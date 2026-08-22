import aiosqlite
from server.config import DB_PATH

async def get_db():
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    return db

async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        # Sessions Table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                active_agent_id TEXT NOT NULL DEFAULT 'ceo',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Messages Table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                agent_id TEXT,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                reasoning TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
            )
        """)

        # Custom Agent Overrides & Settings
        await db.execute("""
            CREATE TABLE IF NOT EXISTS agents (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                role TEXT NOT NULL,
                emoji TEXT NOT NULL,
                color TEXT NOT NULL,
                specialty TEXT NOT NULL,
                tagline TEXT NOT NULL,
                persona TEXT NOT NULL,
                model TEXT NOT NULL,
                is_custom INTEGER DEFAULT 0
            )
        """)

        # Artifacts Table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS artifacts (
                id TEXT PRIMARY KEY,
                session_id TEXT,
                name TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_type TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Agent Knowledge (RAG Document Store) Table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS agent_knowledge (
                id TEXT PRIMARY KEY,
                agent_id TEXT NOT NULL,
                title TEXT NOT NULL,
                source_url TEXT,
                chunk_content TEXT NOT NULL,
                chunk_index INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.execute("CREATE INDEX IF NOT EXISTS idx_agent_knowledge_agent ON agent_knowledge(agent_id)")

        # Desktop AI Growth Pet (DamaAI) Table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS pet_status (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT DEFAULT '뽀삐',
                pet_type TEXT DEFAULT 'dog',
                level INTEGER DEFAULT 1,
                exp INTEGER DEFAULT 0,
                max_exp INTEGER DEFAULT 100,
                affection INTEGER DEFAULT 50,
                growth_stage TEXT DEFAULT 'infant',
                total_fed_count INTEGER DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Ensure single default pet record exists
        cursor = await db.execute("SELECT COUNT(*) FROM pet_status")
        count = (await cursor.fetchone())[0]
        if count == 0:
            await db.execute("""
                INSERT INTO pet_status (id, name, pet_type, level, exp, max_exp, affection, growth_stage, total_fed_count)
                VALUES (1, '뽀삐', 'dog', 1, 0, 100, 50, 'infant', 0)
            """)

        await db.commit()


