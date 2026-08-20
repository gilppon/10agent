import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / "storage"
DB_PATH = STORAGE_DIR / "next_agent.db"
ARTIFACTS_DIR = STORAGE_DIR / "artifacts"

# Ensure directories exist
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

# Server Configuration
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))

# Local LLM Endpoints (Zero-Cost Default)
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
LM_STUDIO_BASE_URL = os.getenv("LM_STUDIO_BASE_URL", "http://localhost:1234/v1")
DEFAULT_TIMEOUT = float(os.getenv("LOCAL_AI_TIMEOUT", "120.0"))


# Semantic Cache & Model Routing Configuration
SEMANTIC_CACHE_ENABLED = os.getenv("SEMANTIC_CACHE_ENABLED", "true").lower() == "true"
SEMANTIC_CACHE_THRESHOLD = float(os.getenv("SEMANTIC_CACHE_THRESHOLD", "0.92"))
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "nomic-embed-text")

# Dynamic Model Tiers
DEFAULT_SMALL_MODEL = os.getenv("DEFAULT_SMALL_MODEL", "llama3.2:3b")
DEFAULT_MEDIUM_MODEL = os.getenv("DEFAULT_MEDIUM_MODEL", "qwen3.8-9b")
DEFAULT_LARGE_MODEL = os.getenv("DEFAULT_LARGE_MODEL", "qwen3.8-9b")
DEFAULT_REASONING_MODEL = os.getenv("DEFAULT_REASONING_MODEL", "deepseek-r1:14b")

