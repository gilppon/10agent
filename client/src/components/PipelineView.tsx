import React, { useState } from 'react';
import { Zap, Play, CheckCircle2, ArrowRight, Sparkles, FileText, Check } from 'lucide-react';
import { api } from '../services/api';

interface PipelineViewProps {
  sessionId: string;
}

const PIPELINES = [
  {
    id: 'youtube_pack',
    title: '📺 유튜브 영상 올인원 제작 팩',
    desc: '클릭율 높은 제목 5종, 3초 후킹 스크립트, 썸네일 브리프, BGM 사운드 연출, SEO 상세설명 일괄 제작',
    stages: ['레오 (기획/후크)', '루나 (사운드/BGM)', '지은 (SEO/설명란)'],
    color: '#FF4444',
    placeholder: '예: 2026년 AI 툴 5가지로 월 300만원 자동화 수익 만드는 현실적 방법'
  },
  {
    id: 'app_builder',
    title: '💻 풀스택 웹앱 자율 빌더 팩',
    desc: '요구사항 사양서 정의 ➡️ 8px HSL 모던 UI/UX 설계 ➡️ 실행 가능한 프론트/백엔드 풀코드 생성',
    stages: ['CEO (사양서 정의)', '민희 (UI/UX 설계)', '코다리 (풀코드 빌드)'],
    color: '#22D3EE',
    placeholder: '예: 로컬 LLM을 연동하여 PDF 문서를 요약하고 질의응답하는 미니 웹 애플리케이션'
  },
  {
    id: 'copywriting_suite',
    title: '✍️ 마케팅 & SNS 전환 카피 스위트',
    desc: '타겟 고객 페르소나 분석 ➡️ AIDA/PAS 세일즈 카피 ➡️ 인스타그램 릴스/스토리 템플릿 제작',
    stages: ['현빈 (BM/타겟 분석)', '지은 (AIDA 카피)', '찬우 (인스타/릴스)'],
    color: '#F59E0B',
    placeholder: '예: 바쁜 1인 개발자를 위한 노코드 웹사이트 빌더 런칭 마케팅'
  },
  {
    id: 'deep_research',
    title: '🔍 심층 시장/기술 교차 리서치 팩',
    desc: '5단계 심층 팩트체크 리서치 ➡️ 비즈니스 위험/기회 분석 ➡️ 경영진 1분 요약 데일리 브리핑',
    stages: ['정우 (교차 팩트체크)', '현빈 (ROI/전략 분석)', '영숙 (경영진 브리핑)'],
    color: '#8B5CF6',
    placeholder: '예: 2026년 온디바이스(On-device) 로컬 AI 경량화 모델 시장 전망 및 경쟁사 동향'
  }
];

export const PipelineView: React.FC<PipelineViewProps> = ({ sessionId }) => {
  const [selectedPipeline, setSelectedPipeline] = useState(PIPELINES[0]);
  const [prompt, setPrompt] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [currentStage, setCurrentStage] = useState<number>(0);
  const [stageTokens, setStageTokens] = useState<Record<number, string>>({});
  const [completedArtifact, setCompletedArtifact] = useState<string | null>(null);

  const handleRunPipeline = () => {
    if (!prompt.trim() || isRunning) return;
    setIsRunning(true);
    setCurrentStage(1);
    setStageTokens({});
    setCompletedArtifact(null);

    api.streamPipeline(
      { session_id: sessionId, pipeline_type: selectedPipeline.id, prompt: prompt.trim() },
      {
        onEvent: (data) => {
          if (data.type === 'pipeline_stage_start') {
            setCurrentStage(data.stage_num);
          } else if (data.type === 'token') {
            setStageTokens(prev => ({
              ...prev,
              [currentStage]: (prev[currentStage] || '') + data.content
            }));
          } else if (data.type === 'pipeline_complete') {
            setCompletedArtifact(data.artifact_name);
          }
        },
        onDone: () => {
          setIsRunning(false);
        },
        onError: (err) => {
          console.error(err);
          setIsRunning(false);
        }
      }
    );
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '24px 32px',
      overflowY: 'auto',
      background: 'radial-gradient(ellipse at top, rgba(6, 182, 212, 0.12), var(--bg-main))'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'var(--accent-cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            color: '#0F172A'
          }}>
            ⚡
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#F8FAFC' }}>
              원클릭 자율 엔지니어링 자동화 팩 (Pipelines)
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              아이디어 한 줄만 입력하면 3명의 전문 에이전트가 릴레이로 연쇄 협업하여 최종 완성본을 산출합니다.
            </p>
          </div>
        </div>
      </div>

      {/* Pipeline Cards Selector */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '12px',
        marginBottom: '20px'
      }}>
        {PIPELINES.map((p) => {
          const isSelected = selectedPipeline.id === p.id;
          return (
            <div
              key={p.id}
              onClick={() => !isRunning && setSelectedPipeline(p)}
              className="glass-panel"
              style={{
                padding: '16px',
                border: isSelected ? `2px solid ${p.color}` : '1px solid var(--border-glass)',
                background: isSelected ? 'rgba(255, 255, 255, 0.05)' : 'var(--bg-card)',
                cursor: isRunning ? 'not-allowed' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#FFF' }}>{p.title}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4, flex: 1 }}>{p.desc}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: p.color, fontWeight: 600 }}>
                {p.stages.join(' ➡️ ')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input & Execution Bar */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
          {selectedPipeline.title} 요청 주제 / 아이디어
        </label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isRunning}
            placeholder={selectedPipeline.placeholder}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-glass)',
              color: '#FFF',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          <button
            onClick={handleRunPipeline}
            disabled={!prompt.trim() || isRunning}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              background: !prompt.trim() || isRunning ? 'rgba(255, 255, 255, 0.1)' : selectedPipeline.color,
              border: 'none',
              color: '#0F172A',
              fontSize: '13px',
              fontWeight: 700,
              cursor: !prompt.trim() || isRunning ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Play size={14} /> {isRunning ? '파이프라인 가동 중...' : '자동화 실행'}
          </button>
        </div>
      </div>

      {/* Pipeline Progression Logs */}
      {(isRunning || Object.keys(stageTokens).length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Status Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F8FAFC' }}>
              ⚡ 파이프라인 연쇄 협업 진행 상황
            </h3>
            {completedArtifact && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--accent-emerald)',
                fontSize: '12px',
                fontWeight: 600
              }}>
                <Check size={14} /> 산출물 생성 완료: {completedArtifact}
              </div>
            )}
          </div>

          {/* Stages List */}
          {selectedPipeline.stages.map((stageName, idx) => {
            const stageNum = idx + 1;
            const isCurrent = currentStage === stageNum && isRunning;
            const isFinished = currentStage > stageNum || (!isRunning && stageTokens[stageNum]);
            const tokenContent = stageTokens[stageNum] || '';

            return (
              <div
                key={idx}
                className="glass-panel"
                style={{
                  padding: '18px 20px',
                  borderLeft: isCurrent 
                    ? `4px solid ${selectedPipeline.color}` 
                    : isFinished 
                      ? '4px solid var(--accent-emerald)' 
                      : '4px solid var(--border-glass)',
                  background: isCurrent ? 'rgba(255, 255, 255, 0.04)' : 'var(--bg-card)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: isFinished ? 'var(--accent-emerald)' : isCurrent ? selectedPipeline.color : 'rgba(255,255,255,0.1)',
                      color: '#0F172A',
                      fontWeight: 700,
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {stageNum}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: '#FFF' }}>
                      Stage {stageNum}: {stageName}
                    </span>
                  </div>

                  {isCurrent && (
                    <span style={{ fontSize: '11px', color: selectedPipeline.color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="pulse-dot" /> 작업 수행 중...
                    </span>
                  )}
                  {isFinished && (
                    <span style={{ fontSize: '11px', color: 'var(--accent-emerald)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={13} /> 완료
                    </span>
                  )}
                </div>

                {tokenContent && (
                  <div style={{
                    fontSize: '13px',
                    lineHeight: 1.6,
                    color: '#E2E8F0',
                    whiteSpace: 'pre-wrap',
                    marginTop: '8px',
                    padding: '12px 14px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '8px'
                  }}>
                    {tokenContent}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
