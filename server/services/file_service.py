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
