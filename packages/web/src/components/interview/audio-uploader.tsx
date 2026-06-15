'use client';

import { useState, useRef } from 'react';
import { api } from '@/lib/api';
import { Upload, Mic, X } from 'lucide-react';

// Response shape from POST /interviews/:id/transcribe (202 Accepted)
export interface TranscribeStarted {
  taskId: string;
}

export interface AudioUploaderProps {
  interviewId: string;
  open: boolean;
  onClose: () => void;
  // Called with taskId when the server accepts the upload (202)
  onStarted: (taskId: string) => void;
}

const ACCEPT = 'audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/webm,audio/aac,.mp3,.wav,.ogg,.m4a,.webm,.aac';

// Human-readable size string
function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AudioUploader({ interviewId, open, onClose, onStarted }: AudioUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFile(null);
    setConsent(false);
    setError(null);
    setLoading(false);
    setDragOver(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function acceptFile(f: File) {
    // Basic client-side mime check — backend enforces the real limit
    if (!f.type.startsWith('audio/') && !f.name.match(/\.(mp3|wav|ogg|m4a|webm|aac)$/i)) {
      setError('请上传音频文件（MP3、WAV、OGG、M4A、AAC 等）');
      return;
    }
    setFile(f);
    setError(null);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) acceptFile(f);
    // Reset input value so the same file can be re-selected after removal
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) acceptFile(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError('请先选择音频文件');
      return;
    }
    if (!consent) {
      setError('请阅读并勾选同意《录音上传与隐私条款》后继续');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.upload<TranscribeStarted>(
        `/interviews/${interviewId}/transcribe`,
        file,
        { consent: 'true' },
      );
      reset();
      onStarted(result.taskId);
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  const canSubmit = !!file && consent && !loading;

  return (
    <div className="modal-overlay">
      {/* Backdrop */}
      <div className="modal-scrim" onClick={handleClose} />

      {/* Dialog */}
      <div
        className="lg"
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '500px',
          padding: '28px',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--serif)',
              fontSize: '19px',
              fontWeight: 600,
              color: 'var(--color-ink)',
              letterSpacing: '-0.02em',
            }}
          >
            上传面试录音
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-ink-3)',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Drop zone */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-ink-2)' }}>
              音频文件（MP3 / WAV / M4A / OGG 等，≤ 25 MB）
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '32px 20px',
                borderRadius: '12px',
                border: `2px dashed ${
                  dragOver
                    ? 'var(--color-brand)'
                    : file
                    ? 'var(--color-brand)'
                    : 'var(--color-line-2)'
                }`,
                background: dragOver
                  ? 'var(--color-brand-soft)'
                  : file
                  ? 'var(--color-brand-soft)'
                  : 'rgba(47,143,255,.04)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {file ? (
                <>
                  <Mic size={30} color="var(--color-brand)" />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-brand-ink)' }}>
                      {file.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-ink-3)', marginTop: '3px' }}>
                      {fileSize(file.size)} · 点击更换文件
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Upload size={30} color="var(--color-ink-4)" />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--color-ink-2)' }}>
                      点击选择或拖拽音频文件到此处
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-ink-4)', marginTop: '3px' }}>
                      支持 MP3 · WAV · M4A · OGG · AAC · WEBM
                    </div>
                  </div>
                </>
              )}
            </button>
          </div>

          {/* Privacy consent checkbox */}
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              cursor: 'pointer',
              padding: '14px 16px',
              borderRadius: '10px',
              background: 'rgba(47,143,255,.04)',
              border: `1px solid ${consent ? 'var(--color-brand)' : 'var(--color-line)'}`,
              transition: 'border-color 0.12s',
            }}
          >
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => { setConsent(e.target.checked); setError(null); }}
              style={{
                width: '16px',
                height: '16px',
                flexShrink: 0,
                marginTop: '1px',
                accentColor: 'var(--color-brand)',
                cursor: 'pointer',
              }}
            />
            <span style={{ fontSize: '12.5px', color: 'var(--color-ink-2)', lineHeight: 1.65 }}>
              我已阅读并同意《录音上传与隐私条款》：音频文件仅用于本次转写，
              转写完成后将立即销毁，不落盘、不对外共享、不生成可访问的公网链接。
            </span>
          </label>

          {/* Error */}
          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '9px',
                background: 'var(--color-danger-soft)',
                color: 'var(--color-danger)',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: '9px 18px',
                borderRadius: '9px',
                border: '1.5px solid var(--color-line)',
                background: 'transparent',
                color: 'var(--color-ink-2)',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                padding: '9px 22px',
                borderRadius: '9px',
                border: 'none',
                background: canSubmit
                  ? 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))'
                  : 'var(--color-line)',
                color: '#fff',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                opacity: canSubmit ? 1 : 0.6,
                boxShadow: canSubmit
                  ? '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)'
                  : 'none',
                transition: 'all 0.12s',
              }}
            >
              {loading ? '上传中…' : '开始转写'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
