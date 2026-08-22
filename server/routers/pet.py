import uuid
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from server.database import get_db
from server.services.pet_brain import PetBrainEngine
from server.services.knowledge_service import knowledge_service
from server.services.ollama_client import local_ai_client

router = APIRouter(prefix="/api/pet", tags=["pet"])

class FeedRequest(BaseModel):
    text: str = Field(..., description="학습시킬 텍스트 또는 문서 내용")
    source: str = Field(default="drag_drop", description="입력 소스 (drag_drop, clipboard 등)")
    file_name: Optional[str] = Field(default=None, description="첨부된 파일 이름")

class ChatRequest(BaseModel):
    message: str = Field(..., description="펫에게 보낼 대화 메시지")

class SwitchTypeRequest(BaseModel):
    pet_type: str = Field(..., description="'dog' 또는 'cat'")
    name: Optional[str] = Field(default=None, description="펫 이름")

@router.get("/status")
async def get_pet_status():
    """현재 AI 펫의 레벨, 경험치, 친밀도, 진화 단계 조회"""
    db = await get_db()
    cursor = await db.execute("SELECT * FROM pet_status WHERE id = 1")
    row = await cursor.fetchone()
    
    if not row:
        # 기본 펫 생성
        await db.execute("""
            INSERT OR IGNORE INTO pet_status (id, name, pet_type, level, exp, max_exp, affection, growth_stage, total_fed_count)
            VALUES (1, '뽀삐', 'dog', 1, 0, 100, 50, 'infant', 0)
        """)
        await db.commit()
        cursor = await db.execute("SELECT * FROM pet_status WHERE id = 1")
        row = await cursor.fetchone()

    return dict(row)

@router.post("/feed")
async def feed_pet(req: FeedRequest):
    """
    텍스트/파일을 펫에게 간식으로 피딩:
    1. 로컬 RAG 지식 베이스(agent_knowledge)에 청킹 및 저장
    2. 경험치(EXP) 부여 및 레벨/진화 단계 계산
    3. SQLite DB 갱신 및 결과 반환
    """
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="피딩할 텍스트 내용이 비어 있습니다.")

    clean_text = req.text.strip()
    db = await get_db()

    # 1. RAG 지식 베이스 저장 (agent_id='pet')
    title = f"Pet Feed: {req.file_name}" if req.file_name else f"Pet Feed: {clean_text[:30]}..."
    chunks = knowledge_service._chunk_markdown(clean_text, title=title, source_url=req.source or "desktop_pet")
    
    for idx, chunk in enumerate(chunks):
        chunk_id = str(uuid.uuid4())
        await db.execute("""
            INSERT INTO agent_knowledge (id, agent_id, title, source_url, chunk_content, chunk_index)
            VALUES (?, 'pet', ?, ?, ?, ?)
        """, (chunk_id, title, req.source, chunk, idx))
    
    # 2. 현재 상태 로드
    cursor = await db.execute("SELECT * FROM pet_status WHERE id = 1")
    row = await cursor.fetchone()
    current_pet = dict(row) if row else {
        "level": 1, "exp": 0, "max_exp": 100, "affection": 50, "growth_stage": "infant", "total_fed_count": 0
    }

    # 3. EXP 및 성장 계산
    gained_exp = PetBrainEngine.calculate_feed_exp(clean_text, req.file_name)
    growth = PetBrainEngine.calculate_growth(
        current_level=current_pet["level"],
        current_exp=current_pet["exp"],
        gained_exp=gained_exp
    )

    new_affection = min(100, current_pet["affection"] + 2)
    new_fed_count = current_pet["total_fed_count"] + 1

    # 4. DB 갱신
    await db.execute("""
        UPDATE pet_status
        SET level = ?, exp = ?, max_exp = ?, growth_stage = ?, affection = ?, total_fed_count = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
    """, (growth["level"], growth["exp"], growth["max_exp"], growth["stage"], new_affection, new_fed_count))
    await db.commit()

    return {
        "status": "success",
        "gained_exp": gained_exp,
        "growth": growth,
        "affection": new_affection,
        "total_fed_count": new_fed_count,
        "knowledge_chunks_stored": len(chunks)
    }

@router.post("/chat")
async def chat_with_pet(req: ChatRequest):
    """
    펫과의 실시간 대화:
    1. 주입된 RAG 지식 검색
    2. 레벨/종족별 페르소나 시스템 프롬프트 조립
    3. 로컬 LLM (sovereign_master 또는 fallback) 추론
    """
    if not req.message or not req.message.strip():
        raise HTTPException(status_code=400, detail="메시지가 비어 있습니다.")

    db = await get_db()
    cursor = await db.execute("SELECT * FROM pet_status WHERE id = 1")
    row = await cursor.fetchone()
    pet = dict(row) if row else {
        "name": "뽀삐", "pet_type": "dog", "level": 1, "growth_stage": "infant"
    }

    # 1. RAG 검색
    memories = await knowledge_service.retrieve_relevant_knowledge("pet", req.message, top_k=2)

    # 2. 동적 프롬프트 생성
    system_prompt = PetBrainEngine.build_system_prompt(
        pet_type=pet.get("pet_type", "dog"),
        level=pet.get("level", 1),
        stage=pet.get("growth_stage", "infant"),
        memories=memories,
        name=pet.get("name", "뽀삐")
    )

    # 3. 모델 추론
    messages = [{"role": "user", "content": req.message}]
    response_text = await local_ai_client.generate_single(
        model="sovereign_master",
        messages=messages,
        system_prompt=system_prompt,
        agent_role="pet"
    )

    # Clean response if necessary
    if not response_text or response_text.startswith("\n❌"):
        # Fallback friendly response
        sound = "멍멍!" if pet.get("pet_type") == "dog" else "야옹~"
        response_text = f"{sound} 주인님, 지금 로컬 AI 두뇌 연결을 확인 중이다{('멍' if pet.get('pet_type') == 'dog' else '냥')}! ({req.message})"
    else:
        # Sanitize repetitive syllable loops (e.g., 냥냥냥냥...)
        import re
        response_text = re.sub(r'([냥멍다옹!~?ㅋㅎ])\1{2,}', r'\1', response_text)

    return {
        "response": response_text.strip(),
        "level": pet.get("level", 1),
        "stage": pet.get("growth_stage", "infant"),
        "pet_type": pet.get("pet_type", "dog"),
        "name": pet.get("name", "뽀삐")
    }

@router.post("/switch-type")
async def switch_pet_type(req: SwitchTypeRequest):
    """강아지('dog') 또는 고양이('cat')로 종족 및 이름 변경"""
    if req.pet_type not in ["dog", "cat"]:
        raise HTTPException(status_code=400, detail="pet_type은 'dog' 또는 'cat'이어야 합니다.")

    default_name = "뽀삐" if req.pet_type == "dog" else "나비"
    name = req.name or default_name

    db = await get_db()
    await db.execute("""
        UPDATE pet_status
        SET pet_type = ?, name = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
    """, (req.pet_type, name))
    await db.commit()

    return {"status": "success", "pet_type": req.pet_type, "name": name}

@router.post("/reset")
async def reset_pet_status():
    """테스트용 펫 상태 초기화 (Lv.1, 0 EXP)"""
    db = await get_db()
    await db.execute("""
        UPDATE pet_status
        SET name = '뽀삐', pet_type = 'dog', level = 1, exp = 0, max_exp = 100,
            affection = 50, growth_stage = 'infant', total_fed_count = 0, updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
    """)
    await db.commit()
    return {"status": "success", "message": "펫 상태가 초기화되었습니다."}
