import React, { useState, useRef } from 'react';
import { Agent } from '../types';
import { Users, Play, CheckSquare, Square, Sparkles, Copy, Check } from 'lucide-react';
import { api } from '../services/api';

interface RoundtableModalProps {
  agents: Agent[];
  sessionId: string;
}

export const RoundtableModal: React.FC<RoundtableModalProps> = ({ agents, sessionId }) => {
  const [topic, setTopic] = useState('');
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>(['ceo', 'business', 'developer', 'designer']);
  const [isMeetingRunning, setIsMeetingRunning] = useState(false);
  const [meetingLogs, setMeetingLogs] = useState<Array<{ agent_id?: string; content: string; reasoning?: string }>>([]);
  const [currentSpeaker, setCurrentSpeaker] = useState<Agent | null>(null);
  const [currentSpeakerToken, setCurrentSpeakerToken] = useState('');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisContent, setSynthesisContent] = useState('');
  const [copied, setCopied] = useState(false);
  
  const currentTokenRef = useRef('');
  const synthesisRef = useRef('');

  const toggleAgent = (id: string) => {
    setSelectedAgentIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedAgentIds(agents.map(a => a.id));
  const deselectAll = () => setSelectedAgentIds([]);

  const handleStartMeeting = () => {
    if (!topic.trim() || selectedAgentIds.length === 0 || isMeetingRunning) return;
    setIsMeetingRunning(true);
    setMeetingLogs([]);
    setCurrentSpeakerToken('');
    setSynthesisContent('');
    currentTokenRef.current = '';
    synthesisRef.current = '';

    api.streamRoundtable(
      { session_id: sessionId, topic: topic.trim(), agent_ids: selectedAgentIds },
      {
        onEvent: (data) => {
          if (data.type === 'roundtable_speaker_start') {
            setCurrentSpeaker(data.agent);
            setCurrentSpeakerToken('');
            currentTokenRef.current = '';
          } else if (data.type === 'token') {
            currentTokenRef.current += data.content;
            setCurrentSpeakerToken(currentTokenRef.current);
          } else if (data.type === 'roundtable_speaker_done') {
            const finalContent = currentTokenRef.current;
            setMeetingLogs(prev => [...prev, {
              agent_id: data.agent_id,
              content: finalContent
            }]);
            setCurrentSpeaker(null);
            setCurrentSpeakerToken('');
            currentTokenRef.current = '';
          } else if (data.type === 'roundtable_synthesis_start') {
            setIsSynthesizing(true);
            setSynthesisContent('');
            synthesisRef.current = '';
          } else if (data.type === 'roundtable_synthesis_token') {
            synthesisRef.current += data.content;
            setSynthesisContent(synthesisRef.current);
          } else if (data.type === 'roundtable_synthesis_done') {
            setIsSynthesizing(false);
            setSynthesisContent(data.content || synthesisRef.current);
          }
        },
        onDone: () => {
          setIsMeetingRunning(false);
          setIsSynthesizing(false);
          setCurrentSpeaker(null);
          currentTokenRef.current = '';
        },
        onError: (err) => {
          console.error(err);
          setIsMeetingRunning(false);
          setIsSynthesizing(false);
          currentTokenRef.current = '';
        }
      }
    );
  };

  const copyTranscript = () => {
    const text = meetingLogs.map(l => {
      const a = agents.find(ag => ag.id === l.agent_id);
      return `### [${a?.name || l.agent_id} (${a?.role || ''})]\n${l.content}\n\n`;
    }).join('');
    navigator.clipboard.writeText(`## 📢 안건: ${topic}\n\n` + text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '24px 32px',
      overflowY: 'auto',
      background: 'radial-gradient(ellipse at top, rgba(139, 92, 246, 0.15), var(--bg-main))'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'var(--accent-purple)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px'
          }}>
            👥
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#F8FAFC' }}>
              다자간 에이전트 합동 원탁회의 (Roundtable)
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              여러 전문 에이전트가 순차적으로 안건을 검토하고 집단 지성으로 최적의 실행 전략을 도출합니다.
            </p>
          </div>
        </div>
      </div>

      {/* Meeting Setup Card */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
            회의 안건 및 기획 주제 (Topic / Agenda)
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={isMeetingRunning}
            placeholder="예: 2026년 1인 창업자를 위한 AI 마케팅 자동화 SaaS 신제품 기획 및 수익화 전략"
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-glass)',
              color: '#FFF',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>

        {/* Agent Selector Grid */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              참석 에이전트 선택 ({selectedAgentIds.length}/{agents.length})
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={selectAll} disabled={isMeetingRunning} style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: '11px', cursor: 'pointer' }}>전체 선택</button>
              <button onClick={deselectAll} disabled={isMeetingRunning} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer' }}>전체 해제</button>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '8px'
          }}>
            {agents.map((ag) => {
              const isChecked = selectedAgentIds.includes(ag.id);
              return (
                <div
                  key={ag.id}
                  onClick={() => !isMeetingRunning && toggleAgent(ag.id)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: isChecked ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.02)',
                    border: isChecked ? '1px solid var(--accent-purple)' : '1px solid var(--border-glass)',
                    cursor: isMeetingRunning ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <div style={{ fontSize: '16px' }}>{ag.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#FFF' }}>{ag.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{ag.role}</div>
                  </div>

                  {isChecked ? <CheckSquare size={14} color="var(--accent-purple)" /> : <Square size={14} color="var(--text-muted)" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Start Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleStartMeeting}
            disabled={!topic.trim() || selectedAgentIds.length === 0 || isMeetingRunning}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              background: !topic.trim() || selectedAgentIds.length === 0 || isMeetingRunning ? 'rgba(255, 255, 255, 0.1)' : 'var(--accent-purple)',
              border: 'none',
              color: '#FFF',
              fontSize: '13px',
              fontWeight: 700,
              cursor: !topic.trim() || selectedAgentIds.length === 0 || isMeetingRunning ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Play size={14} /> {isMeetingRunning ? '원탁회의 진행 중...' : '원탁회의 시작 (100% 무료)'}
          </button>
        </div>
      </div>

      {/* Meeting Logs & Live Speaker View */}
      {(meetingLogs.length > 0 || isMeetingRunning) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F8FAFC' }}>
              📝 실시간 회의 발언록 ({meetingLogs.length}건 완료)
            </h3>
            {meetingLogs.length > 0 && (
              <button
                onClick={copyTranscript}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid var(--border-glass)',
                  color: '#FFF',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {copied ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
                회의록 전체 복사
              </button>
            )}
          </div>

          {/* Past completed speakers */}
          {meetingLogs.map((log, i) => {
            const speakerAgent = agents.find(a => a.id === log.agent_id);
            return (
              <div key={i} className="glass-panel" style={{ padding: '16px 20px', borderLeft: `3px solid ${speakerAgent?.color || 'var(--accent-purple)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '18px' }}>{speakerAgent?.emoji}</span>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: '#FFF' }}>{speakerAgent?.name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({speakerAgent?.role})</span>
                </div>
                <div style={{ fontSize: '13px', lineHeight: 1.6, color: '#E2E8F0', whiteSpace: 'pre-wrap' }}>
                  {log.content}
                </div>
              </div>
            );
          })}

          {/* Currently speaking live agent */}
          {isMeetingRunning && currentSpeaker && (
            <div className="glass-panel" style={{
              padding: '16px 20px',
              borderLeft: `3px solid ${currentSpeaker.color}`,
              background: 'rgba(99, 102, 241, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px' }}>{currentSpeaker.emoji}</span>
                <span style={{ fontWeight: 700, fontSize: '14px', color: '#FFF' }}>{currentSpeaker.name} (발언 중...)</span>
                <span className="pulse-dot" />
              </div>
              <div style={{ fontSize: '13px', lineHeight: 1.6, color: '#E2E8F0', whiteSpace: 'pre-wrap' }}>
                {currentSpeakerToken || <span style={{ color: 'var(--text-muted)' }}>생각 중...</span>}
              </div>
            </div>
          )}

          {/* 🏆 CEO Master Action Plan Synthesis Card */}
          {(isSynthesizing || synthesisContent) && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.12) 0%, rgba(16, 185, 129, 0.12) 100%)',
              border: '1.5px solid rgba(234, 179, 8, 0.5)',
              borderRadius: '16px',
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '22px' }}>🧭</span>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#FACC15', margin: 0 }}>
                      🏆 원탁회의 최종 CEO 총괄 종합 실행 계획서 (Master Action Plan)
                    </h4>
                    <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                      {isSynthesizing ? 'CEO가 전 부서의 독립 발언을 종합 분석하고 있습니다...' : '전사 총괄 최종 승인 완료'}
                    </span>
                  </div>
                </div>
                {synthesisContent && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(synthesisContent);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      background: 'rgba(234, 179, 8, 0.2)',
                      border: '1px solid #FACC15',
                      color: '#FACC15',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {copied ? <Check size={12} color="#FACC15" /> : <Copy size={12} />}
                    마스터 플랜 복사
                  </button>
                )}
              </div>
              <div style={{
                fontSize: '13px',
                lineHeight: 1.7,
                color: '#F8FAFC',
                whiteSpace: 'pre-wrap',
                background: 'rgba(0, 0, 0, 0.4)',
                padding: '16px 20px',
                borderRadius: '12px'
              }}>
                {synthesisContent || <span style={{ color: 'var(--text-muted)' }}>CEO가 마스터 플랜을 수립 중입니다...</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
