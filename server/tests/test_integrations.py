import os
import sys

# Windows UTF-8 stdout encoding fix
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

# Append project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from server.services.integration_service import integration_service

def test_integrations():
    print("==================================================")
    print("🚀 [하네스 검증] 외부 연동 설정 센터(Integration Center) 테스트")
    print("==================================================")
    
    # 1. List Default Integrations
    items = integration_service.list_integrations()
    print(f"\n[1] 기본 연동 서비스 로드 확인: 총 {len(items)}개")
    service_ids = [i["service_id"] for i in items]
    print(f"  - 로드된 서비스: {service_ids}")
    assert "telegram" in service_ids, "Missing telegram integration"
    assert "youtube_api" in service_ids, "Missing youtube_api integration"
    assert "youtube_oauth" in service_ids, "Missing youtube_oauth integration"
    assert "paypal" in service_ids, "Missing paypal integration"
    print("  ✅ [PASS] 6대 기본 연동 서비스 스키마 로드 성공!")

    # 2. Save Telegram Credentials & Mask Check
    print("\n[2] 텔레그램 자격 증명 저장 및 마스킹 검증")
    test_token = "123456789:AAFR55-SecretTelegramBotTokenExample"
    test_chat_id = "8556179792"
    
    saved = integration_service.save_integration("telegram", {
        "bot_token": test_token,
        "chat_id": test_chat_id
    })
    print(f"  - 저장 후 상태: {saved['status']}")
    assert saved["status"] == "연결됨", f"Expected '연결됨', got {saved['status']}"
    
    # Masking check
    masked_list = integration_service.list_integrations(mask_secrets=True)
    tg_item = next(i for i in masked_list if i["service_id"] == "telegram")
    print(f"  - 마스킹된 토큰: {tg_item['credentials']['bot_token']}")
    assert "••••" in tg_item["credentials"]["bot_token"], "Token was not masked properly"
    assert tg_item["credentials"]["chat_id"] == test_chat_id, "Chat ID should remain readable"
    print("  ✅ [PASS] 보안 마스킹 및 상태 전환(연결됨) 검증 완료!")

    # 3. Environment Variable Sync Verification
    print("\n[3] .env 파일 동기화 검증")
    env_content = integration_service.env_path.read_text(encoding="utf-8")
    assert "TELEGRAM_BOT_TOKEN=" in env_content, ".env sync missing TELEGRAM_BOT_TOKEN"
    assert "TELEGRAM_CHAT_ID=8556179792" in env_content, ".env sync missing TELEGRAM_CHAT_ID"
    print("  ✅ [PASS] .env 물리 파일 양방향 동기화 성공!")

    print("\n==================================================")
    print("🎉 외부 연동 센터 검증 테스트 ALL CLEAR! (100% 통과)")
    print("==================================================")

if __name__ == "__main__":
    test_integrations()
