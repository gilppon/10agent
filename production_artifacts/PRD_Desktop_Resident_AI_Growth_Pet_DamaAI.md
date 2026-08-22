# 📄 [PRD] 데스크톱 상주형 AI 성장 펫 (DamaAI) 시스템 사양서

---

## 1. 프로젝트 개요 (Executive Summary)
- **프로젝트 명**: 데스크톱 상주형 AI 성장 펫 (DamaAI - Desktop-Resident AI Growth Pet)
- **목적**: 화면 구석에 항상 상주(Always-on-top)하는 초경량 투명 데스크톱 펫 위젯을 통해, 사용자가 텍스트와 문서를 드래그앤드롭(간식 주기)으로 피딩하면 로컬 RAG 지식 베이스로 자동 적재하고 경험치(EXP)를 획득하여 성장/진화하는 게이미피케이션 AI 동반자 시스템 구축.
- **핵심 가치**:
  1. **초경량 상주 런타임 (Tauri v2 + React)**: 메모리 점유율 30~50MB 수준으로 리소스 부담 없는 투명 오버레이 위젯.
  2. **RAG 데이터 수집의 게이미피케이션**: 번거로운 문서 업로드를 '간식 주기' 인터랙션으로 전환.
  3. **기존 소버린 마스터 두뇌(7B) 및 RAG 백엔드 100% 재활용**: `next11`의 FastAPI, `nomic-embed-text`, `sovereign_master` 추론 엔진 직접 연계.
  4. **3단계 성장 진화 & 10대 에이전트 연계**: 아기(Lv.1~5) ➡️ 성장기(Lv.6~20) ➡️ 마스터 파트너(Lv.21+ 10대 에이전트 브리핑 연계).

---

## 2. 시스템 아키텍처 및 데이터 흐름 (Architecture & Data Flow)

```mermaid
graph TD
    User["사용자 Desktop (OS)"] -->|1. 텍스트/파일 드래그앤드롭 (간식 주기)| Widget["Tauri v2 Desktop Pet Widget (React)"]
    User -->|2. 대화 입력 및 상태 클릭| Widget
    
    subgraph "Desktop Client Layer (desktop-pet/)"
        Widget --> Sprite["PetSprite (CSS/SVG/Emoji 햅틱 애니메이션)"]
        Widget --> Bubble["SpeechBubble (상태별 말풍선)"]
        Widget --> Sound["Web Audio SoundFX (레벨업/피딩 사운드)"]
    end

    Widget -->|HTTP / SSE 통신| Backend["FastAPI Backend Server (localhost:8000)"]

    subgraph "Server Layer (server/)"
        Backend --> PetRouter["routers/pet.py (status, feed, chat, evolve)"]
        PetRouter --> PetBrain["services/pet_brain.py (EXP/성장단계/프롬프트 빌더)"]
        PetRouter --> Knowledge["services/knowledge_service.py (RAG 청킹 및 임베딩)"]
        PetRouter --> FileParser["services/file_service.py (문서 파싱: md, pdf, txt, code)"]
        PetRouter --> DB[("SQLite DB: pet_status")]
    end

    PetRouter -->|RAG 검색 및 LLM 추론| Ollama["Local LLM Engine (Ollama)"]
    subgraph "Local AI Engine"
        Ollama --> EmbedModel["nomic-embed-text (지식 벡터화)"]
        Ollama --> SovereignBrain["sovereign_master:7b (Qwen2.5-Coder + DeepSeek-R1)"]
    end
```

---

## 3. 디렉터리 레이아웃 (Monorepo Directory Layout)

```text
next11/
├── server/                          # [FastAPI 백엔드]
│   ├── main.py                      # pet 라우터 등록
│   ├── database.py                  # pet_status 테이블 스키마 확장
│   ├── routers/
│   │   └── pet.py                   # [신규] 펫 전용 엔드포인트 (/feed, /chat, /status, /reset)
│   ├── services/
│   │   ├── pet_brain.py             # [신규] 레벨/경험치/종족별 프롬프트 엔진
│   │   ├── knowledge_service.py     # RAG 지식 임베딩 및 검색
│   │   ├── file_service.py          # 멀티 포맷 파일 파서
│   │   └── ollama_client.py         # Ollama LLM 추론 클라이언트
│   └── tests/
│       └── test_pet_system.py       # [신규] 펫 성장 및 피딩 단위 테스트
├── desktop-pet/                     # [신규] Tauri v2 기반 투명 데스크톱 위젯
│   ├── src-tauri/
│   │   ├── Cargo.toml               # Tauri v2 Rust 의존성
│   │   ├── tauri.conf.json          # 투명/Always-on-top/마우스 영역 설정
│   │   └── src/main.rs              # 네이티브 창 제어 및 단축키 핸들러
│   ├── src/
│   │   ├── App.tsx                  # 메인 위젯 뷰 (드래그앤드롭 이벤트)
│   │   ├── components/
│   │   │   ├── PetSprite.tsx        # CSS/SVG/Emoji 햅틱 애니메이션 스프라이트
│   │   │   ├── SpeechBubble.tsx     # 레벨별 말투 출력 말풍선
│   │   │   └── StatusModal.tsx      # 스탯/친밀도/지식 열람 모달
│   │   ├── services/
│   │   │   ├── petApi.ts            # 백엔드 API 클라이언트
│   │   │   └── soundEffects.ts      # Web Audio 레벨업/피딩 징글 사운드
│   │   └── types/
│   │       └── pet.ts               # 펫 상태 타입 정의
│   ├── package.json
│   └── vite.config.ts
├── run_all.bat                      # 백엔드 + 웹 대시보드 실행
└── run_pet.bat                      # [신규] 백엔드 + 데스크톱 펫 동시 실행 배치
```

---

## 4. 백엔드 데이터 모델 및 API 명세 (Backend Specifications)

### 4.1. Database Schema (`server/database.py`)
```sql
CREATE TABLE IF NOT EXISTS pet_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT DEFAULT '뽀삐',
    pet_type TEXT DEFAULT 'dog',        -- 'dog' | 'cat'
    level INTEGER DEFAULT 1,
    exp INTEGER DEFAULT 0,
    max_exp INTEGER DEFAULT 100,
    affection INTEGER DEFAULT 50,       -- 친밀도 (0~100)
    growth_stage TEXT DEFAULT 'infant', -- 'infant' | 'growth' | 'master'
    total_fed_count INTEGER DEFAULT 0,  -- 총 피딩 횟수
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4.2. Pet Brain Engine (`server/services/pet_brain.py`)
- **경험치 및 레벨업 공식**:
  - 획득 경험치: `min(len(text) // 15 + 10, 60)` (글자 수 비례, 회당 10~60 EXP)
  - 필요 경험치: `level * 100`
  - 성장 단계 분기:
    - **아기 (Infant)**: Lv. 1 ~ 5
    - **성장기 (Growth)**: Lv. 6 ~ 20
    - **마스터 파트너 (Master)**: Lv. 21+
- **단계별 페르소나 및 지능 제약**:
  - **Dog (강아지/뽀삐)**: 활기참, 무한 충성, 문장 끝 '~멍!', '~했다멍'
  - **Cat (고양이/나비)**: 츤데레, 차분함, 통찰력, 문장 끝 '~냥', '~다옹'
  - **Master 레벨 특권**: 10대 에이전트 사단(코다리, 민희, CEO 등) 작업 브리핑 및 연계 기능 잠금 해제.

### 4.3. REST API Endpoints (`server/routers/pet.py`)
| 메서드 | 엔드포인트 | 요청 Body / 파라미터 | 설명 |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/pet/status` | - | 펫 현재 스탯, 레벨, 경험치, 단계 조회 |
| `POST` | `/api/pet/feed` | `{ "text": "...", "source": "drag_drop", "file_name": "..." }` | 텍스트/파일 RAG 임베딩 적재 및 경험치 지급 |
| `POST` | `/api/pet/chat` | `{ "message": "..." }` | 펫 페르소나 + RAG 지식 기반 LLM 답변 생성 |
| `POST` | `/api/pet/switch-type` | `{ "pet_type": "dog" \| "cat" }` | 강아지/고양이 종족 변경 |
| `POST` | `/api/pet/reset` | - | 펫 스탯 초기화 (테스트용) |

---

## 5. 데스크톱 클라이언트 명세 (Tauri v2 + React)

### 5.1. 투명 윈도우 설정 (`src-tauri/tauri.conf.json`)
- **창 크기**: 220px (W) × 260px (H)
- **Always-on-Top**: `true` (바탕화면 및 모든 창 위에 항상 상주)
- **Transparent**: `true` (투명 배경)
- **Decorations**: `false` (타이틀 바 및 테두리 제거)
- **Shadow**: `false` (불필요한 창 그림자 제거)

### 5.2. UI/UX 및 인터랙션 컴포넌트
1. **스프라이트 애니메이션 (`PetSprite.tsx`)**:
   - CSS 바운스/펄스/스케일 트랜지션 기반 햅틱 애니메이션 (`idle`, `eating`, `sleeping`, `levelup`).
   - SVG 및 이모지 기반 렌더링으로 에셋 누락 위험 원천 차단.
2. **반응형 말풍선 (`SpeechBubble.tsx`)**:
   - 피딩 시 "우적우적.. 지식을 학습 중이다멍! 📖"
   - 레벨업 시 "🎉 축하해! Lv.X로 진화했다멍!"
   - 클릭 시 대화 인터랙션 팝오버 오픈.
3. **Web Audio 사운드 이펙트 (`soundEffects.ts`)**:
   - Web Audio API 기반 오실레이터 사운드 합성 (외부 MP3 파일 의존성 없이 가볍고 즉각적인 피딩/레벨업 비프음 재생).

---

## 6. 검증 계획 및 품질 게이트 (Verification Gate)
1. **단위 테스트 (`server/tests/test_pet_system.py`)**:
   - 펫 상태 초기화 및 조회 검증
   - 피딩 시 EXP 계산 및 단계별 레벨업 루프 검증
   - 페르소나 프롬프트 빌더 렌더링 검증
2. **엔드투엔드 API 검증**:
   - `/api/pet/feed` 호출 시 SQLite DB 및 RAG 지식 베이스 동시 갱신 확인
   - `/api/pet/chat` 호출 시 Sovereign Master 추론 응답 확인
3. **클라이언트 빌드 검증**:
   - `desktop-pet` TypeScript 컴파일 및 Vite 빌드 무결성 확인
