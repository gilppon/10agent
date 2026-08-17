import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { 
  X, 
  Brain, 
  Zap, 
  Sprout, 
  Dna, 
  Cloud, 
  Upload, 
  Download, 
  Search, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
  Copy,
  Check,
  Loader2,
  FileCheck2,
  PackagePlus
} from 'lucide-react';

interface KnowledgeNetworkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GraphNode {
  id: string;
  title: string;
  agent_id: string;
  category: 'marketing' | 'coding' | 'design' | 'business' | 'general';
  source_url: string;
  chunk_preview: string;
  created_at: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphEdge {
  source: string;
  target: string;
  strength: number;
  type: string;
}

export const KnowledgeNetworkModal: React.FC<KnowledgeNetworkModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'short_term' | 'long_term' | 'evolution'>('short_term');
  const [subView, setSubView] = useState<'map' | 'list'>('map');
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Graph Data
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState({
    marketing: 0,
    coding: 0,
    design: 0,
    business: 0,
    general: 0
  });
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // GitHub Settings (주소 변경 가능)
  const [isGithubExpanded, setIsGithubExpanded] = useState(true);
  const [repoUrl, setRepoUrl] = useState('https://github.com/gilppon/personal');
  const [githubToken, setGithubToken] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState('');

  // Starter Pack & AI Evolution State
  const [isInjectingStarter, setIsInjectingStarter] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisResult, setSynthesisResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // ⏰ Daily 9 AM Autonomous Knowledge Scout State
  const [isAutoScouting, setIsAutoScouting] = useState(false);
  const [autoScoutEnabled, setAutoScoutEnabled] = useState(true);
  const [lastScoutTime, setLastScoutTime] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const fetchGraphData = async () => {
    setLoading(true);
    try {
      const data = await api.getKnowledgeGraph();
      setTotalCount(data.total_count || 0);
      setCategories(data.categories || { marketing: 0, coding: 0, design: 0, business: 0, general: 0 });
      
      // Initialize random galaxy coordinate offsets for visual beauty
      const initializedNodes: GraphNode[] = (data.nodes || []).map((n, i) => {
        const clusterAngles = {
          marketing: 0.2,
          coding: 1.5,
          design: 2.8,
          business: 4.1,
          general: 5.4
        };
        const angle = clusterAngles[n.category as keyof typeof clusterAngles] || Math.random() * Math.PI * 2;
        const dist = 60 + Math.random() * 120;
        return {
          ...n,
          category: n.category as any,
          x: 400 + Math.cos(angle + (Math.random() - 0.5) * 0.8) * dist + (Math.random() - 0.5) * 40,
          y: 200 + Math.sin(angle + (Math.random() - 0.5) * 0.8) * dist + (Math.random() - 0.5) * 40,
        };
      });

      setNodes(initializedNodes);
      setEdges(data.edges || []);

      // Fetch auto scout status
      const scoutStatus = await api.getAutoScoutStatus();
      setAutoScoutEnabled(scoutStatus.enabled);
      setLastScoutTime(scoutStatus.last_scout_time);
    } catch (e) {
      console.error('Failed to fetch knowledge graph data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerAutoScout = async () => {
    if (isAutoScouting) return;
    setIsAutoScouting(true);
    try {
      const res = await api.triggerAutoScout();
      setToastMsg({
        type: 'success',
        text: `10대 에이전트 최신 웹 지식 자율 수집 완료! (+${res.total_new_chunks}개 신규 청크)`
      });
      await fetchGraphData();
    } catch (e: any) {
      setToastMsg({ type: 'error', text: `자율 수집 실패: ${e.message}` });
    } finally {
      setIsAutoScouting(false);
    }
  };

  const handleToggleAutoScout = async () => {
    try {
      const next = !autoScoutEnabled;
      const res = await api.toggleAutoScout(next);
      setAutoScoutEnabled(res.enabled);
      setToastMsg({
        type: 'success',
        text: next ? '⏰ 매일 오전 9시 자율 지식 수집이 활성화되었습니다.' : '자율 수집 스케줄러가 비활성화되었습니다.'
      });
    } catch (e: any) {
      setToastMsg({ type: 'error', text: `설정 변경 실패: ${e.message}` });
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchGraphData();
    }
  }, [isOpen]);

  // Canvas 2D Starry Galaxy Renderer
  useEffect(() => {
    if (!isOpen || subView !== 'map') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const categoryColors = {
      marketing: '#FF4D8D', // Pink
      coding: '#06B6D4',    // Cyan
      design: '#A855F7',    // Purple
      business: '#EAB308',  // Gold
      general: '#10B981'    // Emerald
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Background Nebula Grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      const step = 40;
      for (let x = 0; x < canvas.width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // 2. Draw Edges
      const nodeMap = new Map<string, GraphNode>();
      nodes.forEach(n => nodeMap.set(n.id, n));

      edges.forEach(edge => {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (source && target && source.x && source.y && target.x && target.y) {
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);

          const isHighlighted = selectedNode && (selectedNode.id === source.id || selectedNode.id === target.id);
          ctx.strokeStyle = isHighlighted 
            ? 'rgba(6, 182, 212, 0.8)' 
            : `rgba(255, 255, 255, ${edge.strength * 0.18})`;
          ctx.lineWidth = isHighlighted ? 2 : 1;
          ctx.stroke();
        }
      });

      // 3. Draw Nodes (Star points)
      nodes.forEach(node => {
        if (!node.x || !node.y) return;
        const color = categoryColors[node.category] || '#10B981';
        const isHovered = hoveredNode?.id === node.id;
        const isSelected = selectedNode?.id === node.id;

        // Outer Glow
        ctx.beginPath();
        ctx.arc(node.x, node.y, isSelected ? 12 : isHovered ? 9 : 5, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? color : `${color}44`;
        ctx.fill();

        // Core star point
        ctx.beginPath();
        ctx.arc(node.x, node.y, isSelected ? 6 : isHovered ? 4.5 : 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
      });

      // 4. Draw Floating Tooltip on Hover
      if (hoveredNode && hoveredNode.x && hoveredNode.y) {
        const text = hoveredNode.title;
        ctx.font = 'bold 12px sans-serif';
        const textWidth = ctx.measureText(text).width;
        const tooltipX = Math.min(canvas.width - textWidth - 20, Math.max(10, hoveredNode.x + 10));
        const tooltipY = Math.max(25, hoveredNode.y - 10);

        ctx.fillStyle = 'rgba(7, 19, 15, 0.95)';
        ctx.strokeStyle = categoryColors[hoveredNode.category] || '#10B981';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(tooltipX - 8, tooltipY - 18, textWidth + 16, 26, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(text, tooltipX, tooltipY);
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isOpen, subView, nodes, edges, hoveredNode, selectedNode]);

  // Handle Canvas Mouse Move
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

    const found = nodes.find(n => {
      if (!n.x || !n.y) return false;
      const dx = n.x - mouseX;
      const dy = n.y - mouseY;
      return Math.sqrt(dx * dx + dy * dy) < 14;
    });

    setHoveredNode(found || null);
  };

  const handleCanvasClick = () => {
    if (hoveredNode) {
      setSelectedNode(hoveredNode);
    } else {
      setSelectedNode(null);
    }
  };

  // GitHub Backup & Restore Action Handlers
  const handleGithubSync = async (action: 'backup' | 'restore') => {
    if (!repoUrl.trim()) {
      setToastMsg({ type: 'error', text: 'GitHub 리포지토리 주소를 입력해 주십시오.' });
      return;
    }
    setIsSyncing(true);
    setSyncStatusText(action === 'backup' ? 'GitHub 클라우드에 백업 중...' : 'GitHub에서 지식 복원 중...');
    try {
      const res = await api.syncGithubBackup({
        repo_url: repoUrl,
        github_token: githubToken,
        action: action
      });
      if (res.status === 'success') {
        const msg = action === 'backup' 
          ? `🎉 [GitHub 백업 완료] ${res.items_count}개 지식이 ${res.repo}에 안전하게 보존되었습니다!`
          : `🎉 [GitHub 복원 완료] ${res.restored_count}개 지식을 성공적으로 복원하였습니다!`;
        setToastMsg({ type: 'success', text: msg });
        await fetchGraphData();
      }
    } catch (e: any) {
      setToastMsg({ type: 'error', text: `동기화 실패: ${e.message || '알 수 없는 오류'}` });
    } finally {
      setIsSyncing(false);
      setSyncStatusText('');
    }
  };

  // 1-Click Starter Knowledge Pack Injection
  const handleInjectStarterPack = async () => {
    setIsInjectingStarter(true);
    try {
      const res = await api.injectStarterPack();
      if (res.status === 'success') {
        setToastMsg({ 
          type: 'success', 
          text: `🚀 [스타터 지식 장착 완료] 10대 에이전트 핵심 프리셋 (${res.total_chunks}개 청크)이 성공적으로 주입되었습니다!` 
        });
        await fetchGraphData();
      }
    } catch (e: any) {
      setToastMsg({ type: 'error', text: `주입 실패: ${e.message || '오류'}` });
    } finally {
      setIsInjectingStarter(false);
    }
  };

  // 1-Click AI Knowledge Evolution Synthesis
  const handleTriggerSynthesis = async () => {
    if (totalCount === 0) {
      setToastMsg({ type: 'error', text: '저장된 지식이 없습니다. 먼저 [🚀 스타터 팩 주입]이나 [⬇️ GitHub 복원]을 실행해 주십시오.' });
      return;
    }
    setIsSynthesizing(true);
    setSynthesisResult(null);
    try {
      const res = await api.synthesizeKnowledge('2026 전사 종합 마스터 전략');
      if (res.status === 'success' && res.synthesis_result) {
        setSynthesisResult(res.synthesis_result);
        setToastMsg({ type: 'success', text: `🧬 [AI 지식 종합 진화 완료] 모델: ${res.model_used}, ${res.total_chunks_analyzed}개 지식 통합 분석 완료!` });
      } else {
        setToastMsg({ type: 'error', text: res.message || 'AI 진화 실패' });
      }
    } catch (e: any) {
      setToastMsg({ type: 'error', text: `AI 진화 오류: ${e.message || '알 수 없는 오류'}` });
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleCopySynthesis = () => {
    if (synthesisResult) {
      navigator.clipboard.writeText(synthesisResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Local JSON Backup Export
  const handleExportLocalJson = async () => {
    try {
      const data = await api.exportKnowledgeBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `knowledge_network_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setToastMsg({ type: 'success', text: '📥 로컬 백업 파일 다운로드가 완료되었습니다.' });
    } catch (e: any) {
      setToastMsg({ type: 'error', text: '내보내기 실패' });
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.88)',
      backdropFilter: 'blur(12px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '1040px',
        maxHeight: '94vh',
        backgroundColor: '#07130F',
        border: '1px solid #143D30',
        borderRadius: '24px',
        boxShadow: '0 30px 80px -20px rgba(0, 0, 0, 0.95), 0 0 40px rgba(16, 185, 129, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: '#E2E8F0'
      }}>
        {/* ========================================================================= */}
        {/* Modal Header */}
        {/* ========================================================================= */}
        <div style={{
          padding: '20px 28px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)',
              border: '1px solid rgba(236, 72, 153, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Brain size={22} color="#F472B6" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em' }}>
                  지식 네트워크
                </h2>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: totalCount > 0 ? '#10B981' : '#94A3B8',
                  background: totalCount > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: totalCount > 0 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  {totalCount}개
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0, marginTop: '2px' }}>
                10대 에이전트의 축적된 두뇌 지식 그래프 & 클라우드 기억 저장소
              </p>
            </div>
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

        {/* ========================================================================= */}
        {/* 3대 기억 탭 Bar */}
        {/* ========================================================================= */}
        <div style={{
          padding: '0 28px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'rgba(0, 0, 0, 0.2)'
        }}>
          <button
            onClick={() => setActiveTab('short_term')}
            style={{
              padding: '14px 18px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'short_term' ? '2px solid #10B981' : '2px solid transparent',
              color: activeTab === 'short_term' ? '#10B981' : '#94A3B8',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Zap size={15} color={activeTab === 'short_term' ? '#10B981' : '#94A3B8'} />
            단기 기억 (내 지식 저장소)
          </button>

          <button
            onClick={() => setActiveTab('long_term')}
            style={{
              padding: '14px 18px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'long_term' ? '2px solid #10B981' : '2px solid transparent',
              color: activeTab === 'long_term' ? '#10B981' : '#94A3B8',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Sprout size={15} color={activeTab === 'long_term' ? '#10B981' : '#94A3B8'} />
            장기 기억
            <span style={{ fontSize: '10px', background: '#10B981', color: '#000', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>BETA</span>
          </button>

          <button
            onClick={() => setActiveTab('evolution')}
            style={{
              padding: '14px 18px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'evolution' ? '2px solid #10B981' : '2px solid transparent',
              color: activeTab === 'evolution' ? '#10B981' : '#94A3B8',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Dna size={15} color={activeTab === 'evolution' ? '#10B981' : '#94A3B8'} />
            AI 진화
            <span style={{ fontSize: '10px', background: '#10B981', color: '#000', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>BETA</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* Modal Body Content */}
        {/* ========================================================================= */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Toast Notification */}
          {toastMsg && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: toastMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${toastMsg.type === 'success' ? '#10B981' : '#EF4444'}`,
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>{toastMsg.text}</span>
              <X size={14} style={{ cursor: 'pointer' }} onClick={() => setToastMsg(null)} />
            </div>
          )}

          {/* ⏰ 매일 9시 10대 에이전트 자율 지식 스카우트 배너 */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.12) 0%, rgba(16, 185, 129, 0.12) 100%)',
            border: '1.5px solid rgba(234, 179, 8, 0.4)',
            borderRadius: '16px',
            padding: '18px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(234, 179, 8, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px'
              }}>
                ⏰
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#FACC15', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  10대 에이전트 자율 지식 스카우트 (Auto-Scout Engine)
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: autoScoutEnabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                    color: autoScoutEnabled ? '#10B981' : '#94A3B8',
                    fontWeight: 700
                  }}>
                    {autoScoutEnabled ? '매일 오전 09:00 가동 ON' : '자동 스케줄 OFF'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '2px' }}>
                  내가 검색하지 않아도 10대 에이전트가 각자 최신 트렌드를 웹에서 자율 탐색하여 뇌에 자동 주입합니다.
                  {lastScoutTime && <span style={{ color: '#94A3B8', marginLeft: '6px' }}>(최근 수집: {lastScoutTime})</span>}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={handleToggleAutoScout}
                style={{
                  padding: '8px 14px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {autoScoutEnabled ? '⏰ 9시 자동 수집 끄기' : '⏰ 매일 9시 자동 수집 켜기'}
              </button>

              <button
                onClick={handleTriggerAutoScout}
                disabled={isAutoScouting}
                style={{
                  padding: '9px 18px',
                  background: 'linear-gradient(135deg, #FACC15 0%, #10B981 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#0F172A',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: isAutoScouting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 14px rgba(234, 179, 8, 0.3)'
                }}
              >
                {isAutoScouting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {isAutoScouting ? '인터넷 탐색 및 주입 중...' : '⚡ 지금 즉시 최신 웹 지식 충전'}
              </button>
            </div>
          </div>

          {/* 지식이 0개일 때 스타터 팩 주입 가이드 배너 */}
          {totalCount === 0 && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(16, 185, 129, 0.15) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '16px',
              padding: '18px 22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <PackagePlus size={28} color="#10B981" />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF' }}>
                    💡 현재 학습된 지식이 비어 있습니다!
                  </div>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                    10대 에이전트 공식 스타터 지식 팩을 주입하거나 GitHub에서 기존 지식을 복원하세요.
                  </div>
                </div>
              </div>
              <button
                onClick={handleInjectStarterPack}
                disabled={isInjectingStarter}
                style={{
                  padding: '10px 18px',
                  background: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#000000',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}
              >
                {isInjectingStarter ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                🚀 스타터 지식 팩 1-Click 장착
              </button>
            </div>
          )}

          {/* 1. 상단 5대 카테고리 누적 통계 바 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '16px',
            padding: '18px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', fontWeight: 700 }}>
              <span style={{ color: '#F8FAFC' }}>📊 도메인별 축적 지식 분포</span>
              <span style={{ color: '#94A3B8', fontSize: '11px' }}>총 {totalCount}개 벡터 청크 상주</span>
            </div>

            {/* Progress Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Marketing */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '70px', fontSize: '12px', color: '#FF4D8D', fontWeight: 700 }}>📣 마케팅</span>
                <div style={{ flex: 1, height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${totalCount ? (categories.marketing / totalCount) * 100 : 0}%`, height: '100%', background: '#FF4D8D', borderRadius: '4px' }} />
                </div>
                <span style={{ width: '40px', fontSize: '12px', color: '#FF4D8D', textAlign: 'right', fontWeight: 800 }}>🔥 {categories.marketing}</span>
              </div>

              {/* Coding */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '70px', fontSize: '12px', color: '#06B6D4', fontWeight: 700 }}>💻 코딩</span>
                <div style={{ flex: 1, height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${totalCount ? (categories.coding / totalCount) * 100 : 0}%`, height: '100%', background: '#06B6D4', borderRadius: '4px' }} />
                </div>
                <span style={{ width: '40px', fontSize: '12px', color: '#06B6D4', textAlign: 'right', fontWeight: 800 }}>🔥 {categories.coding}</span>
              </div>

              {/* Design */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '70px', fontSize: '12px', color: '#A855F7', fontWeight: 700 }}>🎨 디자인</span>
                <div style={{ flex: 1, height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${totalCount ? (categories.design / totalCount) * 100 : 0}%`, height: '100%', background: '#A855F7', borderRadius: '4px' }} />
                </div>
                <span style={{ width: '40px', fontSize: '12px', color: '#A855F7', textAlign: 'right', fontWeight: 800 }}>{categories.design}</span>
              </div>

              {/* Business */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '70px', fontSize: '12px', color: '#EAB308', fontWeight: 700 }}>💼 사업</span>
                <div style={{ flex: 1, height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${totalCount ? (categories.business / totalCount) * 100 : 0}%`, height: '100%', background: '#EAB308', borderRadius: '4px' }} />
                </div>
                <span style={{ width: '40px', fontSize: '12px', color: '#EAB308', textAlign: 'right', fontWeight: 800 }}>{categories.business}</span>
              </div>

              {/* General */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '70px', fontSize: '12px', color: '#10B981', fontWeight: 700 }}>📁 일반</span>
                <div style={{ flex: 1, height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${totalCount ? (categories.general / totalCount) * 100 : 0}%`, height: '100%', background: '#10B981', borderRadius: '4px' }} />
                </div>
                <span style={{ width: '40px', fontSize: '12px', color: '#10B981', textAlign: 'right', fontWeight: 800 }}>{categories.general}</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: 단기 기억 (지식 지도 & GitHub 백업 패널) */}
          {/* ========================================================================= */}
          {activeTab === 'short_term' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* GitHub 동기화 패널 (주소 변경 가능) */}
              <div style={{
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '16px',
                padding: '18px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}>
                <div 
                  onClick={() => setIsGithubExpanded(!isGithubExpanded)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 800, color: '#10B981' }}>
                    <Cloud size={16} />
                    <span>⚡ 단기 기억 = 내 지식 저장소 (GitHub 클라우드 연동)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94A3B8' }}>
                    <span>{isGithubExpanded ? '설정 접기' : '주소 변경 & 설정'}</span>
                    {isGithubExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </div>

                {isGithubExpanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '6px' }}>
                    {/* 주소 변경 입력창 */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <div style={{ flex: 1, position: 'relative' }}>
                        <input
                          type="text"
                          value={repoUrl}
                          onChange={(e) => setRepoUrl(e.target.value)}
                          placeholder="GitHub 리포지토리 URL (예: https://github.com/gilppon/personal)"
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            background: 'rgba(0, 0, 0, 0.5)',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            borderRadius: '10px',
                            color: '#FFFFFF',
                            fontSize: '12px',
                            outline: 'none'
                          }}
                        />
                      </div>
                      <input
                        type="password"
                        value={githubToken}
                        onChange={(e) => setGithubToken(e.target.value)}
                        placeholder="GitHub Token (Private repo 필수)"
                        style={{
                          width: '240px',
                          padding: '10px 14px',
                          background: 'rgba(0, 0, 0, 0.5)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '10px',
                          color: '#FFFFFF',
                          fontSize: '12px',
                          outline: 'none'
                        }}
                      />
                    </div>

                    {/* 백업 / 복원 액션 버튼들 */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '4px' }}>
                      <button
                        onClick={() => handleGithubSync('backup')}
                        disabled={isSyncing}
                        style={{
                          flex: 1,
                          padding: '10px 16px',
                          background: '#10B981',
                          border: 'none',
                          borderRadius: '10px',
                          color: '#000000',
                          fontWeight: 800,
                          fontSize: '13px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                        {isSyncing ? syncStatusText : '⬆️ GitHub 원클릭 백업'}
                      </button>

                      <button
                        onClick={() => handleGithubSync('restore')}
                        disabled={isSyncing}
                        style={{
                          flex: 1,
                          padding: '10px 16px',
                          background: 'rgba(16, 185, 129, 0.2)',
                          border: '1px solid #10B981',
                          borderRadius: '10px',
                          color: '#10B981',
                          fontWeight: 800,
                          fontSize: '13px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                        {isSyncing ? syncStatusText : '⬇️ GitHub 지식 복원'}
                      </button>

                      <button
                        onClick={handleExportLocalJson}
                        style={{
                          padding: '10px 14px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '10px',
                          color: '#E2E8F0',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        📥 로컬 JSON 내보내기
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. 인터랙티브 은하수 지식 지도 캔버스 */}
              <div style={{
                position: 'relative',
                width: '100%',
                height: '380px',
                borderRadius: '16px',
                border: '1px solid #1B4D3E',
                overflow: 'hidden',
                background: '#040E0A',
                boxShadow: 'inset 0 0 40px rgba(0, 0, 0, 0.9)'
              }}>
                <canvas
                  ref={canvasRef}
                  width={980}
                  height={380}
                  onMouseMove={handleCanvasMouseMove}
                  onClick={handleCanvasClick}
                  style={{ width: '100%', height: '100%', cursor: hoveredNode ? 'pointer' : 'default' }}
                />

                {/* Canvas Controls Overlay */}
                <div style={{
                  position: 'absolute',
                  bottom: '14px',
                  left: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '11px',
                  color: '#94A3B8',
                  background: 'rgba(0, 0, 0, 0.7)',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FF4D8D' }} /> 마케팅
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#06B6D4' }} /> 코딩
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#A855F7' }} /> 디자인
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EAB308' }} /> 사업
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} /> 일반
                  </span>
                </div>

                {/* Refresh Button */}
                <button
                  onClick={fetchGraphData}
                  style={{
                    position: 'absolute',
                    top: '14px',
                    right: '16px',
                    background: 'rgba(0, 0, 0, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    color: '#E2E8F0',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                  새로고침
                </button>
              </div>

              {/* Selected Node Details Card */}
              {selectedNode && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '14px',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF' }}>
                      📌 [{selectedNode.category.toUpperCase()}] {selectedNode.title}
                    </div>
                    <X size={16} style={{ cursor: 'pointer', color: '#94A3B8' }} onClick={() => setSelectedNode(null)} />
                  </div>
                  <div style={{ fontSize: '12px', color: '#CBD5E1', lineHeight: '1.6', background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: '8px' }}>
                    {selectedNode.chunk_preview}
                  </div>
                  {selectedNode.source_url && (
                    <a 
                      href={selectedNode.source_url} 
                      target="_blank" 
                      rel="noreferrer"
                      style={{ fontSize: '11px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                    >
                      <ExternalLink size={12} /> 출처 링크: {selectedNode.source_url}
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: 장기 기억 (목록 & 검색 뷰) */}
          {/* ========================================================================= */}
          {activeTab === 'long_term' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <Search size={16} color="#94A3B8" style={{ position: 'absolute', top: '12px', left: '14px' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="저장된 지식 키워드 검색 (실시간 검색)..."
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '12px',
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                {nodes
                  .filter(n => !searchQuery || n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.chunk_preview.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(n => (
                    <div
                      key={n.id}
                      style={{
                        padding: '14px',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 700, color: n.category === 'marketing' ? '#FF4D8D' : n.category === 'coding' ? '#06B6D4' : n.category === 'design' ? '#A855F7' : '#EAB308' }}>
                        ● {n.category.toUpperCase()} ({n.agent_id})
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFF' }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', lineHeight: '1.4' }}>
                        {n.chunk_preview}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: AI 진화 (지식 종합 승화 결과창) */}
          {/* ========================================================================= */}
          {activeTab === 'evolution' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '16px',
                padding: '24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}>
                <Dna size={36} color="#10B981" />
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  🧬 AI 팀 지식 종합 진화 (Knowledge Synthesis)
                </h3>
                <p style={{ fontSize: '13px', color: '#94A3B8', maxWidth: '540px', lineHeight: '1.6', margin: 0 }}>
                  현재 축적된 <strong>{totalCount}개</strong>의 파편화된 지식 청크들을 로컬 SOTA LLM이 결합·압축하여 
                  우리 회사만의 <strong>'단일 최적화 비즈니스 & 개발 종합 가이드북'</strong>으로 진화시킵니다.
                </p>
                <button
                  onClick={handleTriggerSynthesis}
                  disabled={isSynthesizing || totalCount === 0}
                  style={{
                    marginTop: '8px',
                    padding: '12px 24px',
                    background: totalCount === 0 ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
                    border: 'none',
                    borderRadius: '10px',
                    color: totalCount === 0 ? '#64748B' : '#000000',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: totalCount === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: totalCount > 0 ? '0 4px 14px rgba(16, 185, 129, 0.3)' : 'none'
                  }}
                >
                  {isSynthesizing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {isSynthesizing ? '🧠 로컬 LLM이 지식을 종합 진화 중입니다 (약 10초)...' : '🚀 1-Click 지식 종합 진화 실행'}
                </button>
              </div>

              {/* AI Synthesis Result Display */}
              {synthesisResult && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.05)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '16px',
                  padding: '20px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 800, color: '#10B981' }}>
                      <FileCheck2 size={18} />
                      <span>🏆 2026 우리 회사 통합 마스터 비즈니스 & 개발 가이드북</span>
                    </div>
                    <button
                      onClick={handleCopySynthesis}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                      {copied ? '복사됨!' : '전체 복사'}
                    </button>
                  </div>

                  <div style={{
                    maxHeight: '400px',
                    overflowY: 'auto',
                    background: 'rgba(0, 0, 0, 0.4)',
                    padding: '16px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    color: '#E2E8F0',
                    lineHeight: '1.7',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'monospace'
                  }}>
                    {synthesisResult}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
