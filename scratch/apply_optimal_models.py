import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import asyncio
from server.services.agent_manager import AgentManager
from server.database import init_db

# 10인 에이전트별 로컬 최적 두뇌 매핑 (대표님 PC에 실재하는 모델)
OPTIMAL_MAPPINGS = {
    "ceo": "deepseek-v4",                                   # LM Studio: 최상위 추론/오케스트레이션
    "youtube": "qwen3.5-9b-uncensored-hauhaucs-aggressive", # LM Studio: 거침없는 유튜브 바이럴 후킹
    "instagram": "llama3.2:3b",                             # Ollama: 초경량 릴스/3-3-3 해시태그
    "designer": "qwen3.5-9b-deepseek-v4-flash",             # LM Studio: 공간감/디자인 스타일링
    "developer": "qwen2.5-coder:14b",                       # Ollama: 시니어 코딩/디버깅/TDD
    "business": "prism-ml/bonsai-27b",                      # LM Studio: 대형 비즈니스/ROI 전략
    "secretary": "google/gemma-4-e2b",                      # LM Studio: 초고속 1분 브리핑/일정 관리
    "editor": "google/gemma-4-e4b",                         # LM Studio: 감각적 BGM/사운드 연출
    "writer": "qwen2.5:7b",                                 # Ollama: AIDA/PAS 세일즈 카피라이팅
    "researcher": "qwen3.6:latest"                          # Ollama: 22GB 대형 심층 팩트체크 리서치
}

async def apply_optimal_assignments():
    await init_db()
    mgr = AgentManager()
    
    print("=== [10인 에이전트 최적 모델 배정 시작] ===")
    for aid, model_name in OPTIMAL_MAPPINGS.items():
        await mgr.update_agent_model(aid, model_name)
        agent = await mgr.get_agent(aid)
        print(f"[{agent.name}] ({agent.role}) -> {model_name}")
    print("=== [배정 완료] ===")

if __name__ == "__main__":
    asyncio.run(apply_optimal_assignments())
