export interface Agent {
  id: string;
  name: string;
  role: string;
  emoji: string;
  color: string;
  specialty: string;
  tagline: string;
  persona: string;
  model: string;
  is_custom: boolean;
}

export interface Message {
  id?: string;
  session_id: string;
  agent_id?: string | null;
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoning?: string | null;
  created_at?: string;
}

export interface Session {
  id: string;
  title: string;
  active_agent_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface ModelInfo {
  name: string;
  size?: string;
  modified_at?: string;
  digest?: string;
  vram_tier?: string;
}

export interface ArtifactFile {
  name: string;
  path: string;
  size: number;
  modified_at: string;
  category: 'code' | 'document' | 'media' | 'other';
}

export type ActiveTab = 'chat' | 'roundtable' | 'pipelines' | 'models' | 'workspace';
