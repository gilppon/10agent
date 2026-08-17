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
  error?: boolean;
  errorMessage?: string;
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
  source?: string;
  backend?: 'ollama' | 'lm_studio';
}

export interface HardwareProfile {
  tier: string;
  tier_name: string;
  cpu: {
    physical_cores: number;
    logical_threads: number;
    usage_percent: number;
  };
  ram: {
    total_gb: number;
    available_gb: number;
    usage_percent: number;
  };
  gpu: {
    has_gpu: boolean;
    device_name: string;
    total_vram_gb: number;
    free_vram_gb: number;
    cuda_version: string;
  };
  recommendations: {
    llm_small: string;
    llm_medium: string;
    llm_large: string;
    reasoning: string;
    strategy: string;
  };
}

export interface KnowledgeItem {
  title: string;
  source_url: string;
  chunk_count: number;
  created_at: string;
}

export interface KnowledgePreset {
  title: string;
  query: string;
}

export interface ArtifactFile {
  name: string;
  path: string;
  size: number;
  modified_at: string;
  category: 'code' | 'document' | 'media' | 'other';
}

export type ActiveTab = 'chat' | 'roundtable' | 'pipelines' | 'models' | 'workspace' | 'integrations';



