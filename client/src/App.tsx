import React, { useState, useEffect } from 'react';
import { Agent, Message, Session, ModelInfo, ActiveTab } from './types';
import { api } from './services/api';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ChatView } from './components/ChatView';
import { RoundtableModal } from './components/RoundtableModal';
import { ModelManager } from './components/ModelManager';
import { WorkspaceView } from './components/WorkspaceView';
import { PipelineView } from './components/PipelineView';
import { IntegrationCenterModal } from './components/IntegrationCenterModal';
import { MyTeamModal } from './components/MyTeamModal';
import { KnowledgeNetworkModal } from './components/KnowledgeNetworkModal';
import { TelegramModal } from './components/TelegramModal';

const DEFAULT_AGENTS_FALLBACK: Agent[] = [
  { id: 'ceo', name: 'CEO', role: 'Chief Executive Agent', emoji: '🧭', color: '#F8FAFC', specialty: '오케스트레이션, 작업 분해, 종합 판단, 다음 액션 결정', tagline: '회사 전체 의사결정과 작업 분배를 총괄 지휘합니다', persona: '최고 경영자', model: 'deepseek-v4', is_custom: false },
  { id: 'youtube', name: '레오', role: 'Head of YouTube', emoji: '📺', color: '#FF4444', specialty: '유튜브 채널 운영, 영상 기획서(제목·후크·구조), 트렌드 분석', tagline: '유튜브 채널 기획 및 영상 바이럴 전략을 책임집니다', persona: '유튜브 디렉터', model: 'qwen3.5-9b-uncensored-hauhaucs-aggressive', is_custom: false },
  { id: 'instagram', name: '찬우', role: '인스타 마케터 · Head of Instagram', emoji: '📷', color: '#E1306C', specialty: '인스타그램 릴스/피드 콘셉트, 캡션, 3-3-3 해시태그 전략', tagline: '인스타 콘텐츠 기획과 인게이지먼트를 극대화합니다', persona: '인스타 마케터', model: 'llama3.2:3b', is_custom: false },
  { id: 'designer', name: '민희', role: '디자인 전략가 · Lead Designer', emoji: '🎨', color: '#A78BFA', specialty: 'Z-Axis 공간감, HSL Color Engineering, 8px 그리드 UI/UX 설계', tagline: '브랜드와 프리미엄 시각 자산 디자인을 담당합니다', persona: '디자인 리드', model: 'qwen3.5-9b-deepseek-v4-flash', is_custom: false },
  { id: 'developer', name: '코다리', role: '시니어 풀스택 엔지니어', emoji: '💻', color: '#22D3EE', specialty: '코드 작성·편집·디버깅, 자동화 스크립트, 자율 검증 루프', tagline: '읽고·생각하고·짜고·검증한다 — Claude Code 수준 시니어', persona: '시니어 개발자', model: 'qwen2.5-coder:14b', is_custom: false },
  { id: 'business', name: '현빈', role: '비즈니스 전략가 · Head of Business', emoji: '💼', color: '#F5C518', specialty: '수익화 모델, 가격 전략, 시장·경쟁 분석, ROI/KPI 설계', tagline: '수익화·가격·전략 의사결정을 냉철하게 분석합니다', persona: '비즈니스 전략가', model: 'prism-ml/bonsai-27b', is_custom: false },
  { id: 'secretary', name: '영숙', role: '비서 · Personal Assistant', emoji: '📱', color: '#84CC16', specialty: '일정·할 일 관리, 에이전트 작업 요약, 데일리 브리핑', tagline: '대표님의 일정과 회사 소통을 깔끔하게 챙깁니다', persona: '수석 비서', model: 'google/gemma-4-e2b', is_custom: false },
  { id: 'editor', name: '루나', role: 'Sound Director & Composer', emoji: '🎵', color: '#F472B6', specialty: 'BGM 자동 생성 프롬프트, 사운드 디자인, 오디오 연출', tagline: '콘텐츠에 어울리는 감각적인 사운드와 BGM을 설계합니다', persona: '사운드 디렉터', model: 'google/gemma-4-e4b', is_custom: false },
  { id: 'writer', name: '지은', role: '수석 카피라이터 · Copywriter', emoji: '✍️', color: '#FBBF24', specialty: 'AIDA/PAS/BAB 카피라이팅 프레임워크, SEO 최적화', tagline: '전환율을 부르는 강력한 카피와 스크립트를 작성합니다', persona: '수석 카피라이터', model: 'qwen2.5:7b', is_custom: false },
  { id: 'researcher', name: '정우', role: 'RAG 지식 탐색가 · Trend Researcher', emoji: '🔍', color: '#60A5FA', specialty: '5단계 조사 프로토콜, 교차 검증 팩트체크, 기술 동향 리서치', tagline: '트렌드와 데이터를 정밀 수집하여 팩트체크를 끝냅니다', persona: '심층 리서처', model: 'qwen3.6:latest', is_custom: false }
];

export const App: React.FC = () => {

  const [agents, setAgents] = useState<Agent[]>(DEFAULT_AGENTS_FALLBACK);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(DEFAULT_AGENTS_FALLBACK[0]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [ollamaOnline, setOllamaOnline] = useState<boolean>(false);
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState<string>('http://localhost:11434');
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [isTeamModalOpen, setIsTeamModalOpen] = useState<boolean>(false);
  const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState<boolean>(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState<boolean>(false);

  const [currentSessionId, setCurrentSessionId] = useState<string>('default-session');
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingToken, setStreamingToken] = useState('');
  const [streamingReasoning, setStreamingReasoning] = useState('');

  // Initial Load
  const initSystem = async () => {
    // 1. 에이전트 목록 로드
    try {
      const agentList = await api.getAgents();
      if (agentList && agentList.length > 0) {
        setAgents(agentList);
        if (!selectedAgent) setSelectedAgent(agentList[0]);
      }
    } catch (e) {
      console.warn('에이전트 목록 백엔드 로드 대기 중 (기본값 사용):', e);
    }

    // 2. 모델 및 서버 상태 로드
    try {
      const modelData = await api.getModels();
      if (modelData) {
        setModels(modelData.models || []);
        setOllamaOnline(modelData.status === 'online');
        setOllamaBaseUrl(modelData.base_url || 'http://localhost:11434');
      }
    } catch (e) {
      console.warn('모델 목록 로드 대기 중:', e);
    }

    // 3. 세션 로드
    try {
      const sessionList = await api.getSessions();
      if (sessionList && sessionList.length > 0) {
        setCurrentSessionId(sessionList[0].id);
        const msgs = await api.getSessionMessages(sessionList[0].id);
        setMessages(msgs || []);
      } else {
        const newSess = await api.createSession('기본 세션');
        if (newSess?.id) setCurrentSessionId(newSess.id);
      }
    } catch (e) {
      console.warn('세션 로드 대기 중:', e);
    }
  };

  useEffect(() => {
    initSystem();
  }, []);

  // When selected agent changes, filter/load messages
  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgent(agent);
  };

  const handleSendMessage = (text: string) => {
    if (!selectedAgent || isStreaming) return;

    // Append user message immediately
    const userMsg: Message = {
      session_id: currentSessionId,
      agent_id: null,
      role: 'user',
      content: text
    };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);
    setStreamingToken('');
    setStreamingReasoning('');

    let accumulatedContent = '';
    let accumulatedReasoning = '';

    api.streamChat(
      {
        session_id: currentSessionId,
        agent_id: selectedAgent.id,
        message: text,
        override_model: selectedAgent.model
      },
      {
        onToken: (token) => {
          accumulatedContent += token;
          setStreamingToken(accumulatedContent);
        },
        onReasoning: (reasonText) => {
          accumulatedReasoning += reasonText;
          setStreamingReasoning(accumulatedReasoning);
        },
        onDone: () => {
          setMessages(prev => [
            ...prev,
            {
              session_id: currentSessionId,
              agent_id: selectedAgent.id,
              role: 'assistant',
              content: accumulatedContent,
              reasoning: accumulatedReasoning || undefined
            }
          ]);
          setIsStreaming(false);
          setStreamingToken('');
          setStreamingReasoning('');
        },
        onError: (err) => {
          console.error(err);
          setIsStreaming(false);
        }
      }
    );
  };

  const handleModelChange = async (model: string) => {
    if (!selectedAgent) return;
    await api.updateAgentModel(selectedAgent.id, model);
    setAgents(prev => prev.map(a => a.id === selectedAgent.id ? { ...a, model } : a));
    setSelectedAgent(prev => prev ? { ...prev, model } : null);
  };

  const handleNewSession = async () => {
    const newSess = await api.createSession(`세션 ${new Date().toLocaleTimeString()}`);
    setCurrentSessionId(newSess.id);
    setMessages([]);
  };

  const handleAddAgent = async (newAgent: Agent) => {
    await api.saveAgent(newAgent);
    setAgents(prev => [...prev, newAgent]);
    setSelectedAgent(newAgent);
    setActiveTab('chat');
  };

  const handleRefreshModels = async () => {
    const modelData = await api.getModels();
    setModels(modelData.models);
    setOllamaOnline(modelData.status === 'online');
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Left Sidebar */}
      <Sidebar
        agents={agents}
        selectedAgent={selectedAgent}
        onSelectAgent={handleSelectAgent}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        ollamaOnline={ollamaOnline}
        onAddAgent={handleAddAgent}
        onOpenTeamModal={() => setIsTeamModalOpen(true)}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <Header
          activeAgent={activeTab === 'chat' ? selectedAgent : null}
          availableModels={models}
          currentModel={selectedAgent?.model || 'qwen2.5-coder:14b'}
          onModelChange={handleModelChange}
          onNewSession={handleNewSession}
          onOpenTeamModal={() => setIsTeamModalOpen(true)}
          onOpenKnowledgeModal={() => setIsKnowledgeModalOpen(true)}
          onOpenTelegramModal={() => setIsTelegramModalOpen(true)}
        />

        {/* 1:1 Chat Tab */}
        <div style={{ display: activeTab === 'chat' ? 'flex' : 'none', flex: 1, height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
          {selectedAgent && (
            <ChatView
              agent={selectedAgent}
              messages={messages}
              streamingToken={streamingToken}
              streamingReasoning={streamingReasoning}
              isStreaming={isStreaming}
              onSendMessage={handleSendMessage}
            />
          )}
        </div>

        {/* Multi-Agent Roundtable Tab */}
        <div style={{ display: activeTab === 'roundtable' ? 'flex' : 'none', flex: 1, height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
          <RoundtableModal
            agents={agents}
            sessionId={currentSessionId}
          />
        </div>

        {/* Automation Pipelines Tab (Keeps user prompt & progress alive) */}
        <div style={{ display: activeTab === 'pipelines' ? 'flex' : 'none', flex: 1, height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
          <PipelineView
            sessionId={currentSessionId}
          />
        </div>

        {/* Brain Model Manager Tab */}
        <div style={{ display: activeTab === 'models' ? 'flex' : 'none', flex: 1, height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
          <ModelManager
            agents={agents}
            models={models}
            ollamaOnline={ollamaOnline}
            ollamaBaseUrl={ollamaBaseUrl}
            onRefreshModels={handleRefreshModels}
            onAgentModelUpdated={(aid, m) => {
              setAgents(prev => prev.map(a => a.id === aid ? { ...a, model: m } : a));
              if (selectedAgent?.id === aid) setSelectedAgent(prev => prev ? { ...prev, model: m } : null);
            }}
          />
        </div>

        {/* Workspace Artifacts Tab */}
        <div style={{ display: activeTab === 'workspace' ? 'flex' : 'none', flex: 1, height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
          <WorkspaceView />
        </div>

        {/* External Integration Center Modal */}
        <IntegrationCenterModal
          isOpen={activeTab === 'integrations'}
          onClose={() => setActiveTab('chat')}
        />

        {/* My Team Dashboard & Agent Detail Modal */}
        <MyTeamModal
          isOpen={isTeamModalOpen}
          onClose={() => setIsTeamModalOpen(false)}
          agents={agents}
          models={models}
          onAgentModelUpdated={(aid, m) => {
            setAgents(prev => prev.map(a => a.id === aid ? { ...a, model: m } : a));
            if (selectedAgent?.id === aid) setSelectedAgent(prev => prev ? { ...prev, model: m } : null);
          }}
          onSelectAgentForChat={(agent) => {
            setSelectedAgent(agent);
            setActiveTab('chat');
          }}
        />

        {/* Knowledge Network Graph & Memory Cloud Modal */}
        <KnowledgeNetworkModal
          isOpen={isKnowledgeModalOpen}
          onClose={() => setIsKnowledgeModalOpen(false)}
        />

        {/* Telegram Remote Autonomous Control Modal */}
        <TelegramModal
          isOpen={isTelegramModalOpen}
          onClose={() => setIsTelegramModalOpen(false)}
        />
      </main>
    </div>
  );
};
