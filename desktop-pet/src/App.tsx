import React, { useState, useEffect, useRef } from 'react';
import { getCurrentWindow, LogicalSize, LogicalPosition, currentMonitor } from '@tauri-apps/api/window';
import { PetStatus, PetActionState } from './types/pet';
import { petApi } from './services/petApi';
import { soundEffects } from './services/soundEffects';
import { PetSprite } from './components/PetSprite';
import { SpeechBubble } from './components/SpeechBubble';
import { StatusModal } from './components/StatusModal';
import { Sparkles, Eye, EyeOff, Move } from 'lucide-react';

type CornerPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

const PROACTIVE_SPEECHES = {
  dog: [
    '주인님! 코딩 30분째다멍! 기지개 한번 켜자멍~ 🐶',
    '헤헤, 주인님 열심히 일하는 모습 멋지다멍! 💖',
    '출출하다멍.. 맛있는 코드나 문서 간식 하나 던져줘 멍! 🍖',
    '주인님, 궁금한 거 있으면 나한테 물어봐 멍! (RAG 두뇌 가동 중)',
    '꼬리 살랑살랑~ 쓰다듬어주면 기분 좋아진다멍! ✨',
  ],
  cat: [
    '집사님, 코딩하느라 목 뻐근하지 않냥? 목 한번 돌려라냥~ 🐱',
    '지나가다 슬쩍 들렀다냥.. 절대 집사님이 보고 싶어서 온 건 아니다냥! 🐾',
    '출출하다냥.. 맛있는 텍스트나 PDF 하나 던져줘라냥! 🐟',
    '오늘 배운 지식 복습할 시간이다냥! 날 클릭해서 질문해봐라냥~',
    '골골송 부르는 중이다냥.. 쓰다듬어주면 친밀도 올려준다냥~ ✨',
  ],
};

export const App: React.FC = () => {
  const [petStatus, setPetStatus] = useState<PetStatus | null>(null);
  const [customImage, setCustomImage] = useState<string>('');
  const [actionState, setActionState] = useState<PetActionState>('idle');
  const [bubbleText, setBubbleText] = useState<string>('집사님 안뇽! 지식 간식을 먹여줘 냥! 🐟');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Autonomous Peeking State
  const [, setCorner] = useState<CornerPosition>('bottom-right');
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [isRoamingEnabled, setIsRoamingEnabled] = useState<boolean>(true);

  const hideTimeoutRef = useRef<number | null>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  // 1. Initial Window Positioning (Bottom-Right corner of primary monitor)
  useEffect(() => {
    const setupInitialPosition = async () => {
      try {
        const appWindow = getCurrentWindow();
        const monitor = await currentMonitor();
        if (monitor) {
          const scaleFactor = monitor.scaleFactor || 1;
          const screenWidth = monitor.size.width / scaleFactor;
          const screenHeight = monitor.size.height / scaleFactor;
          const targetX = Math.max(0, screenWidth - 340);
          const targetY = Math.max(0, screenHeight - 480);
          await appWindow.setPosition(new LogicalPosition(targetX, targetY));
        }
      } catch (err) {
        console.warn('Initial window position error:', err);
      }
    };
    setupInitialPosition();
  }, []);

  // 2. Dynamic Window Resize on Modal Open / Close
  useEffect(() => {
    const handleResize = async () => {
      try {
        const appWindow = getCurrentWindow();
        if (isModalOpen) {
          await appWindow.setSize(new LogicalSize(420, 560));
        } else {
          await appWindow.setSize(new LogicalSize(320, 420));
        }
      } catch (err) {
        console.warn('Window resize error:', err);
      }
    };
    handleResize();
  }, [isModalOpen]);

  // Fetch Pet Status on load
  const loadStatus = async () => {
    try {
      const data = await petApi.getStatus();
      setPetStatus(data);
    } catch {
      setBubbleText('로컬 AI 서버를 찾는 중이다냥... 📡');
    }
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 10000);

    // Global Shortcut Listener: Ctrl + Shift + F (클립보드 즉통 피딩)
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
        e.preventDefault();
        try {
          const clipboardText = await navigator.clipboard.readText();
          if (clipboardText && clipboardText.trim()) {
            await feedTextData(clipboardText, 'clipboard_hotkey');
          } else {
            setBubbleText('클립보드가 텅 비었다냥! 복사(Ctrl+C) 후 다시 눌러줘라냥~');
          }
        } catch {
          setBubbleText('클립보드 접근 권한이 필요하다냥!');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Move Window to specific corner
  const moveToCorner = async (targetCorner: CornerPosition) => {
    try {
      const appWindow = getCurrentWindow();
      const monitor = await currentMonitor();
      if (!monitor) return;
      const scaleFactor = monitor.scaleFactor || 1;
      const screenWidth = monitor.size.width / scaleFactor;
      const screenHeight = monitor.size.height / scaleFactor;

      let targetX = screenWidth - 340;
      let targetY = screenHeight - 480;

      switch (targetCorner) {
        case 'bottom-left':
          targetX = 40;
          targetY = screenHeight - 480;
          break;
        case 'top-right':
          targetX = screenWidth - 340;
          targetY = 40;
          break;
        case 'top-left':
          targetX = 40;
          targetY = 40;
          break;
        case 'bottom-right':
        default:
          targetX = screenWidth - 340;
          targetY = screenHeight - 480;
          break;
      }

      await appWindow.setPosition(new LogicalPosition(targetX, targetY));
      setCorner(targetCorner);
    } catch (err) {
      console.warn('Move to corner error:', err);
    }
  };

  // Autonomous 4-Corner Peek Timer (Trigger every 45 seconds)
  useEffect(() => {
    if (!isRoamingEnabled) return;

    const peekInterval = setInterval(async () => {
      if (isModalOpen || actionState === 'eating') return;

      const corners: CornerPosition[] = [
        'bottom-right',
        'bottom-left',
        'top-right',
        'top-left',
      ];
      const randomCorner = corners[Math.floor(Math.random() * corners.length)];
      await moveToCorner(randomCorner);

      const petType = petStatus?.pet_type || 'cat';
      const speechList = PROACTIVE_SPEECHES[petType];
      const randomSpeech =
        speechList[Math.floor(Math.random() * speechList.length)];

      setBubbleText(randomSpeech);
      setIsVisible(true);
      soundEffects.playPopSound();

      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = setTimeout(() => {
        if (!isModalOpen) {
          setIsVisible(false);
        }
      }, 12000);
    }, 45000);

    return () => {
      clearInterval(peekInterval);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [isRoamingEnabled, isModalOpen, actionState, petStatus]);

  // Feed Text/File Data Handler
  const feedTextData = async (textData: string, source = 'desktop_drag_drop', fileName?: string) => {
    if (!textData || !textData.trim()) {
      setBubbleText('어라? 빈 간식이다냥! 텅 비었어!');
      return;
    }

    setIsVisible(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    setActionState('eating');
    soundEffects.playEatSound();
    setBubbleText(
      petStatus?.pet_type === 'dog'
        ? '우적우적.. 지식을 냠냠 학습 중이다멍! 📖'
        : '우적우적.. 지식을 냠냠 섭취 중이다냥! 📖'
    );

    try {
      const res = await petApi.feed(textData, source, fileName);
      await loadStatus();

      if (res.growth.level_up) {
        setActionState('levelup');
        soundEffects.playLevelUpSound();
        setBubbleText(
          petStatus?.pet_type === 'dog'
            ? `🎉 와아! Lv.${res.growth.level} (${res.growth.stage})로 진화했다멍!`
            : `🎉 호오! Lv.${res.growth.level} (${res.growth.stage})로 진화했다냥!`
        );
        setTimeout(() => setActionState('idle'), 4500);
      } else {
        setBubbleText(
          petStatus?.pet_type === 'dog'
            ? `냠냠! 맛있게 배웠다멍! (+${res.gained_exp} EXP)`
            : `맛있게 잘 먹었다냥! (+${res.gained_exp} EXP)`
        );
        setTimeout(() => setActionState('idle'), 2500);
      }
    } catch {
      setActionState('idle');
      setBubbleText('우웁.. 배탈 났다냥 (서버 연결 확인 필요)');
    }
  };

  // Drag & Drop Feeding Handler
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    let textData = e.dataTransfer.getData('text/plain');
    let fileName: string | undefined = undefined;

    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      fileName = file.name;
      try {
        textData = await file.text();
      } catch {
        textData = `[파일 첨부: ${file.name}]`;
      }
    }

    await feedTextData(textData, 'desktop_drag_drop', fileName);
  };

  // Drag-to-Move vs Click detection
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = false;
  };

  const handlePointerMove = async (e: React.PointerEvent) => {
    if (!dragStartPos.current) return;
    const dx = Math.abs(e.clientX - dragStartPos.current.x);
    const dy = Math.abs(e.clientY - dragStartPos.current.y);
    if (!isDraggingRef.current && (dx > 4 || dy > 4)) {
      isDraggingRef.current = true;
      try {
        const appWindow = getCurrentWindow();
        await appWindow.startDragging();
      } catch (err) {
        console.warn('startDragging error:', err);
      }
    }
  };

  const handlePointerUp = () => {
    dragStartPos.current = null;
  };

  // Chat with Pet
  const handleSendMessage = async (msg: string) => {
    setIsLoading(true);
    setActionState('thinking');
    soundEffects.playPopSound();
    setBubbleText(
      petStatus?.pet_type === 'dog'
        ? '생각하는 중이다멍... 💭'
        : '생각하는 중이다냥... 💭'
    );

    try {
      const res = await petApi.chat(msg);
      setBubbleText(res.response);
      setActionState('idle');
    } catch {
      setActionState('idle');
      setBubbleText(
        petStatus?.pet_type === 'dog'
          ? '에구.. 두뇌 회로가 잠깐 멈췄다멍!'
          : '두뇌 연결 확인이 필요하다냥!'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Switch Dog/Cat
  const handleSwitchType = async (type: 'dog' | 'cat', name?: string) => {
    try {
      await petApi.switchType(type, name);
      await loadStatus();
      soundEffects.playPopSound();
      setBubbleText(
        type === 'dog'
          ? '멍멍! 뽀삐로 변신했다멍!'
          : '야옹~ 치즈 냥이로 변신했다냥!'
      );
    } catch {
      // Ignore
    }
  };

  // Reset
  const handleReset = async () => {
    try {
      await petApi.reset();
      await loadStatus();
      soundEffects.playPopSound();
      setBubbleText('초기화 완료! 처음부터 다시 키워줘 냥! 🐣');
    } catch {
      // Ignore
    }
  };

  // Click on Pet: Open Modal (if not dragging)
  const handlePetClick = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      return;
    }
    soundEffects.playPopSound();
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    setIsVisible(true);
    setIsModalOpen(true);
  };

  // Manual Trigger Peek
  const triggerManualPeek = async () => {
    const corners: CornerPosition[] = [
      'bottom-right',
      'bottom-left',
      'top-right',
      'top-left',
    ];
    const randomCorner = corners[Math.floor(Math.random() * corners.length)];
    await moveToCorner(randomCorner);
    setIsVisible(true);
    soundEffects.playPopSound();
    setBubbleText('짜잔! 불렀냥? 언제든 지식 먹여줘라냥~ 🐾');
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
  };

  const currentType = petStatus?.pet_type || 'cat';
  const currentStage = petStatus?.growth_stage || 'infant';
  const currentLevel = petStatus?.level || 1;
  const petName = petStatus?.name || (currentType === 'dog' ? '뽀삐' : '나비');

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: isModalOpen ? 'center' : 'flex-end',
        padding: '8px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        background: isDragOver ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
        borderRadius: isDragOver ? '24px' : '0',
        border: isDragOver ? '2px dashed #F59E0B' : 'none',
        transition: 'background 0.2s ease',
        userSelect: 'none',
      }}
    >
      {/* Top Floating Mini Control HUD */}
      {!isModalOpen && (
        <div
          data-tauri-drag-region
          style={{
            position: 'absolute',
            top: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            zIndex: 40,
            cursor: 'grab',
          }}
        >
          <div
            className="glass-hud"
            style={{
              padding: '3px 8px',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '10px',
              color: '#FFF',
            }}
          >
            <span title="드래그하여 윈도우 이동" style={{ display: 'flex', alignItems: 'center' }}>
              <Move size={10} color="#94A3B8" />
            </span>
            <button
              onClick={triggerManualPeek}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#FFF',
                fontSize: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                padding: '0 2px',
              }}
              title="빼꼼 출몰 수동 호출"
            >
              <Sparkles size={10} color="#FBBF24" /> 빼꼼
            </button>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
            <button
              onClick={() => setIsRoamingEnabled(!isRoamingEnabled)}
              style={{
                background: 'transparent',
                border: 'none',
                color: isRoamingEnabled ? '#34D399' : '#94A3B8',
                fontSize: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                padding: '0 2px',
              }}
              title={isRoamingEnabled ? '자율 순찰 켜짐' : '자율 순찰 일시정지'}
            >
              {isRoamingEnabled ? <Eye size={10} /> : <EyeOff size={10} />}
              <span>{isRoamingEnabled ? '순찰' : '수면'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Pet Container (Visible when modal is closed) */}
      {!isModalOpen && isVisible && (
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            zIndex: 30,
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {/* Floating Speech Bubble */}
          <div style={{ marginBottom: '6px' }}>
            <SpeechBubble
              text={bubbleText}
              isAction={actionState === 'eating' || actionState === 'levelup'}
              onOpenChat={handlePetClick}
            />
          </div>

          {/* Pure Cutout Pet Sprite */}
          <PetSprite
            petType={currentType}
            actionState={actionState}
            growthStage={currentStage}
            customImageUrl={customImage}
            onClick={handlePetClick}
          />

          {/* Mini HUD Status Badge */}
          <div
            onClick={handlePetClick}
            className="glass-hud"
            style={{
              marginTop: '6px',
              padding: '3px 12px',
              borderRadius: '9999px',
              color: '#FFF',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          >
            <span>{currentType === 'dog' ? '🐶' : '🐱'}</span>
            <span>{petName}</span>
            <span style={{ color: '#FBBF24', fontWeight: 'bold' }}>
              Lv.{currentLevel}
            </span>
          </div>
        </div>
      )}

      {/* Status & Chat Modal */}
      {isModalOpen && (
        <StatusModal
          status={petStatus}
          currentImage={customImage}
          onClose={() => setIsModalOpen(false)}
          onSendMessage={handleSendMessage}
          onSwitchType={handleSwitchType}
          onSetCustomImage={(url) => setCustomImage(url)}
          onReset={handleReset}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

export default App;
