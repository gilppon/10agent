import asyncio
import urllib.parse
from typing import List, Dict, Any, Optional
import httpx
from bs4 import BeautifulSoup

class WebSearchService:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        }

    async def search(self, query: str, max_results: int = 4) -> List[Dict[str, str]]:
        """
        Executes a 100% free web search using DuckDuckGo HTML parser.
        Returns a list of dicts: [{"title": ..., "snippet": ..., "url": ...}]
        """
        if not query or not query.strip():
            return []

        cleaned_query = query.strip()
        # Remove common greeting prefixes if any
        for prefix in ["안녕", "정우야", "알려줘", "조사해줘", "검색해줘"]:
            if cleaned_query.startswith(prefix):
                cleaned_query = cleaned_query[len(prefix):].strip()

        if not cleaned_query:
            cleaned_query = query.strip()

        url = "https://html.duckduckgo.com/html/"
        data = {"q": cleaned_query}

        results: List[Dict[str, str]] = []
        try:
            async with httpx.AsyncClient(timeout=6.0, follow_redirects=True) as client:
                response = await client.post(url, data=data, headers=self.headers)
                if response.status_code != 200:
                    # Fallback to GET
                    response = await client.get(f"{url}?q={urllib.parse.quote(cleaned_query)}", headers=self.headers)

                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, "html.parser")
                    result_elements = soup.select(".result.results_links")
                    
                    for elem in result_elements[:max_results]:
                        title_elem = elem.select_one(".result__title a.result__a")
                        snippet_elem = elem.select_one(".result__snippet")
                        
                        if not title_elem:
                            continue
                            
                        title = title_elem.get_text(strip=True)
                        raw_href = title_elem.get("href", "")
                        
                        # Extract real URL from duckduckgo redirect if present
                        actual_url = raw_href
                        if "uddg=" in raw_href:
                            parsed = urllib.parse.urlparse(raw_href)
                            qs = urllib.parse.parse_qs(parsed.query)
                            if "uddg" in qs and qs["uddg"]:
                                actual_url = urllib.parse.unquote(qs["uddg"][0])
                                
                        snippet = snippet_elem.get_text(strip=True) if snippet_elem else ""
                        
                        if title and actual_url:
                            results.append({
                                "title": title,
                                "snippet": snippet,
                                "url": actual_url
                            })
        except Exception as e:
            # Graceful fallback: log warning and return empty list to prevent pipeline crash
            print(f"[WebSearchService] Search warning for query '{query}': {e}")
            return []

        return results

    def format_search_results_for_prompt(self, query: str, results: List[Dict[str, str]]) -> str:
        """
        Formats search results into a clean structured RAG context block for LLM consumption.
        """
        if not results:
            return ""

        lines = [f"🌐 [실시간 인터넷 웹 검색 팩트체크 데이터 (검색어: '{query}')]:"]
        for idx, r in enumerate(results, 1):
            lines.append(f"{idx}. **{r['title']}**\n   - 요약: {r['snippet']}\n   - 출처: {r['url']}")
        
        lines.append("\n👉 [정우 팩트 지시]: 위 실시간 검색 결과를 면밀히 분석하여 답변에 반영하고, 답변 끝에 '[🌐 참고 출처]' 섹션과 함께 링크를 인용하십시오.")
        return "\n".join(lines)

web_search_service = WebSearchService()
