import sqlite3
import json
import math
import time
import httpx
from typing import Optional, Tuple, Dict, Any, List
from collections import OrderedDict
from server.config import DB_PATH, OLLAMA_BASE_URL, EMBEDDING_MODEL, SEMANTIC_CACHE_THRESHOLD, SEMANTIC_CACHE_ENABLED

class LRUCache:
    def __init__(self, capacity: int = 100):
        self.cache = OrderedDict()
        self.capacity = capacity
    
    def lookup(self, key: str) -> Optional[Any]:
        if key in self.cache:
            self.cache.move_to_end(key)
            return self.cache[key]
        return None
    
    def insert(self, key: str, value: Any) -> None:
        if key in self.cache:
            self.cache.move_to_end(key)
        else:
            self.cache[key] = value
            if len(self.cache) > self.capacity:
                self.cache.popitem(last=False)

class SemanticCache:
    def __init__(self, db_path=DB_PATH, threshold=SEMANTIC_CACHE_THRESHOLD, enabled=SEMANTIC_CACHE_ENABLED):
        self.db_path = str(db_path)
        self.threshold = threshold
        self.enabled = enabled
        self.embedding_model = EMBEDDING_MODEL
        self.base_url = OLLAMA_BASE_URL.rstrip("/")
        self.lru_cache = LRUCache(capacity=100)
        self._init_db()

    def _init_db(self):
        """Create cache table if not exists."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS semantic_cache (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    query_text TEXT NOT NULL,
                    system_prompt TEXT,
                    model_tier TEXT,
                    embedding_json TEXT NOT NULL,
                    response_text TEXT NOT NULL,
                    hit_count INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_cache_model ON semantic_cache(model_tier)")
            conn.commit()

    async def get_embedding(self, text: str) -> Optional[List[float]]:
        """Fetch vector embedding from Ollama /api/embeddings or fallback."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.post(
                    f"{self.base_url}/api/embeddings",
                    json={"model": self.embedding_model, "prompt": text}
                )
                if res.status_code == 200:
                    return res.json().get("embedding", [])
        except Exception:
            pass
        
        # Fast local token-hash fallback embedding if Ollama embedding model is not yet loaded
        return self._fallback_hash_embedding(text)

    def _fallback_hash_embedding(self, text: str, dim: int = 128) -> List[float]:
        """Deterministic lightweight bag-of-words hash embedding."""
        vec = [0.0] * dim
        words = text.lower().strip().split()
        if not words:
            return vec
        for word in words:
            h = hash(word) % dim
            vec[h] += 1.0
        # Normalize L2
        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 0:
            vec = [x / norm for x in vec]
        return vec

    @staticmethod
    def cosine_similarity(v1: List[float], v2: List[float]) -> float:
        """Calculate cosine similarity between two vectors."""
        if not v1 or not v2 or len(v1) != len(v2):
            return 0.0
        dot = sum(a * b for a, b in zip(v1, v2))
        norm_a = math.sqrt(sum(a * a for a in v1))
        norm_b = math.sqrt(sum(b * b for b in v2))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    async def lookup(self, query_text: str, model_tier: str = "") -> Optional[Dict[str, Any]]:
        """Lookup semantic cache for a given query."""
        if not self.enabled or not query_text.strip():
            return None

        query_vec = await self.get_embedding(query_text)
        if not query_vec:
            return None

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            # Fetch recent cache records (up to 200 items for low latency)
            cursor.execute(
                "SELECT id, query_text, embedding_json, response_text, hit_count FROM semantic_cache ORDER BY last_accessed DESC LIMIT 200"
            )
            rows = cursor.fetchall()

            best_match = None
            best_score = -1.0

            for row_id, c_query, emb_str, response_text, hit_count in rows:
                try:
                    c_vec = json.loads(emb_str)
                    sim = self.cosine_similarity(query_vec, c_vec)
                    if sim > best_score:
                        best_score = sim
                        best_match = {
                            "id": row_id,
                            "matched_query": c_query,
                            "similarity": round(sim, 4),
                            "response": response_text,
                            "hit_count": hit_count
                        }
                except Exception:
                    continue

            if best_match and best_score >= self.threshold:
                # Increment hit count
                cursor.execute(
                    "UPDATE semantic_cache SET hit_count = hit_count + 1, last_accessed = CURRENT_TIMESTAMP WHERE id = ?",
                    (best_match["id"],)
                )
                conn.commit()
                return best_match

        return None

    async def store(self, query_text: str, response_text: str, system_prompt: str = "", model_tier: str = ""):
        """Store query and response vector into semantic cache."""
        if not self.enabled or not query_text.strip() or not response_text.strip():
            return

        query_vec = await self.get_embedding(query_text)
        if not query_vec:
            return

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO semantic_cache (query_text, system_prompt, model_tier, embedding_json, response_text)
                VALUES (?, ?, ?, ?, ?)
                """,
                (query_text, system_prompt, model_tier, json.dumps(query_vec), response_text)
            )
            conn.commit()

semantic_cache = SemanticCache()
