---
name: test-driven-development
description: "vitest, jest, pytest 기반의 견고한 단위 테스트 및 통합 테스트 작성, 모킹 기법, 엣지 케이스 검증 및 자율 디버깅 표준 스킬입니다."
---

# 🧪 Test-Driven Development & Verification Standards

본 스킬은 **코다리(개발자)** 및 **QA 검증 게이트**에서 동작하는 테스트 및 무결성 검증 지침입니다.

## 1. 테스트 계층 구조
- **Unit Tests (단위 테스트)**: 순수 비즈니스 로직, 데이터 변환 함수, 유틸리티의 독립 검증.
- **Integration Tests (통합 테스트)**: DB 연결, API 라우터, 모델 스트리밍 SSE 파이프라인 검증.
- **Verification Gate**: 모든 수정 완료 후 반드시 테스트 스크립트 실행 결과로 성공을 입증한 뒤 보고합니다.

## 2. 모킹(Mocking) 및 엣지 케이스 원칙
- 외부 의존성(네트워크 단절, Ollama 서버 오프라인, DB Lock)에 대한 Fallback 시나리오를 반드시 테스트합니다.
- 빈 입력(`""`), `null`, `undefined`, 초대용량 텍스트, 특수문자 입력에 대한 방어 로직을 작성합니다.

## 3. 3회 서킷 브레이커 (Circuit Breaker)
- 테스트 실패 시 동일한 패치를 3회 초과 반복하지 않습니다.
- 3회 연속 실패 시 즉시 중단하고 실패 원인 및 스택 트레이스를 분석하여 보고합니다.
