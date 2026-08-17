import pytest
import asyncio
from server.services.agent_manager import AgentManager, DEFAULT_AGENTS
from server.models.schemas import AgentBase
from server.services.orchestrator import MultiAgentOrchestrator
from server.services.ollama_client import OllamaClient
from server.services.file_service import FileService
from server.database import init_db, get_db

@pytest.mark.asyncio
async def test_agent_manager_system_prompt_isolation():
    agent_mgr = AgentManager()
    
    # Check CEO prompt
    ceo_agent = AgentBase(**DEFAULT_AGENTS["ceo"])
    ceo_prompt = agent_mgr.build_system_prompt(ceo_agent)
    assert "### 🧭 CEO (Chief Executive Agent) 관점:" in ceo_prompt
    assert "안녕하십니까, 프로젝트 총괄을 지휘하는 CEO입니다." in ceo_prompt
    assert "Adaptive Language Mirroring & Zero-Bleeding" in ceo_prompt
    assert "Anti-Robot Openers" in ceo_prompt
    
    # Check YouTube (Leo) prompt
    leo_agent = AgentBase(**DEFAULT_AGENTS["youtube"])
    leo_prompt = agent_mgr.build_system_prompt(leo_agent)
    assert "### 📺 레오 (Head of YouTube) 관점:" in leo_prompt
    assert "대표님, 유튜브 디렉터 레오입니다!" in leo_prompt
    assert "NEVER act as, introduce yourself as, or mimic other agents" in leo_prompt
    assert "Specialty: 유튜브 채널 운영" in leo_prompt

    # Check Developer (Kodari) prompt
    dev_agent = AgentBase(**DEFAULT_AGENTS["developer"])
    dev_prompt = agent_mgr.build_system_prompt(dev_agent)
    assert "### 💻 코다리 (시니어 풀스택 엔지니어) 관점:" in dev_prompt
    assert "충성! 대표님, 시니어 풀스택 엔지니어 코다리 부장입니다!" in dev_prompt

@pytest.mark.asyncio
async def test_session_history_context_firewall():
    await init_db()
    
    ollama = OllamaClient()
    agent_mgr = AgentManager()
    file_svc = FileService()
    orchestrator = MultiAgentOrchestrator(ollama, agent_mgr, file_svc)
    
    import uuid
    session_id = f"test_firewall_{uuid.uuid4().hex}"
    
    # Insert simulated conversation
    await orchestrator.save_message(session_id, "user", "우리 프로젝트 어떻게 검수하고 홍보할까?")
    await orchestrator.save_message(session_id, "assistant", "### 🧭 CEO 종합 판단 로드맵...", agent_id="ceo")
    
    # 1. Fetch history from Leo's perspective (agent_id = 'youtube')
    leo_history = await orchestrator.get_session_history_for_agent(session_id, current_agent_id="youtube")
    
    assert len(leo_history) == 2
    assert leo_history[0]["role"] == "user"
    # CEO's message should be wrapped as a user reference block, NOT as an assistant message
    assert leo_history[1]["role"] == "user"
    assert "[📜 동료 에이전트 (ceo)의 이전 발언 기록]:" in leo_history[1]["content"]
    assert "CEO 종합 판단 로드맵" in leo_history[1]["content"]
    
    # 2. Fetch history from CEO's perspective (agent_id = 'ceo')
    ceo_history = await orchestrator.get_session_history_for_agent(session_id, current_agent_id="ceo")
    assert ceo_history[1]["role"] == "assistant"
    assert ceo_history[1]["content"] == "### 🧭 CEO 종합 판단 로드맵..."

@pytest.mark.asyncio
async def test_roundtable_zero_echo_firewall_prompt_structure():
    """Verify that roundtable prompt does not leak prior speaker text to subsequent agents."""
    agent_mgr = AgentManager()
    designer = await agent_mgr.get_agent("designer")
    developer = await agent_mgr.get_agent("developer")
    
    prompt_designer = agent_mgr.build_system_prompt(designer)
    prompt_developer = agent_mgr.build_system_prompt(developer)
    
    assert "민희" in prompt_designer
    assert "코다리" not in prompt_designer
    assert "코다리" in prompt_developer
    assert "민희" not in prompt_developer
