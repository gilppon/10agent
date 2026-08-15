# 🧭 Next-Agent: 독립형 100% 무료(Zero-Cost) 멀티 에이전트 AI 오케스트레이션 시스템

> 외부 유료 API 없이, 로컬 Ollama AI 모델만으로 **10대 전문 에이전트**를 실시간 지휘하고 다자간 협업/원클릭 자동화를 구동하는 독립형 풀스택 소프트웨어 시스템

---

## ✨ 주요 특징

- **💰 비용 0원**: Ollama 로컬 LLM 전용 — OpenAI/Claude API 구독 불필요
- **👥 10대 전문 에이전트 사단**: CEO, 유튜브(레오), 인스타(찬우), 디자인(민희), 개발(코다리), 비즈니스(현빈), 비서(영숙), 사운드(루나), 카피(지은), 리서처(정우)
- **🧠 지능형 로컬 모델 라우터**: 에이전트별 최적의 Ollama 모델 자동 바인딩 및 원클릭 교체
- **💬 실시간 스트리밍 채팅**: SSE 기반 토큰 스트리밍 + DeepSeek-R1 Thinking 토글
- **👥 다자간 원탁회의 (Roundtable)**: 여러 에이전트가 순차 발언하며 집단 지성 도출
- **⚡ 4대 원클릭 자동화 팩**: 유튜브 팩, 풀스택 앱 빌더, 마케팅 카피 스위트, 심층 리서치 팩
- **📂 산출물 워크스페이스**: 에이전트가 생성한 코드/문서 실시간 탐색 및 다운로드

---

## 🚀 원클릭 실행

```bash
# Windows
run_all.bat

# 또는 수동 실행
# 터미널 1: 백엔드
pip install -r server/requirements.txt
python -m uvicorn server.main:app --host 0.0.0.0 --port 8000 --reload

# 터미널 2: 프론트엔드
cd client && npm install && npm run dev
```

- **Frontend Dashboard**: http://localhost:5173
- **Backend API Docs**: http://localhost:8000/docs
- **Ollama Local AI**: http://localhost:11434

---

## 🏛️ 프로젝트 구조

```
├── server/                     # Python FastAPI 백엔드 오케스트레이션 엔진
│   ├── main.py                 # REST / SSE 실시간 스트리밍 엔드포인트
│   ├── services/
│   │   ├── ollama_client.py    # 로컬 모델 자동 감지 & 스트리밍
│   │   ├── agent_manager.py    # 10대 에이전트 페르소나 관리
│   │   └── orchestrator.py     # 1:1 대화, 원탁회의, 파이프라인 엔진
│   └── requirements.txt
├── client/                     # React 18 + Vite 모던 웹 대시보드
│   └── src/components/
│       ├── ChatView.tsx        # 실시간 스트리밍 채팅
│       ├── RoundtableModal.tsx # 다자간 원탁회의
│       ├── ModelManager.tsx    # Ollama 두뇌 관제
│       ├── PipelineView.tsx    # 원클릭 자동화 팩
│       └── WorkspaceView.tsx   # 산출물 탐색기
├── .agents/                    # 에이전트 팀 정의 및 전문 스킬
│   ├── agents.md               # 에이전트 역할/제약 정의
│   ├── skills/                 # 7대 전문 스킬셋
│   └── workflows/              # /startcycle 워크플로 매크로
├── AGENTS.md                   # 최상위 제어 타워 (스킬 인덱스)
├── CLAUDE.md                   # Claude Code 동기화
└── run_all.bat                 # 원클릭 전체 시스템 가동
```

---

## 👥 10대 전문 에이전트

| 에이전트 | 이름 | 직책 | 기본 로컬 AI 두뇌 |
| :--- | :--- | :--- | :--- |
| 🧭 | CEO | 총괄 지휘관 | `qwen2.5-coder:14b` |
| 📺 | 레오 | Head of YouTube | `qwen2.5:14b` |
| 📷 | 찬우 | Head of Instagram | `llama3.2:3b` |
| 🎨 | 민희 | Lead Designer | `qwen2.5-coder:14b` |
| 💻 | 코다리 | 시니어 풀스택 | `qwen2.5-coder:14b` |
| 💼 | 현빈 | Head of Business | `qwen2.5:14b` |
| 📱 | 영숙 | Personal Assistant | `llama3.2:3b` |
| 🎵 | 루나 | Sound Director | `qwen2.5:14b` |
| ✍️ | 지은 | 수석 카피라이터 | `qwen2.5:14b` |
| 🔍 | 정우 | RAG 지식 탐색가 | `deepseek-r1:14b` |

---

## 📋 사전 요구사항

- **Python** 3.10+
- **Node.js** 18+
- **Ollama** ([ollama.com](https://ollama.com)) — 로컬 AI 모델 구동

### 추천 Ollama 모델 설치

```bash
ollama run qwen2.5-coder:14b    # 코딩/풀스택 (코다리, 민희)
ollama run deepseek-r1:14b      # 심층 추론/기획 (CEO, 정우, 현빈)
ollama run llama3.2:3b          # 초경량/초고속 (영숙, 찬우)
```

---

## 📄 라이선스

MIT License
