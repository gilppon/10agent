import React, { useState } from 'react';
import { Agent, ModelInfo } from '../types';
import { Cpu, RefreshCw, Check, HardDrive, Terminal, Zap, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';

interface ModelManagerProps {
  agents: Agent[];
  models: ModelInfo[];
  ollamaOnline: boolean;
  ollamaBaseUrl: string;
  onRefreshModels: () => void;
  onAgentModelUpdated: (agentId: string, model: string) => void;
}

export const ModelManager: React.FC<ModelManagerProps> = ({
  agents,
  models,
  ollamaOnline,
  ollamaBaseUrl,
  onRefreshModels,
  onAgentModelUpdated
}) => {
  const [updatingAgentId, setUpdatingAgentId] = useState<string | null>(null);
  const [successAgentId, setSuccessAgentId] = useState<string | null>(null);

  const handleModelChange = async (agentId: string, modelName: string) => {
    setUpdatingAgentId(agentId);
    try {
      await api.updateAgentModel(agentId, modelName);
      onAgentModelUpdated(agentId, modelName);
      setSuccessAgentId(agentId);
      setTimeout(() => setSuccessAgentId(null), 1500);
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingAgentId(null);
    }
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '24px 32px',
      overflowY: 'auto',
      background: 'radial-gradient(ellipse at top, rgba(6, 182, 212, 0.1), var(--bg-main))'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Cpu size={22} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#F8FAFC' }}>
              Ollama 로컬 AI 두뇌 관제소 (비용 0원 최적화)
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            내 컴퓨터의 로컬 LLM을 에이전트별 전문 직무에 1:1로 매핑하여 100% 무료로 구동합니다.
          </p>
        </div>

        <button
          onClick={onRefreshModels}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid var(--border-glass)',
            color: '#FFF',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <RefreshCw size={14} /> 모델 목록 새로고침
        </button>
      </div>

      {/* Ollama Server Info Card */}
      <div className="glass-panel" style={{ padding: '18px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: ollamaOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
            border: `1px solid ${ollamaOnline ? 'var(--accent-emerald)' : 'var(--accent-rose)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <HardDrive size={20} color={ollamaOnline ? 'var(--accent-emerald)' : 'var(--accent-rose)'} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#FFF' }}>
              Ollama 로컬 엔드포인트: <code style={{ color: 'var(--accent-cyan)' }}>{ollamaBaseUrl}</code>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              상태: {ollamaOnline ? '🟢 정상 작동 중 (감지된 로컬 모델 ' + models.length + '개)' : '🔴 대기 중 (Ollama 실행 필요)'}
            </div>
          </div>
        </div>

        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          <ShieldCheck size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} color="var(--accent-emerald)" />
          외부 API 유출 없음 (100% 로컬 보안)
        </div>
      </div>

      {/* Agent-to-Model Mapping Grid */}
      <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: '#F8FAFC' }}>
        👥 에이전트별 로컬 모델 매핑 매트릭스
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
        gap: '12px',
        marginBottom: '28px'
      }}>
        {agents.map((agent) => {
          const isSuccess = successAgentId === agent.id;
          return (
            <div key={agent.id} className="glass-panel" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>{agent.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#FFF' }}>{agent.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{agent.role}</div>
                  </div>
                </div>
                {isSuccess && (
                  <span style={{ fontSize: '11px', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}>
                    <Check size={13} /> 변경 완료
                  </span>
                )}
              </div>

              {/* Selector */}
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  연결된 로컬 AI 두뇌 (Ollama Model)
                </label>
                <select
                  value={agent.model}
                  onChange={(e) => handleModelChange(agent.id, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid var(--border-glass)',
                    color: '#FFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  {models.map((m) => (
                    <option key={m.name} value={m.name} style={{ background: '#0F172A', color: '#FFF' }}>
                      {m.name} ({m.size || m.vram_tier})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>

      {/* Terminal Command Quick Helper */}
      <div className="glass-panel" style={{ padding: '18px 20px', background: 'rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: 'var(--accent-amber)' }}>
          <Terminal size={16} />
          <span style={{ fontWeight: 700, fontSize: '13px' }}>💡 무료 추천 코딩/추론 모델 원클릭 다운로드 가이드 (PowerShell)</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
          <code>ollama run qwen2.5-coder:14b <span style={{ color: 'var(--text-muted)' }}># 코딩·풀스택 최강 모델 (코다리, 민희 추천)</span></code>
          <code>ollama run deepseek-r1:14b <span style={{ color: 'var(--text-muted)' }}># 심층 추론·기획 모델 (CEO, 정우, 현빈 추천)</span></code>
          <code>ollama run llama3.2:3b <span style={{ color: 'var(--text-muted)' }}># 초경량·초고속 모델 (영숙, 찬우 추천)</span></code>
        </div>
      </div>
    </div>
  );
};
