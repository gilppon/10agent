import React from 'react';
import { Agent, ModelInfo } from '../types';
import { Sparkles, Plus, Cpu, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  activeAgent: Agent | null;
  availableModels: ModelInfo[];
  currentModel: string;
  onModelChange: (model: string) => void;
  onNewSession: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeAgent,
  availableModels,
  currentModel,
  onModelChange,
  onNewSession,
}) => {
  return (
    <header className="glass-header" style={{
      height: '64px',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0
    }}>
      {/* Active Agent Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {activeAgent ? (
          <>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: `rgba(${parseInt(activeAgent.color.slice(1,3), 16) || 99}, ${parseInt(activeAgent.color.slice(3,5), 16) || 102}, ${parseInt(activeAgent.color.slice(5,7), 16) || 241}, 0.2)`,
              border: `1.5px solid ${activeAgent.color}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>
              {activeAgent.emoji}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '15px', color: '#F8FAFC' }}>
                  {activeAgent.name}
                </span>
                <span style={{
                  fontSize: '11px',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--text-secondary)'
                }}>
                  {activeAgent.role}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {activeAgent.tagline}
              </div>
            </div>
          </>
        ) : (
          <div style={{ fontWeight: 600, fontSize: '15px', color: '#F8FAFC' }}>
            다자간 오케스트레이션 대시보드
          </div>
        )}
      </div>

      {/* Action Controls & Model Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Model Quick Switcher */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '8px',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--border-glass)'
        }}>
          <Cpu size={14} color="var(--accent-cyan)" />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>로컬 AI 두뇌:</span>
          <select
            value={currentModel}
            onChange={(e) => onModelChange(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#F8FAFC',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            {availableModels.map((m) => (
              <option key={m.name} value={m.name} style={{ background: '#0F172A', color: '#FFF' }}>
                {m.name} ({m.size || m.vram_tier})
              </option>
            ))}
          </select>
        </div>

        {/* New Session Button */}
        <button
          onClick={onNewSession}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid var(--border-glass)',
            color: '#F8FAFC',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Plus size={14} /> 새 대화
        </button>
      </div>
    </header>
  );
};
