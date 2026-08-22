import React from 'react';

interface SpeechBubbleProps {
  text: string;
  isAction: boolean;
  onOpenChat: () => void;
}

export const SpeechBubble: React.FC<SpeechBubbleProps> = ({
  text,
  isAction,
  onOpenChat,
}) => {
  return (
    <div
      onClick={onOpenChat}
      className={`glass-bubble speech-float cursor-pointer select-none transition-all duration-300`}
      style={{
        position: 'relative',
        maxWidth: '240px',
        padding: '10px 14px',
        borderRadius: '20px',
        fontSize: '12.5px',
        fontWeight: 500,
        lineHeight: 1.45,
        color: '#1E293B',
        boxShadow: isAction
          ? '0 12px 28px rgba(245, 158, 11, 0.25), 0 2px 8px rgba(0,0,0,0.1)'
          : '0 12px 28px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0,0,0,0.06)',
        border: isAction
          ? '1.5px solid rgba(245, 158, 11, 0.8)'
          : '1px solid rgba(255, 255, 255, 0.8)',
        background: isAction
          ? 'linear-gradient(135deg, rgba(254, 243, 199, 0.96) 0%, rgba(253, 230, 138, 0.94) 100%)'
          : 'rgba(255, 255, 255, 0.94)',
        textAlign: 'center',
        wordBreak: 'break-word',
      }}
    >
      <div>{text}</div>

      {/* Bubble Arrow */}
      <div
        style={{
          position: 'absolute',
          bottom: '-6px',
          left: '50%',
          transform: 'translateX(-50%) rotate(45deg)',
          width: '12px',
          height: '12px',
          background: isAction ? '#FDE68A' : 'rgba(255, 255, 255, 0.94)',
          borderRight: isAction ? '1.5px solid rgba(245, 158, 11, 0.8)' : '1px solid rgba(255, 255, 255, 0.8)',
          borderBottom: isAction ? '1.5px solid rgba(245, 158, 11, 0.8)' : '1px solid rgba(255, 255, 255, 0.8)',
        }}
      />
    </div>
  );
};
