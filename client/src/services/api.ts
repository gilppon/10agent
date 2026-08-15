import { Agent, Message, Session, ModelInfo, ArtifactFile } from '../types';

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
    fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
        if (!response.body) return;
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
      .catch(callbacks.onError);
  },

  streamRoundtable(
    payload: { session_id: string; topic: string; agent_ids: string[] },
    callbacks: {
      onEvent: (data: any) => void;
      onDone: () => void;
      onError: (err: any) => void;
    }
  ) {
    fetch(`${API_BASE}/roundtable/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
        if (!response.body) return;
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
      .catch(callbacks.onError);
  },

  streamPipeline(
    payload: { session_id: string; pipeline_type: string; prompt: string },
    callbacks: {
      onEvent: (data: any) => void;
      onDone: () => void;
      onError: (err: any) => void;
    }
  ) {
    fetch(`${API_BASE}/pipeline/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
        if (!response.body) return;
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
      .catch(callbacks.onError);
  },
};
