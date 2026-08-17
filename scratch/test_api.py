import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import asyncio
import httpx
from server.main import app
from server.database import init_db

async def run_test():
    await init_db()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        r1 = await client.get("/api/agents")
        print("1. AGENTS API:", r1.status_code, "Count:", len(r1.json().get("agents", [])))
        
        r2 = await client.get("/api/models")
        print("2. MODELS API:", r2.status_code, "Status:", r2.json().get("status"), "Models Count:", len(r2.json().get("models", [])))
        print("   Backends:", r2.json().get("backends"))
        
        r3 = await client.get("/api/sessions")
        print("3. SESSIONS API:", r3.status_code, "Sessions Count:", len(r3.json().get("sessions", [])))

if __name__ == "__main__":
    asyncio.run(run_test())
