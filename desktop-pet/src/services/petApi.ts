import { PetStatus, FeedResponse, ChatResponse } from '../types/pet';

const BASE_URL = 'http://localhost:8000/api/pet';

export const petApi = {
  async getStatus(): Promise<PetStatus> {
    const res = await fetch(`${BASE_URL}/status`);
    if (!res.ok) throw new Error(`Status fetch failed: ${res.statusText}`);
    return res.json();
  },

  async feed(text: string, source = 'drag_drop', fileName?: string): Promise<FeedResponse> {
    const res = await fetch(`${BASE_URL}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, source, file_name: fileName }),
    });
    if (!res.ok) throw new Error(`Feeding failed: ${res.statusText}`);
    return res.json();
  },

  async chat(message: string): Promise<ChatResponse> {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) throw new Error(`Chat failed: ${res.statusText}`);
    return res.json();
  },

  async switchType(petType: 'dog' | 'cat', name?: string): Promise<{ status: string; pet_type: string; name: string }> {
    const res = await fetch(`${BASE_URL}/switch-type`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pet_type: petType, name }),
    });
    if (!res.ok) throw new Error(`Switch type failed: ${res.statusText}`);
    return res.json();
  },

  async reset(): Promise<{ status: string; message: string }> {
    const res = await fetch(`${BASE_URL}/reset`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`Reset failed: ${res.statusText}`);
    return res.json();
  }
};
