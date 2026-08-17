import os
import re
import shutil
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
        """Extracts HTML, CSS, and JS code blocks from markdown."""
        result = {"html": "", "css": "", "js": "", "full_html": ""}
        
        # Match html code blocks
        html_blocks = re.findall(r"```html\s*([\s\S]*?)\s*```", markdown_text, re.IGNORECASE)
        css_blocks = re.findall(r"```css\s*([\s\S]*?)\s*```", markdown_text, re.IGNORECASE)
        js_blocks = re.findall(r"```(?:javascript|js)\s*([\s\S]*?)\s*```", markdown_text, re.IGNORECASE)

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
            # Fallback wrapper if no explicit ```html block
            html_content = f"""<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>{title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 text-white p-8">
  <h1 class="text-2xl font-bold mb-4">{title}</h1>
  <div class="prose prose-invert max-w-none">
    <pre class="bg-slate-800 p-4 rounded-lg overflow-x-auto text-sm">{full_markdown[:1500]}</pre>
  </div>
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

