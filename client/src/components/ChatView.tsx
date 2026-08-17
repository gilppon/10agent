import React, { useState, useEffect, useRef } from 'react';
import { Agent, Message } from '../types';
import { Send, Bot, User, ChevronDown, ChevronRight, Copy, Check, Sparkles, AlertTriangle, RotateCcw } from 'lucide-react';

interface ChatViewProps {
  agent: Agent;
  messages: Message[];
  streamingToken: string;
  streamingReasoning: string;
  isStreaming: boolean;
  onSendMessage: (text: string) => void;
  onRetryMessage?: (text: string) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  agent,
  messages,
  streamingToken,
  streamingReasoning,
  isStreaming,
  onSendMessage,
  onRetryMessage
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [expandedReasoning, setExpandedReasoning] = useState<Record<number, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingToken, streamingReasoning]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isStreaming) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const toggleReasoning = (idx: number) => {
    setExpandedReasoning(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
      background: 'radial-gradient(ellipse at top, rgba(30, 41, 59, 0.4), var(--bg-main))'
    }}>
      {/* Messages Scroll Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {messages.length === 0 && !isStreaming && (
          <div style={{
            margin: 'auto',
            textAlign: 'center',
            maxWidth: '480px',
            padding: '40px 20px'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px',
              filter: 'drop-shadow(0 0 20px rgba(99, 102, 241, 0.3))'
            }}>
              {agent.emoji}
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: '#F8FAFC' }}>
              {agent.name} ({agent.role})
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
              {agent.persona}
            </p>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-glass)',
              fontSize: '12px',
              color: 'var(--text-muted)'
            }}>
              <Sparkles size={14} color="var(--accent-cyan)" /> 로컬 AI 모델: <strong>{agent.model}</strong>
            </div>
          </div>
        )}

        {/* Existing Messages */}
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: '12px',
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                maxWidth: isUser ? '75%' : '85%',
                flexDirection: isUser ? 'row-reverse' : 'row'
              }}
            >
              {/* Avatar */}
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: isUser ? 'var(--accent-indigo)' : `rgba(255, 255, 255, 0.06)`,
                border: isUser ? 'none' : `1px solid ${agent.color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                flexShrink: 0
              }}>
                {isUser ? <User size={16} color="#FFF" /> : agent.emoji}
              </div>

              {/* Message Content Bubble */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                {/* Reasoning Accordion (if present) */}
                {msg.reasoning && (
                  <div style={{
                    borderRadius: '8px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    padding: '8px 12px',
                    fontSize: '12px',
                    color: 'var(--text-muted)'
                  }}>
                    <button
                      onClick={() => toggleReasoning(idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-cyan)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {expandedReasoning[idx] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      🧠 AI 심층 추론 과정 (Reasoning)
                    </button>
                    {expandedReasoning[idx] && (
                      <div style={{ marginTop: '8px', whiteSpace: 'pre-wrap', fontStyle: 'italic', lineHeight: 1.5 }}>
                        {msg.reasoning}
                      </div>
                    )}
                  </div>
                )}

                <div className="glass-panel" style={{
                  padding: '14px 18px',
                  background: isUser ? 'var(--accent-indigo)' : msg.error ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-card)',
                  color: '#F8FAFC',
                  borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                  fontSize: '14px',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  position: 'relative',
                  border: msg.error ? '1px solid rgba(239, 68, 68, 0.4)' : undefined
                }}>
                  {msg.content || (msg.error ? <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>[응답 생성 중단됨]</span> : '')}

                  {/* Inline Error & Retry Action Card */}
                  {msg.error && (
                    <div style={{
                      marginTop: '12px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#FCA5A5' }}>
                        <AlertTriangle size={16} color="#EF4444" style={{ flexShrink: 0 }} />
                        <span>{msg.errorMessage || '로컬 AI 모델과의 연결이 중단되었습니다.'}</span>
                      </div>
                      {onRetryMessage && (
                        <button
                          onClick={() => {
                            // Find the preceding user message to retry
                            const prevUserMsg = messages.slice(0, idx).reverse().find(m => m.role === 'user');
                            if (prevUserMsg) {
                              onRetryMessage(prevUserMsg.content);
                            }
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            background: '#EF4444',
                            color: '#FFFFFF',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                        >
                          <RotateCcw size={12} /> 다시 시도
                        </button>
                      )}
                    </div>
                  )}

                  {!isUser && !msg.error && msg.content && (
                    <button
                      onClick={() => copyToClipboard(msg.content, idx)}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px',
                        color: 'var(--text-muted)',
                        cursor: 'pointer'
                      }}
                      title="복사하기"
                    >
                      {copiedIndex === idx ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Live Streaming Message Bubble */}
        {isStreaming && (
          <div style={{
            display: 'flex',
            gap: '12px',
            alignSelf: 'flex-start',
            maxWidth: '85%'
          }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: `rgba(255, 255, 255, 0.06)`,
              border: `1px solid ${agent.color}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              flexShrink: 0
            }}>
              {agent.emoji}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
              {streamingReasoning && (
                <div style={{
                  borderRadius: '8px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  padding: '10px 14px',
                  fontSize: '12px',
                  color: 'var(--accent-cyan)',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap'
                }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>🧠 실시간 로컬 AI 추론 중...</div>
                  {streamingReasoning}
                </div>
              )}

              <div className="glass-panel" style={{
                padding: '14px 18px',
                background: 'var(--bg-card)',
                color: '#F8FAFC',
                borderRadius: '4px 16px 16px 16px',
                fontSize: '14px',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap'
              }}>
                {streamingToken || <span style={{ color: 'var(--text-muted)' }}>답변 생성 준비 중...</span>}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Box */}
      <div style={{
        padding: '16px 24px 20px',
        borderTop: '1px solid var(--border-glass)',
        background: 'rgba(15, 23, 42, 0.9)'
      }}>
        <form onSubmit={handleSend} style={{
          display: 'flex',
          gap: '10px',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--border-glass)',
          borderRadius: '12px',
          padding: '6px 8px 6px 16px',
          alignItems: 'center'
        }}>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder={`@${agent.name} 에게 업무 지시하기 (Enter로 전송, Shift+Enter 줄바꿈)...`}
            rows={1}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#F8FAFC',
              fontSize: '14px',
              outline: 'none',
              resize: 'none',
              maxHeight: '120px'
            }}
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isStreaming}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: inputText.trim() && !isStreaming ? 'var(--accent-indigo)' : 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: inputText.trim() && !isStreaming ? 'pointer' : 'not-allowed'
            }}
          >
            <Send size={16} />
          </button>
        </form>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
          <span>💡 100% 로컬 AI 연산 모드 (비용 0원)</span>
          <span>모델: {agent.model}</span>
        </div>
      </div>
    </div>
  );
};
