'use client';

import { useState, useRef } from 'react';
import { api } from '@/lib/api';
import { Upload, Mic, X, Info, Zap, QrCode } from 'lucide-react';

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 8px',
                borderRadius: '999px',
                background: 'rgba(255,111,0,.12)',
                border: '1px solid rgba(255,111,0,.4)',
                fontSize: '11px',
                fontWeight: 700,
                color: '#d96000',
                letterSpacing: '0.04em',
                lineHeight: 1,
              }}
            >
              Beta
            </span>
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
          {/* Beta 准确率提示 + 群面门控 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '14px 16px',
              borderRadius: '10px',
              background: 'rgba(255,181,0,.07)',
              border: '1px solid rgba(255,181,0,.35)',
            }}
          >
            <Info
              size={15}
              color="var(--color-warn)"
              style={{ flexShrink: 0, marginTop: '2px' }}
            />
            <div style={{ fontSize: '12.5px', color: 'var(--color-ink-2)', lineHeight: 1.7 }}>
              <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--color-ink)' }}>
                当前为 Beta 功能，转写能力持续优化中
              </div>
              <div>
                <strong>仅支持 1 对 1 面试</strong>（一位面试官 + 你）；群面暂不支持，后续接入多说话人分轨后开放。
              </div>
              <div style={{ marginTop: '4px', color: 'var(--color-ink-3)' }}>
                以下情况识别准确率会下降：方言口音、多人同时说话、环境嘈杂。
                建议在安静环境下、单人清晰普通话录制，效果最佳。
              </div>
            </div>
          </div>

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
            {/* Block F 占位: 手机扫码上传 — 主路径锚点，功能待 P1 专项实现 */}
            <button
              type="button"
              disabled
              title="该功能正在开发中，敬请期待"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7px',
                marginTop: '10px',
                padding: '9px 16px',
                width: '100%',
                borderRadius: '9px',
                border: '1.5px dashed var(--color-line-2)',
                background: 'transparent',
                color: 'var(--color-ink-4)',
                fontSize: '12.5px',
                cursor: 'not-allowed',
                opacity: 0.65,
              }}
            >
              <QrCode size={14} />
              <span>录音在手机里?扫码用手机传</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '1px 7px',
                  borderRadius: '999px',
                  background: 'rgba(47,143,255,.08)',
                  border: '1px solid rgba(47,143,255,.25)',
                  fontSize: '10.5px',
                  fontWeight: 600,
                  color: 'var(--color-brand)',
                  letterSpacing: '0.03em',
                  lineHeight: 1,
                  marginLeft: '2px',
                }}
              >
                即将上线
              </span>
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

          {/* 7 点数消耗提示 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: '9px',
              background: 'rgba(47,143,255,.05)',
              border: '1px solid var(--hair)',
            }}
          >
            <Zap size={13} color="var(--color-brand)" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: 'var(--color-ink-3)', lineHeight: 1.5 }}>
              本次录音转写复盘消耗 <strong style={{ color: 'var(--color-ink-2)' }}>7 点数</strong>
              （成功才扣，失败不扣）。
            </span>
          </div>

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
