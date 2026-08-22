import pytest
import aiosqlite
from httpx import AsyncClient, ASGITransport
from server.main import app
from server.database import init_db, get_db
from server.services.pet_brain import PetBrainEngine

def test_pet_brain_exp_calculation():
    """피딩 텍스트 길이 및 파일 첨부에 따른 EXP 계산 검증"""
    # 1. 짧은 텍스트 (최소 10 EXP)
    exp_short = PetBrainEngine.calculate_feed_exp("안녕")
    assert exp_short >= 10

    # 2. 긴 텍스트 (최대 60 EXP 상한)
    exp_long = PetBrainEngine.calculate_feed_exp("A" * 1000)
    assert exp_long == 60

    # 3. 파일 첨부 보너스 (+10 EXP)
    exp_file = PetBrainEngine.calculate_feed_exp("API 명세서 내용입니다.", file_name="api_spec.md")
    assert exp_file > 10

def test_pet_growth_and_evolution():
    """레벨업 및 성장 단계(infant -> growth -> master) 진화 검증"""
    # 1. 초기 아기 단계
    growth1 = PetBrainEngine.calculate_growth(current_level=1, current_exp=20, gained_exp=30)
    assert growth1["level"] == 1
    assert growth1["exp"] == 50
    assert growth1["stage"] == "infant"
    assert not growth1["level_up"]

    # 2. 1회 레벨업 (Lv.1 -> Lv.2)
    growth2 = PetBrainEngine.calculate_growth(current_level=1, current_exp=80, gained_exp=50)
    assert growth2["level"] == 2
    assert growth2["exp"] == 30
    assert growth2["stage"] == "infant"
    assert growth2["level_up"]

    # 3. 성장기 단계 진화 (Lv.6)
    growth3 = PetBrainEngine.calculate_growth(current_level=5, current_exp=450, gained_exp=100)
    assert growth3["level"] >= 6
    assert growth3["stage"] == "growth"

    # 4. 마스터 파트너 진화 (Lv.21+)
    growth4 = PetBrainEngine.calculate_growth(current_level=20, current_exp=1950, gained_exp=200)
    assert growth4["level"] >= 21
    assert growth4["stage"] == "master"

def test_pet_system_prompt_builder():
    """종족 및 레벨 단계별 시스템 프롬프트 조립 검증"""
    # Dog Infant
    prompt_dog = PetBrainEngine.build_system_prompt(pet_type="dog", level=3, stage="infant", memories="테스트 지식", name="뽀삐")
    assert "뽀삐" in prompt_dog
    assert "반려견" in prompt_dog
    assert "아기" in prompt_dog
    assert "~멍" in prompt_dog
    assert "테스트 지식" in prompt_dog

    # Cat Master
    prompt_cat = PetBrainEngine.build_system_prompt(pet_type="cat", level=22, stage="master", memories="고급 아키텍처", name="나비")
    assert "나비" in prompt_cat
    assert "반려묘" in prompt_cat
    assert "마스터" in prompt_cat
    assert "10대 에이전트" in prompt_cat
    assert "고급 아키텍처" in prompt_cat

@pytest.mark.asyncio
async def test_pet_api_e2e_flow():
    """FastAPI 엔드포인트 E2E 연동 검증 (/status, /feed, /switch-type, /reset)"""
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Reset
        reset_res = await client.post("/api/pet/reset")
        assert reset_res.status_code == 200

        # 2. Status 조회
        status_res = await client.get("/api/pet/status")
        assert status_res.status_code == 200
        data = status_res.json()
        assert data["level"] == 1
        assert data["growth_stage"] == "infant"
        assert data["pet_type"] == "dog"

        # 3. Feeding
        feed_res = await client.post("/api/pet/feed", json={
            "text": "FastAPI와 Tauri를 연동한 초경량 데스크톱 위젯 개발 가이드입니다.",
            "source": "drag_drop",
            "file_name": "guide.md"
        })
        assert feed_res.status_code == 200
        feed_data = feed_res.json()
        assert feed_data["status"] == "success"
        assert feed_data["gained_exp"] > 0
        assert feed_data["knowledge_chunks_stored"] >= 1

        # 4. Switch Type (Cat)
        switch_res = await client.post("/api/pet/switch-type", json={
            "pet_type": "cat",
            "name": "나비"
        })
        assert switch_res.status_code == 200
        assert switch_res.json()["pet_type"] == "cat"
        assert switch_res.json()["name"] == "나비"

        # 5. Status 재확인
        status_res2 = await client.get("/api/pet/status")
        data2 = status_res2.json()
        assert data2["pet_type"] == "cat"
        assert data2["name"] == "나비"
        assert data2["total_fed_count"] == 1
