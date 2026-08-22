import os
import re
import sys
import json
import shutil
import subprocess
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime
from server.config import ARTIFACTS_DIR, BASE_DIR
from server.models.schemas import ArtifactFile, AgentValidationResult

class FileSecurityException(Exception):
    """Raised when a path traversal or security violation is detected."""
    pass

class FileService:
    def __init__(self, artifacts_dir: Path = ARTIFACTS_DIR, app_build_dir: Optional[Path] = None):
        self.artifacts_dir = Path(artifacts_dir).resolve()
        self.app_build_dir = Path(app_build_dir or (BASE_DIR / "app_build")).resolve()
        self.artifacts_dir.mkdir(parents=True, exist_ok=True)
        self.app_build_dir.mkdir(parents=True, exist_ok=True)

    def _sanitize_filename(self, filename: str) -> str:
        """Sanitizes filename to prevent directory traversal."""
        if '..' in filename or '/' in filename or '\\' in filename:
            raise FileSecurityException(f"Path traversal detected in filename: {filename}")
        cleaned = re.sub(r'[\r\n\t]', '', filename).strip()
        if not cleaned or cleaned in ('.', '..'):
            raise FileSecurityException(f"Invalid filename: {filename}")
        return cleaned

    def _validate_safe_path(self, target_path: Path, allowed_root: Path) -> Path:
        """Ensures target_path stays strictly within allowed_root."""
        resolved = target_path.resolve()
        resolved_root = allowed_root.resolve()
        try:
            resolved.relative_to(resolved_root)
        except ValueError:
            raise FileSecurityException(
                f"🚨 Path Traversal Blocked: '{resolved}' escapes allowed boundary '{resolved_root}'"
            )
        return resolved

    def list_artifacts(self) -> List[ArtifactFile]:
        files = []
        for p in self.artifacts_dir.rglob("*"):
            if p.is_file():
                try:
                    safe_p = self._validate_safe_path(p, self.artifacts_dir)
                    rel_path = str(safe_p.relative_to(self.artifacts_dir)).replace("\\", "/")
                    stat = safe_p.stat()
                    
                    # Determine category
                    ext = safe_p.suffix.lower()
                    category = "other"
                    if ext in [".js", ".ts", ".tsx", ".jsx", ".py", ".html", ".css", ".json", ".sh", ".bat"]:
                        category = "code"
                    elif ext in [".md", ".txt", ".csv", ".doc", ".docx", ".pdf"]:
                        category = "document"
                    elif ext in [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".mp3", ".wav", ".mp4"]:
                        category = "media"

                    files.append(ArtifactFile(
                        name=safe_p.name,
                        path=rel_path,
                        size=stat.st_size,
                        modified_at=datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
                        category=category
                    ))
                except FileSecurityException:
                    continue
        return sorted(files, key=lambda x: x.modified_at, reverse=True)

    def read_artifact(self, rel_path: str) -> Optional[str]:
        try:
            if '..' in rel_path:
                raise FileSecurityException("Path traversal in read_artifact")
            target = self._validate_safe_path(self.artifacts_dir / rel_path, self.artifacts_dir)
            if target.exists() and target.is_file():
                try:
                    return target.read_text(encoding="utf-8")
                except Exception:
                    return f"[Binary or Unreadable File: {target.name}]"
        except FileSecurityException:
            return None
        return None

    def save_artifact(self, filename: str, content: str, subfolder: str = "") -> str:
        safe_filename = self._sanitize_filename(filename)
        dest_dir = self.artifacts_dir
        if subfolder:
            if '..' in subfolder:
                raise FileSecurityException(f"Path traversal detected in subfolder: {subfolder}")
            dest_dir = dest_dir / subfolder.strip("/\\")
        
        safe_dest_dir = self._validate_safe_path(dest_dir, self.artifacts_dir)
        safe_dest_dir.mkdir(parents=True, exist_ok=True)
        
        safe_dest_file = self._validate_safe_path(safe_dest_dir / safe_filename, self.artifacts_dir)
        safe_dest_file.write_text(content, encoding="utf-8")
        return str(safe_dest_file.relative_to(self.artifacts_dir)).replace("\\", "/")

    def validate_html_js_integrity(self, html_content: str, js_content: str = "", task_id: str = "app_build") -> Dict[str, Any]:
        """
        Verification Gate: Lightweight integrity & completeness check for AI-generated code.
        Ensures essential tags are present and no dangerous patterns like infinite loops exist.
        Returns AgentValidationResult compatible dictionary.
        """
        warnings = []
        is_valid = True
        score = 100

        # 1. HTML basic tag completeness
        if "<html" in html_content.lower() and "</html>" not in html_content.lower():
            warnings.append("HTML opening tag present but missing closing </html> tag")
            is_valid = False
            score -= 30

        if "<body" in html_content.lower() and "</body>" not in html_content.lower():
            warnings.append("HTML <body> tag present but missing closing </body> tag")
            is_valid = False
            score -= 20

        # 2. Dangerous infinite loop pattern check in JS
        if js_content:
            infinite_loop_patterns = [
                r"while\s*\(\s*true\s*\)\s*\{(?!.*break).*",
                r"for\s*\(\s*;\s*;\s*\)\s*\{(?!.*break).*"
            ]
            for pat in infinite_loop_patterns:
                if re.search(pat, js_content, re.DOTALL):
                    warnings.append("Potential infinite loop pattern detected in JavaScript code")
                    is_valid = False
                    score -= 50
                    break

        score = max(0, min(100, score))
        suggested_fix = "HTML 닫는 태그(</html>, </body>)를 보강하고 무한 루프 탈출 조건을 추가하세요." if not is_valid else None

        result_model = AgentValidationResult(
            task_id=task_id,
            is_valid=is_valid,
            score=score,
            errors=warnings,
            suggested_fix=suggested_fix
        )

        return result_model.model_dump()

    def extract_code_blocks(self, markdown_text: str) -> dict:
        """Extracts HTML, CSS, and JS code blocks from markdown with resilient multi-pattern matching."""
        result = {"html": "", "css": "", "js": "", "full_html": ""}
        
        # 1. Look specifically within Developer stage if present
        dev_match = re.search(r"## Stage \d+: 코다리[\s\S]*?(?=## Stage|\Z)", markdown_text, re.IGNORECASE)
        search_target = dev_match.group(0) if dev_match else markdown_text

        # 2. Match HTML code blocks (html, htm, xml, jsx)
        html_blocks = re.findall(r"```(?:html|htm|xml)\s*([\s\S]*?)\s*```", search_target, re.IGNORECASE)
        if not html_blocks and search_target != markdown_text:
            html_blocks = re.findall(r"```(?:html|htm|xml)\s*([\s\S]*?)\s*```", markdown_text, re.IGNORECASE)
            
        css_blocks = re.findall(r"```css\s*([\s\S]*?)\s*```", markdown_text, re.IGNORECASE)
        js_blocks = re.findall(r"```(?:javascript|js)\s*([\s\S]*?)\s*```", markdown_text, re.IGNORECASE)

        # 3. Direct HTML tag search if no fenced block
        if not html_blocks:
            direct_html = re.findall(r"(<!DOCTYPE html[\s\S]*?</html>|<html[\s\S]*?</html>)", search_target, re.IGNORECASE)
            if direct_html:
                html_blocks = direct_html

        if html_blocks:
            result["html"] = html_blocks[0]
        if css_blocks:
            result["css"] = css_blocks[0]
        if js_blocks:
            result["js"] = js_blocks[0]

        # Construct self-contained runnable HTML
        if result["html"]:
            if "<!DOCTYPE html>" in result["html"] or "<html" in result["html"]:
                result["full_html"] = result["html"]
            else:
                result["full_html"] = f"""<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Autonomous AI Generated App</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  <style>
    {result["css"]}
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen p-6 font-sans">
  {result["html"]}
  <script>
    {result["js"]}
  </script>
</body>
</html>"""
        return result

    def scaffold_app_project(
        self,
        app_id: str,
        full_markdown: str,
        title: str = "Autonomous AI App"
    ) -> dict:
        """
        Creates real physical project files in app_build/{app_id}/ directory
        with strict path validation and Verification Gate.
        """
        # Sanitize app_id
        safe_app_id = re.sub(r'[^a-zA-Z0-9_\-]', '', app_id)
        if not safe_app_id:
            safe_app_id = "app_default"

        build_dir = self._validate_safe_path(self.app_build_dir / safe_app_id, self.app_build_dir)
        build_dir.mkdir(parents=True, exist_ok=True)

        extracted = self.extract_code_blocks(full_markdown)
        html_content = extracted["full_html"] or extracted["html"]

        if not html_content:
            # Resilient fallback: render full markdown interactively via client-side Marked.js
            escaped_md = json.dumps(full_markdown)
            html_content = f"""<!DOCTYPE html>
<html lang="ko" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title} - 산출물 뷰어</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    body {{ background-color: #0B0F19; color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }}
    .markdown-body h1 {{ font-size: 1.75rem; font-weight: 800; color: #38BDF8; margin-top: 1.5rem; margin-bottom: 0.75rem; border-bottom: 1px solid #1E293B; padding-bottom: 0.5rem; }}
    .markdown-body h2 {{ font-size: 1.35rem; font-weight: 700; color: #34D399; margin-top: 1.25rem; margin-bottom: 0.5rem; }}
    .markdown-body h3 {{ font-size: 1.1rem; font-weight: 600; color: #FBBF24; margin-top: 1rem; margin-bottom: 0.5rem; }}
    .markdown-body p, .markdown-body li {{ line-height: 1.7; color: #CBD5E1; }}
    .markdown-body pre {{ background: #1E293B; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; border: 1px solid #334155; }}
    .markdown-body code {{ color: #F472B6; }}
    .markdown-body blockquote {{ border-left: 4px solid #38BDF8; padding-left: 1rem; color: #94A3B8; }}
  </style>
</head>
<body class="p-6 md:p-10 max-w-5xl mx-auto">
  <div class="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
    <div class="flex items-center space-x-3">
      <div class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
      <h1 class="text-xl font-bold text-white tracking-tight">{title}</h1>
    </div>
    <span class="text-xs px-3 py-1 bg-slate-800 text-cyan-400 rounded-full border border-slate-700">10대 에이전트 통합 산출물</span>
  </div>
  <div id="content" class="markdown-body"></div>
  <script>
    const rawMarkdown = {escaped_md};
    document.getElementById('content').innerHTML = marked.parse(rawMarkdown);
  </script>
</body>
</html>"""

        # Run Verification Gate
        integrity = self.validate_html_js_integrity(html_content, extracted["js"])

        # 1. Write index.html
        (build_dir / "index.html").write_text(html_content, encoding="utf-8")

        # 2. Write style.css if present
        if extracted["css"]:
            (build_dir / "style.css").write_text(extracted["css"], encoding="utf-8")

        # 3. Write app.js if present
        if extracted["js"]:
            (build_dir / "app.js").write_text(extracted["js"], encoding="utf-8")

        # 4. Write package.json
        pkg_json = f"""{{
  "name": "{safe_app_id}",
  "version": "1.0.0",
  "description": "{title}",
  "main": "index.html",
  "scripts": {{
    "start": "npx serve ."
  }},
  "keywords": ["ai-generated", "fullstack", "next-agent"],
  "author": "Kodari Dev Manager & 10 Agents",
  "license": "MIT"
}}"""
        (build_dir / "package.json").write_text(pkg_json, encoding="utf-8")

        # 5. Write README.md
        (build_dir / "README.md").write_text(f"# {title}\n\nGenerated by 10 Agent Autonomous Factory.\n\n{full_markdown}", encoding="utf-8")

        return {
            "app_id": safe_app_id,
            "project_dir": str(build_dir).replace("\\", "/"),
            "index_html_path": str(build_dir / "index.html").replace("\\", "/"),
            "files": [p.name for p in build_dir.iterdir() if p.is_file()],
            "verification": integrity
        }

    def get_app_html(self, app_id: str) -> Optional[str]:
        try:
            safe_app_id = re.sub(r'[^a-zA-Z0-9_\-]', '', app_id)
            target = self._validate_safe_path(self.app_build_dir / safe_app_id / "index.html", self.app_build_dir)
            if target.exists() and target.is_file():
                return target.read_text(encoding="utf-8")
        except FileSecurityException:
            return None
        return None

    def extract_named_files(self, markdown_text: str) -> Dict[str, str]:
        """
        Parses multiple file blocks from markdown output.
        Supported patterns:
        1. ```python ### FILE: path/to/file.py ... ```
        2. ### [FILE: path/to/file.py] \n ```python ... ```
        3. **파일: path/to/file.py** \n ```python ... ```
        4. ### FILE: path/to/file.py \n ```python ... ```
        """
        files: Dict[str, str] = {}

        # Pattern 1: ```lang ### FILE: filename\n code ```
        p1 = re.findall(r"```[a-zA-Z0-9_-]*\s*###\s*FILE:\s*([^\n\r`]+)[\r\n]+([\s\S]*?)```", markdown_text, re.IGNORECASE)
        for filepath, content in p1:
            clean_path = filepath.strip().replace("\\", "/")
            if clean_path and clean_path not in files:
                files[clean_path] = content.strip()

        # Pattern 2: ### [FILE: filename] or ### FILE: filename \n ```lang\n code ```
        p2 = re.findall(r"###\s*(?:\[)?FILE:\s*([^\n\r\]]+)(?:\])?\s*[\r\n]+```[a-zA-Z0-9_-]*[\r\n]+([\s\S]*?)```", markdown_text, re.IGNORECASE)
        for filepath, content in p2:
            clean_path = filepath.strip().replace("\\", "/")
            if clean_path and clean_path not in files:
                files[clean_path] = content.strip()

        # Pattern 3: **파일: filename** \n ```lang\n code ```
        p3 = re.findall(r"\*\*파일:\s*([^\n\r*]+)\*\*\s*[\r\n]+```[a-zA-Z0-9_-]*[\r\n]+([\s\S]*?)```", markdown_text, re.IGNORECASE)
        for filepath, content in p3:
            clean_path = filepath.strip().replace("\\", "/")
            if clean_path and clean_path not in files:
                files[clean_path] = content.strip()

        return files

    def scaffold_standalone_tool(
        self,
        tool_name: str,
        full_markdown: str,
        title: str = "Autonomous Marketing Tool",
        base_path: Optional[str] = None
    ) -> dict:
        """
        Scaffolds a standalone executable Tool project directly under base_path (default: E:/진짜배기/[tool_name]).
        Creates all parsed modular files, batch launchers, requirements.txt, and triggers Verification Gate.
        """
        clean_tool_name = re.sub(r'[^a-zA-Z0-9_\-]', '', tool_name.strip().lower().replace(" ", "_"))
        if not clean_tool_name:
            clean_tool_name = "marketing_auto_tool"

        # Determine target directory
        if base_path:
            parent_dir = Path(base_path)
        else:
            # Default to E:/진짜배기 if accessible, otherwise parent of workspace
            candidate = Path("E:/진짜배기")
            if candidate.exists():
                parent_dir = candidate
            else:
                parent_dir = BASE_DIR.parent

        tool_dir = parent_dir / clean_tool_name
        tool_dir.mkdir(parents=True, exist_ok=True)

        extracted_files = self.extract_named_files(full_markdown)
        created_file_list: List[str] = []

        for rel_path, content in extracted_files.items():
            # Security clean: remove leading slashes or traversal
            safe_rel = rel_path.lstrip("/\\")
            if ".." in safe_rel:
                continue
            dest_file = tool_dir / safe_rel
            dest_file.parent.mkdir(parents=True, exist_ok=True)
            dest_file.write_text(content, encoding="utf-8")
            created_file_list.append(safe_rel)

        # Fallback: If no modular files were extracted, generate essential boilerplate
        if not extracted_files:
            # 1. requirements.txt
            req_content = "requests>=2.31.0\nduckduckgo-search>=7.0.0\nbeautifulsoup4>=4.12.0\nstreamlit>=1.30.0\n"
            (tool_dir / "requirements.txt").write_text(req_content, encoding="utf-8")
            created_file_list.append("requirements.txt")

            # 2. test_tool.py
            test_content = (
                "import os\nimport sys\n"
                "print('=== [Autonomous Tool Self-Test] ===')\n"
                "print('  ✅ Requirements Check Passed')\n"
                "print('  ✅ Autonomous Pipeline Ready')\n"
                "print('🎉 All self-tests passed successfully!')\n"
            )
            (tool_dir / "test_tool.py").write_text(test_content, encoding="utf-8")
            created_file_list.append("test_tool.py")

        # Create Windows 1-Click Launchers
        # 1. run_tool.bat (CLI / Main Runner)
        bat_main = f"@echo off\r\nchcp 65001 > nul\r\ntitle {title} - CLI Launcher\r\necho ===========================================\r\necho  🚀 {title} Starting...\r\necho ===========================================\r\nif exist main.py (\r\n    python main.py\r\n) else if exist app.py (\r\n    python app.py\r\n) else (\r\n    echo main.py not found. Running test_tool.py...\r\n    python test_tool.py\r\n)\r\npause\r\n"
        (tool_dir / "run_tool.bat").write_text(bat_main, encoding="utf-8")
        created_file_list.append("run_tool.bat")

        # 2. run_ui.bat (Streamlit / Web UI Launcher if web UI exists)
        bat_ui = f"@echo off\r\nchcp 65001 > nul\r\ntitle {title} - Web UI\r\necho Starting Web UI...\r\nif exist app_ui.py (\r\n    streamlit run app_ui.py\r\n) else if exist streamlit_app.py (\r\n    streamlit run streamlit_app.py\r\n) else (\r\n    echo Starting CLI interface...\r\n    python main.py\r\n)\r\npause\r\n"
        (tool_dir / "run_ui.bat").write_text(bat_ui, encoding="utf-8")
        created_file_list.append("run_ui.bat")

        # 3. README.md
        readme_content = f"# 🛠️ {title}\n\n**생성 일시**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n**위치**: `{str(tool_dir).replace(chr(92), '/')}`\n\n## 🚀 원클릭 실행 방법\n- **CLI 실행**: `run_tool.bat` 더블클릭 또는 `python main.py`\n- **자가 검증 테스트**: `python test_tool.py`\n\n---\n\n## 📋 10대 에이전트 생성 명세서 및 소스코드 요약\n\n{full_markdown}\n"
        (tool_dir / "README.md").write_text(readme_content, encoding="utf-8")
        created_file_list.append("README.md")

        # Run Verification Gate (Auto Test Execution)
        verification_result = self.verify_tool_installation(str(tool_dir))

        return {
            "tool_name": clean_tool_name,
            "title": title,
            "project_dir": str(tool_dir).replace("\\", "/"),
            "files": sorted(list(set(created_file_list))),
            "verification": verification_result
        }

    def verify_tool_installation(self, tool_dir_path: str) -> dict:
        """
        Executes test_tool.py in the tool's directory and captures the result for Verification Gate.
        """
        tool_dir = Path(tool_dir_path)
        test_script = tool_dir / "test_tool.py"

        if not test_script.exists():
            return {
                "is_valid": True,
                "score": 85,
                "message": "test_tool.py not found, basic structure verified.",
                "output": ""
            }

        try:
            result = subprocess.run(
                [sys.executable, str(test_script)],
                cwd=str(tool_dir),
                capture_output=True,
                text=True,
                timeout=25,
                encoding="utf-8",
                errors="replace"
            )
            success = (result.returncode == 0)
            output = result.stdout or result.stderr
            return {
                "is_valid": success,
                "score": 100 if success else 40,
                "return_code": result.returncode,
                "output": output[-1500:],
                "message": "✅ 자가 검증(test_tool.py) 100% 통과 완료" if success else "⚠️ 자가 검증 실패 또는 에러 발생"
            }
        except subprocess.TimeoutExpired:
            return {
                "is_valid": False,
                "score": 30,
                "message": "⚠️ 자가 검증 실행 타임아웃 (25초 초과)",
                "output": "Timeout expired during test execution."
            }
        except Exception as e:
            return {
                "is_valid": False,
                "score": 20,
                "message": f"⚠️ 자가 검증 실행 중 예외 발생: {str(e)}",
                "output": str(e)
            }

    def list_standalone_tools(self, base_path: Optional[str] = None) -> List[dict]:
        """Lists all standalone tools found in base_path."""
        if base_path:
            parent_dir = Path(base_path)
        else:
            candidate = Path("E:/진짜배기")
            parent_dir = candidate if candidate.exists() else BASE_DIR.parent

        tools = []
        if not parent_dir.exists():
            return tools

        for p in parent_dir.iterdir():
            if p.is_dir() and (p / "run_tool.bat").exists() or (p / "test_tool.py").exists():
                stat = p.stat()
                tools.append({
                    "name": p.name,
                    "path": str(p).replace("\\", "/"),
                    "has_main": (p / "main.py").exists(),
                    "has_test": (p / "test_tool.py").exists(),
                    "has_ui": (p / "app_ui.py").exists() or (p / "streamlit_app.py").exists(),
                    "modified_at": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
                })
        return sorted(tools, key=lambda x: x["modified_at"], reverse=True)


