# 📝 Skill: write_specs (기획 및 사양서 작성 스킬)

## 설명 (Description)
사용자의 요구사항과 아이디어를 분석하여 `production_artifacts/Technical_Specification.md`를 작성하고, 사용자의 검토 및 승인을 획득할 때까지 피드백 루프를 반복 구동합니다.

---

## 🎯 실행 절차 (Execution Workflow)

### 1단계: 요구사항 수렴 및 기술 사양서 작성
1. 사용자의 아이디어/프롬프트를 분석하여 아래 표준 규격에 맞추어 `production_artifacts/Technical_Specification.md` 파일을 생성합니다.
2. 기술 사양서 필수 포함 항목:
   - **프로젝트 개요 및 핵심 기능 목록**
   - **시스템 아키텍처 및 추천 기술 스택** (Frontend, Backend, Database, Styling 등)
   - **`app_build/` 디렉터리 및 파일 구조 트리**
   - **데이터 모델 및 API/인터페이스 인터랙션 설계**
   - **UI/UX 레이아웃 명세 및 주요 컴포넌트 구조**
   - **검증 및 QA 체크리스트**

### 2단계: 사용자 검토 대기 (Approval Gate)
1. 사양서 작성을 완료한 후 사용자에게 작성이 완료되었음을 알리고 검토를 요청합니다.
2. 사용자가 사양서 파일에 인라인 텍스트/댓글을 남기거나 대화창에 피드백을 전달할 때까지 작업을 일시정지하고 대기합니다.

### 3단계: 피드백 반영 및 재작업 루프 (Iterative Rework)
1. 사용자의 수정 요청 또는 피드백이 발생하면 `production_artifacts/Technical_Specification.md`를 즉시 갱신합니다.
2. 변경 사항을 요약 보고하고 다시 승인을 요청합니다.

### 4단계: 최종 승인 및 다음 단계 전환
- 사용자가 **"승인", "진행해", "Approved", "좋습니다"** 등의 명시적 승인을 전달하면 즉시 **Full-Stack Engineer (@engineer)**로 컨텍스트를 스위칭하고 `.agents/skills/generate_code.md`를 구동합니다.
