import os
import re
import json
import uuid
import asyncio
import httpx
from pathlib import Path
from typing import Optional, Dict, Any, List
from server.database import get_db

class TelegramService:
    def __init__(self):
        self.bot_token: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
        self.chat_id: str = os.getenv("TELEGRAM_CHAT_ID", "")
        self.is_polling: bool = False
        self._poll_task: Optional[asyncio.Task] = None
        self._last_update_id: int = 0
        self.cached_scouted_ideas: List[Dict[str, Any]] = []

    async def load_config_from_db(self):
        """Loads bot_token and chat_id from SQLite system_settings table if available."""
        try:
            db = await get_db()
            cursor = await db.execute("SELECT key, value FROM system_settings WHERE key IN ('telegram_bot_token', 'telegram_chat_id')")
            rows = await cursor.fetchall()
            for r in rows:
                if r["key"] == "telegram_bot_token" and r["value"]:
                    self.bot_token = r["value"]
                elif r["key"] == "telegram_chat_id" and r["value"]:
                    self.chat_id = r["value"]
            await db.close()
        except Exception:
            pass

    async def save_config_to_db(self, bot_token: str, chat_id: str):
        self.bot_token = bot_token.strip()
        self.chat_id = chat_id.strip()
        try:
            db = await get_db()
            await db.execute("""
                CREATE TABLE IF NOT EXISTS system_settings (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            await db.execute("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('telegram_bot_token', ?)", (self.bot_token,))
            await db.execute("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('telegram_chat_id', ?)", (self.chat_id,))
            await db.commit()
            await db.close()
        except Exception as e:
            print(f"[TelegramService] DB save error: {e}")

    def get_config(self) -> Dict[str, Any]:
        return {
            "bot_token": self.bot_token,
            "chat_id": self.chat_id,
            "is_configured": bool(self.bot_token and self.chat_id),
            "is_polling": self.is_polling
        }

    async def send_message(self, text: str, reply_markup: Optional[dict] = None) -> dict:
        """Sends a markdown message to the configured telegram chat."""
        if not self.bot_token or not self.chat_id:
            return {"status": "error", "message": "텔레그램 봇 토큰 또는 Chat ID가 설정되지 않았습니다."}

        url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
        payload: Dict[str, Any] = {
            "chat_id": self.chat_id,
            "text": text,
            "parse_mode": "HTML"
        }
        if reply_markup:
            payload["reply_markup"] = reply_markup

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                res = await client.post(url, json=payload)
                data = res.json()
                if not data.get("ok"):
                    # Retry without parse_mode in case of HTML tag error
                    payload.pop("parse_mode", None)
                    res2 = await client.post(url, json=payload)
                    return res2.json()
                return data
            except Exception as e:
                return {"status": "error", "message": str(e)}

    async def send_document(self, file_path: str, caption: str = "") -> dict:
        """Uploads and sends a document file to the telegram chat."""
        if not self.bot_token or not self.chat_id:
            return {"status": "error", "message": "텔레그램 미설정"}

        path = Path(file_path)
        if not path.exists():
            return {"status": "error", "message": f"파일을 찾을 수 없음: {file_path}"}

        url = f"https://api.telegram.org/bot{self.bot_token}/sendDocument"
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                with open(path, "rb") as f:
                    files = {"document": (path.name, f)}
                    data = {"chat_id": self.chat_id, "caption": caption[:1024]}
                    res = await client.post(url, data=data, files=files)
                    return res.json()
            except Exception as e:
                return {"status": "error", "message": str(e)}

    async def scout_hot_ideas(self) -> List[Dict[str, Any]]:
        """Scouts 3 trending SaaS ideas using web search."""
        from server.services.web_search_service import web_search_service
        
        search_res = await web_search_service.search("2026 trending micro SaaS ideas AI tools ProductHunt", max_results=3)
        ideas = []
        default_ideas = [
            {
                "id": "idea_1",
                "title": "AI 숏폼 릴스 자동 영상 생성기 (SaaS)",
                "desc": "텍스트 입력 시 1분 릴스 대본, 나레이션 및 자막 템플릿을 일괄 자동 제작",
                "target": "1인 크리에이터 및 인스타 셀러",
                "pricing": "월 $19 / $49 구독제"
            },
            {
                "id": "idea_2",
                "title": "1인 프리랜서 자동 전자계약 & 리스크 검토기",
                "desc": "PDF 계약서 업로드 시 독소조항 자동 분석 및 수정 권고안 제시",
                "target": "프리랜서 및 1인 스타트업 대표",
                "pricing": "건당 9,900원 / 월 29,000원 무제한"
            },
            {
                "id": "idea_3",
                "title": "스마트스토어 AI 자동 고객응대 & FAQ 챗봇",
                "desc": "쇼핑몰 상품 상세페이지를 읽고 실시간 CS 질문에 24시간 자동 응답",
                "target": "이커머스 1인 셀러",
                "pricing": "월 39,000원"
            }
        ]

        if search_res and len(search_res) >= 3:
            for idx, r in enumerate(search_res[:3]):
                clean_title = re.sub(r'[\r\n]+', ' ', r.get('title', f'AI 아이템 {idx+1}'))[:40]
                ideas.append({
                    "id": f"idea_{idx+1}",
                    "title": clean_title,
                    "desc": r.get('snippet', '최신 웹 검색 트렌드 기반 고수익 1인 비즈니스 아이템')[:120],
                    "target": "글로벌 1인 창업자",
                    "pricing": "월 29,000원 구독제"
                })
        else:
            ideas = default_ideas

        self.cached_scouted_ideas = ideas
        return ideas

    async def send_scouted_report_to_telegram(self) -> dict:
        """Scouts ideas and sends rich interactive inline buttons to Telegram."""
        await self.load_config_from_db()
        if not self.bot_token or not self.chat_id:
            return {"status": "error", "message": "텔레그램 봇 토큰과 Chat ID를 먼저 설정해 주십시오."}

        ideas = await self.scout_hot_ideas()

        msg_lines = [
            "📢 <b>[10대 에이전트 군단 데일리 핫 아이템 발굴 보고]</b>",
            "충성! 대표님, 오늘 시장에서 가장 수요가 급증하는 <b>유망 SaaS 아이템 3종</b>을 발굴했습니다.",
            "원하시는 아이템 아래의 <b>[🚀 개발 승인]</b> 버튼을 누르시면 사무실 컴퓨터에서 즉시 <b>8단계 풀코스 자율 개발(코드 및 실제 파일 생성)</b>에 착수합니다!\n"
        ]

        inline_keyboard = []
        for idx, idea in enumerate(ideas):
            num = idx + 1
            msg_lines.append(f"<b>{num}️⃣ {idea['title']}</b>")
            msg_lines.append(f"• 설명: {idea['desc']}")
            msg_lines.append(f"• 타겟: {idea['target']} | 가격: {idea['pricing']}\n")

            inline_keyboard.append([
                {"text": f"🚀 {num}번 [{idea['title'][:14]}...] 개발 승인", "callback_data": f"approve_{idea['id']}"}
            ])

        reply_markup = {"inline_keyboard": inline_keyboard}
        return await self.send_message("\n".join(msg_lines), reply_markup=reply_markup)

    async def execute_approved_idea_pipeline(self, idea_id: str, chat_id: str):
        """Runs the 8-stage full_cycle pipeline in background and sends the results back to Telegram."""
        target_idea = next((i for i in self.cached_scouted_ideas if i["id"] == idea_id), None)
        if not target_idea:
            # Fallback
            target_idea = {
                "title": "AI 숏폼 릴스 자동 영상 생성기",
                "desc": "1인 창업자를 위한 고효율 자동화 도구"
            }

        prompt = f"{target_idea['title']} - {target_idea['desc']}"
        self.current_active_task = target_idea['title']
        await self.send_message(
            f"⚡ <b>[개발 착수 알림]</b>\n대표님께서 <b>'{target_idea['title']}'</b> 아이템을 승인하셨습니다!\n"
            f"10대 에이전트 군단(정우 ➡️ CEO ➡️ 민희 ➡️ 코다리 ➡️ 레오 ➡️ 찬우 ➡️ 지은 ➡️ 현빈)이 "
            f"<b>실제 소스코드 빌드 및 마케팅 8단계 일괄 완주</b>에 착수합니다. 잠시만 기다려 주십시오! 🫡"
        )

        from server.services.ollama_client import ollama_client
        from server.services.agent_manager import agent_manager
        from server.services.file_service import file_service
        from server.services.orchestrator import MultiAgentOrchestrator

        orchestrator = MultiAgentOrchestrator(ollama_client, agent_manager, file_service)
        session_id = f"tg_auto_{uuid.uuid4().hex[:6]}"

        final_artifact_name = ""
        final_artifact_content = ""
        final_project_dir = ""

        try:
            async for chunk_str in orchestrator.execute_pipeline(session_id, "full_cycle", prompt):
                if chunk_str.startswith("data: "):
                    try:
                        data = json.loads(chunk_str[6:].strip())
                        if data.get("type") == "pipeline_complete":
                            final_artifact_name = data.get("artifact_name", "")
                            final_artifact_content = data.get("artifact_content", "")
                            final_project_dir = data.get("project_dir", "")
                    except Exception:
                        pass

            # Completed! Send results
            done_msg = (
                f"🏆 <b>[10대 에이전트 8단계 자율 개발 완주 보고]</b>\n\n"
                f"대표님! 승인하신 <b>'{target_idea['title']}'</b> 프로젝트의 실제 소스코드와 마케팅 패키지가 100% 완성되었습니다!\n\n"
                f"📁 <b>물리 프로젝트 폴더</b>: <code>{final_project_dir}</code>\n"
                f"📄 <b>산출물 파일</b>: <code>{final_artifact_name}</code>\n\n"
                f"완성된 소스코드 및 총괄 보고서 파일을 아래에 즉시 첨부하여 올립니다, 충성! 🫡"
            )
            await self.send_message(done_msg)

            # Send physical index.html or artifact file
            if final_project_dir:
                index_path = Path(final_project_dir) / "index.html"
                if index_path.exists():
                    await self.send_document(str(index_path), caption=f"🌐 [실제 구동 웹앱 소스코드] {target_idea['title']}")

            if final_artifact_name:
                from server.config import ARTIFACTS_DIR
                art_path = ARTIFACTS_DIR / final_artifact_name
                if art_path.exists():
                    await self.send_document(str(art_path), caption=f"📄 [8개 부서 총괄 마스터 리포트] {target_idea['title']}")

        except Exception as e:
            await self.send_message(f"🚨 [개발 진행 중 오류 발생]: {str(e)}")
        finally:
            self.current_active_task = None

    async def _poll_updates(self):
        """Background long polling loop to receive button clicks and user messages."""
        print("[TelegramService] 롱 폴링(Long Polling) 리스너 시작...")
        async with httpx.AsyncClient(timeout=35.0) as client:
            while self.is_polling:
                if not self.bot_token:
                    await asyncio.sleep(5)
                    continue

                url = f"https://api.telegram.org/bot{self.bot_token}/getUpdates"
                params = {"offset": self._last_update_id + 1, "timeout": 20}
                try:
                    res = await client.get(url, params=params)
                    if res.status_code == 200:
                        data = res.json()
                        if data.get("ok"):
                            for update in data.get("result", []):
                                self._last_update_id = update["update_id"]
                                
                                # Handle button click (callback_query)
                                if "callback_query" in update:
                                    cq = update["callback_query"]
                                    cb_data = cq.get("data", "")
                                    from_chat_id = str(cq.get("message", {}).get("chat", {}).get("id", ""))
                                    
                                    # Answer callback to remove spinner on button
                                    try:
                                        await client.post(f"https://api.telegram.org/bot{self.bot_token}/answerCallbackQuery", json={"callback_query_id": cq["id"], "text": "🚀 개발 착수 승인 완료!"})
                                    except Exception:
                                        pass

                                    if cb_data.startswith("approve_"):
                                        idea_id = cb_data.replace("approve_", "")
                                        asyncio.create_task(self.execute_approved_idea_pipeline(idea_id, from_chat_id))

                                # Handle text commands (e.g. /scout, /help, /status, natural language)
                                elif "message" in update and "text" in update["message"]:
                                    msg_text = update["message"]["text"].strip()
                                    if msg_text in ["/scout", "/아이템", "/발굴", "아이템", "발굴"]:
                                        asyncio.create_task(self.send_scouted_report_to_telegram())
                                    elif msg_text in ["/start", "/help", "/도움말"]:
                                        await self.send_message(
                                            "충성! <b>코다리 개발부장 텔레그램 봇</b>입니다!\n\n"
                                            "• <code>/scout</code> 또는 <code>/아이템</code> : 오늘 시장의 핫 SaaS 아이템 3종 자율 발굴 요청\n"
                                            "• <code>/status</code> 또는 <code>진행중이야?</code> : 현재 10대 에이전트 개발 진행 상황 실시간 조회\n"
                                            "• 보고서의 <b>[🚀 개발 승인]</b> 버튼을 누르면 즉시 10대 에이전트가 풀코스 자율 개발을 완주합니다!"
                                        )
                                    elif any(k in msg_text for k in ["진행", "상태", "어디까지", "개발중", "status", "/status"]):
                                        active = getattr(self, "current_active_task", None)
                                        if active:
                                            await self.send_message(
                                                f"⚡ <b>[현재 작업 진행 중]</b>\n"
                                                f"대표님! 현재 10대 에이전트 군단이 <b>'{active}'</b> 프로젝트를 열심히 빌드하고 있습니다!\n"
                                                f"완성되는 즉시 소스코드와 총괄 보고서를 이곳으로 직송해 올리겠습니다, 충성! 🫡"
                                            )
                                        else:
                                            await self.send_message(
                                                "☕ <b>[현재 대기 중]</b>\n"
                                                "대표님! 현재 진행 중인 개발 작업이 없습니다.\n"
                                                "<code>/scout</code>를 입력하여 새로운 핫 아이템 3종을 발굴하시거나 개발을 지시해 주십시오! 🫡"
                                            )
                                    else:
                                        await self.send_message(
                                            f"충성! 대표님, 코다리 부장입니다! 🫡\n"
                                            f"'{msg_text}' 말씀을 접수했습니다.\n\n"
                                            f"• <b>/scout</b> : 유망 SaaS 3종 발굴 및 개발 승인\n"
                                            f"• <b>/status</b> : 현재 파이프라인 진행 상태 조회"
                                        )
                except Exception as e:
                    # Ignore timeout and retry
                    await asyncio.sleep(2)

    def start_polling(self):
        if not self.is_polling:
            self.is_polling = True
            self._poll_task = asyncio.create_task(self._poll_updates())

    def stop_polling(self):
        self.is_polling = False
        if self._poll_task:
            self._poll_task.cancel()

telegram_service = TelegramService()
