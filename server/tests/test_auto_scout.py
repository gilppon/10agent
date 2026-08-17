import os
import sys
import pytest
import asyncio
from fastapi.testclient import TestClient

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from server.database import init_db
from server.services.knowledge_service import knowledge_service
from server.main import app

@pytest.mark.asyncio
async def test_auto_scout_engine():
    print("==================================================")
    print("⏰ [하네스 검증] 10대 에이전트 자율 지식 스카우트 엔진 테스트")
    print("==================================================")
    
    await init_db()
    
    # 1. Test single agent auto scout (developer)
    res = await knowledge_service.auto_scout_and_ingest(target_agent_id="developer")
    print(f"  - 스카우트 상태: {res['status']}")
    print(f"  - 신규 생성 청크: {res['total_new_chunks']}개")
    print(f"  - 업데이트된 에이전트 수: {res['agents_updated_count']}개")
    
    assert res["status"] == "success"
    assert res["agents_updated_count"] >= 1
    assert res["total_new_chunks"] >= 1
    print("  ✅ [PASS] 개발자(developer) 최신 웹 지식 자율 수집 및 RAG DB 주입 성공!")

def test_auto_scout_api_endpoints():
    print("==================================================")
    print("🌐 [하네스 검증] Auto-Scout REST API 및 스케줄러 토글 테스트")
    print("==================================================")
    
    client = TestClient(app)
    
    # 1. Test status API
    status_resp = client.get("/api/knowledge/auto-scout/status")
    assert status_resp.status_code == 200
    s_data = status_resp.json()
    assert "schedule" in s_data
    assert "enabled" in s_data
    print(f"  - 스케줄러 정보: {s_data['schedule']}, 활성화 상태: {s_data['enabled']}")
    
    # 2. Test toggle API
    toggle_resp = client.post("/api/knowledge/auto-scout/toggle", json={"enabled": False})
    assert toggle_resp.status_code == 200
    assert toggle_resp.json()["enabled"] is False
    
    toggle_resp2 = client.post("/api/knowledge/auto-scout/toggle", json={"enabled": True})
    assert toggle_resp2.status_code == 200
    assert toggle_resp2.json()["enabled"] is True
    print("  ✅ [PASS] Auto-Scout 스케줄러 토글 API 정상 작동 확인 완료!")

if __name__ == "__main__":
    asyncio.run(test_auto_scout_engine())
    test_auto_scout_api_endpoints()
