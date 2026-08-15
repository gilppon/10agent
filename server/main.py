import os
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from server.config import HOST, PORT, ARTIFACTS_DIR
from server.database import init_db, get_db
from server.models.schemas import (
    AgentBase, AgentUpdate, ChatRequest, RoundtableRequest, PipelineRequest
)
from server.services.ollama_client import OllamaClient
from server.services.agent_manager import AgentManager
from server.services.file_service import FileService
from server.services.orchestrator import MultiAgentOrchestrator

# Initialize Services
ollama_client = OllamaClient()
agent_manager = AgentManager()
file_service = FileService()
orchestrator = MultiAgentOrchestrator(ollama_client, agent_manager, file_service)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Database
    await init_db()
    print("🚀 [Next-Agent Engine] SQLite Database Initialized & Server Ready.")
    yield
    print("🛑 [Next-Agent Engine] Shutting down.")

app = FastAPI(
    title="Next-Agent Standalone Local Orchestrator",
    description="100% Zero-Cost Multi-Agent Local AI Engine powered by Ollama",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration for local frontend (Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Agent Management API ---

@app.get("/api/agents")
async def list_agents():
    agents = await agent_manager.get_all_agents()
    return {"agents": [a.model_dump() for a in agents]}

@app.get("/api/agents/{agent_id}")
async def get_agent(agent_id: str):
    agent = await agent_manager.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent.model_dump()

@app.post("/api/agents")
async def create_or_update_agent(agent: AgentBase):
    await agent_manager.save_or_update_agent(agent)
    return {"status": "success", "agent": agent.model_dump()}

@app.post("/api/agents/{agent_id}/model")
async def update_agent_model(agent_id: str, payload: dict):
    model_name = payload.get("model")
    if not model_name:
        raise HTTPException(status_code=400, detail="Model name is required")
    await agent_manager.update_agent_model(agent_id, model_name)
    return {"status": "success", "agent_id": agent_id, "model": model_name}

# --- Ollama Models API ---

@app.get("/api/models")
async def list_models():
    is_healthy = await ollama_client.check_health()
    models = await ollama_client.list_models()
    return {
        "status": "online" if is_healthy else "offline",
        "models": models,
        "base_url": ollama_client.base_url
    }

# --- Chat & Streaming API ---

@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest):
    return StreamingResponse(
        orchestrator.stream_agent_chat(
            session_id=req.session_id,
            agent_id=req.agent_id,
            user_message=req.message,
            override_model=req.override_model
        ),
        media_type="text/event-stream"
    )

@app.post("/api/roundtable/stream")
async def roundtable_stream(req: RoundtableRequest):
    return StreamingResponse(
        orchestrator.stream_roundtable(
            session_id=req.session_id,
            topic=req.topic,
            agent_ids=req.agent_ids
        ),
        media_type="text/event-stream"
    )

@app.post("/api/pipeline/stream")
async def pipeline_stream(req: PipelineRequest):
    return StreamingResponse(
        orchestrator.execute_pipeline(
            session_id=req.session_id,
            pipeline_type=req.pipeline_type,
            prompt=req.prompt
        ),
        media_type="text/event-stream"
    )

# --- Sessions & History API ---

@app.get("/api/sessions")
async def get_sessions():
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM sessions ORDER BY updated_at DESC")
        rows = await cursor.fetchall()
        return {"sessions": [dict(r) for r in rows]}
    finally:
        await db.close()

@app.post("/api/sessions")
async def create_session(payload: dict):
    title = payload.get("title", "새 대화 세션")
    sid = str(uuid.uuid4())
    db = await get_db()
    try:
        await db.execute("INSERT INTO sessions (id, title) VALUES (?, ?)", (sid, title))
        await db.commit()
        return {"id": sid, "title": title}
    finally:
        await db.close()

@app.get("/api/sessions/{session_id}/messages")
async def get_session_messages(session_id: str):
    db = await get_db()
    try:
        cursor = await db.execute("""
            SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC
        """, (session_id,))
        rows = await cursor.fetchall()
        return {"messages": [dict(r) for r in rows]}
    finally:
        await db.close()

# --- Artifacts & Workspace Files API ---

@app.get("/api/artifacts")
async def get_artifacts():
    files = file_service.list_artifacts()
    return {"artifacts": [f.model_dump() for f in files]}

@app.get("/api/artifacts/{file_path:path}")
async def read_artifact(file_path: str):
    target = ARTIFACTS_DIR / file_path
    if not target.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # If text/markdown, return json content
    ext = target.suffix.lower()
    if ext in [".md", ".txt", ".json", ".js", ".ts", ".py", ".html", ".css"]:
        content = file_service.read_artifact(file_path)
        return {"name": target.name, "path": file_path, "content": content}
    
    # Binary download
    return FileResponse(path=str(target), filename=target.name)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server.main:app", host=HOST, port=PORT, reload=True)
