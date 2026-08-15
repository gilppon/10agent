from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class AgentBase(BaseModel):
    id: str
    name: str
    role: str
    emoji: str
    color: str
    specialty: str
    tagline: str
    persona: str
    model: str = "qwen2.5-coder:14b"
    is_custom: bool = False

class AgentUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    emoji: Optional[str] = None
    color: Optional[str] = None
    specialty: Optional[str] = None
    tagline: Optional[str] = None
    persona: Optional[str] = None
    model: Optional[str] = None

class Message(BaseModel):
    id: Optional[str] = None
    session_id: str
    agent_id: Optional[str] = None  # None for user
    role: str  # 'user' | 'assistant' | 'system'
    content: str
    reasoning: Optional[str] = None  # Thinking/reasoning trace
    created_at: Optional[str] = None

class Session(BaseModel):
    id: str
    title: str
    active_agent_id: str = "ceo"
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class ChatRequest(BaseModel):
    session_id: str
    agent_id: str
    message: str
    override_model: Optional[str] = None
    history: Optional[List[Dict[str, str]]] = None

class RoundtableRequest(BaseModel):
    session_id: str
    topic: str
    agent_ids: List[str]
    rounds: int = 1

class PipelineRequest(BaseModel):
    session_id: str
    pipeline_type: str  # 'youtube_pack' | 'app_builder' | 'copywriting_suite' | 'deep_research'
    prompt: str
    custom_options: Optional[Dict[str, Any]] = None

class ModelInfo(BaseModel):
    name: str
    size: Optional[str] = None
    modified_at: Optional[str] = None
    digest: Optional[str] = None
    vram_tier: Optional[str] = None

class ArtifactFile(BaseModel):
    name: str
    path: str
    size: int
    modified_at: str
    category: str  # 'code' | 'document' | 'media' | 'other'
