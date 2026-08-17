import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  Check, 
  Smartphone, 
  Sparkles, 
  Loader2, 
  Key, 
  ShieldCheck, 
  HelpCircle, 
  ExternalLink,
  Bot,
  Play
} from 'lucide-react';
import { api } from '../services/api';

interface TelegramModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TelegramModal: React.FC<TelegramModalProps> = ({ isOpen, onClose }) => {
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [scouting, setScouting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await api.getTelegramConfig();
      setBotToken(data.bot_token || '');
      setChatId(data.chat_id || '');
      setIsConfigured(data.is_configured);
      setIsPolling(data.is_polling);
    } catch (e) {
      console.error('Failed to load telegram config:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!botToken.trim() || !chatId.trim()) {
      setToast({ type: 'error', text: '봇 토큰과 Chat ID를 모두 입력해 주십시오.' });
      return;
    }
    setLoading(true);
    try {
      const res = await api.saveTelegramConfig(botToken, chatId);
      setIsConfigured(res.config.is_configured);
      setIsPolling(res.config.is_polling);
      setToast({ type: 'success', text: '텔레그램 봇 설정이 성공적으로 저장되었습니다!' });
    } catch (e: any) {
      setToast({ type: 'error', text: `저장 실패: ${e.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleTestSend = async () => {
    setTesting(true);
    try {
      const res = await api.testTelegramMessage();
      if (res.ok || res.status === 'success') {
        setToast({ type: 'success', text: '스마트폰 텔레그램으로 테스트 메시지를 성공적으로 발송했습니다!' });
      } else {
        setToast({ type: 'error', text: `발송 실패: ${res.description || res.message || '토큰/챗ID 확인 필요'}` });
      }
    } catch (e: any) {
      setToast({ type: 'error', text: `발송 오류: ${e.message}` });
    } finally {
      setTesting(false);
    }
  };

  const handleScoutNow = async () => {
    setScouting(true);
    try {
      const res = await api.triggerTelegramScout();
      if (res.ok || res.status === 'success') {
        setToast({ type: 'success', text: '🔥 핫 아이템 3종 및 승인 버튼이 텔레그램으로 전송되었습니다! 스마트폰을 확인하세요.' });
      } else {
        setToast({ type: 'error', text: `발굴 전송 실패: ${res.description || res.message}` });
      }
    } catch (e: any) {
      setToast({ type: 'error', text: `발굴 오류: ${e.message}` });
    } finally {
      setScouting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: '#0F172A',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '620px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0088cc 0%, #22D3EE 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFF'
            }}>
              <Smartphone size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#F8FAFC', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                텔레그램 스마트폰 원격 제어 (Remote Autonomous HQ)
                <span style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: isConfigured ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                  color: isConfigured ? '#10B981' : '#94A3B8',
                  fontWeight: 700
                }}>
                  {isConfigured ? '● 원격 제어 연동됨' : '○ 미연동'}
                </span>
              </h3>
              <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0, marginTop: '2px' }}>
                침대나 외출 중에도 텔레그램 버튼 하나로 10대 에이전트에게 개발을 지시하고 완성본을 받습니다.
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
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Toast */}
          {toast && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${toast.type === 'success' ? '#10B981' : '#EF4444'}`,
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>{toast.text}</span>
              <X size={14} style={{ cursor: 'pointer' }} onClick={() => setToast(null)} />
            </div>
          )}

          {/* Form Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Key size={14} color="#0088cc" /> 텔레그램 봇 토큰 (Bot Token)
              </label>
              <input
                type="password"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="예: 1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FFF',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <ShieldCheck size={14} color="#10B981" /> 대표님 텔레그램 Chat ID
              </label>
              <input
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="예: 123456789 (숫자 ID)"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FFF',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleSave}
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                background: '#0088cc',
                border: 'none',
                color: '#FFF',
                fontSize: '13px',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              설정 저장 & 원격 리스너 시작
            </button>

            <button
              onClick={handleTestSend}
              disabled={!isConfigured || testing}
              style={{
                padding: '12px 18px',
                borderRadius: '10px',
                background: isConfigured ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: isConfigured ? '#FFF' : '#64748B',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isConfigured && !testing ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {testing ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
              📲 테스트 발송
            </button>
          </div>

          {/* 🚀 지금 즉시 핫 아이템 발굴 & 텔레그램 전송 배너 */}
          {isConfigured && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(16, 185, 129, 0.15) 100%)',
              border: '1.5px solid rgba(234, 179, 8, 0.4)',
              borderRadius: '14px',
              padding: '16px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#FACC15' }}>
                  🔥 핫 SaaS 아이템 자율 발굴 & 텔레그램 전송
                </div>
                <div style={{ fontSize: '11px', color: '#CBD5E1', marginTop: '2px' }}>
                  정우가 지금 시장의 유망 아이템 3종을 텔레그램 인라인 승인 버튼과 함께 즉시 전송합니다.
                </div>
              </div>

              <button
                onClick={handleScoutNow}
                disabled={scouting}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #FACC15 0%, #10B981 100%)',
                  border: 'none',
                  color: '#0F172A',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: scouting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}
              >
                {scouting ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {scouting ? '발굴 중...' : '🚀 지금 즉시 발굴 & 전송'}
              </button>
            </div>
          )}

          {/* Guide Box */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '12px',
            padding: '14px 16px',
            fontSize: '12px',
            color: '#94A3B8',
            lineHeight: 1.6
          }}>
            <div style={{ fontWeight: 700, color: '#E2E8F0', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <HelpCircle size={14} color="#0088cc" /> 💡 텔레그램 봇 토큰 & Chat ID 얻는 법
            </div>
            1. 텔레그램에서 <code>@BotFather</code> 검색 ➡️ <code>/newbot</code> 입력하여 봇 생성 후 <strong>Token</strong> 복사<br/>
            2. 생성한 봇에게 아무 메시지나 전송 후 <code>@userinfobot</code>에서 본인의 <strong>Id (Chat ID)</strong> 확인<br/>
            3. 위 입력칸에 넣고 [저장]을 누르면 24시간 스마트폰 원격 제어가 즉시 가동됩니다!
          </div>
        </div>
      </div>
    </div>
  );
};
