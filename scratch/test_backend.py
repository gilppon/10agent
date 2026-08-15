import sys
from pathlib import Path

# Fix Windows console encoding
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import asyncio
from server.database import init_db
from server.services.agent_manager import AgentManager
from server.services.file_service import FileService

async def test_backend():
    print("[TEST] Testing DB and Services initialization...")
    await init_db()
    
    agent_mgr = AgentManager()
    agents = await agent_mgr.get_all_agents()
    print(f"[OK] Loaded {len(agents)} agents successfully:")
    for a in agents:
        print(f"   [{a.emoji}] {a.name} ({a.role}) -> Model: {a.model}")
        
    file_svc = FileService()
    test_path = file_svc.save_artifact("welcome.md", "# Welcome to Next-Agent Standalone Engine!\n\n100% Zero-Cost Local AI.")
    print(f"[OK] Artifact created: {test_path}")
    
    artifacts = file_svc.list_artifacts()
    print(f"[OK] Artifacts listed: {len(artifacts)} files found.")
    
    print("\n[SUCCESS] All backend unit checks passed successfully!")

if __name__ == "__main__":
    asyncio.run(test_backend())
