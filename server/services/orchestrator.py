import uuid
import json
import asyncio
from typing import AsyncGenerator, List, Dict, Any, Optional
from server.services.ollama_client import OllamaClient
from server.services.agent_manager import AgentManager
from server.services.file_service import FileService
from server.services.hardware_profiler import hardware_profiler
from server.services.web_search_service import web_search_service
from server.services.knowledge_service import knowledge_service
from server.database import get_db

from server.models.schemas import Message

class MultiAgentOrchestrator:
    def __init__(
        self,
        ollama_client: OllamaClient,
        agent_manager: AgentManager,
        file_service: FileService
    ):
        self.ollama = ollama_client
        self.agent_mgr = agent_manager
        self.file_svc = file_service

    async def save_message(
        self,
        session_id: str,
        role: str,
        content: str,
        agent_id: Optional[str] = None,
        reasoning: Optional[str] = None
    ) -> str:
        msg_id = str(uuid.uuid4())
        db = await get_db()
        try:
            await db.execute("""
                INSERT INTO messages (id, session_id, agent_id, role, content, reasoning)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (msg_id, session_id, agent_id, role, content, reasoning))
            await db.commit()
        finally:
            await db.close()
        return msg_id

    async def get_session_history_for_agent(
        self,
        session_id: str,
        current_agent_id: Optional[str] = None,
        limit: int = 20
    ) -> List[Dict[str, str]]:
        """
        Retrieves session history with Context Firewall:
        Only messages from the current agent are treated as 'assistant'.
        Messages from other agents are safely wrapped as 'user' reference blocks
        to prevent Speaker Echoing & Confusion.
        """
        db = await get_db()
        try:
            cursor = await db.execute("""
                SELECT role, content, agent_id FROM messages
                WHERE session_id = ?
                ORDER BY created_at ASC
                LIMIT ?
            """, (session_id, limit))
            rows = await cursor.fetchall()
            history = []
            for r in rows:
                if r["role"] == "user":
                    history.append({
                        "role": "user",
                        "content": r["content"]
                    })
                elif r["role"] == "assistant":
                    # If this message belongs to the current agent, keep as assistant
                    if current_agent_id and r["agent_id"] == current_agent_id:
                        history.append({
                            "role": "assistant",
                            "content": r["content"]
                        })
                    else:
                        # Belongs to another agent - wrap as reference context to prevent echoing
                        agent_name = r["agent_id"] if r["agent_id"] else "동료 에이전트"
                        history.append({
                            "role": "user",
                            "content": f"[📜 동료 에이전트 ({agent_name})의 이전 발언 기록]:\n{r['content']}"
                        })
            return history
        finally:
            await db.close()

    async def get_session_history(self, session_id: str, limit: int = 20) -> List[Dict[str, str]]:
        return await self.get_session_history_for_agent(session_id, None, limit)

    async def stream_agent_chat(
        self,
        session_id: str,
        agent_id: str,
        user_message: str,
        override_model: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Processes a chat request with a specific agent and streams SSE chunks.
        """
        agent = await self.agent_mgr.get_agent(agent_id)
        if not agent:
            yield f"data: {json.dumps({'error': f'Agent {agent_id} not found'})}\n\n"
            return

        # Save user message
        await self.save_message(session_id, "user", user_message)

        # Get conversation history with speaker firewall
        history = await self.get_session_history_for_agent(session_id, current_agent_id=agent.id)

        # Autonomous Web Search for Researcher (Jungwoo)
        if agent.id == "researcher":
            search_results = await web_search_service.search(user_message)
            if search_results:
                search_block = web_search_service.format_search_results_for_prompt(user_message, search_results)
                # Append web search context to the latest prompt
                if history and history[-1]["role"] == "user":
                    history[-1]["content"] += f"\n\n{search_block}"
                else:
                    history.append({"role": "user", "content": search_block})

        # Agent Dedicated Knowledge RAG Ingestion Context
        rag_context = await knowledge_service.retrieve_relevant_knowledge(agent.id, user_message)
        if rag_context:
            if history and history[-1]["role"] == "user":
                history[-1]["content"] += f"\n\n{rag_context}"
            else:
                history.append({"role": "user", "content": rag_context})

        # Determine target model
        target_model = override_model if override_model else agent.model
        system_prompt = self.agent_mgr.build_system_prompt(agent)

        full_content = ""
        full_reasoning = ""

        # Send Agent Meta Info
        yield f"data: {json.dumps({'type': 'agent_start', 'agent': agent.model_dump(), 'model': target_model})}\n\n"

        async for chunk in self.ollama.stream_chat(target_model, history, system_prompt):
            if chunk["type"] == "token":
                full_content += chunk["content"]
                yield f"data: {json.dumps({'type': 'token', 'content': chunk['content']})}\n\n"
            elif chunk["type"] == "reasoning":
                full_reasoning += chunk["content"]
                yield f"data: {json.dumps({'type': 'reasoning', 'content': chunk['content']})}\n\n"
            elif chunk["type"] == "done":
                # Save assistant response to DB
                await self.save_message(
                    session_id=session_id,
                    role="assistant",
                    content=full_content,
                    agent_id=agent.id,
                    reasoning=full_reasoning if full_reasoning else None
                )
                # Dynamic VRAM & RAM Flush
                hardware_profiler.flush_vram()
                yield f"data: {json.dumps({'type': 'done', 'agent_id': agent.id})}\n\n"


    async def stream_roundtable(
        self,
        session_id: str,
        topic: str,
        agent_ids: List[str]
    ) -> AsyncGenerator[str, None]:
        """
        Executes a Multi-Agent Roundtable Discussion with Zero-Echo Context Firewall:
        Each agent receives a completely isolated professional prompt focused solely on the topic
        and their specialty, physically preventing any speaker echoing or cross-bleeding.
        Finally, the CEO generates a unified Master Action Plan synthesizing all perspectives.
        """
        # Save user topic
        await self.save_message(session_id, "user", f"📢 [합동 원탁회의 안건]: {topic}")
        yield f"data: {json.dumps({'type': 'roundtable_start', 'topic': topic, 'agents': agent_ids})}\n\n"

        speech_history: List[Dict[str, Any]] = []

        for idx, aid in enumerate(agent_ids):
            agent = await self.agent_mgr.get_agent(aid)
            if not agent:
                continue

            yield f"data: {json.dumps({'type': 'roundtable_speaker_start', 'order': idx+1, 'agent': agent.model_dump()})}\n\n"

            # 🛡️ Zero-Echo Prompt: NO previous speaker text is dumped into the user prompt.
            # This completely eliminates the LLM completion echoing loop.
            roundtable_user_prompt = (
                f"📢 [합동 원탁회의 안건]: {topic}\n\n"
                f"👉 [당신의 발언 차례]: 당신은 **{agent.name} ({agent.role})**입니다.\n"
                f"당신의 전문 분야인 **[{agent.specialty}]** 관점에서만 위 안건을 면밀히 분석하고 실전 전략을 제시하십시오.\n\n"
                f"🚫 [절대 금지 사항 - Zero-Echo Firewall]:\n"
                f"1. 다른 에이전트의 직함이나 이름을 말하지 마십시오. 오직 당신({agent.name})의 전문성으로만 답변하십시오.\n"
                f"2. '존경하는 동료들' 같은 어색한 번역체 로봇 서두를 절대 쓰지 마십시오.\n"
                f"3. 사용자의 안건 언어와 100% 동일한 언어로만 작성하십시오 (중국어 출력 절대 금지).\n\n"
                f"✅ [필수 발언 형식]:\n"
                f"반드시 아래 3단 구조로 작성하십시오:\n"
                f"### {agent.emoji} {agent.name} ({agent.role}) 관점:\n\n"
                f"1. 🎯 직무 전문 진단 및 핵심 인사이트\n"
                f"2. 🚀 구체적 실전 실행 액션 플랜 (Action Items)\n"
                f"3. 🤝 타 부서 협업 요청 포인트"
            )

            # Web search injection if speaker is Researcher (Jungwoo)
            if agent.id == "researcher":
                search_results = await web_search_service.search(topic)
                if search_results:
                    search_block = web_search_service.format_search_results_for_prompt(topic, search_results)
                    roundtable_user_prompt += f"\n\n{search_block}"

            # Ingested Knowledge RAG Injection for this speaker
            agent_rag_context = await knowledge_service.retrieve_relevant_knowledge(agent.id, topic)
            if agent_rag_context:
                roundtable_user_prompt += f"\n\n{agent_rag_context}"

            system_prompt = (
                f"{self.agent_mgr.build_system_prompt(agent)}\n\n"
                f"[Roundtable Mode Active]: You are participating in a live Multi-Agent Roundtable as {agent.name} ({agent.role}). Speak ONLY from your domain: {agent.specialty}."
            )

            history = [{"role": "user", "content": roundtable_user_prompt}]

            full_content = ""
            full_reasoning = ""

            async for chunk in self.ollama.stream_chat(agent.model, history, system_prompt):
                if chunk["type"] == "token":
                    full_content += chunk["content"]
                    yield f"data: {json.dumps({'type': 'token', 'agent_id': agent.id, 'content': chunk['content']})}\n\n"
                elif chunk["type"] == "reasoning":
                    full_reasoning += chunk["content"]
                    yield f"data: {json.dumps({'type': 'reasoning', 'agent_id': agent.id, 'content': chunk['content']})}\n\n"

            # Record speech for CEO synthesis
            speech_history.append({
                "order": idx + 1,
                "agent_id": agent.id,
                "agent_name": agent.name,
                "agent_role": agent.role,
                "content": full_content
            })

            # Save response to history so it is persisted in DB
            await self.save_message(
                session_id=session_id,
                role="assistant",
                content=full_content,
                agent_id=agent.id,
                reasoning=full_reasoning if full_reasoning else None
            )

            # Flush VRAM between speaker turns to avoid OOM
            hardware_profiler.flush_vram()

            yield f"data: {json.dumps({'type': 'roundtable_speaker_done', 'agent_id': agent.id})}\n\n"
            await asyncio.sleep(0.3)

        # =========================================================================
        # Final Step: CEO Master Action Plan Synthesis
        # =========================================================================
        ceo_agent = await self.agent_mgr.get_agent("ceo")
        if ceo_agent and len(speech_history) > 1:
            yield f"data: {json.dumps({'type': 'roundtable_synthesis_start'})}\n\n"

            all_speeches_summary = "\n\n".join([
                f"[{s['agent_name']} ({s['agent_role']})]:\n{s['content']}"
                for s in speech_history
            ])

            synthesis_prompt = (
                f"📢 [합동 원탁회의 안건]: {topic}\n\n"
                f"### [참석 에이전트들의 개별 전문 발언록]:\n{all_speeches_summary}\n\n"
                f"### [CEO 총괄 과업]:\n"
                f"당신은 회사의 총괄 CEO입니다. 위 참석자들의 독립 의견들을 종합하여,\n"
                f"대표님이 즉시 실행할 수 있는 '🏆 원탁회의 최종 결정 및 부서별 실행 마스터 플랜'을 체계적인 마크다운으로 완성하십시오:\n"
                f"1. 🎯 총괄 의사결정 및 핵심 목표 (Core Objective)\n"
                f"2. 📋 부서별 즉시 실행 액션 아이템 (Role-by-Role Action Items)\n"
                f"3. ⚡ 예상 리스크 및 타임라인"
            )

            ceo_system = (
                f"{self.agent_mgr.build_system_prompt(ceo_agent)}\n\n"
                f"You are delivering the final Master Synthesis for the company roundtable."
            )

            ceo_full = ""
            async for chunk in self.ollama.stream_chat(ceo_agent.model, [{"role": "user", "content": synthesis_prompt}], ceo_system):
                if chunk["type"] == "token":
                    ceo_full += chunk["content"]
                    yield f"data: {json.dumps({'type': 'roundtable_synthesis_token', 'content': chunk['content']})}\n\n"

            await self.save_message(
                session_id=session_id,
                role="assistant",
                content=ceo_full,
                agent_id="ceo"
            )
            yield f"data: {json.dumps({'type': 'roundtable_synthesis_done', 'content': ceo_full})}\n\n"

        hardware_profiler.flush_vram()
        yield f"data: {json.dumps({'type': 'roundtable_done'})}\n\n"


    async def execute_pipeline(
        self,
        session_id: str,
        pipeline_type: str,
        prompt: str
    ) -> AsyncGenerator[str, None]:
        """
        Runs one of 4 predefined end-to-end automation pipelines with strict speaker boundaries, web RAG and knowledge RAG.
        """
        pipeline_configs = {
            "full_cycle": {
                "title": "🚀 10대 에이전트 올인원 풀 라이프사이클 팩",
                "stages": [
                    {"agent_id": "researcher", "task": f"다음 아이템/주제에 대해 DuckDuckGo 실시간 검색을 통해 [최신 시장 트렌드, 경쟁사 분석, 타겟 니즈, 기술적 실현 가능성 팩트체크]를 심층 리서치하세요:\n주제: {prompt}"},
                    {"agent_id": "ceo", "task": "위 정우의 심층 시장 리서치를 바탕으로 [핵심 제품 정의, 필수 기능 명세, 시스템 아키텍처 로드맵]을 수립하세요."},
                    {"agent_id": "designer", "task": "위 기획 사양서에 맞춰 [8px 그리드 레이아웃, HSL 다크모드 컬러 팔레트, 모던 UI/UX 컴포넌트 가이드]를 설계하세요."},
                    {"agent_id": "developer", "task": "위 기획 및 디자인 가이드를 기반으로 즉시 브라우저에서 실행 가능한 [HTML/CSS/JavaScript 또는 React 풀 소스코드]를 작성하세요."},
                    {"agent_id": "youtube", "task": "위 완성된 소프트웨어를 대중에게 폭발적으로 홍보할 [클릭율 200% 유튜브 제목 5종, 3초 골든 후크 스크립트, 썸네일 시각 브리프]를 작성하세요."},
                    {"agent_id": "instagram", "task": "위 완성된 소프트웨어를 인스타그램에서 바이럴할 [릴스 숏폼 스크립트, 3-3-3 해시태그, 피드 카드뉴스 본문]을 작성하세요."},
                    {"agent_id": "writer", "task": "위 소프트웨어의 랜딩페이지에 들어갈 [AIDA/PAS 기반 초고전환율 세일즈 카피 및 CTA 문구]를 작성하세요."},
                    {"agent_id": "business", "task": "위 완성된 제품의 [월간 유료 구독 가격(Tier), Unit Economics, ROI 및 1인 SaaS 수익화 비즈니스 모델(BM)]을 최종 확정하세요."}
                ],
                "artifact_name": f"Full_Lifecycle_Pack_{uuid.uuid4().hex[:6]}.md"
            },
            "app_builder": {
                "title": "💻 풀스택 앱 자율 빌더 팩",
                "stages": [
                    {"agent_id": "ceo", "task": f"다음 소프트웨어 요구사항에 대해 [시스템 개요, 핵심 기능, 컴포넌트 구조, 권장 기술 스택]을 포함한 기획 사양서를 작성하세요:\n요구사항: {prompt}"},
                    {"agent_id": "designer", "task": "위 사양서를 바탕으로 [HSL 다크모드 팔레트, 8px 그리드 레이아웃, 모바일/데스크톱 UI 컴포넌트 스타일 가이드]를 수립하세요."},
                    {"agent_id": "developer", "task": "위 기획 및 디자인 가이드를 기반으로 즉시 구동 가능한 [HTML/CSS/JavaScript 또는 React 컴포넌트 풀 소스코드]를 작성하세요."}
                ],
                "artifact_name": f"App_Source_{uuid.uuid4().hex[:6]}.md"
            },
            "youtube_pack": {
                "title": "📺 유튜브 영상 올인원 제작 팩",
                "stages": [
                    {"agent_id": "youtube", "task": f"다음 주제에 대해 [클릭율 높은 제목 5종], [초반 3초 후킹 스크립트], [영상 전체 구조(타임라인)], [썸네일 시각 브리프]를 작성하세요:\n주제: {prompt}"},
                    {"agent_id": "editor", "task": "위 유튜브 기획서에 맞춰 영상 분위기를 극대화할 [추천 BGM 장르, BPM, 악기 구성, 음악 생성 프롬프트]를 작성하세요."},
                    {"agent_id": "writer", "task": "위 기획과 사운드 무드를 바탕으로 유튜브 상세 설명란 [SEO 최적화 본문, 타임스탬프, 연관 해시태그 15개, 고정 댓글 템플릿]을 작성하세요."}
                ],
                "artifact_name": f"YouTube_Pack_{uuid.uuid4().hex[:6]}.md"
            },
            "copywriting_suite": {
                "title": "✍️ 마케팅 & SNS 전환 카피 스위트",
                "stages": [
                    {"agent_id": "business", "task": f"다음 아이템/서비스의 [핵심 타겟 고객 페르소나, 고통점(Pain Points), 차별화 가치 제안(UVP)]을 분석하세요:\n아이템: {prompt}"},
                    {"agent_id": "writer", "task": "위 타겟 분석을 바탕으로 [AIDA / PAS 프레임워크 기반 랜딩페이지 세일즈 카피]를 작성하세요."},
                    {"agent_id": "instagram", "task": "위 세일즈 카피를 인스타그램에 최적화하여 [릴스 숏폼 스크립트, 카드뉴스 5장 본문, 3-3-3 해시태그]로 재가공하세요."}
                ],
                "artifact_name": f"Marketing_Suite_{uuid.uuid4().hex[:6]}.md"
            },
            "deep_research": {
                "title": "🔍 심층 시장/기술 교차 리서치 팩",
                "stages": [
                    {"agent_id": "researcher", "task": f"다음 주제에 대해 5단계 조사 프로토콜에 입각하여 [핵심 데이터, 시장 동향, 기술적 장단점, 교차 검증 팩트]를 심층 분석하세요:\n주제: {prompt}"},
                    {"agent_id": "business", "task": "위 리서치 결과를 토대로 [비즈니스 기회 요인, 위험 요소(Risk), 시장 진입 전략(GTM), ROI 예측]을 도출하세요."},
                    {"agent_id": "secretary", "task": "전체 리서치와 비즈니스 분석 내용을 [1분 경영진 데일리 브리핑(핵심 불릿 5개 + 액션 아이템)]으로 깔끔하게 요약하세요."}
                ],
                "artifact_name": f"Research_Report_{uuid.uuid4().hex[:6]}.md"
            }
        }

        config = pipeline_configs.get(pipeline_type)
        if not config:
            yield f"data: {json.dumps({'error': 'Invalid pipeline type'})}\n\n"
            return

        yield f"data: {json.dumps({'type': 'pipeline_start', 'title': config['title'], 'stages_count': len(config['stages'])})}\n\n"

        accumulated_output = f"# {config['title']}\n\n**요청 주제**: {prompt}\n\n---\n\n"

        for idx, stage in enumerate(config["stages"]):
            agent = await self.agent_mgr.get_agent(stage["agent_id"])
            stage_num = idx + 1
            yield f"data: {json.dumps({'type': 'pipeline_stage_start', 'stage_num': stage_num, 'agent': agent.model_dump(), 'task': stage['task']})}\n\n"

            # 🛡️ Zero-Echo Context Firewall: Never dump prior raw text to prevent LLM mimicking loop
            strict_role_guideline = ""
            if agent.id == "developer":
                strict_role_guideline = (
                    "🚨 [개발자 전담 엄격 지침]: 기획서나 글을 반복하지 마십시오. 오직 웹 브라우저에서 즉시 실행 가능한 "
                    "완전한 HTML/CSS/JavaScript (또는 React) 풀 소스코드를 마크다운 코드 블록(```html ... ```)으로 100% 온전하게 작성하십시오."
                )
            elif agent.id == "youtube":
                strict_role_guideline = (
                    "🚨 [유튜브 전담 엄격 지침]: 타 에이전트의 글을 복사하지 마십시오. 오직 [1. CTR 200% 유튜브 제목 5종], "
                    "[2. 3초 골든 후크 스크립트], [3. 썸네일 시각 브리프], [4. 영상 전체 타임라인]만 100% 온전하게 작성하십시오."
                )
            elif agent.id == "instagram":
                strict_role_guideline = (
                    "🚨 [인스타그램 전담 엄격 지침]: 오직 [1. 인스타 릴스 숏폼 60초 풀 스크립트], "
                    "[2. 3-3-3 해시태그 30종], [3. 인스타그램 카드뉴스 5장 카드별 본문]만 100% 온전하게 작성하십시오."
                )
            elif agent.id == "writer":
                strict_role_guideline = (
                    "🚨 [카피라이터 전담 엄격 지침]: 오직 [1. AIDA / PAS 세일즈 카피], "
                    "[2. 랜딩페이지 후킹 헤드라인 & 서브헤드], [3. 초고전환 결제 유도 CTA 버튼 문구]만 100% 온전하게 작성하십시오."
                )
            elif agent.id == "business":
                strict_role_guideline = (
                    "🚨 [비즈니스 전담 엄격 지침]: 오직 [1. 월간/연간 유료 구독 요금제 티어(Free/Pro/Enterprise)], "
                    "[2. CAC, LTV, Unit Economics 손익분기점], [3. 1인 SaaS 수익화 실행 로드맵]만 100% 온전하게 작성하십시오."
                )
            elif agent.id == "designer":
                strict_role_guideline = (
                    "🚨 [디자이너 전담 엄격 지침]: 오직 [1. 8px 그리드 레이아웃 시스템], "
                    "[2. HSL 다크모드 컬러 팔레트 코드], [3. 모던 UI/UX 컴포넌트 스타일 규격]만 100% 온전하게 작성하십시오."
                )
            elif agent.id == "researcher":
                strict_role_guideline = (
                    "🚨 [리서처 전담 엄격 지침]: 오직 [1. 최신 시장 트렌드 팩트], "
                    "[2. 경쟁사 벤치마킹 비교표], [3. 타겟 고객 핵심 니즈 및 실현 가능성]만 100% 온전하게 작성하십시오."
                )

            stage_prompt = (
                f"📢 [프로젝트 전체 주제]: {prompt}\n\n"
                f"👉 [이번 {stage_num}단계 전담 과업]: {stage['task']}\n\n"
                f"{strict_role_guideline}\n\n"
                f"--------------------------------------------------\n"
                f"👉 [당신의 역할]: 당신은 **{agent.name} ({agent.role})**입니다.\n"
                f"오직 본인의 고유 전문 직무 영역({agent.specialty})에만 엄격히 집중하여 최상의 결과물을 도출하십시오.\n"
                f"반드시 '### {agent.emoji} {agent.name} ({agent.role}) 관점:' 헤더로 시작하십시오."
            )

            # Web search for researcher stage
            if agent.id == "researcher":
                search_results = await web_search_service.search(prompt)
                if search_results:
                    search_block = web_search_service.format_search_results_for_prompt(prompt, search_results)
                    stage_prompt += f"\n\n{search_block}"

            # Knowledge RAG Injection for this stage agent
            stage_rag = await knowledge_service.retrieve_relevant_knowledge(agent.id, prompt)
            if stage_rag:
                stage_prompt += f"\n\n{stage_rag}"

            history = [{"role": "user", "content": stage_prompt}]
            system_prompt = self.agent_mgr.build_system_prompt(agent)

            stage_content = ""
            async for chunk in self.ollama.stream_chat(agent.model, history, system_prompt):
                if chunk["type"] == "token":
                    stage_content += chunk["content"]
                    yield f"data: {json.dumps({'type': 'token', 'stage_num': stage_num, 'agent_id': agent.id, 'content': chunk['content']})}\n\n"
                elif chunk["type"] == "reasoning":
                    yield f"data: {json.dumps({'type': 'reasoning', 'stage_num': stage_num, 'agent_id': agent.id, 'content': chunk['content']})}\n\n"

            accumulated_output += f"## Stage {stage_num}: {agent.name} ({agent.role})\n\n{stage_content}\n\n---\n\n"
            hardware_profiler.flush_vram()
            yield f"data: {json.dumps({'type': 'pipeline_stage_done', 'stage_num': stage_num, 'agent_id': agent.id, 'content': stage_content})}\n\n"
            await asyncio.sleep(0.3)

        # Save output to workspace artifact
        artifact_path = self.file_svc.save_artifact(config["artifact_name"], accumulated_output)
        
        # 📁 Physical App Scaffolding: Create real project files in app_build/{app_id}/
        app_id = f"app_{uuid.uuid4().hex[:6]}"
        scaffold_res = self.file_svc.scaffold_app_project(
            app_id=app_id,
            full_markdown=accumulated_output,
            title=f"{config['title']} - {prompt[:20]}"
        )

        yield f"data: {json.dumps({'type': 'pipeline_complete', 'artifact_path': artifact_path, 'artifact_name': config['artifact_name'], 'artifact_content': accumulated_output, 'app_id': app_id, 'preview_url': f'/api/apps/preview/{app_id}', 'project_dir': scaffold_res['project_dir'], 'files': scaffold_res['files']})}\n\n"


