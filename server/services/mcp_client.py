import json
import httpx
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

class MCPToolDefinition(BaseModel):
    name: str
    description: str
    input_schema: Dict[str, Any] = {}
    server_id: str = ""

class MCPServerConfig(BaseModel):
    id: str
    name: str
    url: str
    api_key: Optional[str] = None
    enabled: bool = True
    timeout: float = 10.0

class MCPClientManager:
    """
    Lightweight Server-Side Hybrid MCP (Model Context Protocol) Client Adapter.
    Executes standard MCP JSON-RPC 2.0 tools on the backend and injects plain-text facts
    into local SLMs, shielding small models (3B~7B) from complex Function Calling errors.
    """
    def __init__(self):
        self.servers: Dict[str, MCPServerConfig] = {}

    def register_server(self, config: MCPServerConfig):
        self.servers[config.id] = config

    def unregister_server(self, server_id: str):
        if server_id in self.servers:
            del self.servers[server_id]

    async def list_tools(self, server_id: str) -> List[MCPToolDefinition]:
        """Queries tools/list endpoint via JSON-RPC 2.0."""
        server = self.servers.get(server_id)
        if not server or not server.enabled:
            return []

        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/list",
            "params": {}
        }
        headers = {"Content-Type": "application/json"}
        if server.api_key:
            headers["Authorization"] = f"Bearer {server.api_key}"

        try:
            async with httpx.AsyncClient(timeout=server.timeout) as client:
                res = await client.post(server.url, json=payload, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    tools_raw = data.get("result", {}).get("tools", [])
                    return [
                        MCPToolDefinition(
                            name=t.get("name", ""),
                            description=t.get("description", ""),
                            input_schema=t.get("inputSchema", {}),
                            server_id=server.id
                        )
                        for t in tools_raw
                    ]
        except Exception as e:
            print(f"[MCPClient] list_tools error for {server_id}: {e}")
        return []

    async def call_tool(
        self,
        server_id: str,
        tool_name: str,
        arguments: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Executes tools/call endpoint via JSON-RPC 2.0."""
        server = self.servers.get(server_id)
        if not server or not server.enabled:
            return {"error": f"MCP Server '{server_id}' is not registered or disabled."}

        payload = {
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments
            }
        }
        headers = {"Content-Type": "application/json"}
        if server.api_key:
            headers["Authorization"] = f"Bearer {server.api_key}"

        try:
            async with httpx.AsyncClient(timeout=server.timeout) as client:
                res = await client.post(server.url, json=payload, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    if "error" in data:
                        return {"error": data["error"]}
                    return data.get("result", {})
                return {"error": f"HTTP {res.status_code}: {res.text[:200]}"}
        except Exception as e:
            return {"error": f"MCP connection failed: {str(e)}"}

    def format_mcp_results_for_prompt(
        self,
        tool_name: str,
        result: Dict[str, Any],
        max_length: int = 1500
    ) -> str:
        """
        Formats MCP execution results into a clean markdown reference block
        for zero-overhead local LLM ingestion.
        """
        content_items = result.get("content", [])
        extracted_texts = []
        
        for item in content_items:
            if isinstance(item, dict) and item.get("type") == "text":
                extracted_texts.append(item.get("text", ""))
            elif isinstance(item, str):
                extracted_texts.append(item)

        raw_text = "\n".join(extracted_texts) if extracted_texts else json.dumps(result, ensure_ascii=False)
        truncated_text = raw_text[:max_length] + ("..." if len(raw_text) > max_length else "")

        return (
            f"### 🔌 [표준 MCP 도구 실시간 조회 결과 ({tool_name})]:\n"
            f"```text\n{truncated_text}\n```\n"
            f"👉 위 MCP 도구 실행 결과 데이터를 바탕으로 정밀하게 답변하십시오."
        )

# Global Singleton Instance
mcp_client = MCPClientManager()
