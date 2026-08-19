from typing import Optional, Tuple


class VRAMModelRouter:
    def __init__(self):
        self.model_tiers = {
            "small": ["llama3.2:3b", "qwen2.5:3b", "deepseek-coder:6.7b"],
            "medium": ["llama3.2:7b", "qwen2.5:7b", "deepseek-r1:14b"],
            "large": ["llama3.2:13b", "qwen2.5:14b", "mixtral-8x7b"]
        }

    def route_task(self, task_complexity: str, available_vram_mb: int) -> Tuple[Optional[str], str, str]:
        """
        투입된 작업 복잡도와 사용 가능한 VRAM에 따라 최적 모델 라우팅

        Args:
            task_complexity: "simple" 또는 "complex"
            available_vram_mb: 사용 가능한 VRAM (MB)

        Returns:
            (추천 모델 이름, 모델 티어, 라우팅 사유) 또는 (None, "small", "VRAM 부족으로 시뮬레이션 모드")
        """
        from server.services.model_router import get_model_tier
        small_models = self.model_tiers["small"]
        medium_models = self.model_tiers["medium"]
        large_models = self.model_tiers["large"]
        tier = get_model_tier(available_vram_mb)

        if available_vram_mb < 4096:  # < 4GB
            if task_complexity == "simple":
                return small_models[0], tier, "간단한 작업: 가벼운 모델 라우팅"
            return None, tier, "VRAM 부족(4GB 미만): 시뮬레이션 모드"
        elif available_vram_mb < 8192:  # 4-8GB
            if task_complexity == "simple":
                return small_models[0], tier, "간단한 작업: 가벼운 모델 라우팅"
            elif task_complexity == "complex":
                return None, tier, "복잡한 작업: VRAM 부족으로 시뮬레이션 모드"
            else:
                return medium_models[0], tier, "중간 복잡도: 미디움 모델 라우팅"
        else:  # 8GB+
            if task_complexity == "complex":
                return large_models[0], tier, "복잡한 작업: 파워풀 모델 라우팅"
            else:
                return medium_models[0], tier, "일반 작업: 미디움 모델 라우팅"

    def get_model_tier(self, available_vram_mb: int) -> str:
        """
        사용 가능한 VRAM에 따른 모델 티어 반환

        Args:
            available_vram_mb: 사용 가능한 VRAM (MB)

        Returns:
            "small", "medium", 또는 "large"
        """
        if available_vram_mb < 4096:
            return "small"
        elif available_vram_mb < 8192:
            return "medium"
        else:
            return "large"


# 전역 라우터 인스턴스
_model_router: Optional[VRAMModelRouter] = None


def get_model_router() -> VRAMModelRouter:
    """전역 VRAM 모델 라우터 인스턴스 반환"""
    global _model_router
    if _model_router is None:
        _model_router = VRAMModelRouter()
    return _model_router


def route_task(task_complexity: str, available_vram_mb: int) -> Optional[str]:
    """
    편의 함수: VRAM 기반 모델 라우팅 (전역 인스턴스 사용)

    Args:
        task_complexity: "simple" 또는 "complex"
        available_vram_mb: 사용 가능한 VRAM (MB)

    Returns:
        추천 모델 이름 또는 None
    """
    result = get_model_router().route_task(task_complexity, available_vram_mb)
    return result[0] if result else None


def get_model_tier(available_vram_mb: int) -> str:
    """편의 함수: 모델 티어 조회"""
    return get_model_router().get_model_tier(available_vram_mb)


# backward compatibility: module-level model_router variable
# 이는 기존 imports(model_router)가 작동하도록 함
model_router = get_model_router()