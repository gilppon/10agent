# 🧭 Master Control Tower: AGENTS.md

본 파일은 안티그래비티(Antigravity) 및 클로드 코드(Claude Code) 멀티 에이전트 시스템의 최상위 제어 타워입니다. 모든 하부 에이전트와 전문 스킬의 포인터를 인덱싱하여 컨텍스트 드롭(Context Drop)을 0%로 유지합니다.

---

## 👥 10대 에이전트 정의 및 전담 전문 스킬 매핑

| 에이전트 멘션 | 역할 (Role) | 전담 핵심 스킬 (Specialized Skills) | 주요 책임 및 산출물 |
| :--- | :--- | :--- | :--- |
| **@ceo** | Chief Executive | [.agents/skills/write_specs.md](file:///.agents/skills/write_specs.md) | 오케스트레이션, 기획 사양서 도출, 작업 분배 |
| **@designer (민희)** | Lead Designer | [.agents/skills/canvas-design/SKILL.md](file:///.agents/skills/canvas-design/SKILL.md) | 8px 그리드, HSL 다크모드, Z-Axis UI/UX 설계 |
| **@developer (코다리)** | Senior Full-Stack | [.agents/skills/clean-code-patterns/SKILL.md](file:///.agents/skills/clean-code-patterns/SKILL.md)<br>[.agents/skills/test-driven-development/SKILL.md](file:///.agents/skills/test-driven-development/SKILL.md) | 클린 코드 구현, 자율 디버깅, TDD 테스트 통과 |
| **@youtube (레오)** | Head of YouTube | [.agents/skills/youtube-growth-scripting/SKILL.md](file:///.agents/skills/youtube-growth-scripting/SKILL.md) | 3초 골든 후크, 썸네일 브리프, 시청 유지율 설계 |
| **@instagram (찬우)** | Head of Instagram | [.agents/skills/instagram-viral-marketing/SKILL.md](file:///.agents/skills/instagram-viral-marketing/SKILL.md) | 3-3-3 해시태그, 릴스 숏폼 가이드, 캐러셀 템플릿 |
| **@writer (지은)** | Copywriter | [.agents/skills/high-converting-copywriting/SKILL.md](file:///.agents/skills/high-converting-copywriting/SKILL.md) | AIDA/PAS 세일즈 카피, SEO 글쓰기, 전환율 최적화 |
| **@business (현빈)** | Head of Business | [.agents/skills/multi-agent-orchestration/SKILL.md](file:///.agents/skills/multi-agent-orchestration/SKILL.md) | 비즈니스 모델(BM), ROI/KPI 분석, 가격 전략 |
| **@researcher (정우)**| Trend Researcher | [.agents/skills/multi-agent-orchestration/SKILL.md](file:///.agents/skills/multi-agent-orchestration/SKILL.md) | 5단계 심층 조사, 소스 교차 검증 팩트체크 |
| **@editor (루나)** | Sound Director | [.agents/skills/multi-agent-orchestration/SKILL.md](file:///.agents/skills/multi-agent-orchestration/SKILL.md) | BGM 무드 아키텍처, 음악 생성 AI 프롬프트 |
| **@secretary (영숙)**| Personal Assistant | [.agents/skills/multi-agent-orchestration/SKILL.md](file:///.agents/skills/multi-agent-orchestration/SKILL.md) | 일정 관리, 산출물 취합, 1분 데일리 브리핑 |

---

## ⚡ 지원 워크플로 매크로 (Workflows)

| 워크플로 커맨드 | 설명 | 파일 경로 |
| :--- | :--- | :--- |
| `/startcycle "<아이디어>"` | 기획 ➡️ 개발 ➡️ QA ➡️ 배포 전 수명 주기 일괄 실행 | [.agents/workflows/startcycle.md](file:///.agents/workflows/startcycle.md) |

---

## 🛡️ 안전 프로토콜 (Safety & Quality Gate)
1. **Verification Gate**: 모든 코드 생성/수정은 TDD 및 구문 검증 통과 후 완료 보고.
2. **Circuit Breaker**: QA 자율 패치 루프는 최대 3회 시도로 제한되며, 실패 시 즉각 에스컬레이션.
3. **Context Firewall**: `production_artifacts/` (문서/기획)와 `app_build/` (소스)의 완전한 물리적 격리.
