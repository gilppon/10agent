import React, { useState } from 'react';
import { PetStatus } from '../types/pet';
import { REALISTIC_PET_PRESETS } from './PetSprite';
import { X, Send, RefreshCw, Image as ImageIcon, Sparkles } from 'lucide-react';

interface StatusModalProps {
  status: PetStatus | null;
  currentImage?: string;
  onClose: () => void;
  onSendMessage: (msg: string) => Promise<void>;
  onSwitchType: (type: 'dog' | 'cat', name?: string) => Promise<void>;
  onSetCustomImage: (url: string) => void;
  onReset: () => Promise<void>;
  isLoading: boolean;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  status,
  currentImage,
  onClose,
  onSendMessage,
  onSwitchType,
  onSetCustomImage,
  onReset,
  isLoading,
}) => {
  const [chatInput, setChatInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customUrl, setCustomUrl] = useState('');

  if (!status) return null;

  const expPercent = Math.min(Math.round((status.exp / status.max_exp) * 100), 100);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isLoading) return;
    const msg = chatInput.trim();
    setChatInput('');
    await onSendMessage(msg);
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (customUrl.trim()) {
      onSetCustomImage(customUrl.trim());
      setShowCustomInput(false);
    }
  };

  const getStageBadge = (stage: string) => {
    if (stage === 'master') return { label: '👑 마스터 파트너 (Lv.21+)', bg: '#F3E8FF', color: '#7E22CE', border: '#D8B4FE' };
    if (stage === 'growth') return { label: '🌱 성장기 (Lv.6~20)', bg: '#DCFCE7', color: '#15803D', border: '#86EFAC' };
    return { label: '🐣 아기 단계 (Lv.1~5)', bg: '#FEF3C7', color: '#B45309', border: '#FDE68A' };
  };

  const stageInfo = getStageBadge(status.growth_stage);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="modal-pop glass-bubble"
        style={{
          width: '100%',
          maxWidth: '380px',
          maxHeight: '520px',
          borderRadius: '24px',
          padding: '18px',
          color: '#1E293B',
          fontSize: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          overflowY: 'auto',
        }}
      >
        {/* Header with Drag Region */}
        <div
          data-tauri-drag-region
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #F1F5F9',
            paddingBottom: '8px',
            cursor: 'grab',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', fontSize: '15px' }}>
            <span>{status.pet_type === 'dog' ? '🐶' : '🐱'}</span>
            <span>{status.name}</span>
            <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#64748B' }}>Lv.{status.level}</span>
          </div>
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94A3B8',
              padding: '4px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="창 닫기 (축소)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Stage Badge */}
        <div
          style={{
            padding: '5px 10px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 600,
            textAlign: 'center',
            backgroundColor: stageInfo.bg,
            color: stageInfo.color,
            border: `1px solid ${stageInfo.border}`,
          }}
        >
          {stageInfo.label}
        </div>

        {/* EXP Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748B' }}>
            <span>지식 경험치 (EXP)</span>
            <span style={{ fontWeight: 600, color: '#D97706' }}>{status.exp} / {status.max_exp} ({expPercent}%)</span>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#E2E8F0', borderRadius: '9999px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${expPercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #F59E0B 0%, #D97706 100%)',
                borderRadius: '9999px',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            backgroundColor: '#F8FAFC',
            padding: '10px 12px',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            fontSize: '11px',
          }}
        >
          <div>
            <span style={{ color: '#64748B' }}>친밀도: </span>
            <span style={{ fontWeight: 600, color: '#E11D48' }}>❤️ {status.affection}/100</span>
          </div>
          <div>
            <span style={{ color: '#64748B' }}>지식 피딩: </span>
            <span style={{ fontWeight: 600, color: '#7C3AED' }}>📚 {status.total_fed_count}회</span>
          </div>
        </div>

        {/* Photo Presets Switcher */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={12} color="#F59E0B" /> 실사 외형 변경
          </div>
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
            {Object.entries(REALISTIC_PET_PRESETS).map(([key, preset]) => {
              const isSelected = key === 'fat_cat' ? !currentImage : currentImage === preset.src;
              return (
                <button
                  key={key}
                  onClick={() => {
                    if (key === 'fat_cat') {
                      onSetCustomImage('');
                      onSwitchType('cat', '치즈 뚱냥이');
                    } else {
                      onSetCustomImage(preset.src);
                      onSwitchType(preset.type, preset.name);
                    }
                  }}
                  style={{
                    position: 'relative',
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: isSelected ? '2px solid #F59E0B' : '1px solid #CBD5E1',
                    background: '#FFF',
                    cursor: 'pointer',
                    padding: 0,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={preset.name}
                >
                  {key === 'fat_cat' ? (
                    <img src="/assets/fat_cat.apng" alt={preset.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <img src={preset.src} alt={preset.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </button>
              );
            })}
            <button
              onClick={() => setShowCustomInput(!showCustomInput)}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                border: '1px dashed #94A3B8',
                background: '#F1F5F9',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B',
                flexShrink: 0,
              }}
              title="커스텀 이미지 URL 입력"
            >
              <ImageIcon size={14} />
            </button>
          </div>

          {showCustomInput && (
            <form onSubmit={handleApplyCustomUrl} style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="이미지 URL 붙여넣기..."
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  fontSize: '11px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '6px 12px',
                  fontSize: '11px',
                  backgroundColor: '#F59E0B',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                적용
              </button>
            </form>
          )}
        </div>

        {/* Chat Input Form */}
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="펫에게 질문하기 (RAG 두뇌)..."
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '9px 12px',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
              fontSize: '12px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !chatInput.trim()}
            style={{
              padding: '9px 14px',
              backgroundColor: '#F59E0B',
              color: '#FFF',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
            }}
          >
            <Send size={14} />
          </button>
        </form>

        {/* Footer Reset */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
          <button
            onClick={onReset}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              fontSize: '10px',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={10} /> 상태 초기화
          </button>
        </div>
      </div>
    </div>
  );
};
