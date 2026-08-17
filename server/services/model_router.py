import re
from typing import Dict, Any, Tuple
from server.config import (
    DEFAULT_SMALL_MODEL,
    DEFAULT_MEDIUM_MODEL,
    DEFAULT_LARGE_MODEL,
    DEFAULT_REASONING_MODEL
)

class ModelRouter:
    """
    Intelligent dynamic router that analyzes incoming agent tasks or user queries
    and determines the optimal LLM size/tier to minimize VRAM & latency.
    """
    def __init__(self):
        self.small_model = DEFAULT_SMALL_MODEL
        self.medium_model = DEFAULT_MEDIUM_MODEL
        self.large_model = DEFAULT_LARGE_MODEL
        self.reasoning_model = DEFAULT_REASONING_MODEL

    def route_task(self, query: str, agent_role: str = "", user_preferred_model: str = "") -> Tuple[str, str, str]:
        """
        Determine target model based on query complexity and agent role.
        Returns: (selected_model_name, tier_name, reason)
        """
        # If user explicitly picked a specific heavy/custom model and not 'auto', respect it
        if user_preferred_model and user_preferred_model not in ("auto", "default", "dynamic"):
            return user_preferred_model, "custom", "사용자 명시적 모델 지정"

        text = query.lower()
        
        # 1. Deep Reasoning / Architectural Planning / Complex Coding -> High Tier (32B / R1)
        reasoning_keywords = [
            "deep thinking", "think", "추론", "수학적", "증명", "알고리즘 설계",
            "아키텍처", "전략 수립", "위험 분석", "root cause", "원인 분석",
            "refactor", "리팩토링", "tdd", "unit test", "단위 테스트 작성"
        ]
        if any(k in text for k in reasoning_keywords) or agent_role in ("ceo", "developer", "business"):
            if "think" in text or "추론" in text or "증명" in text:
                return self.reasoning_model, "reasoning", "심층 추론 및 원인/전략 분석 태스크"
            return self.large_model, "large", "핵심 코드 생성 및 아키텍처 설계 태스크"

        # 2. Creative Copywriting / Content Generation / Visual Brief -> Medium Tier (7B)
        medium_keywords = [
            "카피라이팅", "후킹", "스크립트", "스토리보드", "해시태그", "인스타그램",
            "유튜브", "썸네일", "창작", "번역", "작문"
        ]
        if any(k in text for k in medium_keywords) or agent_role in ("designer", "youtube", "instagram", "writer", "editor", "researcher"):
            return self.medium_model, "medium", "콘텐츠 생성, 마케팅 카피 및 비주얼 기획"

        # 3. Simple Extraction / Intent Classification / Light Status Check / Summary -> Small Tier (3B SLM)
        return self.small_model, "small", "단순 의도 분류, 데이터 추출 및 빠른 상태 확인 (초경량 연산)"


model_router = ModelRouter()
