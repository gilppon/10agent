import React, { useState, useEffect } from 'react';
import { Agent, ModelInfo, KnowledgeItem, KnowledgePreset } from '../types';
import { api } from '../services/api';
import { 
  X, 
  Sparkles, 
  Cpu, 
  ArrowLeft, 
  Camera, 
  Check, 
  ChevronRight, 
  Maximize2,
  BookOpen,
  Plus,
  Trash2,
  Globe,
  Loader2
} from 'lucide-react';

interface MyTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: Agent[];
  models: ModelInfo[];
  onAgentModelUpdated: (agentId: string, model: string) => void;
  onSelectAgentForChat?: (agent: Agent) => void;
}

// 10인 에이전트별 사무실 핀 위치 좌표 (% 위치 및 소속 공간)
const AGENT_PIN_POSITIONS: Record<string, { top: string; left: string; room: string }> = {
  ceo: { top: '18%', left: '50%', room: 'CEO 오피스' },
  designer: { top: '32%', left: '14%', room: '디자인 스튜디오' },
  youtube: { top: '18%', left: '13%', room: '유튜브 영상실' },
  instagram: { top: '65%', left: '10%', room: '소셜 마케팅 랩' },
  developer: { top: '44%', left: '46%', room: '개발 엔지니어링 룸' },
  writer: { top: '70%', left: '24%', room: '카피라이팅 스튜디오' },
  business: { top: '72%', left: '46%', room: '비즈니스 전략실' },
  secretary: { top: '52%', left: '85%', room: '경영지원 비서실' },
  editor: { top: '24%', left: '79%', room: 'BGM 사운드 랩' },
  researcher: { top: '68%', left: '80%', room: 'RAG 리서치 센터' }
};

// 4대 직무 키워드 태그
const AGENT_TAGS: Record<string, string[]> = {
  ceo: ['오케스트레이션', '작업 분해', '종합 판단', '다음 액션 결정'],
  youtube: ['3초 골든 후크', '썸네일 브리프', '시청 유지율', '타임라인 기획'],
  instagram: ['3-3-3 해시태그', '릴스 숏폼', '캐러셀 템플릿', '인게이지먼트'],
  designer: ['8px 그리드', 'HSL 다크모드', 'Z-Axis UI', '마이크로 인터랙션'],
  developer: ['클린 코드', 'TDD 자율 검증', 'API 통합', '셀프 힐링 디버깅'],
  business: ['수익화 BM', 'ROI/KPI 분석', '가격 전략', '시장 경쟁 분석'],
  secretary: ['일정 관리', '1분 데일리 브리핑', '산출물 취합', '소통 정리'],
  editor: ['BGM 무드 연출', '음악 생성 프롬프트', '사운드 디자인', '오디오 믹싱'],
  writer: ['AIDA/PAS 세일즈 카피', 'SEO 글쓰기', '후킹 템플릿', '전환율 최적화'],
  researcher: ['5단계 심층 조사', '교차 검증 팩트체크', '경쟁사 분석', '트렌드 수집']
};

export const MyTeamModal: React.FC<MyTeamModalProps> = ({
  isOpen,
  onClose,
  agents,
  models,
  onAgentModelUpdated,
  onSelectAgentForChat
}) => {
  const [selectedAgentDetail, setSelectedAgentDetail] = useState<Agent | null>(null);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [isUpdatingModel, setIsUpdatingModel] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Knowledge RAG State
  const [knowledgeList, setKnowledgeList] = useState<KnowledgeItem[]>([]);
  const [presets, setPresets] = useState<KnowledgePreset[]>([]);
  const [customQuery, setCustomQuery] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestToast, setIngestToast] = useState<string | null>(null);

  const fetchKnowledge = async (agentId: string) => {
    try {
      const res = await api.getAgentKnowledge(agentId);
      setKnowledgeList(res.knowledge || []);
      setPresets(res.presets || []);
    } catch (e) {
      console.error('Failed to fetch knowledge:', e);
    }
  };

  useEffect(() => {
    if (selectedAgentDetail) {
      fetchKnowledge(selectedAgentDetail.id);
    }
  }, [selectedAgentDetail?.id]);

  // 1-Click 지식 자동 주입 핸들러
  const handleIngestKnowledge = async (queryOrUrl: string) => {
    if (!selectedAgentDetail || !queryOrUrl.trim()) return;
    setIsIngesting(true);
    try {
      const res = await api.ingestKnowledge(selectedAgentDetail.id, queryOrUrl);
      if (res.status === 'success') {
        setIngestToast(`🎉 [${res.title}] 지식이 ${selectedAgentDetail.name}의 두뇌에 영구 장착되었습니다! (${res.chunks_count}개 청크)`);
        setCustomQuery('');
        await fetchKnowledge(selectedAgentDetail.id);
        setTimeout(() => setIngestToast(null), 3500);
      }
    } catch (e: any) {
      console.error('지식 주입 에러:', e);
      setIngestToast('❌ 지식 수집에 실패했습니다. 올바른 URL 또는 검색어를 입력해주세요.');
      setTimeout(() => setIngestToast(null), 3000);
    } finally {
      setIsIngesting(false);
    }
  };

  // 지식 삭제 핸들러
  const handleDeleteKnowledge = async (title: string) => {
    if (!selectedAgentDetail) return;
    try {
      await api.deleteKnowledge(selectedAgentDetail.id, title);
      await fetchKnowledge(selectedAgentDetail.id);
    } catch (e) {
      console.error('지식 삭제 에러:', e);
    }
  };

  if (!isOpen) return null;

  // 에이전트 목록이 혹시 비어있을 경우 안전 보장
  const displayAgents = agents && agents.length > 0 ? agents : [];

  // 에이전트 두뇌(모델) 변경 핸들러
  const handleModelChange = async (agentId: string, newModel: string) => {
    setIsUpdatingModel(true);
    try {
      await api.updateAgentModel(agentId, newModel);
      onAgentModelUpdated(agentId, newModel);
      if (selectedAgentDetail && selectedAgentDetail.id === agentId) {
        setSelectedAgentDetail({ ...selectedAgentDetail, model: newModel });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e) {
      console.error('모델 변경 에러:', e);
    } finally {
      setIsUpdatingModel(false);
    }
  };

  const formatModelDisplayName = (modelStr?: string) => {
    if (!modelStr || modelStr === 'default' || modelStr === 'auto') return '공용 두뇌';
    return modelStr;
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(10px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '920px',
        maxHeight: '92vh',
        backgroundColor: '#07130F',
        border: '1px solid #13382C',
        borderRadius: '20px',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 30px rgba(16, 185, 129, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: '#E2E8F0'
      }}>
        {/* ========================================================================= */}
        {/* VIEW 1: 대시보드 메인 뷰 (사무실 픽셀 맵 + 10인 에이전트 두뇌 카드 2열 그리드) */}
        {/* ========================================================================= */}
        {!selectedAgentDetail ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{
              padding: '20px 24px 12px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between'
            }}>
              <div>
                <h2 style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  letterSpacing: '-0.02em',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  내 AI 팀
                </h2>
                <p style={{
                  fontSize: '13px',
                  color: '#6EE7B7',
                  opacity: 0.8,
                  marginTop: '4px',
                  marginBottom: 0,
                  fontWeight: 500
                }}>
                  우리 팀 — 카드 클릭=관리 · 미리보기 클릭=사무실
                </p>
              </div>

              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  padding: '8px',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* 1. 상단 사무실 픽셀아트 미니어처 맵 */}
              <div style={{
                position: 'relative',
                width: '100%',
                height: isMapExpanded ? '340px' : '170px',
                borderRadius: '16px',
                border: '1px solid #1B4D3E',
                overflow: 'hidden',
                background: 'linear-gradient(180deg, #0e271f 0%, #061510 100%)',
                boxShadow: 'inset 0 0 30px rgba(0, 0, 0, 0.8)',
                transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}>
                {/* 픽셀 오피스 룸 배경 그래픽 */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0.9,
                  backgroundImage: `
                    radial-gradient(#1B4D3E 1.5px, transparent 1.5px),
                    linear-gradient(to right, rgba(27, 77, 62, 0.4) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(27, 77, 62, 0.4) 1px, transparent 1px)
                  `,
                  backgroundSize: '20px 20px, 40px 40px, 40px 40px'
                }}>
                  {/* 스튜디오 존 (좌측) */}
                  <div style={{
                    position: 'absolute',
                    left: '8px',
                    top: '8px',
                    width: '26%',
                    bottom: '8px',
                    borderRadius: '10px',
                    border: '1px dashed rgba(52, 211, 153, 0.3)',
                    backgroundColor: 'rgba(16, 185, 129, 0.05)',
                    padding: '6px'
                  }}>
                    <span style={{ fontSize: '9px', fontWeight: 800, color: '#34D399', letterSpacing: '0.05em' }}>🎨 MEDIA STUDIO</span>
                  </div>

                  {/* 메인 개발 & 경영 워크스페이스 (중앙) */}
                  <div style={{
                    position: 'absolute',
                    left: '30%',
                    top: '8px',
                    width: '38%',
                    bottom: '8px',
                    borderRadius: '10px',
                    border: '1px dashed rgba(6, 182, 212, 0.3)',
                    backgroundColor: 'rgba(6, 182, 212, 0.05)',
                    padding: '6px'
                  }}>
                    <span style={{ fontSize: '9px', fontWeight: 800, color: '#38BDF8', letterSpacing: '0.05em' }}>💻 CORE HQ / DEV</span>
                  </div>

                  {/* R&D 및 비즈니스 라운지 (우측) */}
                  <div style={{
                    position: 'absolute',
                    right: '8px',
                    top: '8px',
                    width: '26%',
                    bottom: '8px',
                    borderRadius: '10px',
                    border: '1px dashed rgba(244, 114, 182, 0.3)',
                    backgroundColor: 'rgba(244, 114, 182, 0.05)',
                    padding: '6px'
                  }}>
                    <span style={{ fontSize: '9px', fontWeight: 800, color: '#F472B6', letterSpacing: '0.05em' }}>☕ R&D & LOUNGE</span>
                  </div>
                </div>

                {/* 에이전트 핀 (Pin) 오버레이 */}
                {displayAgents.map((agent) => {
                  const pos = AGENT_PIN_POSITIONS[agent.id] || { top: '50%', left: '50%', room: '사무실' };
                  return (
                    <div
                      key={agent.id}
                      onClick={() => setSelectedAgentDetail(agent)}
                      title={`${agent.name} (${agent.role}) - ${pos.room}\n클릭하여 상세 관리`}
                      style={{
                        position: 'absolute',
                        top: pos.top,
                        left: pos.left,
                        transform: 'translate(-50%, -50%)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        zIndex: 10,
                        transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.25)')}
                    >
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '12px',
                        backgroundColor: '#092119',
                        border: `2px solid ${agent.color || '#10B981'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        boxShadow: `0 0 14px ${agent.color || '#10B981'}66`,
                        position: 'relative'
                      }}>
                        {agent.emoji}
                        <span style={{
                          position: 'absolute',
                          bottom: '-2px',
                          right: '-2px',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: '#34D399',
                          border: '1.5px solid #092119'
                        }} />
                      </div>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: '#FFFFFF',
                        marginTop: '3px',
                        backgroundColor: 'rgba(4, 18, 14, 0.85)',
                        padding: '1px 6px',
                        borderRadius: '6px',
                        border: '1px solid #144635',
                        whiteSpace: 'nowrap'
                      }}>
                        {agent.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ padding: '10px 24px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>
                  👥 상주 에이전트 목록 ({displayAgents.length}명)
                </span>
                <span style={{ fontSize: '11px', color: '#6EE7B7' }}>
                  카드를 클릭하여 상세 정보 확인 및 두뇌/지식 주입
                </span>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '12px'
              }}>
                {displayAgents.map((agent) => {
                  const modelName = formatModelDisplayName(agent.model);
                  const isDefaultModel = modelName === '공용 두뇌';
                  return (
                    <div
                      key={agent.id}
                      onClick={() => setSelectedAgentDetail(agent)}
                      style={{
                        backgroundColor: '#071D17',
                        border: '1px solid #134535',
                        borderRadius: '14px',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#0A2B21';
                        e.currentTarget.style.borderColor = '#10B981';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#071D17';
                        e.currentTarget.style.borderColor = '#134535';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '14px',
                        backgroundColor: '#092119',
                        border: `1.5px solid ${agent.color || '#34D399'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '22px',
                        flexShrink: 0,
                        boxShadow: `0 0 10px ${agent.color || '#34D399'}22`
                      }}>
                        {agent.emoji}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF', marginBottom: '2px' }}>{agent.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: isDefaultModel ? '#EC4899' : '#38BDF8', fontWeight: 700 }}>
                          <span>🧠</span> {modelName}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid #143D30',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <button
                onClick={() => setSelectedAgentDetail(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid #1B4D3E',
                  borderRadius: '8px',
                  padding: '5px 10px',
                  color: '#6EE7B7',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <ArrowLeft size={14} /> 목록으로
              </button>
              <button
                onClick={onClose}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {ingestToast && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid #10B981',
                  color: '#A7F3D0',
                  fontSize: '12px',
                  fontWeight: 700
                }}>
                  {ingestToast}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', paddingBottom: '16px', borderBottom: '1px solid #143D30' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: '76px',
                    height: '76px',
                    borderRadius: '20px',
                    backgroundColor: '#0D211A',
                    border: `2px solid ${selectedAgentDetail.color || '#34D399'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '36px',
                    boxShadow: `0 0 20px ${selectedAgentDetail.color || '#34D399'}33`
                  }}>
                    {selectedAgentDetail.emoji}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 4px 0' }}>
                    {selectedAgentDetail.name}
                  </h1>
                  <p style={{ fontSize: '12px', color: '#CBD5E1', lineHeight: '1.4', margin: 0 }}>
                    {selectedAgentDetail.specialty || selectedAgentDetail.tagline}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {(AGENT_TAGS[selectedAgentDetail.id] || ['업무 총괄', '자율 분석', '성과 도출']).map((tag, i) => (
                  <span key={i} style={{ padding: '4px 10px', borderRadius: '14px', backgroundColor: '#091E17', border: '1px solid #1A4D3B', color: '#6EE7B7', fontSize: '11px', fontWeight: 700 }}>
                    {tag}
                  </span>
                ))}
              </div>
              <div style={{ backgroundColor: '#081712', border: '1px solid #133D2F', borderRadius: '12px', padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '12px', color: '#FFF' }}>
                    <span>🎒</span> AI 지식 & 데이터셋 현황
                  </div>
                  <span style={{ fontSize: '10px', color: '#34D399', backgroundColor: 'rgba(52, 211, 153, 0.1)', border: '1px solid rgba(52, 211, 153, 0.3)', padding: '2px 7px', borderRadius: '6px', fontWeight: 700 }}>
                    실시간 RAG 연결됨
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <div style={{ backgroundColor: '#0B211A', border: '1px solid #143E30', borderRadius: '8px', padding: '8px 4px', textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#34D399' }}>{knowledgeList.length}개</div>
                    <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>주입된 문서</div>
                  </div>
                  <div style={{ backgroundColor: '#0B211A', border: '1px solid #143E30', borderRadius: '8px', padding: '8px 4px', textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#60A5FA' }}>{knowledgeList.reduce((acc, cur) => acc + (cur.chunk_count || 1), 0)}개</div>
                    <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>벡터 청크</div>
                  </div>
                  <div style={{ backgroundColor: '#0B211A', border: '1px solid #143E30', borderRadius: '8px', padding: '8px 4px', textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#FBBF24' }}>0.01s</div>
                    <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>RAG 속도</div>
                  </div>
                </div>
              </div>
              <div style={{ backgroundColor: '#081712', border: '1px solid #133D2F', borderRadius: '14px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '13px', color: '#FFF' }}>
                    <BookOpen size={16} /> {selectedAgentDetail.name} 전용 지식 주입기 (RAG)
                  </div>
                </div>
                {presets.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {presets.map((preset, idx) => (
                        <button key={idx} disabled={isIngesting} onClick={() => handleIngestKnowledge(preset.query)} style={{ padding: '5px 10px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.35)', color: '#67E8F9', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Plus size={12} /> {preset.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <input
                    type="text"
                    value={customQuery}
                    disabled={isIngesting}
                    placeholder="공식 문서 URL 또는 키워드 입력"
                    onChange={(e) => setCustomQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleIngestKnowledge(customQuery)}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', backgroundColor: '#0B261E', border: '1px solid #1B5441', color: '#FFF', fontSize: '12px', outline: 'none' }}
                  />
                  <button disabled={isIngesting} onClick={() => handleIngestKnowledge(customQuery)} style={{ padding: '8px 14px', borderRadius: '8px', background: 'linear-gradient(135deg, #06B6D4, #3B82F6)', border: 'none', color: '#FFF', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                    {isIngesting ? <Loader2 size={13} className="animate-spin" /> : <Globe size={13} />}
                  </button>
                </div>
                {knowledgeList.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '130px', overflowY: 'auto' }}>
                      {knowledgeList.map((k, i) => (
                        <div key={i} style={{ padding: '6px 10px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ flex: 1, minWidth: 0, marginRight: '8px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#E2E8F0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.title}</div>
                          </div>
                          <button onClick={() => handleDeleteKnowledge(k.title)} style={{ background: 'none', border: 'none', color: '#F87171', cursor: 'pointer' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ backgroundColor: '#081712', border: '1px solid #133D2F', borderRadius: '14px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '13px', color: '#FFF' }}>
                    <span>🧠</span> 두뇌 (AI 모델) 배정
                  </div>
                  {saveSuccess && <span style={{ fontSize: '11px', color: '#34D399', fontWeight: 700 }}><Check size={14} /> 저장됨!</span>}
                </div>
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedAgentDetail.model || 'auto'}
                    disabled={isUpdatingModel}
                    onChange={(e) => handleModelChange(selectedAgentDetail.id, e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#0B261E', border: '1px solid #1B5441', color: '#FFFFFF', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    <option value="auto">공용 두뇌 (자동 라우팅)</option>
                    {models.map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.backend === 'lm_studio' ? '🚀 [LM Studio]' : '🦙 [Ollama]'} {m.name} ({m.size || m.vram_tier})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 5. 1:1 대화 시작 액션 버튼 */}
              {onSelectAgentForChat && (
                <button
                  onClick={() => {
                    onSelectAgentForChat(selectedAgentDetail);
                    onClose();
                  }}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                    transition: 'all 0.2s'
                  }}
                >
                  <Sparkles size={15} /> {selectedAgentDetail.name}와 1:1 업무 대화 시작하기
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
