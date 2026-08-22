import React, { useState, useRef } from 'react';
import { 
  Zap, 
  Play, 
  CheckCircle2, 
  Sparkles, 
  FileText, 
  Check, 
  Copy, 
  Download, 
  ArrowRight,
  Send,
  Video,
  Instagram,
  PenTool,
  DollarSign,
  Search,
  Code2,
  ExternalLink,
  Folder,
  Layers,
  MonitorPlay,
  RotateCw,
  Terminal,
  Wrench,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';

interface PipelineViewProps {
  sessionId: string;
}

const PIPELINES = [
  {
    id: 'full_cycle',
    title: '🚀 10대 에이전트 올인원 풀 라이프사이클 팩',
    desc: '정우 심층 시장조사 ➡️ CEO 기획 ➡️ 민희 디자인 ➡️ 코다리 풀코드 ➡️ 레오 유튜브 ➡️ 루나 BGM ➡️ 찬우 인스타 ➡️ 지은 카피 ➡️ 현빈 BM ➡️ 영숙 경영진 브리핑 10단계 일괄 완주',
    stages: [
      '정우 (시장/경쟁사 리서치)',
      'CEO (제품 사양서)',
      '민희 (8px HSL 디자인)',
      '코다리 (풀 소스코드)',
      '레오 (유튜브 팩)',
      '루나 (BGM 사운드)',
      '찬우 (인스타 릴스)',
      '지은 (세일즈 카피)',
      '현빈 (SaaS 가격/BM)',
      '영숙 (경영진 브리핑)'
    ],
    color: '#10B981',
    placeholder: '예: 2026년 1인 창업자를 위한 AI 마케팅 자동화 SaaS 신제품 개발 및 수익화 올인원'
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
    id: 'youtube_pack',
    title: '📺 유튜브 영상 올인원 제작 팩',
    desc: '클릭율 높은 제목 5종, 3초 후킹 스크립트, 썸네일 브리프, BGM 사운드 연출, SEO 상세설명 일괄 제작',
    stages: ['레오 (기획/후크)', '루나 (사운드/BGM)', '지은 (SEO/설명란)'],
    color: '#FF4444',
    placeholder: '예: 2026년 AI 툴 5가지로 월 300만원 자동화 수익 만드는 현실적 방법'
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
  },
  {
    id: 'tool_factory',
    title: '🛠️ 독립형 툴 자율 팩토리 (Autonomous Tool Factory)',
    desc: '리서치 ➡️ 모듈 아키텍처 설계 ➡️ 독립 Python 툴 풀코드 100% 자율 작성 ➡️ E:/진짜배기/ 에 독립 프로젝트 스캐폴딩 및 자가검증 완료',
    stages: [
      '정우 (라이브러리/데이터 리서치)',
      'CEO (툴 아키텍처/모듈 설계)',
      '코다리 (독립 툴 소스코드 완전 구현)',
      '지은 (마케팅 템플릿/프롬프트 주입)',
      '영숙 (원클릭 런처/README 패키징)'
    ],
    color: '#EC4899',
    placeholder: '예: 네이버 및 구글 트렌드를 실시간 검색하여 유튜브/인스타 마케팅 팩을 생성하고 CSV/MD로 저장하는 독립형 자동화 툴'
  }
];

export const PipelineView: React.FC<PipelineViewProps> = ({ sessionId }) => {
  const [selectedPipeline, setSelectedPipeline] = useState(PIPELINES[0]);
  const [prompt, setPrompt] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [currentStage, setCurrentStage] = useState<number>(0);
  const [stageTokens, setStageTokens] = useState<Record<number, string>>({});
  const [completedArtifact, setCompletedArtifact] = useState<string | null>(null);
  const [artifactContent, setArtifactContent] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [projectDir, setProjectDir] = useState<string | null>(null);
  const [appFiles, setAppFiles] = useState<string[]>([]);
  const [pipelineTypeCompleted, setPipelineTypeCompleted] = useState<string | null>(null);
  const [toolName, setToolName] = useState<string | null>(null);
  const [toolVerification, setToolVerification] = useState<any>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dirCopied, setDirCopied] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // Ref buffer to prevent React closure stale state issues
  const stageTokensRef = useRef<Record<number, string>>({});

  const handleRunPipeline = (overridePipeline?: typeof PIPELINES[0], overridePrompt?: string) => {
    const targetPipeline = overridePipeline || selectedPipeline;
    const targetPrompt = overridePrompt || prompt;

    if (!targetPrompt.trim() || isRunning) return;
    if (overridePipeline) setSelectedPipeline(overridePipeline);
    if (overridePrompt) setPrompt(overridePrompt);

    setIsRunning(true);
    setCurrentStage(1);
    setStageTokens({});
    stageTokensRef.current = {};
    setCompletedArtifact(null);
    setArtifactContent(null);
    setPreviewUrl(null);
    setProjectDir(null);
    setAppFiles([]);
    setPipelineTypeCompleted(null);
    setToolName(null);
    setToolVerification(null);
    setActionStatus(null);

    api.streamPipeline(
      { session_id: sessionId, pipeline_type: targetPipeline.id, prompt: targetPrompt.trim() },
      {
        onEvent: (data) => {
          if (data.type === 'pipeline_stage_start') {
            setCurrentStage(data.stage_num);
          } else if (data.type === 'token') {
            const sNum = data.stage_num || 1;
            stageTokensRef.current[sNum] = (stageTokensRef.current[sNum] || '') + data.content;
            setStageTokens({ ...stageTokensRef.current });
          } else if (data.type === 'pipeline_stage_done') {
            const sNum = data.stage_num || 1;
            if (data.content) {
              stageTokensRef.current[sNum] = data.content;
              setStageTokens({ ...stageTokensRef.current });
            }
          } else if (data.type === 'pipeline_complete') {
            setCompletedArtifact(data.artifact_name);
            setArtifactContent(data.artifact_content || Object.values(stageTokensRef.current).join('\n\n---\n\n'));
            setPipelineTypeCompleted(data.pipeline_type || targetPipeline.id);
            if (data.preview_url) setPreviewUrl(data.preview_url);
            if (data.project_dir) setProjectDir(data.project_dir);
            if (data.files) setAppFiles(data.files);
            if (data.tool_name) setToolName(data.tool_name);
            if (data.verification) setToolVerification(data.verification);
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

  const handleLaunchTool = async (mode: 'cli' | 'ui' = 'cli') => {
    if (!projectDir) return;
    try {
      setActionStatus(`🚀 도구 (${mode.toUpperCase()}) 기동 중...`);
      const res = await api.runStandaloneTool(projectDir, mode);
      setActionStatus(`✅ ${res.message}`);
      setTimeout(() => setActionStatus(null), 4000);
    } catch (e: any) {
      setActionStatus(`⚠️ 실행 실패: ${e.message}`);
      setTimeout(() => setActionStatus(null), 4000);
    }
  };

  const handleOpenFolder = async () => {
    if (!projectDir) return;
    try {
      await api.openToolFolder(projectDir);
      setActionStatus(`📂 Windows 탐색기에서 폴더를 열었습니다.`);
      setTimeout(() => setActionStatus(null), 3000);
    } catch (e: any) {
      setActionStatus(`⚠️ 폴더 열기 실패: ${e.message}`);
      setTimeout(() => setActionStatus(null), 3000);
    }
  };

  const handleReTestTool = async () => {
    if (!projectDir) return;
    try {
      setActionStatus(`🧪 자가 검증(test_tool.py) 실행 중...`);
      const res = await api.testStandaloneTool(projectDir);
      setToolVerification(res.result);
      setActionStatus(res.result.message || '검증 완료');
      setTimeout(() => setActionStatus(null), 4000);
    } catch (e: any) {
      setActionStatus(`⚠️ 자가 검증 실패: ${e.message}`);
      setTimeout(() => setActionStatus(null), 4000);
    }
  };

  const handleCopyArtifact = () => {
    if (artifactContent) {
      navigator.clipboard.writeText(artifactContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyDir = () => {
    if (projectDir) {
      navigator.clipboard.writeText(projectDir);
      setDirCopied(true);
      setTimeout(() => setDirCopied(false), 2000);
    }
  };

  const handleDownloadArtifact = () => {
    if (!artifactContent) return;
    const blob = new Blob([artifactContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = completedArtifact || `Pipeline_Output_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 1-Click Handoff Actions
  const handleHandoff = (pipelineId: string) => {
    const nextPipe = PIPELINES.find(p => p.id === pipelineId);
    if (nextPipe) {
      handleRunPipeline(nextPipe, prompt);
    }
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
              아이디어 한 줄만 입력하면 정우의 시장조사부터 개발, 마케팅, 가격 전략까지 10대 에이전트가 릴레이로 연쇄 완주합니다.
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
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#FFF' }}>{p.title}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4, flex: 1 }}>{p.desc}</div>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px', fontSize: '10px', color: p.color, fontWeight: 600 }}>
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
            onClick={() => handleRunPipeline()}
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
            <Play size={14} /> {isRunning ? '파이프라인 연쇄 가동 중...' : '자동화 실행'}
          </button>
        </div>
      </div>

      {/* Pipeline Progression Logs */}
      {(isRunning || Object.keys(stageTokens).length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Status Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F8FAFC' }}>
              ⚡ 파이프라인 연쇄 협업 진행 상황 ({selectedPipeline.stages.length}단계 릴레이)
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
                    padding: '14px 16px',
                    background: 'rgba(0, 0, 0, 0.35)',
                    borderRadius: '8px',
                    fontFamily: stageName.includes('코드') ? 'monospace' : 'inherit'
                  }}>
                    {tokenContent}
                  </div>
                )}
              </div>
            );
          })}

          {/* 🌐 실시간 인터랙티브 웹 샌드박스 (Live App Preview) */}
          {previewUrl && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%)',
              border: '1.5px solid var(--accent-cyan)',
              borderRadius: '16px',
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5)'
            }}>
              {/* Sandbox Top Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <MonitorPlay size={22} color="var(--accent-cyan)" />
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🌐 실시간 인터랙티브 웹 샌드박스 (Live App Sandbox)
                      <span style={{ fontSize: '10px', background: 'var(--accent-cyan)', color: '#0F172A', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>실행 중</span>
                    </h4>
                    <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                      화면 안에서 버튼을 직접 클릭하고 기능을 조작해 보세요!
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => setIframeKey(prev => prev + 1)}
                    title="프리뷰 새로고침"
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid var(--border-glass)',
                      color: '#FFF',
                      cursor: 'pointer'
                    }}
                  >
                    <RotateCw size={14} />
                  </button>

                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      background: 'var(--accent-cyan)',
                      border: 'none',
                      color: '#0F172A',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      textDecoration: 'none'
                    }}
                  >
                    <ExternalLink size={14} /> 새 창에서 전체화면 실행
                  </a>
                </div>
              </div>

              {/* Physical Scaffolding Info Badge */}
              {projectDir && (
                <div style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  color: '#CBD5E1'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Folder size={15} color="var(--accent-cyan)" />
                    <span>실제 물리 프로젝트 폴더: <strong style={{ color: '#F8FAFC' }}>{projectDir}</strong></span>
                    {appFiles.length > 0 && (
                      <span style={{ color: 'var(--text-muted)' }}>({appFiles.join(', ')})</span>
                    )}
                  </div>
                  <button
                    onClick={handleCopyDir}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      color: '#FFF',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    {dirCopied ? '경로 복사됨!' : '경로 복사'}
                  </button>
                </div>
              )}

              {/* Interactive Iframe Window */}
              <div style={{
                width: '100%',
                height: '480px',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: '#0F172A',
                boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.6)'
              }}>
                <iframe
                  key={iframeKey}
                  src={previewUrl}
                  title="Live Generated App Preview"
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    background: '#0F172A'
                  }}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                />
              </div>
            </div>
          )}

          {/* 🛠️ 독립형 툴 자율 팩토리 전용 컨트롤 패널 (Autonomous Tool Control Panel) */}
          {(pipelineTypeCompleted === 'tool_factory' || toolName) && projectDir && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
              border: '1.5px solid #EC4899',
              borderRadius: '16px',
              padding: '22px 26px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 12px 36px rgba(236, 72, 153, 0.15)'
            }}>
              {/* Tool Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: '#EC4899',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFF',
                    fontWeight: 800
                  }}>
                    <Wrench size={22} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🛠️ 로컬 AI 독립형 툴 프로젝트 생성 완료 ({toolName || 'marketing_auto_tool'})
                      <span style={{ fontSize: '11px', background: '#10B981', color: '#0F172A', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>
                        배포 및 즉시 실행 가능
                      </span>
                    </h4>
                    <span style={{ fontSize: '12px', color: '#CBD5E1' }}>
                      10대 에이전트가 완제품 Python 소스코드 및 실행 배치파일을 물리 디렉토리에 구축했습니다.
                    </span>
                  </div>
                </div>

                {/* Action Feedback Badge */}
                {actionStatus && (
                  <div style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    background: 'rgba(0, 0, 0, 0.7)',
                    border: '1px solid #EC4899',
                    color: '#F472B6',
                    fontSize: '12px',
                    fontWeight: 700
                  }}>
                    {actionStatus}
                  </div>
                )}
              </div>

              {/* Physical Path & Files Box */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.45)',
                padding: '12px 18px',
                borderRadius: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    <Folder size={16} color="#EC4899" />
                    <span style={{ color: '#94A3B8' }}>물리 저장 위치:</span>
                    <strong style={{ color: '#F8FAFC', fontFamily: 'monospace' }}>{projectDir}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handleCopyDir}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid var(--border-glass)',
                        color: '#FFF',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {dirCopied ? '복사 완료!' : '경로 복사'}
                    </button>
                    <button
                      onClick={handleOpenFolder}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '6px',
                        background: 'rgba(236, 72, 153, 0.25)',
                        border: '1px solid #EC4899',
                        color: '#F472B6',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Folder size={13} /> 📂 Windows 탐색기로 폴더 열기
                    </button>
                  </div>
                </div>

                {appFiles.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#94A3B8' }}>생성된 파일:</span>
                    {appFiles.map((f, i) => (
                      <span key={i} style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        borderRadius: '4px',
                        color: f.endsWith('.bat') ? '#34D399' : f.endsWith('.py') ? '#60A5FA' : '#CBD5E1',
                        fontFamily: 'monospace'
                      }}>
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Verification Gate Result Card */}
              {toolVerification && (
                <div style={{
                  background: toolVerification.is_valid ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  border: toolVerification.is_valid ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '10px',
                  padding: '12px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {toolVerification.is_valid ? (
                      <ShieldCheck size={20} color="#10B981" />
                    ) : (
                      <AlertCircle size={20} color="#EF4444" />
                    )}
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: toolVerification.is_valid ? '#34D399' : '#F87171' }}>
                        {toolVerification.message || '자가 검증 완료'} (신뢰도 점수: {toolVerification.score}/100)
                      </div>
                      {toolVerification.output && (
                        <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'monospace', marginTop: '2px', maxWidth: '600px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {toolVerification.output.trim()}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleReTestTool}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid var(--border-glass)',
                      color: '#FFF',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <RotateCw size={12} /> 검증 재실행
                  </button>
                </div>
              )}

              {/* 1-Click Launch Buttons */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleLaunchTool('cli')}
                  style={{
                    flex: 1,
                    minWidth: '200px',
                    padding: '12px 20px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
                    border: 'none',
                    color: '#FFF',
                    fontSize: '14px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(236, 72, 153, 0.4)'
                  }}
                >
                  <Terminal size={18} /> 🚀 툴 원클릭 실행 (CLI / main.py)
                </button>

                <button
                  onClick={() => handleLaunchTool('ui')}
                  style={{
                    flex: 1,
                    minWidth: '200px',
                    padding: '12px 20px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(236, 72, 153, 0.5)',
                    color: '#FFF',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <MonitorPlay size={18} color="#EC4899" /> 🌐 웹 UI 실행 (Streamlit / UI)
                </button>
              </div>
            </div>
          )}

          {/* 🏆 최종 완성 통합 산출물 뷰어 카드 */}
          {artifactContent && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(16, 185, 129, 0.12) 100%)',
              border: '1.5px solid rgba(6, 182, 212, 0.5)',
              borderRadius: '16px',
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              marginTop: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Sparkles size={20} color="var(--accent-cyan)" />
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                      🏆 최종 완성 애플리케이션 & 마케팅 올인원 패키지 ({completedArtifact})
                    </h4>
                    <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                      작업 영역(Workspace) 파일로 자동 보존되었습니다.
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleCopyArtifact}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid var(--border-glass)',
                      color: '#FFF',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {copied ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
                    {copied ? '복사됨!' : '전체 복사'}
                  </button>

                  <button
                    onClick={handleDownloadArtifact}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      background: 'var(--accent-cyan)',
                      border: 'none',
                      color: '#0F172A',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Download size={14} /> 소스 파일 다운로드
                  </button>
                </div>
              </div>

              {/* 🤝 1-Click 후속 바통 터치 (Next Handoff Actions) */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '14px 18px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.06)'
              }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#FACC15', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Send size={14} /> 🤝 완성된 산출물을 다음 전문 에이전트에게 1-Click 바통 터치 (Handoff):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <button
                    onClick={() => handleHandoff('youtube_pack')}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#F87171',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Video size={13} /> 📺 레오: 유튜브 3초 후킹 영상 팩 제작
                  </button>

                  <button
                    onClick={() => handleHandoff('copywriting_suite')}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      color: '#FBBF24',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Instagram size={13} /> 📷 찬우 & 지은: 인스타 릴스 & 세일즈 카피 제작
                  </button>

                  <button
                    onClick={() => handleHandoff('deep_research')}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(139, 92, 246, 0.15)',
                      border: '1px solid rgba(139, 92, 246, 0.4)',
                      color: '#C084FC',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Search size={13} /> 🔍 정우 & 영숙: 시장 교차 검증 & 경영진 브리핑
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
