import React, { useRef } from 'react';
import { PetType, PetActionState, GrowthStage } from '../types/pet';

interface PetSpriteProps {
  petType: PetType;
  actionState: PetActionState;
  growthStage: GrowthStage;
  customImageUrl?: string;
  onClick: () => void;
}

// 투명 누끼 실사 펫 프리셋
export const REALISTIC_PET_PRESETS = {
  // Cat Gatekeeper 원본 실사 치즈 뚱냥이 (완전 투명 배경)
  fat_cat: {
    name: '치즈 뚱냥이 (오리지널)',
    type: 'cat' as PetType,
    mediaType: 'video',
    src: '/assets/fat_cat.webm',
    fallbackSrc: '/assets/fat_cat.apng',
  },
  // 실사 댕댕이 컷아웃
  golden_puppy: {
    name: '골든 댕댕이',
    type: 'dog' as PetType,
    mediaType: 'image',
    src: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=600&q=80',
    fallbackSrc: '',
  },
  // 실사 시바견
  shiba_dog: {
    name: '시바 댕댕이',
    type: 'dog' as PetType,
    mediaType: 'image',
    src: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=600&q=80',
    fallbackSrc: '',
  }
};

export const PetSprite: React.FC<PetSpriteProps> = ({
  petType,
  actionState,
  growthStage,
  customImageUrl,
  onClick,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Determine active media
  const isDefaultFatCat = !customImageUrl && petType === 'cat';

  const getAnimationClass = () => {
    switch (actionState) {
      case 'eating':
        return 'pet-eating';
      case 'levelup':
        return 'animate-bounce';
      case 'thinking':
        return 'animate-pulse';
      default:
        return 'pet-breathing';
    }
  };

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '380px',
        height: '220px',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
      className={`group hover:scale-105 active:scale-95 ${getAnimationClass()}`}
      title="클릭하여 대화하기 / 상태 열람"
    >
      {/* Dynamic Glow when level up or special state */}
      {actionState === 'levelup' && (
        <div
          style={{
            position: 'absolute',
            inset: '0',
            borderRadius: '50%',
            filter: 'blur(32px)',
            opacity: 0.8,
            background: 'radial-gradient(circle, rgba(245,158,11,0.8) 0%, rgba(234,179,8,0.2) 100%)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Main Cutout Pet: Transparent, No Box, No Border */}
      <div
        className="pet-shadow"
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          overflow: 'visible',
          background: 'transparent',
        }}
      >
        {isDefaultFatCat ? (
          // Cat Gatekeeper Animated Transparent Video (WebM)
          <video
            ref={videoRef}
            src="/assets/fat_cat.webm"
            autoPlay
            loop
            muted
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              objectPosition: 'bottom center',
              pointerEvents: 'none',
            }}
          />
        ) : (
          // Other Photo / Custom Image Cutout
          <img
            src={customImageUrl || REALISTIC_PET_PRESETS.golden_puppy.src}
            alt="AI Pet"
            style={{
              maxHeight: '100%',
              maxWidth: '100%',
              objectFit: 'contain',
              objectPosition: 'bottom center',
              borderRadius: customImageUrl ? '24px' : '0',
              pointerEvents: 'none',
            }}
            onError={(e) => {
              // Fallback to APNG
              const target = e.target as HTMLImageElement;
              target.src = '/assets/fat_cat.apng';
            }}
          />
        )}

        {/* Master Crown Badge */}
        {growthStage === 'master' && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: '25%',
              fontSize: '28px',
              filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.6))',
              animation: 'floatGentle 2s ease-in-out infinite',
            }}
          >
            👑
          </div>
        )}
      </div>

      {/* Floating Eating Snack */}
      {actionState === 'eating' && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            right: '20%',
            fontSize: '40px',
            filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.4))',
            animation: 'eatingChew 0.4s ease-in-out infinite',
            zIndex: 30,
          }}
        >
          {petType === 'dog' ? '🍖' : '🐟'}
        </div>
      )}

      {/* Level Up Confetti */}
      {actionState === 'levelup' && (
        <div
          style={{
            position: 'absolute',
            top: '0px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '38px',
            animation: 'popIn 0.3s ease forwards',
            zIndex: 30,
          }}
        >
          🎉
        </div>
      )}
    </div>
  );
};
