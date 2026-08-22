import { Agent, Message, Session, ModelInfo, ArtifactFile, HardwareProfile, KnowledgeItem, KnowledgePreset, StandaloneTool } from '../types';

const API_BASE = '/api';

export const api = {
  async getAgents(): Promise<Agent[]> {
    const res = await fetch(`${API_BASE}/agents`);
    const data = await res.json();
    return data.agents;
  },

  async updateAgentModel(agentId: string, model: string): Promise<void> {
    await fetch(`${API_BASE}/agents/${agentId}/model`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model }),
    });
  },

  async saveAgent(agent: Agent): Promise<void> {
    await fetch(`${API_BASE}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agent),
    });
  },

  async getModels(): Promise<{ status: string; models: ModelInfo[]; base_url: string }> {
    const res = await fetch(`${API_BASE}/models`);
    return await res.json();
  },

  async getHardwareProfile(): Promise<HardwareProfile> {
    const res = await fetch(`${API_BASE}/hardware/profile`);
    return await res.json();
  },

  async getHardwareRecommendations(): Promise<{
    tier: string;
    tier_name: string;
    installed_sota: Array<{ role: string; name: string; cmd: string }>;
    missing_sota: Array<{ role: string; name: string; cmd: string }>;
    readiness_score: number;
  }> {
    const res = await fetch(`${API_BASE}/hardware/recommendations`);
    return await res.json();
  },

  async autoAssignOptimalModels(): Promise<{ status: string; assigned_count: number; mapping: Record<string, string> }> {
    const res = await fetch(`${API_BASE}/hardware/auto-assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  },

  async ingestKnowledge(agentId: string, queryOrUrl: string): Promise<any> {
    const res = await fetch(`${API_BASE}/knowledge/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: agentId, query_or_url: queryOrUrl }),
    });
    return await res.json();
  },

  async getAgentKnowledge(agentId: string): Promise<{ agent_id: string; knowledge: KnowledgeItem[]; presets: KnowledgePreset[] }> {
    const res = await fetch(`${API_BASE}/knowledge/${agentId}`);
    return await res.json();
  },

  async deleteKnowledge(agentId: string, title: string): Promise<any> {
    const res = await fetch(`${API_BASE}/knowledge/${agentId}?title=${encodeURIComponent(title)}`, {
      method: 'DELETE',
    });
    return await res.json();
  },

  async getKnowledgeGraph(): Promise<{
    total_count: number;
    categories: {
      marketing: number;
      coding: number;
      design: number;
      business: number;
      general: number;
    };
    nodes: Array<{
      id: string;
      title: string;
      agent_id: string;
      category: string;
      source_url: string;
      chunk_preview: string;
      created_at: string;
    }>;
    edges: Array<{
      source: string;
      target: string;
      strength: number;
      type: string;
    }>;
  }> {
    const res = await fetch(`${API_BASE}/knowledge/graph`);
    return await res.json();
  },

  async exportKnowledgeBackup(): Promise<any> {
    const res = await fetch(`${API_BASE}/knowledge/backup/export`);
    return await res.json();
  },

  async importKnowledgeBackup(data: any): Promise<any> {
    const res = await fetch(`${API_BASE}/knowledge/backup/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await res.json();
  },

  async syncGithubBackup(payload: {
    repo_url: string;
    github_token?: string;
    branch?: string;
    action: 'backup' | 'restore';
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/knowledge/backup/github`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  async injectStarterPack(): Promise<{
    status: string;
    injected_presets: number;
    total_chunks: number;
    categories: Record<string, number>;
  }> {
    const res = await fetch(`${API_BASE}/knowledge/starter-pack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  },

  async synthesizeKnowledge(topic?: string): Promise<{
    status: string;
    message?: string;
    model_used?: string;
    total_chunks_analyzed?: number;
    synthesis_result?: string;
  }> {
    const res = await fetch(`${API_BASE}/knowledge/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: topic || '전사 종합 전략' }),
    });
    return await res.json();
  },

  async triggerAutoScout(agentId?: string): Promise<{
    status: string;
    timestamp: string;
    total_new_chunks: number;
    agents_updated_count: number;
    details: Array<{ agent_id: string; query: string; chunks_created?: number; title?: string; status: string }>;
  }> {
    const res = await fetch(`${API_BASE}/knowledge/auto-scout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: agentId }),
    });
    return await res.json();
  },

  async getAutoScoutStatus(): Promise<{
    enabled: boolean;
    schedule: string;
    last_scout_time: string | null;
    monitored_agents_count: number;
  }> {
    const res = await fetch(`${API_BASE}/knowledge/auto-scout/status`);
    return await res.json();
  },

  async toggleAutoScout(enabled: boolean): Promise<{
    enabled: boolean;
    schedule: string;
    last_scout_time: string | null;
    monitored_agents_count: number;
  }> {
    const res = await fetch(`${API_BASE}/knowledge/auto-scout/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    return await res.json();
  },

  async getTelegramConfig(): Promise<{
    bot_token: string;
    chat_id: string;
    is_configured: boolean;
    is_polling: boolean;
  }> {
    const res = await fetch(`${API_BASE}/telegram/config`);
    return await res.json();
  },

  async saveTelegramConfig(botToken: string, chatId: string): Promise<{
    status: string;
    config: { bot_token: string; chat_id: string; is_configured: boolean; is_polling: boolean };
  }> {
    const res = await fetch(`${API_BASE}/telegram/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bot_token: botToken, chat_id: chatId }),
    });
    return await res.json();
  },

  async testTelegramMessage(): Promise<any> {
    const res = await fetch(`${API_BASE}/telegram/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  },

  async triggerTelegramScout(): Promise<any> {
    const res = await fetch(`${API_BASE}/telegram/scout-now`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  },

  async getSessions(): Promise<Session[]> {
    const res = await fetch(`${API_BASE}/sessions`);
    const data = await res.json();
    return data.sessions;
  },

  async createSession(title: string): Promise<Session> {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    return await res.json();
  },

  async getSessionMessages(sessionId: string): Promise<Message[]> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/messages`);
    const data = await res.json();
    return data.messages;
  },

  async getArtifacts(): Promise<ArtifactFile[]> {
    const res = await fetch(`${API_BASE}/artifacts`);
    const data = await res.json();
    return data.artifacts;
  },

  async readArtifact(path: string): Promise<{ name: string; path: string; content: string }> {
    const res = await fetch(`${API_BASE}/artifacts/${path}`);
    return await res.json();
  },

  streamChat(
    payload: { session_id: string; agent_id: string; message: string; override_model?: string },
    callbacks: {
      onToken: (token: string) => void;
      onReasoning: (text: string) => void;
      onDone: (agentId: string) => void;
      onError: (err: any) => void;
    }
  ) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      callbacks.onError(new Error('로컬 AI 모델 응답 시간(120초)이 초과되었습니다.'));
    }, 120000);

    fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`서버 응답 오류 (HTTP ${response.status})`);
        }
        if (!response.body) {
          throw new Error('응답 본문이 비어 있습니다.');
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.error) {
                  callbacks.onError(new Error(data.error));
                  return;
                }
                if (data.type === 'token') {
                  callbacks.onToken(data.content);
                } else if (data.type === 'reasoning') {
                  callbacks.onReasoning(data.content);
                } else if (data.type === 'done') {
                  callbacks.onDone(data.agent_id);
                }
              } catch (e) {
                console.error('SSE JSON parse error', e);
              }
            }
          }
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          callbacks.onError(err);
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
      });
  },

  streamRoundtable(
    payload: { session_id: string; topic?: string; user_message?: string; agent_ids?: string[]; override_model?: string },
    callbacks: {
      onEvent: (data: any) => void;
      onDone: () => void;
      onError: (err: any) => void;
    }
  ) {
    const controller = new AbortController();
    let idleTimeoutId: any = null;
    const resetIdleTimeout = () => {
      if (idleTimeoutId) clearTimeout(idleTimeoutId);
      idleTimeoutId = setTimeout(() => {
        controller.abort();
        callbacks.onError(new Error('원탁회의 세션 응답 대기 시간(180초)이 초과되었습니다.'));
      }, 180000);
    };

    resetIdleTimeout();

    fetch(`${API_BASE}/roundtable/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`서버 응답 오류 (HTTP ${response.status})`);
        if (!response.body) throw new Error('응답 본문이 비어 있습니다.');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          resetIdleTimeout();
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.error) {
                  callbacks.onError(new Error(data.error));
                  return;
                }
                callbacks.onEvent(data);
                if (data.type === 'roundtable_done') {
                  callbacks.onDone();
                }
              } catch (e) {
                console.error('Roundtable SSE parse error', e);
              }
            }
          }
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') callbacks.onError(err);
      })
      .finally(() => {
        if (idleTimeoutId) clearTimeout(idleTimeoutId);
      });
  },

  streamPipeline(
    payload: { session_id: string; pipeline_type: string; prompt: string },
    callbacks: {
      onEvent: (data: any) => void;
      onDone: () => void;
      onError: (err: any) => void;
    }
  ) {
    const controller = new AbortController();
    let idleTimeoutId: any = null;
    const resetIdleTimeout = () => {
      if (idleTimeoutId) clearTimeout(idleTimeoutId);
      idleTimeoutId = setTimeout(() => {
        controller.abort();
        callbacks.onError(new Error('파이프라인 응답 대기 시간(180초)이 초과되었습니다.'));
      }, 180000);
    };

    resetIdleTimeout();

    fetch(`${API_BASE}/pipeline/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`서버 응답 오류 (HTTP ${response.status})`);
        if (!response.body) throw new Error('응답 본문이 비어 있습니다.');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          resetIdleTimeout();
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.error) {
                  callbacks.onError(new Error(data.error));
                  return;
                }
                callbacks.onEvent(data);
                if (data.type === 'pipeline_complete') {
                  callbacks.onDone();
                }
              } catch (e) {
                console.error('Pipeline SSE parse error', e);
              }
            }
          }
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') callbacks.onError(err);
      })
      .finally(() => {
        if (idleTimeoutId) clearTimeout(idleTimeoutId);
      });
  },

  // 🧠 Brain Forge (4대 특화 두뇌 관제) API
  async getBrainForgeStatus(): Promise<{
    status: string;
    brains: Array<{
      id: string;
      brain_name: string;
      display_name: string;
      base_model: string;
      temperature: number;
      assigned_agents: string[];
      assigned_names: string[];
      color: string;
      icon: string;
      mission: string;
      is_custom_installed: boolean;
      is_base_installed: boolean;
      active_model: string;
      status: string;
      backend_available: boolean;
    }>;
  }> {
    const res = await fetch(`${API_BASE}/brain-forge/status`);
    return await res.json();
  },

  async buildCustomBrain(brainId: string, knowledgeSnippets?: string[]): Promise<{
    success: boolean;
    brain_id: string;
    model_name: string;
    message?: string;
    error?: string;
  }> {
    const res = await fetch(`${API_BASE}/brain-forge/build/${brainId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ knowledge_snippets: knowledgeSnippets || [] }),
    });
    return await res.json();
  },

  async buildAllCustomBrains(): Promise<{
    status: string;
    results: Array<{
      success: boolean;
      brain_id: string;
      model_name: string;
      message?: string;
      error?: string;
    }>;
  }> {
    const res = await fetch(`${API_BASE}/brain-forge/build-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  },

  // 🧬 물리적 가중치 병합(MergeKit SLERP) & 자율 진화 API
  async getModelMergeStatus(): Promise<{
    recipes: Array<{
      brain_id: string;
      recipe_file: string;
      merge_method: string;
      base_model: string;
      model_a: string;
      model_b: string;
      ratio: string;
      output_name: string;
      quantization_target: string;
      vram_estimate_gb: number;
    }>;
    jobs: Record<string, {
      brain_id: string;
      status: string;
      progress: number;
      current_step: string;
      logs: string[];
      output_gguf: string;
      last_merged_at?: string;
      evolution_version: string;
      evolution_samples_count: number;
    }>;
    overall_status: string;
  }> {
    const res = await fetch(`${API_BASE}/model-merge/status`);
    return await res.json();
  },

  async startModelMerge(brainId: string): Promise<{
    status: string;
    brain_id?: string;
    message: string;
    results?: any[];
  }> {
    const res = await fetch(`${API_BASE}/model-merge/start/${brainId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  },

  async recordBrainEvolution(brainId: string, prompt: string, completion: string, score: number = 1.0): Promise<any> {
    const res = await fetch(`${API_BASE}/model-merge/evolve/${brainId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, completion, score }),
    });
    return await res.json();
  },

  async getStandaloneTools(): Promise<{ status: string; tools: StandaloneTool[] }> {
    const res = await fetch(`${API_BASE}/tools`);
    return await res.json();
  },

  async runStandaloneTool(toolPath: string, mode: 'cli' | 'ui' = 'cli'): Promise<{ status: string; message: string; tool_path: string }> {
    const res = await fetch(`${API_BASE}/tools/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool_path: toolPath, mode }),
    });
    return await res.json();
  },

  async openToolFolder(toolPath: string): Promise<{ status: string; message: string; tool_path: string }> {
    const res = await fetch(`${API_BASE}/tools/open-folder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool_path: toolPath }),
    });
    return await res.json();
  },

  async testStandaloneTool(toolPath: string): Promise<{ status: string; result: any }> {
    const res = await fetch(`${API_BASE}/tools/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool_path: toolPath }),
    });
    return await res.json();
  },
};


