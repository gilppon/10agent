# 📄 [PRD] 자율형 멀티 에이전트 루프 엔지니어링 하네스 프레임워크

---

## 1. 프로젝트 개요 (Executive Summary)
- **프로젝트 명**: 자율형 1인 개발 멀티 에이전트 엔지니어링 시스템 (Autonomous Multi-Agent Loop Harness)
- **목적**: 아이디어 입력 한 줄(`/startcycle "<아이디어>"`)만으로 **기획(PM) ➡️ 코드 생성(Engineer) ➡️ 감사/디버깅(QA) ➡️ 로컬 실행(DevOps)** 전 과정을 100% 자율 연쇄 반응(Autonomous Loop)으로 수행하는 개발 파이프라인 구축.
- **핵심 가치**:
  1. **컨텍스트 격리 (Context Firewall)**: 각 에이전트의 역할과 소스 디렉터리(`app_build/`, `production_artifacts/`) 격리
  2. **안전 게이트 (Safety Gate & Circuit Breaker)**: PM의 사용자 승인 게이트 및 QA의 3회 한도 자율 디버깅 서킷 브레이커
  3. **크로스 툴 호환 (Antigravity & Claude Code)**: 루트 `AGENTS.md` 및 `CLAUDE.md` 통합 인덱싱

---

## 2. 시스템 아키텍처 및 폴더 구조 (System Architecture)

```
c:\Users\PC\next11/
├── .agents/
│   ├── agents.md                 # 4대 에이전트 역할/제약 정의
│   ├── skills/
│   │   ├── write_specs.md        # [기획] 요구사항 수렴 및 사양서 작성/승인 대기
│   │   ├── generate_code.md      # [개발] 사양서 기반 app_build/ 내 소스코드 생성
│   │   ├── audit_code.md         # [QA] 문법/의존성/로직 감사 및 자율 패치 루프 (Max 3회)
│   │   └── deploy_app.md         # [배포] 런타임 감지, 의존성 설치 및 로컬 서버 구동
│   └── workflows/
│       └── startcycle.md         # /startcycle 원클릭 파이프라인 매크로
├── production_artifacts/         # 에이전트 간 물리적 산출물 공유 영역
│   ├── PRD_Autonomous_MultiAgent_Engineering_Harness.md
│   └── Technical_Specification.md (런타임 생성)
├── app_build/                    # 엔지니어가 생성하는 격리된 실제 서비스 소스코드
├── AGENTS.md                     # 최상위 제어 타워 (Antigravity 네이티브 인덱스)
└── CLAUDE.md                     # Claude Code 동기화 지침서
```

---

## 3. 에이전트 역할 및 책임 (Multi-Agent Team Definition)

| 에이전트 | 역할 (Role) | 핵심 목표 (Goal) | 하드 제약사항 (Hard Constraints) |
| :--- | :--- | :--- | :--- |
| **@pm** | Product Manager | 사용자 아이디어를 기술 사양서(`Technical_Specification.md`)로 구체화 | • 코드 절대 작성 금지<br>• 사용자 명시적 '승인' 전까지 다음 단계 진행 금지 |
| **@engineer** | Full-Stack Engineer | 승인된 사양서를 바탕으로 구동 가능한 고품질 소스코드 생성 | • 임의 가정 배제, 사양서 규격 준수<br>• 오직 `app_build/` 내에만 소스 생성/수정 |
| **@qa** | QA Engineer | 정적 분석, 문법 오류, 모듈 충돌 검증 및 자율 덮어쓰기 패치 | • 최대 3회 재시도 서킷 브레이커 준수<br>• 3회 연속 실패 시 원인 정리 후 사용자 보고 |
| **@devops** | DevOps Master | 패키지 매니저 식별, 의존성 설치, 로컬 서버 구동 및 링크 제공 | • 포트 충돌 방지 및 안전한 백그라운드 구동<br>• 최종 사용자에게 접근 URL 및 상태 보고 |

---

## 4. 4대 핵심 스킬 상세 명세 (Skill Specifications)

### 4.1. `write_specs.md` (기획 스킬)
- **입력**: 사용자의 개발 아이디어/요구사항
- **동작**:
  1. `production_artifacts/Technical_Specification.md` 생성
  2. 아키텍처 다이어그램, 파일 구조, 데이터 모델, API 명세 수록
  3. 사용자에게 검토 요청 및 대기 (Human-in-the-Loop)
  4. 사용자 피드백 발생 시 사양서 재수정 루프 수행
  5. 최종 "승인(Approved)" 획득 시 @engineer 호출

### 4.2. `generate_code.md` (개발 스킬)
- **입력**: `production_artifacts/Technical_Specification.md`
- **동작**:
  1. 스택 자동 감지 (Next.js, Vite, React, Node.js, Python 등)
  2. `app_build/` 내 디렉터리 트리 구축 및 핵심 파일 생성
  3. 모듈화된 클린 코드 및 필수 설정 파일(`package.json`, `requirements.txt` 등) 일괄 작성
  4. 작성 완료 후 @qa 호출

### 4.3. `audit_code.md` (QA 스킬)
- **입력**: `app_build/` 소스코드
- **동작**:
  1. 구문(Syntax), 의존성(Dependencies), 임포트 누락 정적 감사
  2. 에러 발견 시 `app_build/` 파일 직접 수정 (자율 패치)
  3. 시도 횟수 카운팅 (Circuit Breaker: 1~3회)
  4. 감사 통과 시 @devops 호출, 3회 실패 시 즉각 에스컬레이션

### 4.4. `deploy_app.md` (배포 스킬)
- **입력**: 무결성이 검증된 `app_build/`
- **동작**:
  1. 패키지 관리자(`npm`, `pnpm`, `pip`, `uv` 등) 자동 감지
  2. 의존성 설치 명령 실행
  3. 개발/운영 서버 백그라운드 구동 (예: `localhost:3000`, `localhost:5173`, `localhost:8000`)
  4. 사용자에게 최종 접속 URL 및 실행 상태 보고

---

## 5. 워크플로 매크로 명세 (`startcycle.md`)

- **트리거**: `/startcycle "<아이디어>"`
- **체이닝 플로우**:
  $$\text{User Idea} \xrightarrow{} \text{@pm (write\_specs)} \xrightarrow{\text{User Approved}} \text{@engineer (generate\_code)} \xrightarrow{} \text{@qa (audit\_code)} \xrightarrow{\text{Pass}} \text{@devops (deploy\_app)} \xrightarrow{} \text{Running App}$$

---

## 6. 품질 및 안정성 보증 (Quality & Safety Gates)
1. **컨텍스트 드롭 방지 (0% Drop)**: 루트 `AGENTS.md` 인덱스 테이블 및 지침 동기화
2. **무한 루프 방지**: QA 자율 패치 3회 상한 서킷 브레이커
3. **환경 분리**: `production_artifacts/` (문서/기획)와 `app_build/` (소스)의 완전한 물리적 분리

---
**작성자**: Kodari_Dev_Manager (코다리 개발부장)  
**상태**: 승인 완료 (Ready for Construction)
