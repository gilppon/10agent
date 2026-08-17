import asyncio
import os
import sys

# Windows UTF-8 stdout encoding fix
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

# Append project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))


from server.services.semantic_cache import semantic_cache
from server.services.model_router import model_router
from server.services.ollama_client import OllamaClient

async def run_tests():
    print("==================================================")
    print("🚀 [하네스 검증] 로컬 라우팅 & 세맨틱 캐시 단위 테스트")
    print("==================================================")
    
    # 1. Model Router Verification
    print("\n[1] Dynamic Model Router 검증")
    cases = [
        ("이 에러의 root cause를 찾고 TDD 단위 테스트를 작성해줘", "developer", "large"),
        ("유튜브 쇼츠 3초 후킹 인트로와 썸네일 카피 작성해줘", "youtube", "medium"),
        ("현재 작업 상태 요약 및 확인", "secretary", "small"),
        ("시스템 아키텍처 관점에서 수학적 추론 및 심층 분석해줘", "ceo", "reasoning"),
    ]
    
    for query, role, expected_tier in cases:
        model, tier, reason = model_router.route_task(query, agent_role=role)
        print(f"  - Query: '{query[:25]}...' | Role: {role} -> Tier: {tier.upper()} ({model})")
        assert tier == expected_tier, f"Routing failed for '{query}': expected {expected_tier}, got {tier}"
    print("  ✅ [PASS] 모델 라우팅 분기 검증 완료!")

    # 2. Semantic Cache Store & Lookup Verification
    print("\n[2] Semantic Cache 적중 검증")
    sample_query = "Next11 프로젝트 빌드 방법 알려줘"
    sample_response = "Next11 프로젝트는 `run_all.bat`을 실행하거나 클라이언트와 서버를 각각 가동하시면 됩니다."
    
    # Store
    await semantic_cache.store(query_text=sample_query, response_text=sample_response, model_tier="small")
    print("  - 캐시 저장 완료:", sample_query)
    
    # Exact lookup
    match = await semantic_cache.lookup(sample_query)
    assert match is not None, "Exact match lookup failed!"
    print(f"  - 동일 질의 조회 성공: 유사도 {match['similarity']*100}% | HitCount: {match['hit_count']}")
    
    # Semantic variation lookup
    similar_query = "Next11 프로젝트 빌드 어떻게 해?"
    match_sim = await semantic_cache.lookup(similar_query)
    print(f"  - 유사 질의 조회 결과: '{similar_query}' -> 유사도 {match_sim['similarity']*100 if match_sim else 0}%")
    
    # 3. OllamaClient Integration Test
    print("\n[3] OllamaClient 스트리밍 & 캐시 히트 연동 검증")
    client = OllamaClient()
    received_types = []
    
    async for chunk in client.stream_chat(
        model="auto",
        messages=[{"role": "user", "content": sample_query}],
        agent_role="secretary"
    ):
        received_types.append(chunk["type"])
    
    print("  - Stream Event Sequence:", received_types)
    assert "routing_info" in received_types, "Missing routing_info event"
    assert "cache_hit" in received_types, "Missing cache_hit event on cached query"
    print("  ✅ [PASS] OllamaClient 세맨틱 캐시 즉시 반환(Zero-Inference) 연동 성공!")
    
    print("\n==================================================")
    print("🎉 모든 하네스 검증 테스트 ALL CLEAR! (100% 통과)")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(run_tests())
