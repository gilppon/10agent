import React, { useState, useEffect } from 'react';
import { ArtifactFile } from '../types';
import { FolderGit2, FileText, Code2, Film, Download, RefreshCw, Eye, Copy, Check } from 'lucide-react';
import { api } from '../services/api';

export const WorkspaceView: React.FC = () => {
  const [artifacts, setArtifacts] = useState<ArtifactFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<ArtifactFile | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadArtifacts = async () => {
    setLoading(true);
    try {
      const list = await api.getArtifacts();
      setArtifacts(list);
      if (list.length > 0 && !selectedFile) {
        handleSelectFile(list[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArtifacts();
  }, []);

  const handleSelectFile = async (file: ArtifactFile) => {
    setSelectedFile(file);
    try {
      const data = await api.readArtifact(file.path);
      setFileContent(data.content || '');
    } catch (e) {
      setFileContent('파일을 불러올 수 없습니다.');
    }
  };

  const copyContent = () => {
    navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filtered = filterCategory === 'all' 
    ? artifacts 
    : artifacts.filter(a => a.category === filterCategory);

  const getIcon = (cat: string) => {
    if (cat === 'code') return <Code2 size={16} color="var(--accent-cyan)" />;
    if (cat === 'document') return <FileText size={16} color="var(--accent-amber)" />;
    if (cat === 'media') return <Film size={16} color="var(--accent-purple)" />;
    return <FileText size={16} color="var(--text-muted)" />;
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      height: '100%',
      overflow: 'hidden',
      background: 'var(--bg-main)'
    }}>
      {/* File List Pane */}
      <div style={{
        width: '320px',
        borderRight: '1px solid var(--border-glass)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'rgba(15, 23, 42, 0.5)'
      }}>
        <div style={{
          padding: '18px 20px',
          borderBottom: '1px solid var(--border-glass)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderGit2 size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#FFF' }}>산출물 저장소</h3>
          </div>
          <button
            onClick={loadArtifacts}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            title="새로고침"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Category Filters */}
        <div style={{ padding: '8px 12px', display: 'flex', gap: '4px' }}>
          {['all', 'document', 'code', 'media'].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              style={{
                flex: 1,
                padding: '5px 0',
                borderRadius: '6px',
                border: 'none',
                background: filterCategory === cat ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                color: filterCategory === cat ? '#FFF' : 'var(--text-muted)',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              {cat === 'all' ? '전체' : cat === 'document' ? '문서' : cat === 'code' ? '코드' : '미디어'}
            </button>
          ))}
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', fontSize: '12px', color: 'var(--text-muted)' }}>
              저장된 산출물이 없습니다.
            </div>
          ) : (
            filtered.map((file) => {
              const isSelected = selectedFile?.path === file.path;
              return (
                <div
                  key={file.path}
                  onClick={() => handleSelectFile(file)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: isSelected ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                    border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  {getIcon(file.category)}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#FFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {file.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {(file.size / 1024).toFixed(1)} KB · {file.modified_at.split(' ')[0]}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* File Preview Pane */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'rgba(11, 15, 23, 0.9)'
      }}>
        {selectedFile ? (
          <>
            {/* Header */}
            <div style={{
              height: '56px',
              padding: '0 24px',
              borderBottom: '1px solid var(--border-glass)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(15, 23, 42, 0.5)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {getIcon(selectedFile.category)}
                <span style={{ fontWeight: 700, fontSize: '14px', color: '#FFF' }}>{selectedFile.name}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({selectedFile.path})</span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={copyContent}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid var(--border-glass)',
                    color: '#FFF',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {copied ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />} 복사
                </button>

                <a
                  href={`/api/artifacts/${selectedFile.path}`}
                  download={selectedFile.name}
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
                    gap: '4px',
                    textDecoration: 'none'
                  }}
                >
                  <Download size={14} /> 다운로드
                </a>
              </div>
            </div>

            {/* Code / Text Viewer */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px 24px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '13px',
              lineHeight: 1.6,
              color: '#E2E8F0',
              whiteSpace: 'pre-wrap'
            }}>
              {fileContent}
            </div>
          </>
        ) : (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}>
            좌측에서 열람할 산출물 파일을 선택하세요.
          </div>
        )}
      </div>
    </div>
  );
};
