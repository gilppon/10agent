# 📋 [ISSUES] 자율형 멀티 에이전트 엔지니어링 시스템 작업 분할표

---

## 📌 마일스톤 1: 디렉터리 및 팀 정의 베이스라인 구축

### [ISSUE-01] 핵심 디렉터리 트리 및 파일 격리 구조 초기화
- **상태**: 🔲 To Do
- **우선순위**: P0 (Blocker)
- **작업 내용**:
  - [ ] `.agents/skills/` 디렉터리 생성
  - [ ] `.agents/workflows/` 디렉터리 생성
  - [ ] `production_artifacts/` 공용 산출물 디렉터리 초기화
  - [ ] `app_build/` 소스 격리 디렉터리 초기화 및 `.gitkeep` 배치
- **검증 기준**: 디렉터리 구조 트리 실사 확인

### [ISSUE-02] 멀티 에이전트 팀 지침 정의 (`.agents/agents.md`)
- **상태**: 🔲 To Do
- **우선순위**: P0 (Blocker)
- **작업 내용**:
  - [ ] `@pm`: 기획 전담, 코드 작성 금지, 승인 대기 제약 명시
  - [ ] `@engineer`: `app_build/` 소스 생성 전담, 사양서 준수 명시
  - [ ] `@qa`: 무한 루프 방지(3회 서킷 브레이커), 코드 직접 패치 명시
  - [ ] `@devops`: 의존성 자동 설치, 로컬 서버 백그라운드 구동 명시
- **검증 기준**: `.agents/agents.md` 파일 생성 및 4대 역할/제약 명세 완비

---

## 📌 마일스톤 2: 4대 핵심 자율 스킬 구현

### [ISSUE-03] PM 기획 및 승인 루프 스킬 (`.agents/skills/write_specs.md`)
- **상태**: 🔲 To Do
- **우선순위**: P1 (High)
- **작업 내용**:
  - [ ] 요구사항 분석 및 `production_artifacts/Technical_Specification.md` 생성 템플릿 정의
  - [ ] 사용자 인라인 피드백 감지 및 재작업 루프 설계
  - [ ] 사용자 명시적 '승인' 시 다음 단계 자동 핸드오프 로직 선언

### [ISSUE-04] Full-Stack 엔지니어 코드 생성 스킬 (`.agents/skills/generate_code.md`)
- **상태**: 🔲 To Do
- **우선순위**: P1 (High)
- **작업 내용**:
  - [ ] `Technical_Specification.md` 기반 자동 스택 식별
  - [ ] `app_build/` 내 소스코드/설정파일 생성 표준 가이드 정의
  - [ ] 가상 코드/플레이스홀더 배제 및 즉시 실행 가능한 완성형 코드 작성 지침

### [ISSUE-05] QA 자율 감사 및 3회 서킷브레이커 패치 스킬 (`.agents/skills/audit_code.md`)
- **상태**: 🔲 To Do
- **우선순위**: P1 (High)
- **작업 내용**:
  - [ ] 구문/임포트/의존성/로직 결함 정적 감사 룰 정의
  - [ ] 소스 파일 직접 덮어쓰기(In-place patch) 루프 작성
  - [ ] 3회 실패 시 중단 및 사용자 에스컬레이션 서킷 브레이커 내장

### [ISSUE-06] DevOps 자동 빌드 및 로컬 배포 스킬 (`.agents/skills/deploy_app.md`)
- **상태**: 🔲 To Do
- **우선순위**: P1 (High)
- **작업 내용**:
  - [ ] `package.json`, `requirements.txt`, `vite.config` 등 식별
  - [ ] 자동 패키지 인스톨 명령어 체인 (`npm install`, `pip install` 등)
  - [ ] 포트 충돌 방지 로컬 서버 백그라운드 구동 및 브라우저 URL 안내

---

## 📌 마일스톤 3: 워크플로 매크로 및 제어 타워 통합

### [ISSUE-07] `/startcycle` 원클릭 파이프라인 매크로 (`.agents/workflows/startcycle.md`)
- **상태**: 🔲 To Do
- **우선순위**: P1 (High)
- **작업 내용**:
  - [ ] YAML Frontmatter 메타데이터 작성 (`description`)
  - [ ] PM ➡️ Engineer ➡️ QA ➡️ DevOps 4단계 체이닝 트리거 명세
  - [ ] 파라미터 `<idea>` 인터셉트 및 전달 규칙 정의

### [ISSUE-08] 최상위 제어 타워 및 크로스 툴 동기화 (`AGENTS.md`, `CLAUDE.md`)
- **상태**: 🔲 To Do
- **우선순위**: P1 (High)
- **작업 내용**:
  - [ ] 프로젝트 루트 `AGENTS.md`에 스킬/워크플로 인덱스 테이블 배치 (컨텍스트 드롭 방지)
  - [ ] 윈도우 환경 안전 동기화로 `CLAUDE.md` 일치화

### [ISSUE-09] 하네스 종합 무결성 검증 (Verification Gate)
- **상태**: 🔲 To Do
- **우선순위**: P1 (High)
- **작업 내용**:
  - [ ] 모든 지침 파일 및 디렉터리 물리적 실사 확인
  - [ ] 모의 `/startcycle` 트리거 및 스킬 포인터 링크 유효성 테스트
