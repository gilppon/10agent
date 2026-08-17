import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import asyncio
from server.services.ollama_client import LocalAIClient

async def test_dual_streaming():
    client = LocalAIClient()
    backends = await client.detect_backends()
    print("Backends:", backends)

    # 1. LM Studio 모델 테스트
    print("\n--- [1. LM Studio 모델 스트리밍 테스트 (qwen3.5-9b-uncensored)] ---")
    async for chunk in client.stream_chat(
        model="qwen3.5-9b-uncensored-hauhaucs-aggressive",
        messages=[{"role": "user", "content": "1줄로 인사해줘"}]
    ):
        if chunk["type"] == "token":
            print(chunk["content"], end="", flush=True)

    # 2. Ollama 모델 테스트
    print("\n\n--- [2. Ollama 모델 스트리밍 테스트 (qwen2.5-coder:14b)] ---")
    async for chunk in client.stream_chat(
        model="qwen2.5-coder:14b",
        messages=[{"role": "user", "content": "1줄로 인사해줘"}]
    ):
        if chunk["type"] == "token":
            print(chunk["content"], end="", flush=True)

    print("\n\n=== [테스트 완료] ===")

if __name__ == "__main__":
    asyncio.run(test_dual_streaming())
