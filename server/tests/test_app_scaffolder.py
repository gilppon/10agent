import os
import sys
import pytest
import shutil
from pathlib import Path
from fastapi.testclient import TestClient

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from server.services.file_service import FileService
from server.main import app

def test_extract_code_blocks_and_scaffold():
    print("==================================================")
    print("📁 [하네스 검증] 물리 앱 스캐폴더 및 코드 블록 추출 테스트")
    print("==================================================")
    
    file_svc = FileService()
    sample_markdown = """
# 풀스택 웹앱 산출물

## 기획
이 앱은 홍보 자동화 도구입니다.

```html
<div class="max-w-md mx-auto p-6 bg-slate-800 rounded-xl shadow-lg">
  <h2 class="text-xl font-bold text-cyan-400">자동 홍보 제어판</h2>
  <button id="promoBtn" class="mt-4 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded text-slate-900 font-bold">홍보 시작</button>
  <p id="status" class="mt-2 text-sm text-slate-300">대기 중...</p>
</div>
```

```css
#promoBtn { transition: transform 0.2s; }
#promoBtn:hover { transform: scale(1.05); }
```

```javascript
document.getElementById('promoBtn').addEventListener('click', () => {
  document.getElementById('status').innerText = '자동 홍보가 즉시 시작되었습니다!';
});
```
"""
    app_id = "test_promo_app_001"
    res = file_svc.scaffold_app_project(app_id, sample_markdown, title="자동 홍보 플랫폼")
    
    print(f"  - 생성된 프로젝트 디렉토리: {res['project_dir']}")
    print(f"  - 생성된 물리 파일 목록: {res['files']}")
    
    assert "index.html" in res["files"]
    assert "package.json" in res["files"]
    assert "README.md" in res["files"]
    
    # Verify index.html content
    html_content = file_svc.get_app_html(app_id)
    assert html_content is not None
    assert "자동 홍보 제어판" in html_content
    assert "promoBtn" in html_content
    print("  ✅ [PASS] 물리 파일(index.html, package.json 등) 생성 및 파싱 무결성 확인 완료!")

def test_live_preview_api():
    print("==================================================")
    print("🌐 [하네스 검증] 라이브 웹 프리뷰 샌드박스 API 테스트")
    print("==================================================")
    
    client = TestClient(app)
    app_id = "test_promo_app_001"
    
    # 1. Test preview HTML response
    resp = client.get(f"/api/apps/preview/{app_id}")
    assert resp.status_code == 200
    assert "text/html" in resp.headers["content-type"]
    assert "자동 홍보 제어판" in resp.text
    print("  ✅ [PASS] GET /api/apps/preview/{app_id} 200 OK (HTML 렌더링 정상)")
    
    # 2. Test apps list
    list_resp = client.get("/api/apps/list")
    assert list_resp.status_code == 200
    apps = list_resp.json()
    assert any(a["app_id"] == app_id for a in apps)
    print("  ✅ [PASS] GET /api/apps/list 200 OK (앱 목록 조회 정상)")
    
    # Cleanup test build dir
    shutil.rmtree(Path("app_build") / app_id, ignore_errors=True)
    print("  🧹 테스트 생성 폴더 정리 완료")

if __name__ == "__main__":
    test_extract_code_blocks_and_scaffold()
    test_live_preview_api()
