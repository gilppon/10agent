import os
import sys
import pytest
import asyncio
import json

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from server.database import init_db
from server.services.agent_manager import AgentManager
from server.services.ollama_client import LocalAIClient
from server.services.file_service import FileService
from server.services.orchestrator import MultiAgentOrchestrator

@pytest.mark.asyncio
async def test_pipeline_configs_and_stages():
    print("==================================================")
    print("🚀 [하네스 검증] 10대 에이전트 올인원 풀 라이프사이클 파이프라인 테스트")
    print("==================================================")
    
    await init_db()
    ollama = LocalAIClient()
    agent_mgr = AgentManager()
    file_svc = FileService()
    orchestrator = MultiAgentOrchestrator(ollama, agent_mgr, file_svc)
    
    session_id = "test_pipeline_session"
    prompt = "2026 AI 자동화 마케팅 SaaS 제품"
    
    # Check that full_cycle pipeline is properly registered with 10 stages
    stream_gen = orchestrator.execute_pipeline(session_id, "full_cycle", prompt)
    first_event = await anext(stream_gen)
    
    data = json.loads(first_event.replace("data: ", "").strip())
    print(f"  - 파이프라인 타이틀: {data.get('title')}")
    print(f"  - 총 릴레이 스테이지 수: {data.get('stages_count')}단계")
    
    assert data["type"] == "pipeline_start"
    assert data["stages_count"] == 10
    assert "올인원 풀 라이프사이클" in data["title"]
    print("  ✅ [PASS] 10대 에이전트 올인원 풀사이클(정우 ➡️ CEO ➡️ 민희 ➡️ 코다리 ➡️ 레오 ➡️ 루나 ➡️ 찬우 ➡️ 지은 ➡️ 현빈 ➡️ 영숙) 정상 등록 검증 완료!")

if __name__ == "__main__":
    asyncio.run(test_pipeline_configs_and_stages())

