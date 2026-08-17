import sqlite3
import json
import os
from pathlib import Path
from typing import Dict, Any, List, Optional
from server.config import DB_PATH, BASE_DIR

class IntegrationService:
    def __init__(self, db_path=DB_PATH):
        self.db_path = str(db_path)
        self.env_path = BASE_DIR / ".env"
        self._init_db()

    def _init_db(self):
        """Initialize integrations table."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS integrations (
                    service_id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    description TEXT,
                    status TEXT DEFAULT '미설정', -- '연결됨', '미설정', '준비 중'
                    credentials_json TEXT NOT NULL DEFAULT '{}',
                    metadata_json TEXT NOT NULL DEFAULT '{}',
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Seed default integrations if empty
            default_services = [
                (
                    "duckduckgo_search",
                    "실시간 웹 검색 (DuckDuckGo)",
                    "정우(리서처)가 시장 트렌드와 팩트체크를 위해 100% 무료로 인터넷을 실시간 검색합니다.",
                    "연결됨",
                    json.dumps({}),
                    json.dumps({
                        "icon": "🌐",
                        "badge": "100% 무료",
                        "help_text": "별도 API 키 발급 없이 즉시 무료로 작동합니다.",
                        "fields": []
                    })
                ),
                (
                    "telegram",
                    "텔레그램 봇",
                    "비서가 텔레그램으로 양방향 명령을 받고 보고합니다. 폰 어디서든 회사를 운영하세요.",
                    "미설정",
                    json.dumps({"bot_token": "", "chat_id": ""}),
                    json.dumps({
                        "icon": "✉️",
                        "help_text": "@BotFather에서 /newbot으로 발급 (숫자:문자)",
                        "fields": [
                            {"key": "bot_token", "label": "Bot Token", "type": "password", "placeholder": "123456789:ABCdefGhIJKlmNoPQRstuVWXyz"},
                            {"key": "chat_id", "label": "Chat ID", "type": "text", "placeholder": "8556179792", "sub_help": "봇한테 메시지 1번 보내고 비운 채 저장하면 자동 입력"}
                        ]
                    })
                ),
                (
                    "youtube_api",
                    "YouTube Data API",
                    "내 채널 + 경쟁 채널 분석, 댓글 답장 큐. 비공개 데이터는 OAuth 별도.",
                    "미설정",
                    json.dumps({"api_key": ""}),
                    json.dumps({
                        "icon": "📺",
                        "help_text": "Google Cloud Console에서 YouTube Data API v3 활성화 후 발급",
                        "fields": [
                            {"key": "api_key", "label": "API Key", "type": "password", "placeholder": "AIzaSy..."}
                        ]
                    })
                ),
                (
                    "youtube_oauth",
                    "YouTube Analytics (OAuth)",
                    "시청 지속률·트래픽·구독 증감. 저장 후 \"⚡ 자동 연결\"로 구글 로그인.",
                    "미설정",
                    json.dumps({"client_id": "", "client_secret": ""}),
                    json.dumps({
                        "icon": "📊",
                        "has_auto_connect": True,
                        "help_text": "Cloud Console에서 승인된 리디렉션 URI에 http://127.0.0.1:5814/yt-oauth-callback 추가",
                        "fields": [
                            {"key": "client_id", "label": "Client ID", "type": "password", "placeholder": "xxxx.apps.googleusercontent.com"},
                            {"key": "client_secret", "label": "Client Secret", "type": "password", "placeholder": "GOCSPX-xxxx"}
                        ]
                    })
                ),
                (
                    "google_calendar",
                    "Google Calendar",
                    "비서 캘린더 자동 일정 등록 및 데일리 미팅 동기화.",
                    "준비 중",
                    json.dumps({}),
                    json.dumps({
                        "icon": "📅",
                        "is_coming_soon": True,
                        "fields": []
                    })
                ),
                (
                    "paypal",
                    "PayPal (매출 분석)",
                    "결제 거래 분석. 💰 매출 대시보드 + 새 결제 알림에 사용.",
                    "미설정",
                    json.dumps({"mode": "live", "client_id": "", "client_secret": ""}),
                    json.dumps({
                        "icon": "💰",
                        "help_text": "PayPal Developer Dashboard에서 REST API App 생성 후 발급",
                        "fields": [
                            {"key": "mode", "label": "모드", "type": "select", "options": ["live", "sandbox"], "sub_help": "실제 결제는 live, 테스트는 sandbox"},
                            {"key": "client_id", "label": "Client ID", "type": "password", "placeholder": "Axxx..."},
                            {"key": "client_secret", "label": "Client Secret", "type": "password", "placeholder": "Exxx..."}
                        ]
                    })
                ),
                (
                    "instagram",
                    "Instagram (Meta Graph)",
                    "인스타 비즈니스 게시 + DM/댓글 분석.",
                    "준비 중",
                    json.dumps({"access_token": "", "business_account_id": ""}),
                    json.dumps({
                        "icon": "📷",
                        "help_text": "Meta for Developers에서 Graph API 토큰 발급",
                        "fields": [
                            {"key": "access_token", "label": "Access Token", "type": "password", "placeholder": "EAAG..."},
                            {"key": "business_account_id", "label": "Business Account ID", "type": "text", "placeholder": "178414..."}
                        ]
                    })
                )
            ]
            
            for s in default_services:
                cursor.execute(
                    "INSERT OR IGNORE INTO integrations (service_id, title, description, status, credentials_json, metadata_json) VALUES (?, ?, ?, ?, ?, ?)",
                    s
                )
            conn.commit()

    def list_integrations(self, mask_secrets: bool = True) -> List[Dict[str, Any]]:
        """Retrieve all integrations with masked credentials for UI safety."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT service_id, title, description, status, credentials_json, metadata_json, updated_at FROM integrations")
            rows = cursor.fetchall()
            
            results = []
            for s_id, title, desc, status, creds_str, meta_str, updated_at in rows:
                creds = json.loads(creds_str or "{}")
                meta = json.loads(meta_str or "{}")
                
                # Check status based on credentials
                has_values = any(bool(v) for k, v in creds.items() if k != "mode")
                current_status = status
                if s_id == "duckduckgo_search":
                    current_status = "연결됨"
                elif meta.get("is_coming_soon"):
                    current_status = "준비 중"
                elif has_values:
                    current_status = "연결됨"
                else:
                    current_status = "미설정"

                # Mask credentials if requested
                masked_creds = {}
                for k, v in creds.items():
                    if mask_secrets and k in ("bot_token", "client_secret", "api_key", "access_token") and v:
                        masked_creds[k] = f"{v[:4]}••••••••••••••••{v[-4:]}" if len(v) > 8 else "••••••••"
                    else:
                        masked_creds[k] = v

                results.append({
                    "service_id": s_id,
                    "title": title,
                    "description": desc,
                    "status": current_status,
                    "credentials": masked_creds,
                    "metadata": meta,
                    "updated_at": updated_at
                })
            return results

    def save_integration(self, service_id: str, credentials: Dict[str, Any]) -> Dict[str, Any]:
        """Save credentials and update status."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Fetch existing to avoid overwriting with masked strings
            cursor.execute("SELECT credentials_json, metadata_json FROM integrations WHERE service_id = ?", (service_id,))
            row = cursor.fetchone()
            if not row:
                raise ValueError(f"Unknown service: {service_id}")

            existing_creds = json.loads(row[0] or "{}")
            meta = json.loads(row[1] or "{}")

            # Merge, ignoring masked bullets
            for k, v in credentials.items():
                if "••••" in str(v):
                    continue  # keep existing
                existing_creds[k] = v

            has_values = any(bool(v) for k, v in existing_creds.items() if k != "mode")
            status = "준비 중" if meta.get("is_coming_soon") else ("연결됨" if has_values else "미설정")

            cursor.execute(
                "UPDATE integrations SET credentials_json = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE service_id = ?",
                (json.dumps(existing_creds), status, service_id)
            )
            conn.commit()

            # Sync to .env file
            self._sync_to_env(service_id, existing_creds)

            return {"service_id": service_id, "status": status, "credentials": existing_creds}

    def _sync_to_env(self, service_id: str, creds: Dict[str, Any]):
        """Persist sensitive keys to server .env for zero-config CLI or backend usage."""
        try:
            env_map = {
                "telegram": {"bot_token": "TELEGRAM_BOT_TOKEN", "chat_id": "TELEGRAM_CHAT_ID"},
                "youtube_api": {"api_key": "YOUTUBE_API_KEY"},
                "youtube_oauth": {"client_id": "YOUTUBE_CLIENT_ID", "client_secret": "YOUTUBE_CLIENT_SECRET"},
                "paypal": {"client_id": "PAYPAL_CLIENT_ID", "client_secret": "PAYPAL_CLIENT_SECRET", "mode": "PAYPAL_MODE"},
                "instagram": {"access_token": "INSTAGRAM_ACCESS_TOKEN", "business_account_id": "INSTAGRAM_ACCOUNT_ID"}
            }
            
            if service_id not in env_map:
                return

            mapping = env_map[service_id]
            lines = []
            if self.env_path.exists():
                lines = self.env_path.read_text(encoding="utf-8").splitlines()

            existing_dict = {}
            for line in lines:
                if "=" in line and not line.startswith("#"):
                    k, v = line.split("=", 1)
                    existing_dict[k.strip()] = v.strip()

            for cred_key, env_var in mapping.items():
                val = creds.get(cred_key, "")
                if val and "••••" not in str(val):
                    existing_dict[env_var] = str(val)

            new_content = "\n".join([f"{k}={v}" for k, v in existing_dict.items()]) + "\n"
            self.env_path.write_text(new_content, encoding="utf-8")
        except Exception as e:
            print(f"[IntegrationService] env sync warning: {e}")

integration_service = IntegrationService()
