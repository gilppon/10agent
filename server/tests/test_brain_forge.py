import pytest
from server.services.brain_forge import brain_forge_service, BRAIN_SPECS

@pytest.mark.asyncio
async def test_sovereign_master_brain_forge_status():
    status = await brain_forge_service.get_brain_status()
    assert len(status) == 1
    master_brain = status[0]
    assert master_brain["id"] == "sovereign_master"
    assert master_brain["brain_name"] == "sovereign-master:7b"
    assert len(master_brain["assigned_agents"]) == 10
    assert "RTX 4050" in master_brain["vram_usage"]

def test_generate_modelfile():
    modelfile = brain_forge_service.generate_modelfile("sovereign_master", ["TDD 원칙 준수", "8px 그리드 적용"])
    assert "FROM qwen2.5-coder:7b" in modelfile
    assert "PARAMETER temperature 0.3" in modelfile
    assert "TDD 원칙 준수" in modelfile
    assert "sovereign-master-7b" in modelfile

@pytest.mark.asyncio
async def test_brain_forge_build():
    res = await brain_forge_service.build_brain("sovereign_master")
    assert "success" in res
    assert res["brain_id"] == "sovereign_master"
