# 💻 Skill: generate_code (풀스택 코드 생성 스킬)

## 설명 (Description)
승인된 `production_artifacts/Technical_Specification.md`를 기반으로 `app_build/` 디렉터리 내에 완전하고 구동 가능한 프로덕션 레벨 소스코드를 생성합니다.

---

## 🎯 실행 절차 (Execution Workflow)

### 1단계: 기술 사양서 탐색 및 환경 식별
1. `production_artifacts/Technical_Specification.md`를 정밀 탐색하여 정의된 기술 스택, 디렉터리 구조, 의존성 패키지 목록을 추출합니다.
2. 타겟 런타임(Node.js / React / Next.js / Vite / Python FastAPI 등)의 필수 설정 파일을 계획합니다.

### 2단계: `app_build/` 디렉터리 내 소스코드 생성
1. 모든 파일 생성 및 수정은 오직 `app_build/` 디렉터리 내부로 한정합니다.
2. 필수 구성 요소 생성:
   - **패키지 메타데이터**: `package.json` (스크립트 및 의존성 명시) 또는 `requirements.txt` / `pyproject.toml`
   - **환경 설정**: `tsconfig.json`, `vite.config.ts`, `.env.example` 등
   - **엔트리포인트**: `index.html`, `src/main.tsx`, `src/App.tsx`, `app/page.tsx` 또는 `main.py`
   - **모듈 및 컴포넌트**: 재사용 가능한 UI 컴포넌트, 상태 관리 로직, 유틸리티 함수
   - **스타일링**: 일관되고 세련된 모던 CSS / 테마 토큰 정의

### 3단계: 코드 품질 준수 원칙
1. 플레이스홀더, TODO 주석, 미완성 스텁 코드를 절대 남기지 않습니다.
2. 모든 의존성 임포트 경로가 정확한지 확인합니다.
3. 생성이 완료되면 **QA Engineer (@qa)**로 컨텍스트를 스위칭하고 `.agents/skills/audit_code.md`를 호출합니다.
