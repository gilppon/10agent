# 📋 [ISSUES] 데스크톱 상주형 AI 성장 펫 (DamaAI) 작업 분할표 (WBS)

---

## 📌 마일스톤 1: 백엔드 펫 성장 엔진 및 DB 아키텍처 구축

### [ISSUE-01] SQLite DB 펫 상태 테이블 스키마 추가 (`server/database.py`)
- **상태**: ✅ Done
- **우선순위**: P0 (Blocker)
- **작업 내용**:
  - [x] `pet_status` 테이블 DDL 정의 (id, name, pet_type, level, exp, max_exp, affection, growth_stage, total_fed_count)
  - [x] 펫 상태 조회, 갱신, 초기화 비동기 헬퍼 함수 구현
- **검증 기준**: DB 초기화 시 `pet_status` 테이블 자동 생성 및 기본값 1행 보장 완료

### [ISSUE-02] 펫 성장 및 페르소나 엔진 구현 (`server/services/pet_brain.py`)
- **상태**: ✅ Done
- **우선순위**: P0 (Blocker)
- **작업 내용**:
  - [x] 글자 수 및 파일 기반 경험치(EXP) 계산 로직 구현
  - [x] 레벨업 및 성장 단계(`infant` -> `growth` -> `master`) 판정 로직
  - [x] 종족(Dog/Cat) 및 단계별 지능 제약 시스템 프롬프트 빌더 구현
  - [x] 마스터 단계(Lv.21+) 10대 에이전트 연계 프롬프트 주입
- **검증 기준**: 단위 테스트를 통한 EXP 누적 및 단계 진화 로직 100% 통과

### [ISSUE-03] 펫 전용 REST API 라우터 구현 (`server/routers/pet.py` & `server/main.py`)
- **상태**: ✅ Done
- **우선순위**: P0 (Blocker)
- **작업 내용**:
  - [x] `GET /api/pet/status`: 현재 펫 스탯 반환
  - [x] `POST /api/pet/feed`: 텍스트/파일 RAG 적재(`knowledge_service`) + EXP/레벨 업데이트
  - [x] `POST /api/pet/chat`: RAG 지식 검색 + `sovereign_master` LLM 추론 연계
  - [x] `POST /api/pet/switch-type`: 강아지/고양이 전환
  - [x] `POST /api/pet/reset`: 펫 스탯 초기화
  - [x] `server/main.py`에 pet 라우터 등록
- **검증 기준**: FastAPI 엔드포인트 수동/자동 테스트 정상 응답 확인

### [ISSUE-04] 백엔드 단위 테스트 스위트 작성 (`server/tests/test_pet_system.py`)
- **상태**: ✅ Done
- **우선순위**: P1 (High)
- **작업 내용**:
  - [x] 펫 생성, 피딩, 레벨업, 프롬프트 빌더 테스트 케이스 작성
  - [x] `pytest server/tests/test_pet_system.py` 전원 통과 검증 (4/4 Pass, 전체 32/32 Pass)
- **검증 기준**: pytest 100% Pass 완료

---

## 📌 마일스톤 2: 데스크톱 펫 클라이언트 (Tauri v2 + React) 구축

### [ISSUE-05] `desktop-pet` 프로젝트 스캐폴딩 및 Tauri v2 설정
- **상태**: ✅ Done
- **우선순위**: P0 (Blocker)
- **작업 내용**:
  - [x] `desktop-pet/package.json` 및 `vite.config.ts` 설정
  - [x] `src-tauri/tauri.conf.json` 투명/Always-on-top/무테두리 윈도우 설정
  - [x] TailwindCSS 및 스타일 유틸리티 구성
- **검증 기준**: Tauri v2 및 React 프로젝트 구조 완성

### [ISSUE-06] 햅틱 스프라이트 & 사운드 피드백 컴포넌트 구현
- **상태**: ✅ Done
- **우선순위**: P1 (High)
- **작업 내용**:
  - [x] `src/components/PetSprite.tsx`: CSS/SVG/Emoji 햅틱 애니메이션 (idle, eating, sleeping, levelup, thinking)
  - [x] `src/components/SpeechBubble.tsx`: 귀여운 말풍선 및 반응형 텍스트 렌더러
  - [x] `src/services/soundEffects.ts`: Web Audio API 오실레이터 사운드 합성 (외부 에셋 불필요)
  - [x] `src/components/StatusModal.tsx`: 레벨/친밀도/지식 수치 열람 모달
- **검증 기준**: 상태 변경 시 부드러운 애니메이션 및 효과음 정상 출력

### [ISSUE-07] 드래그앤드롭 피딩 & 백엔드 통신 통합 (`desktop-pet/src/App.tsx`)
- **상태**: ✅ Done
- **우선순위**: P0 (Blocker)
- **작업 내용**:
  - [x] 드래그앤드롭 이벤트 리스너 (텍스트 및 파일 데이터 추출)
  - [x] `/api/pet/feed` 비동기 호출 및 EXP 획득/레벨업 UI 피드백 연동
  - [x] 클릭 인터랙션 (간단한 대화창 및 상태 모달 트리거)
  - [x] `run_pet.bat` 원클릭 실행 스크립트 작성
- **검증 기준**: 위젯으로 텍스트 드롭 시 펫이 반응하며 백엔드 RAG 및 DB 실시간 갱신 확인

---

## 📌 마일스톤 3: 종합 통합 검증 및 원클릭 런처

### [ISSUE-08] 전체 파이프라인 E2E 검증 및 하네스 등록
- **상태**: ✅ Done
- **우선순위**: P1 (High)
- **작업 내용**:
  - [x] 백엔드 `test_pet_system.py` 및 기존 28개 테스트 전체 통과 확인 (총 32/32 Pass)
  - [x] `desktop-pet` React 빌드 검증 (`npm run build` 0 Error Pass)
  - [x] `run_pet.bat` 스크립트 작성 (백엔드 + 데스크톱 펫 동시 구동)
- **검증 기준**: 0 Error, 무결점 구동 확인 완료
