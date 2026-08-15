# 📄 [PRD] 독립형 100% 무료(Zero-Cost) 멀티 에이전트 오케스트레이션 시스템

---

## 1. 프로젝트 개요 (Executive Summary)
- **프로젝트 명**: Next-Agent Standalone Local Engine (가칭: 넥스트 에이전트 독립형 로컬 오케스트레이터)
- **목적**: 외부 클라우드 API(OpenAI/Claude 등) 구독 비용 없이, **Ollama 로컬 AI 모델만으로 10대 전문 에이전트를 실시간 지휘/협업**시키는 독립형 풀스택(Full-Stack) 소프트웨어 시스템 구축.
- **핵심 목표**:
  1. **Zero-Cost Operation (비용 0원)**: Ollama 로컬 엔드포인트(`localhost:11434`) 기반 100% 로컬 구동
  2. **10대 전문 에이전트 사단**: CEO, 유튜브(레오), 인스타(찬우), 디자인(민희), 개발(코다리), 비즈니스(현빈), 비서(영숙), 사운드(루나), 카피(지은), 리서처(정우)
  3. **지능형 로컬 모델 라우터**: 각 에이전트의 업무 특성에 맞춰 최적의 로컬 모델(Qwen2.5-Coder, DeepSeek-R1-Distill, Llama-3.2 등)을 자동 바인딩 및 원클릭 교체 지원
  4. **All-in-One 모던 대시보드**: 실시간 스트리밍 채팅, 다자간 에이전트 회의(Roundtable), 파일/산출물 탐색기, 원클릭 자동화 파이프라인

---

## 2. 시스템 아키텍처 및 디렉터리 구성

```
c:\Users\PC\next11/
├── server/                          # Python FastAPI 백엔드 오케스트레이션 엔진
│   ├── main.py                      # FastAPI 엔트리포인트 및 API 라우터
│   ├── config.py                    # 시스템 설정 (Ollama URL, DB 경로 등)
│   ├── database.py                  # SQLite 기반 세션/메시지/에이전트 저장소
│   ├── models/
│   │   ├── agent.py                 # 에이전트 정의 및 상태 스키마
│   │   └── session.py               # 채팅 및 파이프라인 세션 스키마
│   ├── services/
│   │   ├── ollama_client.py         # Ollama 로컬 모델 자동 감지 및 스트리밍 호출
│   │   ├── agent_manager.py         # 10대 에이전트 페르소나 및 프롬프트 관리
│   │   ├── orchestrator.py          # 작업 분해, 라우팅, 에이전트 협업 실행 엔진
│   │   └── file_service.py          # 산출물/파일 시스템 읽기/쓰기/다운로드 관리
│   └── requirements.txt             # 백엔드 의존성 (fastapi, uvicorn, httpx, aiosqlite 등)
├── client/                          # React + Vite 모던 웹 프론트엔드 대시보드
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx                  # 메인 레이아웃 및 탭 뷰
│       ├── components/
│       │   ├── Sidebar.tsx          # 에이전트 목록 및 상태 표시
│       │   ├── ChatView.tsx         # 스트리밍 메시지, 마크다운 렌더러, 멘션 기능
│       │   ├── ModelManager.tsx     # Ollama 모델 감지 및 에이전트별 두뇌 매핑 UI
│       │   ├── WorkspaceView.tsx    # 생성된 코드/문서/미디어 파일 탐색기
│       │   └── PipelineView.tsx     # 원클릭 자동화 파이프라인 실행 패널
│       ├── services/
│       │   └── api.ts               # 백엔드 REST/SSE API 통신 모듈
│       └── styles/                  # 다크모드/글래스모피즘 모던 디자인 토큰
├── storage/                         # SQLite DB 및 생성된 산출물 저장소
│   ├── next_agent.db                # 대화 이력, 에이전트 설정, 파이프라인 로그
│   └── artifacts/                   # 에이전트가 생성한 소스코드, 문서, 미디어 파일
├── run_server.bat                   # 윈도우 원클릭 백엔드 실행 스크립트
├── run_client.bat                   # 윈도우 원클릭 프론트엔드 실행 스크립트
└── run_all.bat                      # 전체 시스템 원클릭 일괄 기동 스크립트
```

---

## 3. 10대 전문 에이전트 및 로컬 두뇌 매핑 (Agent Roster)

| 에이전트 ID | 이름 / 직책 | 전문 영역 (Specialty) | 기본 추천 로컬 AI 두뇌 (Ollama) |
| :--- | :--- | :--- | :--- |
| **`ceo`** | **CEO (총괄 지휘관)** | 오케스트레이션, 작업 분해, 다자간 조율 | `deepseek-r1:14b` / `qwen2.5:14b` |
| **`youtube`** | **레오 (Head of YouTube)** | 영상 기획, 제목/후크/구조, 썸네일 브리프 | `qwen2.5:14b` / `llama3.1:8b` |
| **`instagram`** | **찬우 (Head of Instagram)** | 릴스/피드, 3-3-3 해시태그, 캡션 템플릿 | `qwen2.5:14b` / `llama3.2:3b` |
| **`designer`** | **민희 (Lead Designer)** | Z-Axis 깊이감, HSL 컬러, UI/UX 설계 | `qwen2.5-coder:14b` / `qwen2.5:14b` |
| **`developer`** | **코다리 (시니어 풀스택)** | 풀스택 코드 작성, 정밀 디버깅, 자체 검증 | `qwen2.5-coder:14b` / `qwen2.5-coder:7b` |
| **`business`** | **현빈 (Head of Business)** | 수익화 모델, ROI/KPI, 시장/경쟁 분석 | `deepseek-r1:14b` / `qwen2.5:14b` |
| **`secretary`** | **영숙 (Personal Assistant)** | 일정 관리, 일일 브리핑, 작업 요약 정리 | `llama3.2:3b` / `qwen2.5:7b` (초고속) |
| **`editor`** | **루나 (Sound Director)** | BGM 무드 설계, 사운드 연출, 음악 프롬프트 | `qwen2.5:14b` |
| **`writer`** | **지은 (수석 카피라이터)** | AIDA/PAS/BAB 카피라이팅, SEO 글쓰기 | `qwen2.5:14b` / `gemma2:9b` |
| **`researcher`** | **정우 (RAG 지식 탐색가)** | 5단계 심층 조사, 교차 검증 팩트체크 | `deepseek-r1:14b` / `qwen2.5:14b` |

*※ 사용자가 보유한 VRAM 사양(8GB, 12GB, 16GB, 24GB+)에 따라 Ollama에 설치된 임의의 모델로 자유롭게 1초 만에 재매핑 가능.*

---

## 4. 핵심 백엔드 기능 명세 (Backend Specifications)

1. **Ollama Dynamic Connector**:
   - `http://localhost:11434/api/tags`를 호출하여 현재 로컬 PC에 설치된 모든 Ollama 모델 자동 조회
   - Server-Sent Events (SSE) 기반 실시간 토큰 스트리밍 응답 제공
   - 로컬 모델 미설치/미구동 시 친절한 안내 및 Fallback 처리

2. **Multi-Agent Orchestrator**:
   - **단일 에이전트 1:1 대화**: 특정 에이전트와 직접 심층 상담
   - **CEO 자동 라우팅**: 사용자 질문을 CEO가 분석하여 적합한 전문 에이전트 자동 호출
   - **다자간 회의 (Roundtable)**: 여러 에이전트가 순차적으로 의견을 교환하며 종합 기획안 도출
   - **자율 파이프라인 (Pipeline Execution)**: 기획 ➡️ 디자인 ➡️ 카피 ➡️ 개발 ➡️ 검증 일괄 체인 실행

3. **Workspace File Management**:
   - 에이전트가 작성한 코드, 마크다운 기획서, 스크립트를 `storage/artifacts/`에 자동 저장 및 브라우저 다운로드/편집 제공

---

## 5. 핵심 프론트엔드 UI/UX 명세 (Frontend Dashboard)

1. **에이전트 사이드바 (Sidebar)**:
   - 10대 에이전트 캐릭터 아바타, 상태 배지, 현재 매핑된 로컬 모델 표시
   - 원클릭 에이전트 전환 및 다자간 회의 모드 토글
   - [+ 새 에이전트 추가] 버튼으로 커스텀 에이전트 동적 생성 지원

2. **실시간 스트리밍 채팅창 (Chat View)**:
   - 마크다운 및 코드 구문 강조(Syntax Highlighting) 지원
   - 에이전트별 고유 컬러 테마 및 페르소나 말풍선 렌더링
   - 실시간 생각하는 과정(Thinking / Reasoner) 토글 아코디언 지원

3. **로컬 AI 모델 관제 패널 (Model Manager)**:
   - 현재 설치된 Ollama 모델 목록 및 용량 실시간 표시
   - 각 에이전트별 기본 AI 모델 드롭다운 셀렉터 (비용 0원 최적화)

4. **산출물 워크스페이스 뷰어 (Workspace View)**:
   - 생성된 파일 트리 탐색기, 코드 에디터, 마크다운 프리뷰어 내장

---

## 6. 성공 기준 및 안전성 (Success Metrics)
- **비용 0원 완벽 달성**: 외부 유료 API 키 없이 100% 로컬 구동 검증
- **낮은 시스템 부하**: 가벼운 FastAPI + Vite 조합으로 메모리 오버헤드 최소화
- **원클릭 실행성**: 더블 클릭 한 번(`run_all.bat`)으로 백엔드 및 웹 UI 동시 가동
