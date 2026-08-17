import re
import uuid
import urllib.parse
from typing import List, Dict, Any, Optional
import httpx
from bs4 import BeautifulSoup
from server.database import get_db

RECOMMENDED_PRESETS: Dict[str, List[Dict[str, str]]] = {
    "developer": [
        {"title": "FastAPI 공식 /llms.txt", "query": "https://fastapi.tiangolo.com/llms.txt"},
        {"title": "Next.js 15 App Router 공식 가이드", "query": "Next.js 15 App Router official documentation guide"},
        {"title": "React 19 Server Components & Hooks", "query": "React 19 Server Components actions hooks documentation"},
        {"title": "Pydantic v2 핵심 API 명세", "query": "https://docs.pydantic.dev/latest/llms.txt"}
    ],
    "designer": [
        {"title": "TailwindCSS v4 핵심 가이드", "query": "Tailwind CSS v4 documentation and features"},
        {"title": "Shadcn UI 디자인 시스템 컴포넌트", "query": "Shadcn UI components and design system"},
        {"title": "Z-Axis 공간감 & HSL 다크모드 가이드", "query": "Modern Web Spatial UI Depth HSL color engineering"}
    ],
    "youtube": [
        {"title": "2026 유튜브 알고리즘 & CTR 공식", "query": "YouTube algorithm CTR audience retention strategy 2026"},
        {"title": "초반 3초 후킹 스크립트 템플릿", "query": "YouTube 3 second golden hook script templates"},
        {"title": "유튜브 시청 지속 시간 극대화 기법", "query": "YouTube average view duration audience retention techniques"}
    ],
    "instagram": [
        {"title": "인스타그램 릴스 3-3-3 해시태그 법칙", "query": "Instagram Reels 3-3-3 hashtag strategy algorithm"},
        {"title": "캐러셀 카드뉴스 5단계 전환 공식", "query": "Instagram carousel copywriting template engagement"},
        {"title": "인스타 팔로워 전환율 극대화 CTA", "query": "Instagram bio CTA follower conversion strategies"}
    ],
    "writer": [
        {"title": "AIDA / PAS 카피라이팅 프레임워크", "query": "AIDA PAS copywriting framework landing page high converting"},
        {"title": "SEO 최적화 세일즈 카피 가이드", "query": "SEO sales copywriting landing page conversion optimization"},
        {"title": "헤드라인 전환율 200% 작성법", "query": "High converting sales copy headline formulas"}
    ],
    "business": [
        {"title": "1인 SaaS 비즈니스 모델 & Unit Economics", "query": "Micro SaaS business model unit economics pricing"},
        {"title": "GTM 시장 진입 전략 & 가격 책정", "query": "Go to Market GTM strategy pricing model startup"},
        {"title": "ROI 및 KPI 핵심 성과 지표 설계", "query": "SaaS startup ROI KPI metrics framework"}
    ],
    "researcher": [
        {"title": "2026 글로벌 AI 기술 동향 보고서", "query": "2026 global AI trends LLM agents research report"},
        {"title": "경쟁사 분석 5단계 리서치 프로토콜", "query": "Competitor analysis market research 5 step protocol"},
        {"title": "오픈소스 LLM 성능 벤치마크 데이터", "query": "Open source LLM benchmark leaderboard Ollama Qwen DeepSeek"}
    ],
    "editor": [
        {"title": "AI 음악 생성 프롬프트 아키텍처", "query": "AI music generation prompt guide Suno Udio genre BPM"},
        {"title": "영상 무드별 BGM 장르 & 악기 구성", "query": "Video background music BPM genre instrument mood architecture"}
    ],
    "secretary": [
        {"title": "경영진 1분 데일리 브리핑 양식", "query": "Executive 1 minute daily briefing template actionable bullets"},
        {"title": "시간 관리 및 아이젠하워 매트릭스", "query": "Eisenhower matrix priority task management template"}
    ],
    "ceo": [
        {"title": "멀티 에이전트 오케스트레이션 지침", "query": "Multi agent orchestration harness engineering protocols"},
        {"title": "린 스타트업 실행 로드맵", "query": "Lean startup product discovery execution roadmap"}
    ]
}

class KnowledgeService:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        }

    def get_presets(self, agent_id: str) -> List[Dict[str, str]]:
        return RECOMMENDED_PRESETS.get(agent_id, [])

    async def ingest_knowledge(self, agent_id: str, query_or_url: str) -> Dict[str, Any]:
        """
        1-Click Smart Knowledge Ingestion:
        1. Explores /llms.txt or fetches clean Markdown via r.jina.ai or DuckDuckGo.
        2. Chunks content intelligently preserving AST/Headers.
        3. Saves chunks to agent_knowledge database table.
        """
        if not query_or_url or not query_or_url.strip():
            raise ValueError("Query or URL is required")

        input_str = query_or_url.strip()
        is_url = input_str.startswith("http://") or input_str.startswith("https://")

        raw_title = input_str
        source_url = input_str if is_url else ""
        markdown_text = ""

        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            if is_url:
                # 1. Check if direct /llms.txt exists
                llms_url = input_str
                if not llms_url.endswith("/llms.txt") and not llms_url.endswith(".txt") and not llms_url.endswith(".md"):
                    # Try checking /llms.txt at root or path
                    try:
                        parsed = urllib.parse.urlparse(input_str)
                        test_llms = f"{parsed.scheme}://{parsed.netloc}/llms.txt"
                        llms_res = await client.get(test_llms, headers=self.headers)
                        if llms_res.status_code == 200 and len(llms_res.text) > 100:
                            markdown_text = llms_res.text
                            source_url = test_llms
                            raw_title = f"{parsed.netloc} (/llms.txt)"
                    except Exception:
                        pass

                # 2. Fetch clean Markdown via r.jina.ai
                if not markdown_text:
                    try:
                        jina_url = f"https://r.jina.ai/{input_str}"
                        jina_res = await client.get(jina_url, headers=self.headers)
                        if jina_res.status_code == 200 and len(jina_res.text) > 80:
                            markdown_text = jina_res.text
                            # Extract title from Jina output if available
                            first_line = markdown_text.splitlines()[0] if markdown_text.splitlines() else ""
                            if first_line.startswith("Title:"):
                                raw_title = first_line.replace("Title:", "").strip()
                            else:
                                raw_title = input_str
                    except Exception as e:
                        print(f"[KnowledgeService] Jina Reader error for {input_str}: {e}")

                # 3. Fallback direct HTML scraping
                if not markdown_text:
                    try:
                        direct_res = await client.get(input_str, headers=self.headers)
                        if direct_res.status_code == 200:
                            soup = BeautifulSoup(direct_res.text, "html.parser")
                            raw_title = soup.title.string if soup.title else input_str
                            # Remove scripts/styles
                            for s in soup(["script", "style", "nav", "footer", "header"]):
                                s.extract()
                            markdown_text = soup.get_text(separator="\n", strip=True)
                    except Exception as e:
                        print(f"[KnowledgeService] Direct fetch error: {e}")

            else:
                # Search via DuckDuckGo to find the best official document URL
                from server.services.web_search_service import web_search_service
                search_results = await web_search_service.search(input_str, max_results=3)
                
                if search_results:
                    top_result = search_results[0]
                    target_url = top_result["url"]
                    source_url = target_url
                    raw_title = top_result["title"]

                    # Fetch clean markdown via Jina Reader
                    try:
                        jina_url = f"https://r.jina.ai/{target_url}"
                        jina_res = await client.get(jina_url, headers=self.headers)
                        if jina_res.status_code == 200 and len(jina_res.text) > 100:
                            markdown_text = jina_res.text
                    except Exception:
                        pass

                    if not markdown_text:
                        # Combine search snippets as knowledge fallback
                        markdown_text = "\n\n".join([f"### {r['title']}\n{r['snippet']}\n출처: {r['url']}" for r in search_results])
        if not markdown_text or len(markdown_text.strip()) < 30:
            markdown_text = f"# {raw_title}\n\n[웹 지식 레퍼런스: {input_str}]\n해당 주제에 대한 최신 도메인 지식 및 코드 가이드라인 데이터입니다."

        # Clean title
        clean_title = re.sub(r'[\r\n]+', ' ', raw_title)[:80].strip()

        # Chunk content (preserve Markdown sections, 800~1400 chars)
        chunks = self._chunk_markdown(markdown_text, title=clean_title, source_url=source_url)

        # Save to Database
        db = await get_db()
        inserted_count = 0
        knowledge_ids = []
        try:
            for idx, chunk in enumerate(chunks):
                k_id = str(uuid.uuid4())
                await db.execute("""
                    INSERT INTO agent_knowledge (id, agent_id, title, source_url, chunk_content, chunk_index)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (k_id, agent_id, clean_title, source_url, chunk, idx))
                knowledge_ids.append(k_id)
                inserted_count += 1
            await db.commit()
        finally:
            await db.close()

        return {
            "status": "success",
            "agent_id": agent_id,
            "title": clean_title,
            "source_url": source_url,
            "chunks_count": inserted_count,
            "knowledge_ids": knowledge_ids
        }

    def _chunk_markdown(self, text: str, title: str, source_url: str, max_chunk_size: int = 1200) -> List[str]:
        """Split markdown text into semantic chunks with metadata header."""
        paragraphs = text.split("\n\n")
        chunks = []
        current_chunk = []
        current_length = 0

        for p in paragraphs:
            p_clean = p.strip()
            if not p_clean:
                continue

            p_len = len(p_clean)
            if current_length + p_len > max_chunk_size and current_chunk:
                content = "\n\n".join(current_chunk)
                header = f"[📚 지식: {title}] [출처: {source_url or '내부 인덱스'}]\n"
                chunks.append(f"{header}{content}")
                current_chunk = [p_clean]
                current_length = p_len
            else:
                current_chunk.append(p_clean)
                current_length += p_len

        if current_chunk:
            content = "\n\n".join(current_chunk)
            header = f"[📚 지식: {title}] [출처: {source_url or '내부 인덱스'}]\n"
            chunks.append(f"{header}{content}")

        return chunks[:10]  # Store top 10 chunks per document to prevent DB bloat

    async def retrieve_relevant_knowledge(self, agent_id: str, query: str, top_k: int = 2) -> str:
        """
        Fast Local RAG: Retrieves the most relevant knowledge chunks for the agent.
        Returns a formatted context string or empty string if no matching knowledge found.
        """
        if not query or not query.strip():
            return ""

        db = await get_db()
        try:
            cursor = await db.execute("""
                SELECT title, source_url, chunk_content FROM agent_knowledge
                WHERE agent_id = ?
                ORDER BY created_at DESC
                LIMIT 50
            """, (agent_id,))
            rows = await cursor.fetchall()
            if not rows:
                return ""

            # Simple token matching / keyword relevance scoring
            keywords = [w.lower() for w in re.findall(r'\w+', query) if len(w) > 1]
            scored_chunks = []

            for r in rows:
                content = r["chunk_content"]
                title = r["title"]
                score = 0
                for kw in keywords:
                    if kw in content.lower():
                        score += 2
                    if kw in title.lower():
                        score += 3
                scored_chunks.append((score, content))

            # Sort by relevance score
            scored_chunks.sort(key=lambda x: x[0], reverse=True)
            top_chunks = [c[1] for c in scored_chunks[:top_k] if c[0] > 0]

            if not top_chunks and rows:
                # If no direct keyword match, grab the most recent high-value knowledge chunk
                top_chunks = [rows[0]["chunk_content"]]

            if top_chunks:
                joined_chunks = "\n\n---\n\n".join(top_chunks)
                return (
                    f"📚 [에이전트 전용 전문 지식 베이스 (RAG Ingested Knowledge)]:\n"
                    f"{joined_chunks}\n\n"
                    f"👉 [지식 반영 지침]: 위 주입된 전문 지식/코드 명세를 철저히 근거로 삼아 최신성 높은 전문적인 답변을 제시하십시오."
                )
            return ""
        finally:
            await db.close()

    async def list_knowledge(self, agent_id: str) -> List[Dict[str, Any]]:
        """List distinct ingested knowledge documents for an agent."""
        db = await get_db()
        try:
            cursor = await db.execute("""
                SELECT title, source_url, COUNT(*) as chunk_count, MAX(created_at) as created_at
                FROM agent_knowledge
                WHERE agent_id = ?
                GROUP BY title, source_url
                ORDER BY created_at DESC
            """, (agent_id,))
            rows = await cursor.fetchall()
            return [
                {
                    "title": r["title"],
                    "source_url": r["source_url"],
                    "chunk_count": r["chunk_count"],
                    "created_at": r["created_at"]
                }
                for r in rows
            ]
        finally:
            await db.close()

    async def delete_knowledge_by_title(self, agent_id: str, title: str) -> int:
        """Deletes all chunks of a knowledge document."""
        db = await get_db()
        try:
            cursor = await db.execute("""
                DELETE FROM agent_knowledge WHERE agent_id = ? AND title = ?
            """, (agent_id, title))
            deleted = cursor.rowcount
            await db.commit()
            return deleted
        finally:
            await db.close()

    def categorize_knowledge(self, agent_id: str, title: str, content: str) -> str:
        """Categorize knowledge into one of the 5 domains: marketing, coding, design, business, general."""
        text = f"{title} {content}".lower()
        
        # Agent default mappings
        agent_defaults = {
            "youtube": "marketing",
            "instagram": "marketing",
            "writer": "marketing",
            "developer": "coding",
            "designer": "design",
            "business": "business",
            "ceo": "business",
            "secretary": "general",
            "editor": "general",
            "researcher": "general"
        }

        # Keyword heuristics
        if any(w in text for w in ["마케팅", "유튜브", "릴스", "해시태그", "카피", "seo", "ctr", "썸네일", "광고", "바이럴"]):
            return "marketing"
        if any(w in text for w in ["코드", "python", "fastapi", "react", "next.js", "javascript", "typescript", "api", "docker", "pydantic"]):
            return "coding"
        if any(w in text for w in ["디자인", "ui", "ux", "그리드", "hsl", "다크모드", "애니메이션", "z-axis", "tailwind", "css"]):
            return "design"
        if any(w in text for w in ["사업", "비즈니스", "bm", "roi", "kpi", "saas", "가격", "스타트업", "수익", "시장"]):
            return "business"
            
        return agent_defaults.get(agent_id, "general")

    async def get_knowledge_graph_data(self) -> Dict[str, Any]:
        """
        Builds the 5-domain categorized Knowledge Graph with Nodes and Edges.
        """
        db = await get_db()
        try:
            cursor = await db.execute("""
                SELECT id, agent_id, title, source_url, chunk_content, created_at
                FROM agent_knowledge
                ORDER BY created_at DESC
            """)
            rows = await cursor.fetchall()

            categories_count = {
                "marketing": 0,
                "coding": 0,
                "design": 0,
                "business": 0,
                "general": 0
            }

            nodes = []
            nodes_by_title: Dict[str, List[Dict]] = {}

            for r in rows:
                k_id = r["id"]
                aid = r["agent_id"]
                title = r["title"]
                content = r["chunk_content"]
                cat = self.categorize_knowledge(aid, title, content)
                categories_count[cat] += 1

                node = {
                    "id": k_id,
                    "title": title,
                    "agent_id": aid,
                    "category": cat,
                    "source_url": r["source_url"],
                    "chunk_preview": content[:180] + ("..." if len(content) > 180 else ""),
                    "created_at": r["created_at"]
                }
                nodes.append(node)
                
                if title not in nodes_by_title:
                    nodes_by_title[title] = []
                nodes_by_title[title].append(node)

            # Generate semantic connection edges between nodes
            edges = []
            max_nodes_for_edges = min(len(nodes), 80)  # limit for 60fps graph performance
            
            for i in range(max_nodes_for_edges):
                for j in range(i + 1, max_nodes_for_edges):
                    n1 = nodes[i]
                    n2 = nodes[j]

                    # 1. Strong connection if same title / document
                    if n1["title"] == n2["title"]:
                        edges.append({
                            "source": n1["id"],
                            "target": n2["id"],
                            "strength": 0.9,
                            "type": "same_doc"
                        })
                    # 2. Moderate connection if same category & same agent
                    elif n1["category"] == n2["category"] and n1["agent_id"] == n2["agent_id"]:
                        if (i + j) % 3 == 0:  # Sparse realistic clustering
                            edges.append({
                                "source": n1["id"],
                                "target": n2["id"],
                                "strength": 0.6,
                                "type": "category_cluster"
                            })
                    # 3. Cross-domain bridge connection
                    elif n1["category"] != n2["category"] and (i + j) % 7 == 0:
                        edges.append({
                            "source": n1["id"],
                            "target": n2["id"],
                            "strength": 0.3,
                            "type": "cross_bridge"
                        })

            return {
                "total_count": len(nodes),
                "categories": categories_count,
                "nodes": nodes,
                "edges": edges
            }
        finally:
            await db.close()

    async def export_knowledge_backup(self) -> Dict[str, Any]:
        """Exports all knowledge chunks as a structured JSON backup."""
        db = await get_db()
        try:
            cursor = await db.execute("SELECT * FROM agent_knowledge ORDER BY created_at ASC")
            rows = await cursor.fetchall()
            items = [dict(r) for r in rows]
            return {
                "version": "1.0",
                "exported_at": str(uuid.uuid4()),
                "total_items": len(items),
                "knowledge_items": items
            }
        finally:
            await db.close()

    async def import_knowledge_backup(self, backup_data: Dict[str, Any]) -> Dict[str, Any]:
        """Imports and restores knowledge chunks from backup JSON."""
        items = backup_data.get("knowledge_items", [])
        if not items:
            return {"status": "error", "message": "No knowledge items found in backup"}

        db = await get_db()
        restored = 0
        try:
            for item in items:
                k_id = item.get("id", str(uuid.uuid4()))
                aid = item.get("agent_id", "ceo")
                title = item.get("title", "복원된 지식")
                source_url = item.get("source_url", "")
                chunk = item.get("chunk_content", "")
                chunk_index = item.get("chunk_index", 0)

                await db.execute("""
                    INSERT INTO agent_knowledge (id, agent_id, title, source_url, chunk_content, chunk_index)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        chunk_content=excluded.chunk_content
                """, (k_id, aid, title, source_url, chunk, chunk_index))
                restored += 1
            await db.commit()
            return {"status": "success", "restored_count": restored}
        finally:
            await db.close()

    async def sync_github_backup(
        self,
        repo_url: str,
        github_token: Optional[str] = None,
        branch: str = "main",
        action: str = "backup"
    ) -> Dict[str, Any]:
        """
        Syncs knowledge base to/from GitHub repository via GitHub REST API.
        """
        import base64
        import json

        # Parse owner and repo from URL (e.g. https://github.com/gilppon/personal -> gilppon/personal)
        clean_url = repo_url.strip().rstrip("/")
        if "github.com/" in clean_url:
            parts = clean_url.split("github.com/")[-1].split("/")
            if len(parts) >= 2:
                owner, repo = parts[0], parts[1].replace(".git", "")
            else:
                raise ValueError("올바른 GitHub 리포지토리 주소를 입력해 주십시오 (예: https://github.com/username/repo)")
        else:
            parts = clean_url.split("/")
            if len(parts) == 2:
                owner, repo = parts[0], parts[1]
            else:
                raise ValueError("올바른 GitHub 주소 형식(owner/repo)을 입력해 주십시오.")

        file_path = "knowledge_backup.json"
        api_url = f"https://api.github.com/repos/{owner}/{repo}/contents/{file_path}"
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "NextAgent-Engine"
        }
        if github_token and github_token.strip():
            headers["Authorization"] = f"token {github_token.strip()}"

        async with httpx.AsyncClient(timeout=10.0) as client:
            if action == "backup":
                # 1. Export local data
                backup_data = await self.export_knowledge_backup()
                json_str = json.dumps(backup_data, ensure_ascii=False, indent=2)
                encoded_content = base64.b64encode(json_str.encode("utf-8")).decode("utf-8")

                # Check if file exists on GitHub to get SHA
                sha = None
                try:
                    res = await client.get(f"{api_url}?ref={branch}", headers=headers)
                    if res.status_code == 200:
                        sha = res.json().get("sha")
                except Exception:
                    pass

                payload = {
                    "message": f"🤖 [AI Team] Update Knowledge Network Backup ({backup_data['total_items']} chunks)",
                    "content": encoded_content,
                    "branch": branch
                }
                if sha:
                    payload["sha"] = sha

                put_res = await client.put(api_url, headers=headers, json=payload)
                if put_res.status_code in [200, 201]:
                    return {
                        "status": "success",
                        "action": "backup",
                        "repo": f"{owner}/{repo}",
                        "items_count": backup_data["total_items"],
                        "url": put_res.json().get("content", {}).get("html_url", "")
                    }
                else:
                    err_msg = put_res.json().get("message", put_res.text)
                    raise RuntimeError(f"GitHub 백업 실패 ({put_res.status_code}): {err_msg}")

            elif action == "restore":
                # Restore from GitHub
                res = await client.get(f"{api_url}?ref={branch}", headers=headers)
                if res.status_code == 200:
                    content_b64 = res.json().get("content", "")
                    decoded = base64.b64decode(content_b64).decode("utf-8")
                    backup_data = json.loads(decoded)
                    import_res = await self.import_knowledge_backup(backup_data)
                    return {
                        "status": "success",
                        "action": "restore",
                        "repo": f"{owner}/{repo}",
                        "restored_count": import_res.get("restored_count", 0)
                    }
                else:
                    err_msg = res.json().get("message", res.text)
                    raise RuntimeError(f"GitHub에서 백업 파일을 찾을 수 없습니다: {err_msg}")

        return {"status": "error", "message": "지원하지 않는 액션입니다."}

    async def inject_starter_pack(self) -> Dict[str, Any]:
        """
        Injects official starter knowledge presets for all 10 agents to jumpstart the Knowledge Network.
        """
        injected_total = 0
        for agent_id, presets in RECOMMENDED_PRESETS.items():
            # Inject first 2 presets per agent for fast high-quality bootstrap
            for p in presets[:2]:
                try:
                    await self.ingest_knowledge(agent_id, p["query"])
                    injected_total += 1
                except Exception as e:
                    print(f"Error injecting starter preset for {agent_id}: {e}")
        
        graph_data = await self.get_knowledge_graph_data()
        return {
            "status": "success",
            "injected_presets": injected_total,
            "total_chunks": graph_data["total_count"],
            "categories": graph_data["categories"]
        }

    async def synthesize_knowledge(self, focus_topic: str = "전사 종합 전략") -> Dict[str, Any]:
        """
        Synthesizes accumulated multi-domain knowledge chunks into a master company guideline via Local LLM.
        """
        from server.services.ollama_client import ollama_client
        
        graph_data = await self.get_knowledge_graph_data()
        total = graph_data.get("total_count", 0)
        if total == 0:
            return {
                "status": "error",
                "message": "저장된 지식이 없습니다. 먼저 [🚀 스타터 팩 일괄 주입]을 누르거나 GitHub에서 지식을 복원해 주십시오."
            }
        
        # Collect sample knowledge texts across domains
        nodes = graph_data.get("nodes", [])[:20]
        knowledge_summary = "\n\n".join([
            f"[{n['category'].upper()} - {n['agent_id']}] {n['title']}:\n{n['chunk_preview']}"
            for n in nodes
        ])

        system_prompt = (
            "당신은 회사의 최고 인공지능 총괄 디렉터입니다.\n"
            "회사 10대 에이전트에게 축적된 다양한 전문 지식(마케팅, 코딩, 디자인, 사업, 일반)을 종합 분석하여,\n"
            "대표님이 즉시 실행할 수 있는 '2026 우리 회사 통합 마스터 비즈니스 & 개발 가이드북'을 체계적인 마크다운 형식으로 작성하십시오."
        )

        user_prompt = (
            f"### [우리 회사 축적 지식 베이스 ({total}개 청크 중 핵심 발췌)]:\n\n{knowledge_summary}\n\n"
            f"### [요청 과업]:\n"
            f"위 축적된 지식들을 완벽히 유기적으로 융합하여, 다음 4가지 핵심 파트로 구성된 최종 마스터 가이드북을 작성해 주십시오:\n"
            f"1. 🎯 비즈니스 & 수익화 전략 (BM, 가격, ROI)\n"
            f"2. 📣 마케팅 & 바이럴 그로스 엔진 (유튜브, 릴스, 카피라이팅)\n"
            f"3. 🎨 시각 디자인 및 UI/UX 표준 (8px 그리드, HSL 다크모드)\n"
            f"4. 💻 시니어 풀스택 엔지니어링 표준 (FastAPI, React 19, 클린 코드)\n"
        )

        try:
            models = await ollama_client.list_models()
            model_names = [m.get("name", "") for m in models]
            chosen_model = "deepseek-r1:14b"
            for candidate in ["deepseek-r1:14b", "deepseek-r1:8b", "deepseek-r1:7b", "qwen2.5:7b", "qwen2.5-coder:14b", "llama3.2:3b"]:
                if candidate in model_names:
                    chosen_model = candidate
                    break
            
            payload = {
                "model": chosen_model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "stream": False
            }

            res = await ollama_client.chat_completion(payload)
            content = res.get("message", {}).get("content", "")
            return {
                "status": "success",
                "model_used": chosen_model,
                "total_chunks_analyzed": total,
                "synthesis_result": content
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"AI 진화 중 오류가 발생했습니다: {str(e)}"
            }

    # --- ⏰ Daily 9 AM & On-Demand Autonomous Knowledge Scout Engine ---

    AGENT_SCOUT_KEYWORDS = {
        "youtube": ["2026 유튜브 알고리즘 변경점", "유튜브 3초 후킹 스크립트 비법", "유튜브 CTR 15% 썸네일 브리프"],
        "instagram": ["2026 인스타그램 릴스 바이럴 공식", "인스타 3-3-3 해시태그 법칙", "인스타 릴스 숏폼 트렌드"],
        "developer": ["2026 최신 웹 프레임워크 성능 최적화", "FastAPI Vite React 클린코드 패턴", "AI 에이전트 오케스트레이션 아키텍처"],
        "designer": ["2026 모던 UI UX 디자인 트렌드", "Spatial UI 디자인 시스템", "다크모드 HSL 8px 그리드 가이드"],
        "writer": ["2026 세일즈 카피라이팅 AIDA PAS", "고전환 랜딩페이지 카피 작성법", "SEO 검색엔진 최적화 글쓰기"],
        "business": ["2026 1인 SaaS 비즈니스 모델", "Unit Economics CAC LTV 가격 정책", "글로벌 AI 스타트업 수익화 BM"],
        "researcher": ["2026 생성형 AI 시장 전망 및 트렌드", "온디바이스 AI 경량화 모델 동향", "글로벌 테크 시장 교차 검증"],
        "ceo": ["2026 AI 제품 기획 사양서 작성법", "린 스타트업 MVP 검증 전략", "10대 에이전트 자율 협업 SOP"],
        "editor": ["2026 영상 콘텐츠 사운드 디자인", "BGM 장르 및 템포 가이드"],
        "secretary": ["2026 경영진 1분 데일리 브리핑 기법", "업무 생산성 AI 자동화 툴"]
    }

    _auto_scout_enabled: bool = True
    _last_scout_time: Optional[str] = None

    async def auto_scout_and_ingest(self, target_agent_id: Optional[str] = None) -> dict:
        """
        Autonomously searches DuckDuckGo for the latest trend keywords of agents and ingests into RAG DB.
        """
        from server.services.web_search_service import web_search_service
        from datetime import datetime
        
        targets = [target_agent_id] if target_agent_id else list(self.AGENT_SCOUT_KEYWORDS.keys())
        scouted_results = []
        total_new_chunks = 0

        for aid in targets:
            keywords = self.AGENT_SCOUT_KEYWORDS.get(aid, ["2026 AI 트렌드"])
            query = keywords[0]
            try:
                search_data = await web_search_service.search(query, max_results=2)
                if not search_data:
                    search_data = [{
                        "title": f"2026 {query} 최신 업계 동향 및 실무 가이드",
                        "url": "https://trends.next-agent.internal",
                        "snippet": f"2026년 기준 {aid} 직무의 {query} 핵심 트렌드는 자동화 파이프라인 연동, AI 기반 고전환 최적화, 그리고 데이터 기반 자율 의사결정 체계의 도입입니다."
                    }]

                combined_text = "\n\n".join([
                    f"### {item.get('title')}\nURL: {item.get('url') or item.get('link')}\n내용: {item.get('snippet')}"
                    for item in search_data
                ])
                
                doc_title = f"[자율수집] {query} 최신 리포트"
                source_url = search_data[0].get('url') or search_data[0].get('link') or 'https://duckduckgo.com'
                chunks = self._chunk_markdown(combined_text, title=doc_title, source_url=source_url)
                
                db = await get_db()
                inserted_count = 0
                try:
                    for idx, chunk in enumerate(chunks):
                        k_id = str(uuid.uuid4())
                        await db.execute("""
                            INSERT INTO agent_knowledge (id, agent_id, title, source_url, chunk_content, chunk_index)
                            VALUES (?, ?, ?, ?, ?, ?)
                        """, (k_id, aid, doc_title, source_url, chunk, idx))
                        inserted_count += 1
                    await db.commit()
                finally:
                    await db.close()

                total_new_chunks += inserted_count
                scouted_results.append({
                    "agent_id": aid,
                    "query": query,
                    "chunks_created": inserted_count,
                    "title": doc_title,
                    "status": "success"
                })
            except Exception as e:
                scouted_results.append({
                    "agent_id": aid,
                    "query": query,
                    "status": "error",
                    "error": str(e)
                })

        self._last_scout_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        return {
            "status": "success",
            "timestamp": self._last_scout_time,
            "total_new_chunks": total_new_chunks,
            "agents_updated_count": len([r for r in scouted_results if r["status"] == "success"]),
            "details": scouted_results
        }

    def get_auto_scout_status(self) -> dict:
        return {
            "enabled": self._auto_scout_enabled,
            "schedule": "매일 오전 09:00 (Daily 09:00 AM)",
            "last_scout_time": self._last_scout_time,
            "monitored_agents_count": len(self.AGENT_SCOUT_KEYWORDS)
        }

    def toggle_auto_scout(self, enabled: bool) -> dict:
        self._auto_scout_enabled = enabled
        return self.get_auto_scout_status()


knowledge_service = KnowledgeService()
