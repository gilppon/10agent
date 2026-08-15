import uuid
import json
import asyncio
from typing import AsyncGenerator, List, Dict, Any, Optional
from server.services.ollama_client import OllamaClient
from server.services.agent_manager import AgentManager
from server.services.file_service import FileService
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

    async def get_session_history(self, session_id: str, limit: int = 20) -> List[Dict[str, str]]:
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
                prefix = f"[{r['agent_id']}] " if r['agent_id'] and r['role'] == 'assistant' else ""
                history.append({
                    "role": r["role"],
                    "content": f"{prefix}{r['content']}"
                })
            return history
        finally:
            await db.close()

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

        # Get conversation history
        history = await self.get_session_history(session_id)

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
                yield f"data: {json.dumps({'type': 'done', 'agent_id': agent.id})}\n\n"

    async def stream_roundtable(
        self,
        session_id: str,
        topic: str,
        agent_ids: List[str]
    ) -> AsyncGenerator[str, None]:
        """
        Executes a Multi-Agent Roundtable Discussion where selected agents sequentially speak.
        """
        # Save user topic
        await self.save_message(session_id, "user", f"📢 [합동 원탁회의 안건]: {topic}")
        yield f"data: {json.dumps({'type': 'roundtable_start', 'topic': topic, 'agents': agent_ids})}\n\n"

        collective_context = f"오늘의 회의 안건: '{topic}'\n각 에이전트는 본인의 전문 직무 관점에서 통찰과 실행 방안을 제시하고 다음 발언자와 유기적으로 연결하세요."

        for idx, aid in enumerate(agent_ids):
            agent = await self.agent_mgr.get_agent(aid)
            if not agent:
                continue

            yield f"data: {json.dumps({'type': 'roundtable_speaker_start', 'order': idx+1, 'agent': agent.model_dump()})}\n\n"

            history = await self.get_session_history(session_id)
            system_prompt = (
                f"{self.agent_mgr.build_system_prompt(agent)}\n\n"
                f"현재는 다자간 원탁회의(Roundtable) 진행 중입니다. 이전 동료들의 발언을 참고하여 본인 분야({agent.specialty})의 구체적 전략을 제시하세요."
            )

            full_content = ""
            full_reasoning = ""

            async for chunk in self.ollama.stream_chat(agent.model, history, system_prompt):
                if chunk["type"] == "token":
                    full_content += chunk["content"]
                    yield f"data: {json.dumps({'type': 'token', 'agent_id': agent.id, 'content': chunk['content']})}\n\n"
                elif chunk["type"] == "reasoning":
                    full_reasoning += chunk["content"]
                    yield f"data: {json.dumps({'type': 'reasoning', 'agent_id': agent.id, 'content': chunk['content']})}\n\n"

            # Save response to history so subsequent agents see it
            await self.save_message(
                session_id=session_id,
                role="assistant",
                content=full_content,
                agent_id=agent.id,
                reasoning=full_reasoning if full_reasoning else None
            )

            yield f"data: {json.dumps({'type': 'roundtable_speaker_done', 'agent_id': agent.id})}\n\n"
            await asyncio.sleep(0.5)

        yield f"data: {json.dumps({'type': 'roundtable_done'})}\n\n"

    async def execute_pipeline(
        self,
        session_id: str,
        pipeline_type: str,
        prompt: str
    ) -> AsyncGenerator[str, None]:
        """
        Runs one of 4 predefined end-to-end automation pipelines.
        """
        pipeline_configs = {
            "youtube_pack": {
                "title": "📺 유튜브 영상 올인원 제작 팩",
                "stages": [
                    {"agent_id": "youtube", "task": f"다음 주제에 대해 [클릭율 높은 제목 5종], [초반 3초 후킹 스크립트], [영상 전체 구조(타임라인)], [썸네일 시각 브리프]를 작성하세요:\n주제: {prompt}"},
                    {"agent_id": "editor", "task": "위 유튜브 기획서에 맞춰 영상 분위기를 극대화할 [추천 BGM 장르, BPM, 악기 구성, 음악 생성 프롬프트]를 작성하세요."},
                    {"agent_id": "writer", "task": "위 기획과 사운드 무드를 바탕으로 유튜브 상세 설명란 [SEO 최적화 본문, 타임스탬프, 연관 해시태그 15개, 고정 댓글 템플릿]을 작성하세요."}
                ],
                "artifact_name": f"YouTube_Pack_{uuid.uuid4().hex[:6]}.md"
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
            yield f"data: {json.dumps({'type': 'pipeline_stage_start', 'stage_num': idx+1, 'agent': agent.model_dump(), 'task': stage['task']})}\n\n"

            stage_prompt = (
                f"{stage['task']}\n\n"
                f"[이전 단계 산출물 참조]:\n{accumulated_output[-2000:] if len(accumulated_output) > 50 else '첫 번째 단계입니다.'}"
            )

            history = [{"role": "user", "content": stage_prompt}]
            system_prompt = self.agent_mgr.build_system_prompt(agent)

            stage_content = ""
            async for chunk in self.ollama.stream_chat(agent.model, history, system_prompt):
                if chunk["type"] == "token":
                    stage_content += chunk["content"]
                    yield f"data: {json.dumps({'type': 'token', 'agent_id': agent.id, 'content': chunk['content']})}\n\n"
                elif chunk["type"] == "reasoning":
                    yield f"data: {json.dumps({'type': 'reasoning', 'agent_id': agent.id, 'content': chunk['content']})}\n\n"

            accumulated_output += f"## Stage {idx+1}: {agent.name} ({agent.role})\n\n{stage_content}\n\n---\n\n"
            yield f"data: {json.dumps({'type': 'pipeline_stage_done', 'stage_num': idx+1, 'agent_id': agent.id})}\n\n"

        # Save output to workspace artifact
        artifact_path = self.file_svc.save_artifact(config["artifact_name"], accumulated_output)
        yield f"data: {json.dumps({'type': 'pipeline_complete', 'artifact_path': artifact_path, 'artifact_name': config['artifact_name']})}\n\n"
