# 🚀 Skill: deploy_app (DevOps 환경 빌드 및 로컬 배포 스킬)

## 설명 (Description)
`app_build/` 디렉터리 내의 런타임 환경 및 패키지 구조를 자동 감지하여 의존성을 설치하고, 로컬 개발/프로덕션 서버를 안전하게 백그라운드 구동한 후 사용자에게 접속 URL을 제공합니다.

---

## 🎯 실행 절차 (Execution Workflow)

### 1단계: 런타임 및 패키지 매니저 자동 감지
1. `app_build/` 내의 설정 파일을 식별합니다:
   - `package.json` 존재 시: `npm` (또는 `pnpm` / `yarn` / `bun`) 기반 환경으로 판별
   - `requirements.txt` 또는 `pyproject.toml` 존재 시: `python` (또는 `uv` / `pip`) 환경으로 판별
   - 정적 HTML/JS만 존재 시: 내장 경량 HTTP 서버 또는 브라우저 로컬 파일 구동으로 판별

### 2단계: 의존성 설치 (Dependency Installation)
1. `app_build/` 디렉터리 내에서 패키지 설치 명령을 실행합니다:
   - Node 계열: `npm install` (또는 해당 패키지 매니저 설치 명령)
   - Python 계열: `pip install -r requirements.txt`

### 3단계: 로컬 서버 백그라운드 기동
1. `package.json` 내 `scripts`의 `dev` 또는 `start` 명령을 실행하거나 적절한 서버 실행 명령을 백그라운드로 실행합니다.
   - 예: `npm run dev`, `npx serve .`, `uvicorn main:app --reload`
2. 포트 충돌 방지 및 정상 구동 여부를 확인합니다.

### 4단계: 배포 완료 및 브라우저 링크 안내
1. 가동된 로컬 서버의 접속 엔드포인트(예: `http://localhost:3000`, `http://localhost:5173` 등)를 확인합니다.
2. 최종 사용자에게 다음 정보를 포함하여 배포 완료 보고를 전달합니다:
   - **서비스 접속 URL** (클릭 가능한 로컬 링크)
   - **구동된 기술 스택 및 포트 번호**
   - **주요 기능 확인 가이드**
