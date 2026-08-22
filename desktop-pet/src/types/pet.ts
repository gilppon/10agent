export type PetType = 'dog' | 'cat';
export type GrowthStage = 'infant' | 'growth' | 'master';
export type PetActionState = 'idle' | 'eating' | 'sleeping' | 'levelup' | 'thinking';

export interface PetPreset {
  id: string;
  name: string;
  type: PetType;
  imageUrl: string;
  description: string;
}

export interface PetStatus {
  id: number;
  name: string;
  pet_type: PetType;
  level: number;
  exp: number;
  max_exp: number;
  affection: number;
  growth_stage: GrowthStage;
  total_fed_count: number;
  preset_id?: string;
  custom_image_url?: string;
  updated_at?: string;
}

export interface GrowthResult {
  level: number;
  exp: number;
  max_exp: number;
  stage: GrowthStage;
  level_up: boolean;
  levels_gained: number;
}

export interface FeedResponse {
  status: string;
  gained_exp: number;
  growth: GrowthResult;
  affection: number;
  total_fed_count: number;
  knowledge_chunks_stored: number;
}

export interface ChatResponse {
  response: string;
  level: number;
  stage: GrowthStage;
  pet_type: PetType;
  name: string;
}
