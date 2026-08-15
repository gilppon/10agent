---
description: 1인 자율 개발 파이프라인 전체 수명 주기를 일괄 시작합니다.
---

# ⚡ Workflow: /startcycle (자율 개발 파이프라인 수명 주기)

사용자가 `/startcycle <idea>` 명령을 호출하면 `.agents/agents.md`와 `.agents/skills/`를 엄격히 상호 참조하여 아래의 4단계 자율 연쇄 반응(Autonomous Loop)을 가동합니다.

---

## 🔄 실행 순서 명세 (Execution Sequence)

### 1단계: Product Manager (@pm) - 기획 및 승인 루프
1. `@pm` 역할로 전환하여 `<idea>` 요구사항을 바탕으로 `.agents/skills/write_specs.md`를 실행합니다.
2. `production_artifacts/Technical_Specification.md`를 작성하고 사용자 검토를 요청하며 대기합니다.
3. 사용자가 사양서에 피드백을 전달하면 반영하여 사양서를 갱신합니다.
4. **사용자가 최종 승인(Approved)을 선언할 때까지 대기하며, 승인 시 2단계로 자동 이행합니다.**

### 2단계: Full-Stack Engineer (@engineer) - 소스코드 생성
1. `@engineer` 역할로 컨텍스트를 스위칭합니다.
2. 승인된 `Technical_Specification.md`를 참조하여 `.agents/skills/generate_code.md`를 실행합니다.
3. 모든 소스코드, 컴포넌트, 설정 파일을 `app_build/` 내부에 격리 생성합니다.
4. 소스코드 작성이 완료되면 3단계로 자동 이행합니다.

### 3단계: QA Engineer (@qa) - 코드 감사 및 자율 디버깅
1. `@qa` 역할로 컨텍스트를 스위칭합니다.
2. `app_build/` 내의 소스코드를 대상으로 `.agents/skills/audit_code.md`를 구동합니다.
3. 문법 오류, 의존성 충돌, 런타임 결함을 자율적으로 덮어쓰며 패치합니다.
4. **안전장치**: 최대 3회 시도 내에 결함이 해결되면 4단계로 이행하며, 3회 실패 시 즉각 중단하고 사용자에게 보고합니다.

### 4단계: DevOps Master (@devops) - 환경 빌드 및 로컬 배포
1. `@devops` 역할로 컨텍스트를 스위칭합니다.
2. 무결성이 입증된 `app_build/` 환경을 대상으로 `.agents/skills/deploy_app.md`를 실행합니다.
3. 의존성 패키지 설치(`npm install` 등)를 수행하고 로컬 서버를 기동합니다.
4. 사용자에게 가동 중인 로컬호스트 링크(예: `http://localhost:3000`)와 최종 배포 완료 보고를 전달합니다.
