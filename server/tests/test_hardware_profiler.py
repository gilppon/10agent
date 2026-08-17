import os
import sys

# Windows UTF-8 stdout encoding fix
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

# Append project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from server.services.hardware_profiler import hardware_profiler

def test_hardware_profiler():
    print("==================================================")
    print("🚀 [하네스 검증] 하드웨어 진단 및 VRAM Flush 엔진 테스트")
    print("==================================================")
    
    # 1. Profile Hardware Specs
    print("\n[1] 시스템 하드웨어 자동 프로파일링")
    profile = hardware_profiler.get_system_profile()
    
    print(f"  - CPU 코어: 물리 {profile['cpu']['physical_cores']}C / 논리 {profile['cpu']['logical_threads']}T (사용률 {profile['cpu']['usage_percent']}%)")
    print(f"  - RAM 메모리: 총 {profile['ram']['total_gb']}GB (여유 {profile['ram']['available_gb']}GB)")
    print(f"  - GPU 디바이스: {profile['gpu']['device_name']} (VRAM: {profile['gpu']['total_vram_gb']}GB)")
    print(f"  - 판정된 티어: {profile['tier_name']} [{profile['tier']}]")
    print(f"  - 추천 모델 가이드: {profile['recommendations']['llm_medium']} / {profile['recommendations']['llm_large']}")
    
    assert profile["tier"] in ("low_vram", "mid_vram", "high_vram"), f"Invalid tier: {profile['tier']}"
    assert profile["ram"]["total_gb"] > 0, "RAM total must be greater than 0"
    print("  ✅ [PASS] 하드웨어 스펙 수집 및 자동 티어 분류 완료!")

    # 2. VRAM & RAM Flush Execution
    print("\n[2] VRAM & Garbage Collection Flush 검증")
    flush_res = hardware_profiler.flush_vram()
    print(f"  - 수거된 가비지 객체 수: {flush_res['collected_garbage_objects']}개")
    print(f"  - CUDA VRAM 메모리 캐시 비움 상태: {flush_res['cuda_vram_emptied']}")
    assert flush_res["status"] == "flushed", "Flush status failed"
    # 3. Auto Assign Optimal Models (100-Point SOTA Rules)
    print("\n[3] 100점 만점 SOTA 최적 모델 자동 배정 알고리즘 검증")
    mock_models = [
        {"name": "qwen2.5-coder:14b"},
        {"name": "deepseek-r1:14b"},
        {"name": "qwen2.5vl:7b"},
        {"name": "qwen2.5:7b"},
        {"name": "llama3.2:3b"},
        {"name": "mistral-nemo"}
    ]
    mapping = hardware_profiler.auto_assign_optimal_models(mock_models)
    print(f"  - 배정 결과: {mapping}")
    
    assert mapping["developer"] == "qwen2.5-coder:14b", f"Expected coder:14b, got {mapping['developer']}"
    assert mapping["ceo"] == "deepseek-r1:14b", f"Expected deepseek-r1:14b, got {mapping['ceo']}"
    assert mapping["designer"] == "qwen2.5vl:7b", f"Expected qwen2.5vl:7b, got {mapping['designer']}"
    assert mapping["researcher"] == "deepseek-r1:14b", f"Expected deepseek-r1:14b, got {mapping['researcher']}"
    assert mapping["writer"] == "qwen2.5:7b", f"Expected qwen2.5:7b, got {mapping['writer']}"
    assert mapping["secretary"] == "llama3.2:3b", f"Expected llama3.2:3b, got {mapping['secretary']}"
    assert mapping["editor"] == "mistral-nemo", f"Expected mistral-nemo, got {mapping['editor']}"
    assert len(mapping) == 10
    print("  ✅ [PASS] 10대 에이전트 100점 만점 SOTA 모델 정밀 매핑 검증 완료!")

    # 4. Tier Recommendations & Readiness Score
    print("\n[4] 사양 티어별 추천 및 준비도(Readiness) 산출 검증")
    recs = hardware_profiler.get_tier_recommendations(mock_models)
    print(f"  - 현재 티어: {recs['tier_name']}")
    print(f"  - SOTA 준비도 점수: {recs['readiness_score']}%")
    print(f"  - 장착된 SOTA 모델 수: {len(recs['installed_sota'])}개")
    print(f"  - 미설치 SOTA 모델 수: {len(recs['missing_sota'])}개")
    assert recs["readiness_score"] >= 0 and recs["readiness_score"] <= 100
    print("  ✅ [PASS] 하드웨어 티어별 추천 엔진 검증 완료!")

    print("\n==================================================")
    print("🎉 하드웨어 프로파일러 & 100점 SOTA 하네스 테스트 ALL CLEAR! (100% 통과)")
    print("==================================================")

if __name__ == "__main__":
    test_hardware_profiler()

