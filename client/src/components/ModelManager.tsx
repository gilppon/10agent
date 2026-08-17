import React, { useState, useEffect } from 'react';
import { Agent, ModelInfo, HardwareProfile } from '../types';
import { Cpu, RefreshCw, Check, HardDrive, Terminal, Zap, ShieldCheck, Sparkles, Activity } from 'lucide-react';
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
  const [hardwareProfile, setHardwareProfile] = useState<HardwareProfile | null>(null);
  const [isAutoAssigning, setIsAutoAssigning] = useState<boolean>(false);
  const [autoAssignToast, setAutoAssignToast] = useState<string | null>(null);

  const fetchHardwareProfile = async () => {
    try {
      const profile = await api.getHardwareProfile();
      setHardwareProfile(profile);
    } catch (e) {
      console.error('Failed to fetch hardware profile:', e);
    }
  };

  useEffect(() => {
    fetchHardwareProfile();
  }, []);

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

  const handleAutoAssign = async () => {
    setIsAutoAssigning(true);
    try {
      const res = await api.autoAssignOptimalModels();
      if (res.status === 'success' && res.mapping) {
        Object.entries(res.mapping).forEach(([aid, mName]) => {
          onAgentModelUpdated(aid, mName);
        });
        setAutoAssignToast(`🎉 대표님 PC 사양에 맞춘 10대 에이전트 최적 모델 자동 배정이 완료되었습니다!`);
        setTimeout(() => setAutoAssignToast(null), 3000);
      }
    } catch (e) {
      console.error('Auto assign failed:', e);
    } finally {
      setIsAutoAssigning(false);
    }
  };

  const isLMStudioModel = (modelName: string) => {
    const found = models.find(m => m.name === modelName);
    if (found?.backend) return found.backend === 'lm_studio';
    return modelName.includes('/') || modelName.includes('bonsai') || modelName.includes('Loaded') || modelName.includes('flash') || modelName.includes('uncensored');
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '24px 32px',
      overflowY: 'auto',
      background: 'radial-gradient(ellipse at top, rgba(6, 182, 212, 0.12), var(--bg-main))'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Cpu size={22} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em' }}>
              로컬 AI 두뇌 관제소 (Ollama & LM Studio 하이브리드)
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            내 컴퓨터의 로컬 LLM을 에이전트별 전문 직무에 1:1로 매핑하여 100% 무료·보안으로 구동합니다.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleAutoAssign}
            disabled={isAutoAssigning || models.length === 0}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
              border: 'none',
              color: '#FFF',
              fontSize: '12px',
              fontWeight: 700,
              cursor: isAutoAssigning ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 10px rgba(139, 92, 246, 0.3)'
            }}
          >
            <Sparkles size={14} /> {isAutoAssigning ? '최적 모델 배정 중...' : '⚡ 내 사양 맞춤 1-Click 자동 배정'}
          </button>

          <button
            onClick={() => { onRefreshModels(); fetchHardwareProfile(); }}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.2))',
              border: '1px solid rgba(52, 211, 153, 0.4)',
              color: '#34D399',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)'
            }}
          >
            <RefreshCw size={14} /> 모델 목록 새로고침
          </button>
        </div>
      </div>

      {/* Auto Assign Toast Notification */}
      {autoAssignToast && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '10px',
          background: 'rgba(139, 92, 246, 0.25)',
          border: '1px solid var(--accent-purple)',
          color: '#DDD6FE',
          fontSize: '13px',
          fontWeight: 700,
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Sparkles size={16} color="var(--accent-purple)" />
          {autoAssignToast}
        </div>
      )}

      {/* Hardware Diagnostics & VRAM Real-Time Dashboard */}
      {hardwareProfile && (
        <div className="glass-panel" style={{ padding: '18px 22px', marginBottom: '20px', background: 'rgba(15, 23, 42, 0.65)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} color="var(--accent-cyan)" />
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#F8FAFC' }}>
                💻 내 PC 하드웨어 사양 실시간 진단: <span style={{ color: 'var(--accent-cyan)' }}>{hardwareProfile.tier_name}</span>
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {hardwareProfile.recommendations?.strategy}
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px'
          }}>
            {/* GPU Card */}
            <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.07)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>🎮 그래픽카드 (GPU & VRAM)</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFF' }}>
                {hardwareProfile.gpu.device_name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--accent-emerald)', marginTop: '4px', fontWeight: 600 }}>
                총 VRAM: {hardwareProfile.gpu.total_vram_gb} GB (여유: {hardwareProfile.gpu.free_vram_gb} GB)
              </div>
            </div>

            {/* RAM Card */}
            <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.07)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>🧠 시스템 메모리 (RAM)</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFF' }}>
                {hardwareProfile.ram.total_gb} GB (여유: {hardwareProfile.ram.available_gb} GB)
              </div>
              <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginTop: '4px' }}>
                점유율: {hardwareProfile.ram.usage_percent}%
              </div>
            </div>

            {/* CPU Card */}
            <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.07)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>⚙️ 프로세서 (CPU)</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFF' }}>
                {hardwareProfile.cpu.physical_cores} Physical Cores ({hardwareProfile.cpu.logical_threads} Threads)
              </div>
              <div style={{ fontSize: '11px', color: 'var(--accent-amber)', marginTop: '4px' }}>
                현재 부하: {hardwareProfile.cpu.usage_percent}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Local AI Server Engine Status Card */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: ollamaOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
            border: `1px solid ${ollamaOnline ? 'var(--accent-emerald)' : 'var(--accent-rose)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <HardDrive size={18} color={ollamaOnline ? 'var(--accent-emerald)' : 'var(--accent-rose)'} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#FFF' }}>
              연동 엔진: <span style={{ color: '#34D399', marginRight: '8px' }}>🦙 Ollama (11434)</span> <span style={{ color: '#A78BFA' }}>🚀 LM Studio (1234)</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              상태: {ollamaOnline ? `🟢 정상 작동 중 (감지된 로컬 모델 ${models.length}개)` : '🔴 대기 중 (Ollama 또는 LM Studio 실행 필요)'}
            </div>
          </div>
        </div>

        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          <ShieldCheck size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} color="var(--accent-emerald)" />
          외부 API 유출 없음 (100% 로컬 무료 구동)
        </div>
      </div>

      {/* Agent-to-Model Mapping Grid */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#F8FAFC' }}>
          👥 10대 에이전트별 로컬 모델 매핑 매트릭스
        </h3>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          각 직무에 가장 적합한 로컬 AI 두뇌를 자유롭게 교체하세요
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
        gap: '12px',
        marginBottom: '28px'
      }}>
        {agents.map((agent) => {
          const isSuccess = successAgentId === agent.id;
          const isLM = isLMStudioModel(agent.model);

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
                {isSuccess ? (
                  <span style={{ fontSize: '11px', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}>
                    <Check size={13} /> 변경 완료
                  </span>
                ) : (
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    background: isLM ? 'rgba(139, 92, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    border: `1px solid ${isLM ? '#8B5CF6' : '#10B981'}`,
                    color: isLM ? '#C4B5FD' : '#6EE7B7'
                  }}>
                    {isLM ? '🚀 LM Studio' : '🦙 Ollama'}
                  </span>
                )}
              </div>

              {/* Selector */}
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  연결된 AI 두뇌
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
                  {models.map((m) => {
                    const isM_LM = isLMStudioModel(m.name);
                    const enginePrefix = isM_LM ? '🚀 [LM Studio]' : '🦙 [Ollama]';
                    return (
                      <option key={m.name} value={m.name} style={{ background: '#0F172A', color: '#FFF' }}>
                        {enginePrefix} {m.name} ({m.size || m.vram_tier})
                      </option>
                    );
                  })}
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
          <span style={{ fontWeight: 700, fontSize: '13px' }}>💡 대표님 사양(RTX 4050 6GB / 32GB RAM) 맞춤형 추천 모델</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
          <code>ollama run qwen2.5-coder:14b <span style={{ color: 'var(--text-muted)' }}># 코딩·풀스택 최강 모델 (코다리, 민희 추천)</span></code>
          <code>ollama run deepseek-v4 / qwen3.6 <span style={{ color: 'var(--text-muted)' }}># 심층 추론·기획·리서치 모델 (CEO, 정우, 현빈 추천)</span></code>
          <code>ollama run llama3.2:3b / gemma-4-e4b <span style={{ color: 'var(--text-muted)' }}># 초경량·초고속 SNS/비서 모델 (영숙, 찬우, 지은 추천)</span></code>
        </div>
      </div>
    </div>
  );
};

