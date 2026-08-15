import httpx
import json
import re
import asyncio
from typing import AsyncGenerator, List, Dict, Any, Optional
from server.config import OLLAMA_BASE_URL, DEFAULT_TIMEOUT

class OllamaClient:
    def __init__(self, base_url: str = OLLAMA_BASE_URL):
        self.base_url = base_url.rstrip("/")

    async def check_health(self) -> bool:
        """Check if Ollama server is running locally."""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                return res.status_code == 200
        except Exception:
            return False

    async def list_models(self) -> List[Dict[str, Any]]:
        """Retrieve list of locally installed Ollama models."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models = []
                    for m in data.get("models", []):
                        name = m.get("name", "")
                        size_bytes = m.get("size", 0)
                        size_gb = f"{size_bytes / (1024**3):.1f} GB" if size_bytes else "N/A"
                        
                        # Infer VRAM tier recommendation
                        vram_tier = "8GB~12GB"
                        if "70b" in name.lower():
                            vram_tier = "40GB+ (High VRAM)"
                        elif "32b" in name.lower() or "33b" in name.lower():
                            vram_tier = "24GB (RTX 3090/4090)"
                        elif "14b" in name.lower():
                            vram_tier = "12GB~16GB (RTX 4070)"
                        elif "7b" in name.lower() or "8b" in name.lower():
                            vram_tier = "6GB~8GB (Entry VRAM)"
                        elif "3b" in name.lower() or "1.5b" in name.lower():
                            vram_tier = "4GB+ (Ultra Light)"

                        models.append({
                            "name": name,
                            "size": size_gb,
                            "modified_at": m.get("modified_at", ""),
                            "digest": m.get("digest", "")[:12],
                            "vram_tier": vram_tier
                        })
                    return models
        except Exception as e:
            print(f"[OllamaClient] list_models warning: {e}")
        
        # Fallback default recommendations if Ollama is starting up
        return [
            {"name": "qwen2.5-coder:14b", "size": "9.0 GB", "vram_tier": "12GB~16GB", "digest": "recommended"},
            {"name": "qwen2.5-coder:7b", "size": "4.7 GB", "vram_tier": "6GB~8GB", "digest": "recommended"},
            {"name": "deepseek-r1:14b", "size": "9.0 GB", "vram_tier": "12GB~16GB", "digest": "recommended"},
            {"name": "llama3.2:3b", "size": "2.0 GB", "vram_tier": "4GB+", "digest": "recommended"}
        ]

    async def stream_chat(
        self,
        model: str,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream chat tokens from Ollama /api/chat.
        Yields dicts with {'type': 'token'|'reasoning'|'done', 'content': '...'}
        """
        is_alive = await self.check_health()
        
        if not is_alive:
            # Friendly simulation / fallback when Ollama is not yet launched
            fallback_text = (
                f"⚠️ **[로컬 Ollama 연결 대기 중]**\n\n"
                f"현재 로컬 Ollama(`{self.base_url}`)가 실행되어 있지 않습니다.\n\n"
                f"📌 **로컬 AI 연결 가이드 (비용 0원):**\n"
                f"1. 터미널에서 `ollama run {model}` 명령을 실행해 주세요.\n"
                f"2. 모델이 실행되면 즉시 실시간 로컬 두뇌로 전환되어 100% 무료 연산이 시작됩니다.\n\n"
                f"---\n"
                f"*(에이전트 시뮬레이션 모드)* 요청하신 업무를 접수하였습니다: '{messages[-1]['content']}'"
            )
            for chunk in fallback_text.split(" "):
                await asyncio.sleep(0.04)
                yield {"type": "token", "content": chunk + " "}
            yield {"type": "done", "content": ""}
            return

        payload_messages = []
        if system_prompt:
            payload_messages.append({"role": "system", "content": system_prompt})
        payload_messages.extend(messages)

        payload = {
            "model": model,
            "messages": payload_messages,
            "stream": True,
            "options": {
                "temperature": 0.7,
                "num_ctx": 16384  # high context for agent workflows
            }
        }

        try:
            async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
                async with client.stream("POST", f"{self.base_url}/api/chat", json=payload) as response:
                    if response.status_code != 200:
                        yield {"type": "token", "content": f"❌ Ollama Error ({response.status_code}): {await response.aread()}"}
                        yield {"type": "done", "content": ""}
                        return

                    in_thinking_tag = False
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        try:
                            data = json.loads(line)
                            content = data.get("message", {}).get("content", "")
                            
                            # Handle DeepSeek-R1 / thinking models <think> tags
                            if "<think>" in content:
                                in_thinking_tag = True
                                content = content.replace("<think>", "")
                            if "</think>" in content:
                                in_thinking_tag = False
                                content = content.replace("</think>", "")
                                
                            if in_thinking_tag:
                                yield {"type": "reasoning", "content": content}
                            else:
                                if content:
                                    yield {"type": "token", "content": content}

                            if data.get("done", False):
                                yield {"type": "done", "content": ""}
                        except json.JSONDecodeError:
                            continue
        except Exception as e:
            yield {"type": "token", "content": f"\n\n❌ [Ollama 스트리밍 통신 오류]: {str(e)}"}
            yield {"type": "done", "content": ""}

    async def generate_single(
        self,
        model: str,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None
    ) -> str:
        """Non-streaming single shot generation."""
        full_content = ""
        async for chunk in self.stream_chat(model, messages, system_prompt):
            if chunk["type"] == "token":
                full_content += chunk["content"]
        return full_content
