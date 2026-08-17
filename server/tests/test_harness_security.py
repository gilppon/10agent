import pytest
from pathlib import Path
from server.services.file_service import FileService, FileSecurityException
from server.services.orchestrator import MultiAgentOrchestrator
from server.services.mcp_client import MCPClientManager, MCPServerConfig

def test_file_service_path_traversal_guard(tmp_path):
    artifacts_dir = tmp_path / "artifacts"
    app_build_dir = tmp_path / "app_build"
    fs = FileService(artifacts_dir=artifacts_dir, app_build_dir=app_build_dir)

    # 1. Normal save should succeed
    saved_path = fs.save_artifact("test.md", "Hello World", subfolder="sub")
    assert "test.md" in saved_path
    assert (artifacts_dir / "sub" / "test.md").exists()

    # 2. Path Traversal filename attack should be blocked
    with pytest.raises(FileSecurityException):
        fs.save_artifact("../../../evil.py", "malicious content")

    # 3. Path Traversal subfolder attack should be blocked
    with pytest.raises(FileSecurityException):
        fs.save_artifact("evil.py", "malicious content", subfolder="../../..")

def test_file_service_verification_gate(tmp_path):
    fs = FileService(artifacts_dir=tmp_path / "artifacts", app_build_dir=tmp_path / "app_build")

    # Valid HTML
    valid_res = fs.validate_html_js_integrity("<html><body><h1>Hello</h1></body></html>", "console.log('hi');")
    assert valid_res["is_valid"] is True
    assert valid_res["score"] == 100
    assert len(valid_res["errors"]) == 0

    # Incomplete HTML
    invalid_html = fs.validate_html_js_integrity("<html><body><h1>Hello</h1>", "")
    assert invalid_html["is_valid"] is False
    assert invalid_html["score"] < 100
    assert len(invalid_html["errors"]) > 0

    # Dangerous JS infinite loop
    loop_res = fs.validate_html_js_integrity("<div>test</div>", "while(true) { let a = 1; }")
    assert loop_res["is_valid"] is False
    assert any("infinite loop" in w for w in loop_res["errors"])

def test_orchestrator_sliding_window():
    class DummyOllama:
        pass
    class DummyAgentMgr:
        pass
    class DummyFileSvc:
        pass

    orch = MultiAgentOrchestrator(
        ollama_client=DummyOllama(),
        agent_manager=DummyAgentMgr(),
        file_service=DummyFileSvc()
    )

    # Create 10 dummy messages with 100 chars each = 1,000 chars total
    messages = [{"role": "user" if i % 2 == 0 else "assistant", "content": f"Message {i}: " + ("x" * 90)} for i in range(10)]
    
    # If max_chars is 450, it should only retain the newest ~4 messages
    trimmed = orch._trim_history_to_token_limit(messages, max_chars=450)
    assert len(trimmed) < len(messages)
    assert trimmed[-1]["content"] == messages[-1]["content"]
    assert sum(len(m["content"]) for m in trimmed) <= 450 or len(trimmed) == 2

def test_mcp_client_formatting():
    mgr = MCPClientManager()
    sample_result = {
        "content": [
            {"type": "text", "text": "Stripe Balance: $12,450.00 USD (Active)"}
        ]
    }
    formatted = mgr.format_mcp_results_for_prompt("get_balance", sample_result)
    assert "표준 MCP 도구 실시간 조회 결과" in formatted
    assert "$12,450.00 USD" in formatted
