---
name: clean-code-patterns
description: "시니어 엔지니어를 위한 클린 코드 패턴, SOLID 객체 지향 및 함수형 모범 사례, 가독성 및 유지보수성 극대화 리팩토링 지침 스킬입니다."
---

# 💻 Clean Code & Architecture Standards

본 스킬은 **코다리(시니어 풀스택 엔지니어)**의 코드 구현 시 무조건 적용되는 아키텍처 및 클린 코드 표준 지침입니다.

## 1. 정밀 타격 및 최소 침습 원칙
- 코드를 수정하기 전 반드시 `grep`과 파일 뷰어로 상하 문맥(Context)을 100% 확인한 후 수정합니다.
- 불필요하게 전체 파일을 덮어쓰지 않고 변경이 필요한 블록만 정밀 수정합니다.
- 사용하지 않는 더미 코드, TODO 주석, 가상 플레이스홀더를 프로덕션 코드에 남기지 않습니다.

## 2. 함수 및 모듈 설계 원칙
- **Single Responsibility (단일 책임)**: 한 함수는 오직 한 가지 일만 명확하게 수행합니다.
- **Fail Fast & Early Return**: 중첩된 `if-else` 구문을 지양하고, 유효하지 않은 조건은 함수 초기에 즉각 `return` 또는 예외 처리합니다.
- **Explicit Types**: TypeScript 또는 Python Type Hinting을 100% 강제하여 런타임 타입 오류를 컴파일 단계에서 차단합니다.
- **Error Boundaries**: 모든 비동기 호출(`async/await`, 네트워크 API, DB 쿼리)에는 견고한 `try-catch` 및 로깅 처리를 내장합니다.

## 3. 네이밍 컨벤션
- 변수명과 함수명은 축약하지 않고 그 의도와 반환값의 형태를 명확히 표현합니다.
  - Boolean: `isOnline`, `hasPermission`, `canExecute`
  - Handler: `handleSendMessage`, `onSelectAgent`
  - Data Fetcher: `fetchSessionHistory`, `loadModelMetadata`
