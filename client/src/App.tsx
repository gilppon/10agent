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

export const App: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [ollamaOnline, setOllamaOnline] = useState<boolean>(false);
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState<string>('http://localhost:11434');
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');

  const [currentSessionId, setCurrentSessionId] = useState<string>('default-session');
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingToken, setStreamingToken] = useState('');
  const [streamingReasoning, setStreamingReasoning] = useState('');

  // Initial Load
  const initSystem = async () => {
    try {
      const [agentList, modelData, sessionList] = await Promise.all([
        api.getAgents(),
        api.getModels(),
        api.getSessions()
      ]);

      setAgents(agentList);
      if (agentList.length > 0) {
        setSelectedAgent(agentList[0]);
      }

      setModels(modelData.models);
      setOllamaOnline(modelData.status === 'online');
      setOllamaBaseUrl(modelData.base_url);

      if (sessionList && sessionList.length > 0) {
        setCurrentSessionId(sessionList[0].id);
        const msgs = await api.getSessionMessages(sessionList[0].id);
        setMessages(msgs);
      } else {
        const newSess = await api.createSession('기본 세션');
        setCurrentSessionId(newSess.id);
      }
    } catch (e) {
      console.error('System initialization error', e);
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
      />

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <Header
          activeAgent={activeTab === 'chat' ? selectedAgent : null}
          availableModels={models}
          currentModel={selectedAgent?.model || 'qwen2.5-coder:14b'}
          onModelChange={handleModelChange}
          onNewSession={handleNewSession}
        />

        {activeTab === 'chat' && selectedAgent && (
          <ChatView
            agent={selectedAgent}
            messages={messages}
            streamingToken={streamingToken}
            streamingReasoning={streamingReasoning}
            isStreaming={isStreaming}
            onSendMessage={handleSendMessage}
          />
        )}

        {activeTab === 'roundtable' && (
          <RoundtableModal
            agents={agents}
            sessionId={currentSessionId}
          />
        )}

        {activeTab === 'pipelines' && (
          <PipelineView
            sessionId={currentSessionId}
          />
        )}

        {activeTab === 'models' && (
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
        )}

        {activeTab === 'workspace' && (
          <WorkspaceView />
        )}
      </main>
    </div>
  );
};
