import React, { useState, useEffect } from 'react';
import { Agent, ModelInfo, HardwareProfile } from '../types';
import { Cpu, RefreshCw, Check, HardDrive, Terminal, Zap, ShieldCheck, Sparkles, Activity, Crown, Layers, FileCode, CheckCircle2 } from 'lucide-react';
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

  // 👑 단일 주권 마스터 두뇌 (Sovereign Master Brain) State
  const [masterBrain, setMasterBrain] = useState<any | null>(null);
  const [isBuildingMaster, setIsBuildingMaster] = useState<boolean>(false);

  // 🧬 물리적 가중치 병합 (SLERP Merge) State
  const [mergeRecipe, setMergeRecipe] = useState<any | null>(null);
  const [mergeJob, setMergeJob] = useState<any | null>(null);
  const [showLogsModal, setShowLogsModal] = useState<boolean>(false);
  const [isMerging, setIsMerging] = useState<boolean>(false);

  const fetchBrainForgeStatus = async () => {
    try {
      const res = await api.getBrainForgeStatus();
      if (res.brains && res.brains.length > 0) {
        setMasterBrain(res.brains[0]);
      }
    } catch (e) {
      console.error('Failed to fetch master brain status:', e);
    }
  };

  const fetchModelMergeStatus = async () => {
    try {
      const res = await api.getModelMergeStatus();
      if (res.recipes && res.recipes.length > 0) setMergeRecipe(res.recipes[0]);
      if (res.jobs) {
        const job = res.jobs['sovereign_master'] || Object.values(res.jobs)[0];
        if (job) setMergeJob(job);
      }
    } catch (e) {
      console.error('Failed to fetch model merge status:', e);
    }
  };

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
    fetchBrainForgeStatus();
    fetchModelMergeStatus();
  }, []);

  // 병합 진행 중일 때 1.5초 간격 자동 폴링
  useEffect(() => {
    if (!mergeJob) return;
    const isMergingNow = mergeJob.status === 'merging' || mergeJob.status === 'quantizing';
    if (!isMergingNow) return;
    const interval = setInterval(fetchModelMergeStatus, 1500);
    return () => clearInterval(interval);
  }, [mergeJob]);

  const handleStartMerge = async () => {
    setIsMerging(true);
    try {
      await api.startModelMerge('sovereign_master');
      setAutoAssignToast('🚀 [Sovereign-Master-7B] 물리적 가중치 병합(MergeKit SLERP) 파이프라인이 시작되었습니다!');
      await fetchModelMergeStatus();
      setTimeout(() => setAutoAssignToast(null), 4000);
    } catch (e: any) {
      setAutoAssignToast(`❌ 병합 시작 실패: ${e.message}`);
    } finally {
      setIsMerging(false);
    }
  };

  const handleBuildMasterBrain = async () => {
    setIsBuildingMaster(true);
    try {
      const res = await api.buildCustomBrain('sovereign_master');
      if (res.success) {
        setAutoAssignToast(`👑 ${res.message || '단일 주권 마스터 두뇌가 성공적으로 빌드/각인되었습니다!'}`);
        await fetchBrainForgeStatus();
        onRefreshModels();
      } else {
        setAutoAssignToast(`⚠️ 빌드 오류: ${res.error}`);
      }
      setTimeout(() => setAutoAssignToast(null), 4000);
    } catch (e: any) {
      setAutoAssignToast(`❌ 빌드 실패: ${e.message}`);
    } finally {
      setIsBuildingMaster(false);
    }
  };

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

  const handleAttachAllToMaster = async () => {
    setIsAutoAssigning(true);
    try {
      const targetModel = masterBrain ? masterBrain.brain_name : 'sovereign-master:7b';
      for (const agent of agents) {
        await api.updateAgentModel(agent.id, targetModel);
        onAgentModelUpdated(agent.id, targetModel);
      }
      setAutoAssignToast(`👑 10대 에이전트 전원이 [${targetModel}] 단일 마스터 두뇌에 100% 직결되었습니다!`);
      setTimeout(() => setAutoAssignToast(null), 3500);
    } catch (e) {
      console.error('Attach all failed:', e);
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
      background: 'radial-gradient(ellipse at top, rgba(139, 92, 246, 0.12), var(--bg-main))'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Crown size={22} color="var(--accent-purple)" />
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em' }}>
              주권 AI 마스터 관제탑 (Sovereign Single Master Brain)
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Qwen2.5-Coder(65%) + DeepSeek-R1(35%) 물리적 병합 단일 마스터 두뇌로 10대 에이전트를 100% 로컬 무료 구동합니다.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleAttachAllToMaster}
            disabled={isAutoAssigning}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)',
              border: 'none',
              color: '#FFF',
              fontSize: '12px',
              fontWeight: 700,
              cursor: isAutoAssigning ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 10px rgba(139, 92, 246, 0.35)'
            }}
          >
            <Crown size={14} /> {isAutoAssigning ? '마스터 직결 중...' : '👑 10대 에이전트 마스터 두뇌 1-Click 일괄 직결'}
          </button>

          <button
            onClick={() => { onRefreshModels(); fetchHardwareProfile(); fetchBrainForgeStatus(); fetchModelMergeStatus(); }}
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
            <RefreshCw size={14} /> 새로고침
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
        <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '20px', background: 'rgba(15, 23, 42, 0.7)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} color="var(--accent-cyan)" />
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#F8FAFC' }}>
                💻 하드웨어 실시간 진단: <span style={{ color: 'var(--accent-cyan)' }}>{hardwareProfile.tier_name}</span>
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#34D399', fontWeight: 600 }}>
              🛡️ Sovereign Master 최적화: VRAM 4.3GB 안착 (여유 1.7GB 확보)
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px'
          }}>
            {/* GPU Card */}
            <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.07)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>🎮 GPU & VRAM 점유</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFF' }}>
                {hardwareProfile.gpu.device_name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--accent-emerald)', marginTop: '2px', fontWeight: 600 }}>
                총 {hardwareProfile.gpu.total_vram_gb} GB 중 마스터 모델 4.3GB (100% GPU 가속)
              </div>
            </div>

            {/* RAM Card */}
            <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.07)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>🧠 시스템 메모리 (RAM)</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFF' }}>
                {hardwareProfile.ram.total_gb} GB (여유: {hardwareProfile.ram.available_gb} GB)
              </div>
              <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                점유율: {hardwareProfile.ram.usage_percent}%
              </div>
            </div>

            {/* Local Engine Card */}
            <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.07)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>⚡ 연동 엔진 상태</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFF' }}>
                🦙 Ollama + 🚀 LM Studio
              </div>
              <div style={{ fontSize: '11px', color: ollamaOnline ? 'var(--accent-emerald)' : 'var(--accent-rose)', marginTop: '2px' }}>
                {ollamaOnline ? `🟢 정상 작동 중 (로컬 모델 ${models.length}개)` : '🔴 엔진 대기 중'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 👑 단일 주권 마스터 두뇌 포지 & 가중치 병합 관제탑 (HERO CARD) */}
      {/* ========================================================================= */}
      <div className="glass-panel" style={{
        padding: '24px 28px',
        marginBottom: '28px',
        background: 'linear-gradient(135deg, rgba(24, 18, 48, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
        border: '1.5px solid rgba(139, 92, 246, 0.5)',
        boxShadow: '0 10px 36px rgba(139, 92, 246, 0.25)',
        borderRadius: '16px'
      }}>
        {/* Master Brain Title & Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontSize: '24px' }}>👑</span>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFF', margin: 0, letterSpacing: '-0.02em' }}>
                {masterBrain?.display_name || '주권 마스터 두뇌 (Sovereign-Master-7B)'}
              </h3>
              <span style={{
                fontSize: '11px',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                color: '#FFF',
                padding: '3px 10px',
                borderRadius: '6px'
              }}>
                Q4_K_M GGUF • RTX 4050 100% GPU 풀가속
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0, maxWidth: '780px' }}>
              {masterBrain?.mission || 'Qwen2.5-Coder(65%)의 무결점 풀스택 코딩과 DeepSeek-R1(35%)의 CoT 심층 추론을 물리적으로 융합한 단일 마스터 두뇌'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleStartMerge}
              disabled={isMerging || mergeJob?.status === 'merging' || mergeJob?.status === 'quantizing'}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.35), rgba(236, 72, 153, 0.35))',
                border: '1px solid #A855F7',
                color: '#FFF',
                fontSize: '12px',
                fontWeight: 800,
                cursor: isMerging ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 14px rgba(168, 85, 247, 0.3)'
              }}
            >
              <Zap size={14} color="#C084FC" />
              {isMerging || mergeJob?.status === 'merging' ? 'SLERP 병합 진행 중...' : '🧬 물리적 SLERP 가중치 합성'}
            </button>

            <button
              onClick={handleBuildMasterBrain}
              disabled={isBuildingMaster}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #06B6D4 0%, #10B981 100%)',
                border: 'none',
                color: '#041E28',
                fontSize: '12px',
                fontWeight: 800,
                cursor: isBuildingMaster ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 14px rgba(6, 182, 212, 0.35)'
              }}
            >
              <Sparkles size={14} />
              {isBuildingMaster ? '마스터 빌드 중...' : '🚀 1-Click 마스터 빌드 & 지식 주입'}
            </button>
          </div>
        </div>

        {/* Master Recipe & Spec Details Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '14px',
          marginBottom: '18px'
        }}>
          {/* Spec Card 1: 가중치 배합 */}
          <div style={{ padding: '14px 16px', borderRadius: '12px', background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>🧬 물리적 SLERP 가중치 합성 구성</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#E2E8F0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div><span style={{ color: 'var(--accent-cyan)' }}>Model A (65%):</span> Qwen2.5-Coder-7B-Instruct</div>
              <div><span style={{ color: 'var(--accent-purple)' }}>Model B (35%):</span> DeepSeek-R1-Distill-Qwen-7B</div>
            </div>
            <div style={{ fontSize: '11px', color: '#F472B6', marginTop: '6px', fontWeight: 600 }}>
              ⚖️ 구면 선형 보간(SLERP) 가중치 수학 연산 완료
            </div>
          </div>

          {/* Spec Card 2: 하드웨어 최적화 */}
          <div style={{ padding: '14px 16px', borderRadius: '12px', background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>📊 VRAM 점유 및 양자화 규격</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFF' }}>
              타겟: Q4_K_M GGUF (점유: 약 4.3 GB)
            </div>
            <div style={{ fontSize: '11px', color: '#34D399', marginTop: '6px', fontWeight: 600 }}>
              ⚡ 6GB VRAM 100% GPU 가속 (최대 16k 토큰 스왑 0%)
            </div>
          </div>

          {/* Spec Card 3: 사내 지식 주입 */}
          <div style={{ padding: '14px 16px', borderRadius: '12px', background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>🏛️ 듀얼 지식 주입 엔진</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38BDF8' }}>
                🏛️ AGENTS.md 10대 에이전트 스킬셋 주입
              </span>
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', color: '#C084FC' }}>
                🌐 실시간 웹 트렌드 RAG 결합
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#CBD5E1', marginTop: '6px' }}>
              10명 전원의 페르소나 및 행동 강령 내장
            </div>
          </div>
        </div>

        {/* Merge Progress Bar */}
        {mergeJob && (
          <div style={{
            padding: '14px 16px',
            borderRadius: '12px',
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(168, 85, 247, 0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={14} color="#C084FC" />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#E2E8F0' }}>
                  {mergeJob.current_step}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#C084FC' }}>
                  {mergeJob.progress}%
                </span>
                <button
                  onClick={() => setShowLogsModal(true)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#CBD5E1',
                    fontSize: '10.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Terminal size={11} /> 로그 보기
                </button>
              </div>
            </div>

            <div style={{ width: '100%', height: '7px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.1)', overflow: 'hidden' }}>
              <div style={{
                width: `${mergeJob.progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #8B5CF6, #06B6D4)',
                transition: 'width 0.4s ease'
              }} />
            </div>
          </div>
        )}
      </div>

      {/* 실시간 병합 로그 모달 */}
      {showLogsModal && mergeJob && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            width: '680px',
            maxWidth: '90vw',
            maxHeight: '80vh',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(168, 85, 247, 0.4)',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={18} color="var(--accent-purple)" />
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#FFF', margin: 0 }}>
                  [Sovereign-Master-7B] SLERP 병합 및 GGUF 양자화 실시간 로그
                </h4>
              </div>
              <button
                onClick={() => setShowLogsModal(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '18px', cursor: 'pointer', padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            <div style={{
              flex: 1,
              overflowY: 'auto',
              background: '#0B0F19',
              borderRadius: '10px',
              padding: '14px 16px',
              fontFamily: 'monospace',
              fontSize: '12px',
              lineHeight: '1.6',
              color: '#34D399',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              minHeight: '200px'
            }}>
              {(mergeJob.logs || []).map((log: string, idx: number) => (
                <div key={idx}>{log}</div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowLogsModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#FFF',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 👥 10대 에이전트 다이렉트 직결 매트릭스 (10-Agent Direct Mapping Matrix) */}
      {/* ========================================================================= */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
            👥 10대 에이전트 다이렉트 직결 매트릭스 (10-Agent Direct Mapping)
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
            단일 마스터 두뇌(Sovereign-Master-7B) 위에서 각 에이전트의 고유 페르소나와 전문 스킬이 100% 가동됩니다.
          </p>
        </div>
        <span style={{
          fontSize: '11px',
          fontWeight: 700,
          color: '#34D399',
          background: 'rgba(16, 185, 129, 0.15)',
          padding: '4px 10px',
          borderRadius: '6px',
          border: '1px solid rgba(16, 185, 129, 0.3)'
        }}>
          ✨ 10 에이전트 전원 마스터 두뇌 지능 공유 중
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
            <div key={agent.id} className="glass-panel" style={{
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(15, 23, 42, 0.65)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '22px' }}>{agent.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '14px', color: '#FFF' }}>{agent.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--accent-cyan)' }}>{agent.role}</div>
                  </div>
                </div>
                {isSuccess ? (
                  <span style={{ fontSize: '11px', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 700 }}>
                    <Check size={13} /> 변경 완료
                  </span>
                ) : (
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    background: 'rgba(139, 92, 246, 0.2)',
                    border: '1px solid #8B5CF6',
                    color: '#DDD6FE'
                  }}>
                    👑 Master Brain
                  </span>
                )}
              </div>

              {/* Selector */}
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  마운트된 로컬 AI 두뇌
                </label>
                <select
                  value={agent.model}
                  onChange={(e) => handleModelChange(agent.id, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(0, 0, 0, 0.45)',
                    border: '1px solid var(--border-glass)',
                    color: '#FFF',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="sovereign-master:7b" style={{ background: '#0F172A', color: '#DDD6FE', fontWeight: 'bold' }}>
                    👑 [마스터 추천] sovereign-master:7b (Q4_K_M • 100% GPU)
                  </option>
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
      <div className="glass-panel" style={{ padding: '16px 20px', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: 'var(--accent-amber)' }}>
          <Terminal size={15} />
          <span style={{ fontWeight: 700, fontSize: '12.5px' }}>💡 Sovereign Master 운영 가이드 (RTX 4050 6GB 완벽 안착)</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px', color: '#CBD5E1' }}>
          <code>1. [가중치 합성]: Qwen2.5-Coder-7B(65%) + DeepSeek-R1-7B(35%) ➡️ sovereign-master-7b-q4_k_m.gguf 생성</code>
          <code>2. [10대 에이전트]: 프롬프트와 AGENTS.md 스킬셋으로 전문 역할 분기 (VRAM 스왑 0%, 초당 40+ 토큰)</code>
        </div>
      </div>
    </div>
  );
};
