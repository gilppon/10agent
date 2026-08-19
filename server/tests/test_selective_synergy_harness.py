import pytest
from server.services.agent_manager import AgentManager, DEFAULT_AGENTS

@pytest.mark.asyncio
async def test_agent_manager_selective_synergy_prompts():
    manager = AgentManager()
    agents = await manager.get_all_agents()
    agent_map = {a.id: a for a in agents}

    # 1. Verify CEO has CTO Architect synergy
    ceo = agent_map.get("ceo")
    assert ceo is not None
    assert "CTO Architect" in ceo.specialty or "거시 시스템 아키텍처" in ceo.specialty
    ceo_prompt = manager.build_system_prompt(ceo)
    assert "3대 하네스 거버넌스" in ceo_prompt
    assert "Circuit Breaker" in ceo_prompt

    # 2. Verify Designer (민희) has 2026 Spatial UI synergy
    designer = agent_map.get("designer")
    assert designer is not None
    assert "2026 Spatial UI" in designer.specialty
    assert "Z-Axis" in designer.specialty
    designer_prompt = manager.build_system_prompt(designer)
    assert "Z-Axis" in designer_prompt or "Spatial" in designer_prompt

    # 3. Verify Developer (코다리) has QA, Security, DBA, Harness synergy
    developer = agent_map.get("developer")
    assert developer is not None
    assert "TDD 무결성(QA)" in developer.specialty
    assert "보안 취약점 감사(Security)" in developer.specialty
    assert "DB 인덱스/쿼리 최적화(DBA)" in developer.specialty
    assert "PMO 하네스" in developer.specialty
    dev_prompt = manager.build_system_prompt(developer)
    assert "충성! 대표님" in dev_prompt
    assert "Verification Gate" in dev_prompt

    # 4. Verify Marketing agents preserve pure creative persona without engineering contamination
    youtube = agent_map.get("youtube")
    assert youtube is not None
    assert "3초 안에 시청자를 사로잡는" in manager.build_system_prompt(youtube)

    writer = agent_map.get("writer")
    assert writer is not None
    assert "AIDA" in writer.specialty
