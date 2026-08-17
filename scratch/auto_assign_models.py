import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import asyncio
from server.services.ollama_client import LocalAIClient
from server.services.agent_manager import AgentManager
from server.database import init_db

async def check_and_auto_assign():
    ollama_client = LocalAIClient()
    await init_db()
    models = await ollama_client.list_models()
    model_names = [m["name"] for m in models]
    print("=== [현재 로컬 감지된 모델 목록 (총 {}개)] ===".format(len(models)))
    for m in models:
        print(f"  * {m['name']} [{m.get('source', '')}] ({m.get('size', '')})")
        
    # 각 에이전트별 최적 매칭 로직
    mgr = AgentManager()
    agents = await mgr.get_all_agents()
    print("\n=== [10인 에이전트 최적 모델 자동 배정] ===")
    
    # 모델 선택 우선순위 룰
    def find_best_model(agent_id, role):
        # 1. 코딩/개발 -> coder 계열 우선
        if agent_id in ("developer", "designer"):
            for m in model_names:
                if "coder" in m.lower() or "code" in m.lower():
                    return m
            for m in model_names:
                if "qwen" in m.lower():
                    return m
        # 2. CEO / 추론 / RAG 리서치 / 비즈니스 -> deepseek-r1 / r1 / reasoning / large 계열
        elif agent_id in ("ceo", "researcher", "business"):
            for m in model_names:
                if "r1" in m.lower() or "reason" in m.lower() or "deepseek" in m.lower():
                    return m
            for m in model_names:
                if "qwen2.5:14b" in m.lower() or "32b" in m.lower() or "14b" in m.lower():
                    return m
        # 3. 유튜브, 카피라이터, 사운드 에디터 -> qwen2.5 / 7b~14b / llama 계열
        elif agent_id in ("youtube", "writer", "editor"):
            for m in model_names:
                if "qwen2.5" in m.lower() and "coder" not in m.lower():
                    return m
            for m in model_names:
                if "llama" in m.lower() or "gemma" in m.lower():
                    return m
        # 4. 비서, 인스타그램 마케터 -> 경량 빠른 모델 (3b, 8b)
        elif agent_id in ("secretary", "instagram"):
            for m in model_names:
                if "3b" in m.lower() or "llama3.2" in m.lower() or "mini" in m.lower() or "small" in m.lower():
                    return m
            for m in model_names:
                if "8b" in m.lower() or "7b" in m.lower():
                    return m

        # fallback: 첫 번째 사용 가능한 모델
        return model_names[0] if model_names else "auto"

    assigned = {}
    for a in agents:
        best = find_best_model(a.id, a.role)
        await mgr.update_agent_model(a.id, best)
        assigned[a.name] = (a.role, best)
        print(f"  ✅ {a.name} ({a.role}) ➡️ 🧠 {best}")

if __name__ == "__main__":
    asyncio.run(check_and_auto_assign())
