import os
import shutil
from pathlib import Path
from typing import List, Optional
from datetime import datetime
from server.config import ARTIFACTS_DIR
from server.models.schemas import ArtifactFile

class FileService:
    def __init__(self, artifacts_dir: Path = ARTIFACTS_DIR):
        self.artifacts_dir = artifacts_dir
        self.artifacts_dir.mkdir(parents=True, exist_ok=True)

    def list_artifacts(self) -> List[ArtifactFile]:
        files = []
        for p in self.artifacts_dir.rglob("*"):
            if p.is_file():
                rel_path = str(p.relative_to(self.artifacts_dir)).replace("\\", "/")
                stat = p.stat()
                
                # Determine category
                ext = p.suffix.lower()
                category = "other"
                if ext in [".js", ".ts", ".tsx", ".jsx", ".py", ".html", ".css", ".json", ".sh", ".bat"]:
                    category = "code"
                elif ext in [".md", ".txt", ".csv", ".doc", ".docx", ".pdf"]:
                    category = "document"
                elif ext in [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".mp3", ".wav", ".mp4"]:
                    category = "media"

                files.append(ArtifactFile(
                    name=p.name,
                    path=rel_path,
                    size=stat.st_size,
                    modified_at=datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
                    category=category
                ))
        return sorted(files, key=lambda x: x.modified_at, reverse=True)

    def read_artifact(self, rel_path: str) -> Optional[str]:
        target = self.artifacts_dir / rel_path
        if target.exists() and target.is_file():
            try:
                return target.read_text(encoding="utf-8")
            except Exception:
                return f"[Binary or Unreadable File: {target.name}]"
        return None

    def save_artifact(self, filename: str, content: str, subfolder: str = "") -> str:
        dest_dir = self.artifacts_dir / subfolder if subfolder else self.artifacts_dir
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest_file = dest_dir / filename
        dest_file.write_text(content, encoding="utf-8")
        return str(dest_file.relative_to(self.artifacts_dir)).replace("\\", "/")

    def extract_code_blocks(self, markdown_text: str) -> dict:
        """Extracts HTML, CSS, and JS code blocks from markdown."""
        import re
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
        Creates real physical project files in app_build/{app_id}/ directory.
        """
        build_dir = Path("app_build") / app_id
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
  "name": "{app_id}",
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
            "app_id": app_id,
            "project_dir": str(build_dir).replace("\\", "/"),
            "index_html_path": str(build_dir / "index.html").replace("\\", "/"),
            "files": [p.name for p in build_dir.iterdir() if p.is_file()]
        }

    def get_app_html(self, app_id: str) -> Optional[str]:
        target = Path("app_build") / app_id / "index.html"
        if target.exists() and target.is_file():
            return target.read_text(encoding="utf-8")
        return None

