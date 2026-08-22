import os
import sys
import uuid
import subprocess
from pathlib import Path
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
from server.services.telegram_service import telegram_service
from server.services.brain_forge import brain_forge_service
from server.services.model_merger import model_merger_service
from server.routers.pet import router as pet_router

# Initialize Services
ollama_client = OllamaClient()
agent_manager = AgentManager()
file_service = FileService()
orchestrator = MultiAgentOrchestrator(ollama_client, agent_manager, file_service)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Database & Telegram
    await init_db()
    await telegram_service.load_config_from_db()
    if telegram_service.bot_token:
        telegram_service.start_polling()
    print("🚀 [Next-Agent Engine] SQLite Database Initialized & Telegram Bot Ready.")
    yield
    telegram_service.stop_polling()
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

# Include DamaAI Desktop Pet Router
app.include_router(pet_router)

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

# --- Local AI Models API (Ollama & LM Studio) ---

@app.get("/api/models")
async def list_models():
    try:
        backends = await ollama_client.detect_backends()
        is_healthy = backends.get("ollama", False) or backends.get("lm_studio", False)
        models = await ollama_client.list_models()
        return {
            "status": "online" if is_healthy else "offline",
            "backends": backends,
            "models": models,
            "ollama_url": ollama_client.ollama_url,
            "lm_studio_url": ollama_client.lm_studio_url,
            "base_url": ollama_client.base_url
        }
    except Exception as e:
        print(f"Error in /api/models: {e}")
        return {
            "status": "offline",
            "backends": {"ollama": False, "lm_studio": False},
            "models": await ollama_client.list_models(),
            "base_url": "http://localhost:11434"
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
    
from server.services.integration_service import integration_service
from server.services.hardware_profiler import hardware_profiler
from server.services.knowledge_service import knowledge_service

# --- Knowledge Network & Graph & Backup API (Static Routes First) ---

@app.get("/api/knowledge/graph")
async def get_knowledge_graph():
    return await knowledge_service.get_knowledge_graph_data()

@app.get("/api/knowledge/backup/export")
async def export_knowledge_backup():
    return await knowledge_service.export_knowledge_backup()

@app.post("/api/knowledge/backup/import")
async def import_knowledge_backup(payload: dict):
    return await knowledge_service.import_knowledge_backup(payload)

@app.post("/api/knowledge/backup/github")
async def sync_github_backup(payload: dict):
    repo_url = payload.get("repo_url", "https://github.com/gilppon/personal")
    token = payload.get("github_token", "")
    branch = payload.get("branch", "main")
    action = payload.get("action", "backup")
    try:
        res = await knowledge_service.sync_github_backup(
            repo_url=repo_url,
            github_token=token,
            branch=branch,
            action=action
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/knowledge/starter-pack")
async def inject_starter_pack():
    return await knowledge_service.inject_starter_pack()

@app.post("/api/knowledge/synthesize")
async def trigger_knowledge_synthesis(payload: dict = None):
    topic = (payload or {}).get("topic", "전사 종합 전략")
    return await knowledge_service.synthesize_knowledge(focus_topic=topic)

@app.post("/api/knowledge/auto-scout")
async def trigger_auto_scout(payload: dict = None):
    target_agent_id = (payload or {}).get("agent_id")
    return await knowledge_service.auto_scout_and_ingest(target_agent_id)

@app.get("/api/knowledge/auto-scout/status")
async def get_auto_scout_status():
    return knowledge_service.get_auto_scout_status()

@app.post("/api/knowledge/auto-scout/toggle")
async def toggle_auto_scout(payload: dict):
    enabled = payload.get("enabled", True)
    return knowledge_service.toggle_auto_scout(enabled)

# --- Agent-Specific Knowledge API (Parameterized Routes) ---

@app.post("/api/knowledge/ingest")
async def ingest_agent_knowledge(payload: dict):
    agent_id = payload.get("agent_id")
    query_or_url = payload.get("query_or_url")
    if not agent_id or not query_or_url:
        raise HTTPException(status_code=400, detail="agent_id and query_or_url are required")
    try:
        res = await knowledge_service.ingest_knowledge(agent_id, query_or_url)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/knowledge/{agent_id}")
async def get_agent_knowledge_list(agent_id: str):
    items = await knowledge_service.list_knowledge(agent_id)
    presets = knowledge_service.get_presets(agent_id)
    return {"agent_id": agent_id, "knowledge": items, "presets": presets}

@app.delete("/api/knowledge/{agent_id}")
async def delete_agent_knowledge(agent_id: str, title: str):
    deleted = await knowledge_service.delete_knowledge_by_title(agent_id, title)
    return {"status": "success", "deleted_count": deleted}

# --- 📱 Telegram Remote Autonomous Control API ---

@app.get("/api/telegram/config")
async def get_telegram_config():
    await telegram_service.load_config_from_db()
    return telegram_service.get_config()

@app.post("/api/telegram/config")
async def update_telegram_config(payload: dict):
    bot_token = payload.get("bot_token", "")
    chat_id = payload.get("chat_id", "")
    await telegram_service.save_config_to_db(bot_token, chat_id)
    if telegram_service.bot_token and not telegram_service.is_polling:
        telegram_service.start_polling()
    return {"status": "success", "config": telegram_service.get_config()}

@app.post("/api/telegram/test")
async def test_telegram_message():
    await telegram_service.load_config_from_db()
    res = await telegram_service.send_message(
        "충성! <b>코다리 개발부장</b>입니다!\n\n"
        "대표님, 텔레그램 스마트폰 원격 제어망이 <b>100% 정상 연동</b>되었습니다!\n"
        "이제 외출 중이시거나 침대에 계실 때도 스마트폰 버튼 하나로 10대 에이전트 군단에게 개발을 지시하실 수 있습니다! 🫡"
    )
    return res

@app.post("/api/telegram/scout-now")
async def trigger_telegram_scout():
    await telegram_service.load_config_from_db()
    res = await telegram_service.send_scouted_report_to_telegram()
    return res

# --- Live Web Sandbox & Real App Scaffolding API ---

@app.get("/api/apps/preview/{app_id}")
async def preview_app(app_id: str):
    """Serves real rendered HTML for the generated app inside an iframe sandbox."""
    from fastapi.responses import HTMLResponse
    html_content = file_service.get_app_html(app_id)
    if not html_content:
        raise HTTPException(status_code=404, detail="App preview not found")
    return HTMLResponse(content=html_content, status_code=200)

@app.get("/api/apps/list")
async def list_built_apps():
    """Lists all scaffolded physical projects in app_build/ directory."""
    from pathlib import Path
    build_dir = Path("app_build")
    if not build_dir.exists():
        return []
    
    apps = []
    for d in build_dir.iterdir():
        if d.is_dir():
            has_html = (d / "index.html").exists()
            apps.append({
                "app_id": d.name,
                "path": str(d).replace("\\", "/"),
                "has_preview": has_html,
                "preview_url": f"/api/apps/preview/{d.name}" if has_html else None,
                "files": [p.name for p in d.iterdir() if p.is_file()]
            })
    return apps

# --- Hardware Diagnostics & VRAM Flush API ---

@app.get("/api/hardware/profile")
async def get_hardware_profile():
    return hardware_profiler.get_system_profile()

@app.get("/api/hardware/recommendations")
async def get_hardware_recommendations():
    detected_models = await ollama_client.list_models()
    return hardware_profiler.get_tier_recommendations(detected_models)

@app.post("/api/hardware/flush")
async def trigger_hardware_flush():
    res = hardware_profiler.flush_vram()
    return {"status": "success", "result": res}

@app.post("/api/hardware/auto-assign")
async def auto_assign_models():
    detected_models = await ollama_client.list_models()
    optimal_mapping = hardware_profiler.auto_assign_optimal_models(detected_models)
    
    updated_agents = []
    for aid, model_name in optimal_mapping.items():
        await agent_manager.update_agent_model(aid, model_name)
        updated_agents.append({"id": aid, "model": model_name})
        
    return {
        "status": "success",
        "assigned_count": len(updated_agents),
        "mapping": optimal_mapping
    }

# --- External Integrations & API Keys API ---

@app.get("/api/integrations")
async def get_integrations():
    integrations = integration_service.list_integrations(mask_secrets=True)
    return {"integrations": integrations}

@app.post("/api/integrations/{service_id}")
async def update_integration(service_id: str, payload: dict):
    try:
        updated = integration_service.save_integration(service_id, payload)
        return {"status": "success", "integration": updated}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- 🧠 Brain Forge (4대 직군별 특화 두뇌 관제) API ---

@app.get("/api/brain-forge/status")
async def get_brain_forge_status():
    """4대 직군별 특화 두뇌의 설치 및 활성화 현황 반환"""
    status = await brain_forge_service.get_brain_status()
    return {"status": "success", "brains": status}

@app.post("/api/brain-forge/build/{brain_id}")
async def build_custom_brain(brain_id: str, payload: dict = None):
    """특정 특화 두뇌 Modelfile 생성 및 Ollama/LM Studio 빌드"""
    knowledge_snippets = payload.get("knowledge_snippets") if payload else None
    res = await brain_forge_service.build_brain(brain_id, knowledge_snippets)
    return res

@app.post("/api/brain-forge/build-all")
async def build_all_custom_brains():
    """4대 특화 두뇌 전체 일괄 빌드"""
    results = await brain_forge_service.build_all_brains()
    return {"status": "success", "results": results}


# --- 🧬 Physical Model Merge & Evolution (MergeKit SLERP & LoRA) API ---

@app.get("/api/model-merge/status")
async def get_model_merge_status():
    """4대 두뇌 SLERP 레시피 정보 및 물리적 병합 진행률 조회"""
    return model_merger_service.get_merge_status()

@app.post("/api/model-merge/start/{brain_id}")
async def start_model_merge(brain_id: str):
    """지정된 두뇌 또는 전체(all) 물리적 가중치 병합(MergeKit) 및 Q5_K_M GGUF 빌드 시작"""
    return await model_merger_service.start_merge_job(brain_id)

@app.post("/api/model-merge/evolve/{brain_id}")
async def record_brain_evolution(brain_id: str, payload: dict):
    """사내 고품질 대화 및 작업 로그를 자율 진화(LoRA 파인튜닝) 데이터셋에 누적 기록"""
    prompt = payload.get("prompt", "")
    completion = payload.get("completion", "")
    score = payload.get("score", 1.0)
    return model_merger_service.record_evolution_sample(brain_id, prompt, completion, score)


# --- 🛠️ Autonomous Tools Management & Execution API ---

@app.get("/api/tools")
async def list_standalone_tools():
    """E:/진짜배기/ 하위에 자율 생성된 독립형 툴 목록 조회"""
    tools = file_service.list_standalone_tools()
    return {"status": "success", "tools": tools}

@app.post("/api/tools/run")
async def run_standalone_tool(payload: dict):
    """지정된 독립형 도구(CLI/Web UI) 백그라운드 프로세스 기동"""
    tool_path = payload.get("tool_path")
    mode = payload.get("mode", "cli")  # 'cli' or 'ui'
    if not tool_path or not os.path.exists(tool_path):
        raise HTTPException(status_code=404, detail="Tool directory not found")
    
    target_bat = "run_ui.bat" if mode == "ui" else "run_tool.bat"
    bat_file = Path(tool_path) / target_bat
    
    if sys.platform == "win32":
        # Launch independently in a new Windows terminal window
        if bat_file.exists():
            os.system(f'start cmd /c "cd /d {tool_path} && {target_bat}"')
        else:
            os.system(f'start cmd /c "cd /d {tool_path} && python main.py"')
    else:
        subprocess.Popen([sys.executable, "main.py"], cwd=tool_path)
        
    return {"status": "success", "message": f"Tool launched ({mode} mode)", "tool_path": tool_path}

@app.post("/api/tools/open-folder")
async def open_tool_folder(payload: dict):
    """Windows 탐색기로 해당 툴 프로젝트 폴더 열기"""
    tool_path = payload.get("tool_path")
    if not tool_path or not os.path.exists(tool_path):
        raise HTTPException(status_code=404, detail="Tool directory not found")
    
    if sys.platform == "win32":
        os.system(f'explorer "{os.path.abspath(tool_path)}"')
    return {"status": "success", "message": "Folder opened in Explorer", "tool_path": tool_path}

@app.post("/api/tools/test")
async def test_standalone_tool(payload: dict):
    """해당 툴의 test_tool.py 자가검증 실행"""
    tool_path = payload.get("tool_path")
    if not tool_path or not os.path.exists(tool_path):
        raise HTTPException(status_code=404, detail="Tool directory not found")
    
    result = file_service.verify_tool_installation(tool_path)
    return {"status": "success", "result": result}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server.main:app", host=HOST, port=PORT, reload=True)

