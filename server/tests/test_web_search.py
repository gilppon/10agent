import pytest
import asyncio
from server.services.web_search_service import web_search_service, WebSearchService
from server.services.integration_service import integration_service

@pytest.mark.asyncio
async def test_web_search_live_query():
    # Execute a real search query
    results = await web_search_service.search("Next.js 15 React 19", max_results=3)
    
    # We should receive results or empty list without any exception
    assert isinstance(results, list)
    if len(results) > 0:
        first = results[0]
        assert "title" in first
        assert "snippet" in first
        assert "url" in first
        assert first["url"].startswith("http")

def test_web_search_prompt_formatter():
    mock_results = [
        {
            "title": "2026 AI 트렌드 보고서",
            "snippet": "에이전트 중심의 자율 파이프라인이 대세가 되었습니다.",
            "url": "https://example.com/ai-2026"
        }
    ]
    
    formatted = web_search_service.format_search_results_for_prompt("2026 AI 트렌드", mock_results)
    
    assert "🌐 [실시간 인터넷 웹 검색 팩트체크 데이터" in formatted
    assert "2026 AI 트렌드 보고서" in formatted
    assert "https://example.com/ai-2026" in formatted
    assert "[🌐 참고 출처]" in formatted

@pytest.mark.asyncio
async def test_web_search_graceful_fallback():
    # Empty query should return empty list gracefully
    empty_res = await web_search_service.search("")
    assert empty_res == []

def test_integration_service_includes_duckduckgo():
    integrations = integration_service.list_integrations()
    service_ids = [i["service_id"] for i in integrations]
    assert "duckduckgo_search" in service_ids
    
    ddg_item = next(i for i in integrations if i["service_id"] == "duckduckgo_search")
    assert ddg_item["status"] == "연결됨"
    assert ddg_item["metadata"]["icon"] == "🌐"
