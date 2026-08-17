import httpx
import json
import re
import asyncio
from typing import AsyncGenerator, List, Dict, Any, Optional
from server.config import OLLAMA_BASE_URL, LM_STUDIO_BASE_URL, DEFAULT_TIMEOUT
from server.services.semantic_cache import semantic_cache
from server.services.model_router import model_router

class LocalAIClient:
    """
    Unified Local AI Client supporting automatic detection & routing
    for both Ollama (11434) and LM Studio (1234/v1).
    """
    def __init__(self, ollama_url: str = OLLAMA_BASE_URL, lm_studio_url: str = LM_STUDIO_BASE_URL):
        self.ollama_url = ollama_url.rstrip("/")
        self.lm_studio_url = lm_studio_url.rstrip("/")
        self.base_url = self.ollama_url

    async def detect_backends(self) -> Dict[str, bool]:
        """Check availability of Ollama and LM Studio."""
        results = {"ollama": False, "lm_studio": False}
        
        async with httpx.AsyncClient(timeout=2.0) as client:
            try:
                res_ol = await client.get(f"{self.ollama_url}/api/tags")
                results["ollama"] = (res_ol.status_code == 200)
            except Exception:
                pass

            try:
                res_lm = await client.get(f"{self.lm_studio_url}/models")
                results["lm_studio"] = (res_lm.status_code == 200)
            except Exception:
                pass

        return results

    async def _get_lm_model_ids(self) -> List[str]:
        """Fetch list of active model IDs in LM Studio."""
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{self.lm_studio_url}/models")
                if res.status_code == 200:
                    return [m.get("id", "") for m in res.json().get("data", [])]
        except Exception:
            pass
        return []

    async def check_health(self) -> bool:
        """Return True if at least one local AI server is alive."""
        backends = await self.detect_backends()
        return backends["ollama"] or backends["lm_studio"]

    async def list_models(self) -> List[Dict[str, Any]]:
        """Retrieve unified list of models from Ollama and LM Studio."""
        models = []
        backends = await self.detect_backends()

        # 1. Fetch from Ollama
        if backends["ollama"]:
            try:
                async with httpx.AsyncClient(timeout=4.0) as client:
                    res = await client.get(f"{self.ollama_url}/api/tags")
                    if res.status_code == 200:
                        for m in res.json().get("models", []):
                            name = m.get("name", "")
                            size_bytes = m.get("size", 0)
                            size_gb = f"{size_bytes / (1024**3):.1f} GB" if size_bytes else "N/A"
                            models.append({
                                "name": name,
                                "source": "Ollama (11434)",
                                "backend": "ollama",
                                "size": size_gb,
                                "digest": m.get("digest", "")[:12],
                                "vram_tier": self._infer_vram(name)
                            })
            except Exception as e:
                print(f"[LocalAI] Ollama list warning: {e}")

        # 2. Fetch from LM Studio (OpenAI Compatible)
        if backends["lm_studio"]:
            try:
                async with httpx.AsyncClient(timeout=4.0) as client:
                    res = await client.get(f"{self.lm_studio_url}/models")
                    if res.status_code == 200:
                        for m in res.json().get("data", []):
                            m_id = m.get("id", "")
                            models.append({
                                "name": m_id,
                                "source": "LM Studio (1234)",
                                "backend": "lm_studio",
                                "size": "Loaded",
                                "digest": "lm-studio",
                                "vram_tier": self._infer_vram(m_id)
                            })
            except Exception as e:
                print(f"[LocalAI] LM Studio list warning: {e}")

        if models:
            return models

        # Fallback default recommendations
        return [
            {"name": "qwen2.5-coder:32b", "source": "Ollama / LM Studio", "size": "19.0 GB", "vram_tier": "24GB (RTX 3090/4090)", "digest": "large"},
            {"name": "qwen2.5:7b", "source": "Ollama / LM Studio", "size": "4.7 GB", "vram_tier": "6GB~8GB", "digest": "medium"},
            {"name": "llama3.2:3b", "source": "Ollama / LM Studio", "size": "2.0 GB", "vram_tier": "4GB+", "digest": "small"},
            {"name": "deepseek-r1:latest", "source": "Ollama / LM Studio", "size": "9.0 GB", "vram_tier": "12GB~16GB", "digest": "reasoning"}
        ]

    def _infer_vram(self, name: str) -> str:
        n = name.lower()
        if "70b" in n:
            return "40GB+ (High VRAM)"
        elif "32b" in n or "33b" in n:
            return "24GB (RTX 3090/4090)"
        elif "14b" in n:
            return "12GB~16GB (RTX 4070)"
        elif "7b" in n or "8b" in n:
            return "6GB~8GB (Entry VRAM)"
        elif "3b" in n or "1.5b" in n:
            return "4GB+ (Ultra Light)"
        return "8GB~12GB"

    async def stream_chat(
        self,
        model: str,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        agent_role: str = "",
        use_cache: bool = True
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream tokens with backend auto-routing (Ollama vs LM Studio) + Semantic Cache."""
        last_user_query = messages[-1]["content"] if messages else ""
        
        # 1. Dynamic Model Routing
        resolved_model, tier, route_reason = model_router.route_task(
            query=last_user_query,
            agent_role=agent_role,
            user_preferred_model=model
        )
        yield {
            "type": "routing_info",
            "content": f"⚡ [동적 라우팅] {resolved_model} ({tier.upper()} Tier) 할당 - {route_reason}"
        }

        # 2. Semantic Cache Check
        if use_cache and last_user_query:
            cached_result = await semantic_cache.lookup(last_user_query, model_tier=tier)
            if cached_result:
                yield {
                    "type": "cache_hit",
                    "content": f"🚀 [세맨틱 캐시 적중 ({int(cached_result['similarity']*100)}%)] 0초 즉시 반환"
                }
                for chunk in cached_result["response"].split(" "):
                    await asyncio.sleep(0.01)
                    yield {"type": "token", "content": chunk + " "}
                yield {"type": "done", "content": ""}
                return

        # 3. Detect active backends
        backends = await self.detect_backends()
        
        if not backends["ollama"] and not backends["lm_studio"]:
            fallback_text = (
                f"⚠️ **[로컬 AI 연결 대기 중]**\n\n"
                f"현재 로컬 Ollama(`{self.ollama_url}`) 및 LM Studio(`{self.lm_studio_url}`)가 감지되지 않았습니다.\n\n"
                f"📌 **로컬 AI 연결 안내:**\n"
                f"- **Ollama 사용자**: 터미널에서 `ollama run {resolved_model}` 실행\n"
                f"- **LM Studio 사용자**: LM Studio 실행 후 'Local Server (포트 1234)' Start 버튼 클릭\n\n"
                f"---\n"
                f"*(시뮬레이션 모드 접수 완료)*: '{last_user_query}'"
            )
            for chunk in fallback_text.split(" "):
                await asyncio.sleep(0.02)
                yield {"type": "token", "content": chunk + " "}
            yield {"type": "done", "content": ""}
            return

        # 4. Determine Target Backend (LM Studio vs Ollama)
        use_lm_studio = False
        
        # Check if model belongs to LM Studio
        if backends["lm_studio"]:
            if not backends["ollama"]:
                use_lm_studio = True
            elif "/" in resolved_model or "deepseek-v4" in resolved_model.lower() or "qwen3.5" in resolved_model.lower() or "bonsai" in resolved_model.lower() or "loaded" in resolved_model.lower():
                use_lm_studio = True
            else:
                # Check against known LM Studio models
                lm_models = await self._get_lm_model_ids()
                if resolved_model in lm_models:
                    use_lm_studio = True

        if use_lm_studio:
            had_error = False
            async for chunk in self._stream_lm_studio(resolved_model, messages, system_prompt, tier, last_user_query):
                if chunk["type"] == "token" and "❌ LM Studio Error" in chunk["content"]:
                    had_error = True
                else:
                    yield chunk
            # Fallback to Ollama if LM Studio failed and Ollama is alive
            if had_error and backends["ollama"]:
                yield {"type": "token", "content": "\n⚠️ [LM Studio 오류로 Ollama 자동 폴백 중...]\n"}
                async for chunk in self._stream_ollama(resolved_model, messages, system_prompt, tier, last_user_query):
                    yield chunk
        else:
            had_error = False
            async for chunk in self._stream_ollama(resolved_model, messages, system_prompt, tier, last_user_query):
                if chunk["type"] == "token" and "❌ Ollama Error" in chunk["content"] and "not found" in chunk["content"].lower():
                    had_error = True
                else:
                    yield chunk
            # Fallback to LM Studio if Ollama model not found and LM Studio is alive
            if had_error and backends["lm_studio"]:
                yield {"type": "token", "content": "\n⚠️ [Ollama 모델 미발견으로 LM Studio 자동 폴백 중...]\n"}
                async for chunk in self._stream_lm_studio(resolved_model, messages, system_prompt, tier, last_user_query):
                    yield chunk

    async def _stream_ollama(self, model: str, messages: list, system_prompt: Optional[str], tier: str, query: str):
        payload_messages = []
        if system_prompt:
            payload_messages.append({"role": "system", "content": system_prompt})
        payload_messages.extend(messages)

        payload = {
            "model": model,
            "messages": payload_messages,
            "stream": True,
            "options": {"temperature": 0.7, "num_ctx": 16384}
        }
        accum = []
        try:
            async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
                async with client.stream("POST", f"{self.ollama_url}/api/chat", json=payload) as response:
                    if response.status_code != 200:
                        yield {"type": "token", "content": f"❌ Ollama Error: {await response.aread()}"}
                        yield {"type": "done", "content": ""}
                        return
                    in_thinking = False
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        try:
                            data = json.loads(line)
                            content = data.get("message", {}).get("content", "")
                            if "<think>" in content:
                                in_thinking = True
                                content = content.replace("<think>", "")
                            if "</think>" in content:
                                in_thinking = False
                                content = content.replace("</think>", "")
                            if in_thinking:
                                yield {"type": "reasoning", "content": content}
                            elif content:
                                accum.append(content)
                                yield {"type": "token", "content": content}
                            if data.get("done", False):
                                full_res = "".join(accum)
                                if query and full_res:
                                    asyncio.create_task(semantic_cache.store(query, full_res, model_tier=tier))
                                yield {"type": "done", "content": ""}
                        except json.JSONDecodeError:
                            continue
        except Exception as e:
            yield {"type": "token", "content": f"\n❌ [Ollama 통신 오류]: {str(e)}"}
            yield {"type": "done", "content": ""}

    async def _stream_lm_studio(self, model: str, messages: list, system_prompt: Optional[str], tier: str, query: str):
        payload_messages = []
        if system_prompt:
            payload_messages.append({"role": "system", "content": system_prompt})
        payload_messages.extend(messages)

        payload = {
            "model": model,
            "messages": payload_messages,
            "stream": True,
            "temperature": 0.7
        }
        accum = []
        try:
            async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
                async with client.stream("POST", f"{self.lm_studio_url}/chat/completions", json=payload) as response:
                    if response.status_code != 200:
                        yield {"type": "token", "content": f"❌ LM Studio Error: {await response.aread()}"}
                        yield {"type": "done", "content": ""}
                        return
                    async for line in response.aiter_lines():
                        if not line or not line.startswith("data: "):
                            continue
                        raw = line[6:].strip()
                        if raw == "[DONE]":
                            full_res = "".join(accum)
                            if query and full_res:
                                asyncio.create_task(semantic_cache.store(query, full_res, model_tier=tier))
                            yield {"type": "done", "content": ""}
                            break
                        try:
                            data = json.loads(raw)
                            delta = data.get("choices", [{}])[0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                accum.append(content)
                                yield {"type": "token", "content": content}
                        except json.JSONDecodeError:
                            continue
        except Exception as e:
            yield {"type": "token", "content": f"\n❌ [LM Studio 통신 오류]: {str(e)}"}
            yield {"type": "done", "content": ""}

    async def generate_single(self, model: str, messages: list, system_prompt: Optional[str] = None, agent_role: str = "") -> str:
        full_content = ""
        async for chunk in self.stream_chat(model, messages, system_prompt, agent_role=agent_role):
            if chunk["type"] == "token":
                full_content += chunk["content"]
        return full_content

    async def chat_completion(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Convenience method for non-streaming chat completions."""
        model = payload.get("model", "deepseek-r1:latest")
        messages = payload.get("messages", [])
        system_prompt = None
        user_msgs = []
        for m in messages:
            if m.get("role") == "system":
                system_prompt = m.get("content")
            else:
                user_msgs.append(m)
        content = await self.generate_single(model, user_msgs, system_prompt=system_prompt)
        return {
            "message": {"role": "assistant", "content": content}
        }

# Compatibility Alias & Singleton
OllamaClient = LocalAIClient
local_ai_client = LocalAIClient()
ollama_client = local_ai_client


