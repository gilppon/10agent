import os
import sys
import pytest
import asyncio
from fastapi.testclient import TestClient

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from server.database import init_db
from server.services.telegram_service import telegram_service
from server.main import app

@pytest.mark.asyncio
async def test_telegram_hot_ideas_scout():
    print("==================================================")
    print("📱 [하네스 검증] 텔레그램 자율 핫 아이템 발굴 엔진 테스트")
    print("==================================================")
    
    await init_db()
    ideas = await telegram_service.scout_hot_ideas()
    
    print(f"  - 발굴된 아이템 수: {len(ideas)}개")
    for idx, item in enumerate(ideas):
        print(f"    [{idx+1}] {item['title']} (타겟: {item['target']})")
        assert "title" in item
        assert "desc" in item
        assert "target" in item
        assert "pricing" in item
    
    assert len(ideas) >= 3
    print("  ✅ [PASS] 핫 SaaS 아이템 3종 발굴 데이터 구조 검증 완료!")

@pytest.mark.asyncio
async def test_telegram_config_and_db_persistence():
    print("==================================================")
    print("💾 [하네스 검증] 텔레그램 봇 토큰 DB 저장 및 로드 테스트")
    print("==================================================")
    
    await init_db()
    test_token = "1234567890:TEST_TOKEN_FOR_TESTING"
    test_chat_id = "987654321"
    
    await telegram_service.save_config_to_db(test_token, test_chat_id)
    await telegram_service.load_config_from_db()
    
    cfg = telegram_service.get_config()
    assert cfg["bot_token"] == test_token
    assert cfg["chat_id"] == test_chat_id
    assert cfg["is_configured"] is True
    print("  ✅ [PASS] 텔레그램 설정 영구 저장 및 무결성 검증 완료!")

def test_telegram_api_endpoints():
    print("==================================================")
    print("🌐 [하네스 검증] Telegram REST API 엔드포인트 테스트")
    print("==================================================")
    
    client = TestClient(app)
    
    # 1. Config GET
    get_res = client.get("/api/telegram/config")
    assert get_res.status_code == 200
    assert "bot_token" in get_res.json()
    
    # 2. Config POST
    post_res = client.post("/api/telegram/config", json={
        "bot_token": "99999999:MOCK_TOKEN",
        "chat_id": "111222333"
    })
    assert post_res.status_code == 200
    assert post_res.json()["config"]["bot_token"] == "99999999:MOCK_TOKEN"
    print("  ✅ [PASS] 텔레그램 REST API 정상 응답 확인 완료!")

if __name__ == "__main__":
    asyncio.run(test_telegram_hot_ideas_scout())
    asyncio.run(test_telegram_config_and_db_persistence())
    test_telegram_api_endpoints()
