from typing import List, Optional, Dict, Any
from dataclasses import dataclass


@dataclass
class SearchResult:
    """검색 결과 데이터 클래스"""
    title: str
    url: str
    snippet: str
    source: str
    relevance_score: float = 0.0


class DuckDuckGoParser:
    """DuckDuckGo HTML 파서 (기본 파서)"""
    
    def parse(self, query: str) -> List[SearchResult]:
        """DDG 검색 결과 파싱"""
        # 실제 구현에서는 httpx로 DDG 검색 API 호출 후 HTML 파싱
        # 여기서는 더미 데이터 반환을 통한 구조 유지
        return [
            SearchResult(
                title=f"검색 결과: {query}",
                url=f"https://example.com/search/{query}",
                snippet=f"이것은 '{query}'에 대한 검색 결과의 스니펫입니다.",
                source="DuckDuckGo"
            )
        ]


class DDGAPINotAvailableError(Exception):
    """DDG API가 사용할 수 없을 때 발생하는 에러"""
    pass


class SearchResilience:
    """검색 서비스 복원력 강화 클래스
    
    DuckDuckGo 파서 실패 시 폴백 전략을 제공합니다.
    """
    
    def __init__(self):
        self.basic_parser = DuckDuckGoParser()
        self.api_available = False  # DDG API 키 상태
        self.fallback_count = 0
        self.success_count = 0
    
    async def search_with_fallback(self, query: str) -> List[SearchResult]:
        """폴백 전략이 포함된 검색 실행"""
        # 1차: DDG 파서 시도
        try:
            results = self.basic_parser.parse(query)
            if results and len(results) > 0:
                # 결과 검증 및 중복 제거
                validated = self._validate_and_dedup(results)
                self.success_count += 1
                return validated
        except Exception as e:
            print(f"DDG 파서 오류: {e}")
        
        # 2차: API 폴백 또는 빈 결과 반환
        # 실제 프로젝트에서는 유료 API (DuckDuckGo API, Google Custom Search 등)를 호출
        # 여기서는 시뮬레이션된 결과 반환
        self.fallback_count += 1
        return await self._api_fallback(query)
    
    async def _api_fallback(self, query: str) -> List[SearchResult]:
        """API 폴백 검색"""
        # 실제 구현 시:
        # - DuckDuckGo API 키가 있는 경우 호출
        # - Google Custom Search API 호출
        # - 다른 검색 엔진 API 활용
        
        # 시뮬레이션: 기본 파서로 다시 시도
        return self.basic_parser.parse(query)
    
    def _validate_and_dedup(self, results: List[SearchResult]) -> List[SearchResult]:
        """검증 및 중복 제거"""
        seen_urls = set()
        validated = []
        
        for result in results:
            if result.url not in seen_urls and result.title and result.snippet:
                seen_urls.add(result.url)
                validated.append(result)
        
        return validated
    
    def get_stats(self) -> Dict[str, int]:
        """검색 통계 반환"""
        return {
            "success_count": self.success_count,
            "fallback_count": self.fallback_count
        }