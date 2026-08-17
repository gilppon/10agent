import React, { useState } from 'react';
import { Agent, ActiveTab } from '../types';
import { 
  MessageSquare, 
  Users, 
  Zap, 
  Cpu, 
  FolderGit2, 
  PlusCircle, 
  Sparkles,
  CheckCircle2,
  X
} from 'lucide-react';

interface SidebarProps {
  agents: Agent[];
  selectedAgent: Agent | null;
  onSelectAgent: (agent: Agent) => void;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  ollamaOnline: boolean;
  onAddAgent: (agent: Agent) => void;
  onOpenTeamModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  agents,
  selectedAgent,
  onSelectAgent,
  activeTab,
  onSelectTab,
  ollamaOnline,
  onAddAgent,
  onOpenTeamModal
}) => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    role: '',
    emoji: '🤖',
    color: '#38BDF8',
    specialty: '',
    tagline: '',
    persona: '',
    model: 'qwen2.5-coder:14b'
  });

  const handleCreateAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.role) return;
    const newId = formData.id.trim() || `agent_${Date.now()}`;
    onAddAgent({
      ...formData,
      id: newId,
      is_custom: true
    });
    setShowModal(false);
    setFormData({
      id: '',
      name: '',
      role: '',
      emoji: '🤖',
      color: '#38BDF8',
      specialty: '',
      tagline: '',
      persona: '',
      model: 'qwen2.5-coder:14b'
    });
  };

  return (
    <aside style={{
      width: '320px',
      height: '100vh',
      backgroundColor: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border-glass)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '20px 18px',
        borderBottom: '1px solid var(--border-glass)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366F1, #06B6D4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
          }}>
            🧭
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '-0.02em', color: '#F8FAFC' }}>
              NEXT-AGENT
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              100% Zero-Cost Local Engine
            </div>
          </div>
        </div>

        {/* Ollama Status Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 8px',
          borderRadius: '20px',
          background: ollamaOnline ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
          border: `1px solid ${ollamaOnline ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'}`,
          fontSize: '11px',
          color: ollamaOnline ? 'var(--accent-emerald)' : 'var(--accent-rose)',
          fontWeight: 600
        }}>
          <span className={`pulse-dot ${!ollamaOnline ? 'offline' : ''}`} />
          {ollamaOnline ? 'Ollama Online' : 'Ollama Ready'}
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div style={{ padding: '12px 14px', display: 'flex', gap: '6px' }}>
        <button
          onClick={() => onSelectTab('chat')}
          style={{
            flex: 1,
            padding: '8px 6px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'chat' ? 'var(--accent-indigo)' : 'rgba(255, 255, 255, 0.04)',
            color: activeTab === 'chat' ? '#FFF' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px'
          }}
        >
          <MessageSquare size={14} /> 1:1 대화
        </button>

        <button
          onClick={() => onSelectTab('roundtable')}
          style={{
            flex: 1,
            padding: '8px 6px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'roundtable' ? 'var(--accent-purple)' : 'rgba(255, 255, 255, 0.04)',
            color: activeTab === 'roundtable' ? '#FFF' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px'
          }}
        >
          <Users size={14} /> 원탁회의
        </button>

        <button
          onClick={() => onSelectTab('pipelines')}
          style={{
            flex: 1,
            padding: '8px 6px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'pipelines' ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.04)',
            color: activeTab === 'pipelines' ? '#0F172A' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px'
          }}
        >
          <Zap size={14} /> 자동화팩
        </button>
      </div>

      {/* Secondary Tools Navigation */}
      <div style={{ padding: '0 14px 10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <button
          onClick={() => onSelectTab('models')}
          style={{
            flex: 1,
            minWidth: '90px',
            padding: '6px 8px',
            borderRadius: '6px',
            border: '1px solid var(--border-glass)',
            background: activeTab === 'models' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
            color: activeTab === 'models' ? 'var(--accent-indigo)' : 'var(--text-muted)',
            fontSize: '11px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          <Cpu size={12} /> 두뇌 설정
        </button>

        <button
          onClick={() => onSelectTab('integrations')}
          style={{
            flex: 1,
            minWidth: '90px',
            padding: '6px 8px',
            borderRadius: '6px',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            background: activeTab === 'integrations' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.05)',
            color: activeTab === 'integrations' ? '#10B981' : '#34D399',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          <Zap size={12} color="#10B981" /> 외부 연동
        </button>

        <button
          onClick={() => onSelectTab('workspace')}
          style={{
            flex: 1,
            minWidth: '90px',
            padding: '6px 8px',
            borderRadius: '6px',
            border: '1px solid var(--border-glass)',
            background: activeTab === 'workspace' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
            color: activeTab === 'workspace' ? 'var(--accent-cyan)' : 'var(--text-muted)',
            fontSize: '11px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          <FolderGit2 size={12} /> 산출물
        </button>
      </div>


      {/* Agent Roster List Section */}
      <div style={{
        padding: '8px 16px 4px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            전문 에이전트 ({agents.length})
          </span>
          {onOpenTeamModal && (
            <button
              onClick={onOpenTeamModal}
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(52, 211, 153, 0.3)',
                borderRadius: '6px',
                color: '#34D399',
                fontSize: '10px',
                padding: '2px 6px',
                cursor: 'pointer',
                fontWeight: 700
              }}
            >
              🏢 팀 관리
            </button>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent-cyan)',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          <PlusCircle size={13} /> 추가
        </button>
      </div>

      {/* Agent List Scroll Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '6px 12px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        {agents.map((agent) => {
          const isSelected = selectedAgent?.id === agent.id && activeTab === 'chat';
          return (
            <div
              key={agent.id}
              onClick={() => {
                onSelectAgent(agent);
                if (activeTab !== 'chat') onSelectTab('chat');
              }}
              style={{
                padding: '10px 12px',
                borderRadius: '10px',
                background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                border: isSelected ? '1px solid var(--accent-indigo)' : '1px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.15s ease'
              }}
            >
              {/* Agent Emoji & Color Ring */}
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: `rgba(${parseInt(agent.color.slice(1,3), 16) || 99}, ${parseInt(agent.color.slice(3,5), 16) || 102}, ${parseInt(agent.color.slice(5,7), 16) || 241}, 0.15)`,
                border: `1px solid ${agent.color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                flexShrink: 0
              }}>
                {agent.emoji}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#F8FAFC' }}>
                    {agent.name}
                  </div>

                  <span style={{
                    fontSize: '9px',
                    padding: '2px 5px',
                    borderRadius: '4px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    color: 'var(--text-muted)'
                  }}>
                    {agent.model.split(':')[0]}
                  </span>
                </div>
                <div style={{
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {agent.role}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Agent Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div className="glass-panel" style={{
            width: '460px',
            padding: '24px',
            background: '#0F172A',
            border: '1px solid var(--border-glass)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ fontWeight: 700, fontSize: '18px' }}>✨ 새 커스텀 에이전트 생성</div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAgent} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ width: '70px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>이모지</label>
                  <input
                    type="text"
                    value={formData.emoji}
                    onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: '#FFF', textAlign: 'center' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>에이전트 이름</label>
                  <input
                    type="text"
                    required
                    placeholder="예: 지후"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: '#FFF' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>직책 / 역할</label>
                <input
                  type="text"
                  required
                  placeholder="예: 숏폼 바이럴 디렉터"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: '#FFF' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>전문 분야 (Specialty)</label>
                <input
                  type="text"
                  placeholder="예: 틱톡 릴스 알고리즘 분석, 후킹 기획"
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: '#FFF' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>페르소나 / 행동 지침</label>
                <textarea
                  rows={3}
                  placeholder="예: 트렌드에 민감하고 직설적인 톤으로 바이럴 성공 확률을 높이는 전략 제시."
                  value={formData.persona}
                  onChange={(e) => setFormData({ ...formData, persona: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: '#FFF', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '8px 14px', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#FFF', cursor: 'pointer' }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', borderRadius: '6px', background: 'var(--accent-indigo)', border: 'none', color: '#FFF', fontWeight: 600, cursor: 'pointer' }}
                >
                  에이전트 등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};
