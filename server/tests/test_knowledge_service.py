import os
import sys
import pytest

# Windows UTF-8 stdout encoding fix
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

# Append project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from server.database import init_db
from server.services.knowledge_service import knowledge_service

@pytest.mark.asyncio
async def test_knowledge_presets():
    await init_db()
    dev_presets = knowledge_service.get_presets("developer")
    assert len(dev_presets) >= 2
    assert any("FastAPI" in p["title"] or "Next.js" in p["title"] for p in dev_presets)

    des_presets = knowledge_service.get_presets("designer")
    assert any("Tailwind" in p["title"] or "Shadcn" in p["title"] for p in des_presets)

@pytest.mark.asyncio
async def test_ingest_and_retrieve_knowledge():
    await init_db()
    # 1. Ingest sample knowledge
    ingest_res = await knowledge_service.ingest_knowledge(
        agent_id="developer",
        query_or_url="FastAPI 공식 /llms.txt"
    )
    assert ingest_res["status"] == "success"
    assert ingest_res["agent_id"] == "developer"
    assert ingest_res["chunks_count"] > 0

    # 2. List knowledge
    doc_list = await knowledge_service.list_knowledge("developer")
    assert len(doc_list) > 0
    assert any("fastapi" in d["title"].lower() or "llms" in d["title"].lower() for d in doc_list)

    # 3. Retrieve relevant knowledge
    rag_context = await knowledge_service.retrieve_relevant_knowledge("developer", "FastAPI routing and APIRouter")
    assert "전문 지식 베이스" in rag_context
    assert len(rag_context) > 100

    # 4. Clean up / delete
    first_title = doc_list[0]["title"]
    deleted = await knowledge_service.delete_knowledge_by_title("developer", first_title)
    assert deleted > 0
