'use client';

import { useState, useRef } from 'react';
import { api } from '@/lib/api';
import type { Resume } from '@/lib/types';
import { Upload, FileText, X } from 'lucide-react';

interface ResumeUploaderProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (resume: Resume) => void;
}

type Tab = 'text' | 'file';

export function ResumeUploader({ open, onClose, onSuccess }: ResumeUploaderProps) {
  const [tab, setTab] = useState<Tab>('text');
  const [title, setTitle] = useState('');
  const [rawText, setRawText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isPrimary, setIsPrimary] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setTab('text');
    setTitle('');
    setRawText('');
    setFile(null);
    setIsPrimary(false);
    setError(null);
    setLoading(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('请填写简历标题');
      return;
    }
    if (tab === 'text' && !rawText.trim()) {
      setError('请粘贴简历文本');
      return;
    }
    if (tab === 'file' && !file) {
      setError('请选择文件');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let resume: Resume;
      if (tab === 'text') {
        resume = await api.post<Resume>('/resumes', {
          title: title.trim(),
          raw_text: rawText.trim(),
          is_primary: isPrimary,
        });
      } else {
        resume = await api.upload<Resume>('/resumes', file!, {
          title: title.trim(),
          is_primary: isPrimary ? 'true' : 'false',
        });
      }
      onSuccess(resume);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.25)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Dialog */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '520px',
          background: 'var(--color-surface)',
          borderRadius: '20px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.14)',
          border: '1px solid var(--color-line)',
          padding: '28px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
            添加简历
          </div>
          <button
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

        {/* Tab switcher */}
        <div
          style={{
            display: 'flex',
            gap: '4px',
            background: 'var(--color-surface-2)',
            borderRadius: '10px',
            padding: '3px',
            marginBottom: '20px',
          }}
        >
          {(['text', 'file'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: '7px 0',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                background: tab === t ? 'var(--color-surface)' : 'transparent',
                color: tab === t ? 'var(--color-ink)' : 'var(--color-ink-3)',
                boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.12s',
              }}
            >
              {t === 'text' ? '粘贴文本' : '上传文件'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-ink-2)' }}>
              简历标题
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例：我的简历 2025"
              style={{
                height: '40px',
                padding: '0 12px',
                borderRadius: '10px',
                border: '1.5px solid var(--color-line)',
                background: 'var(--color-surface)',
                color: 'var(--color-ink)',
                fontSize: '14px',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-brand)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(10,132,255,0.12)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-line)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {tab === 'text' ? (
            /* Raw text paste */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-ink-2)' }}>
                简历内容
              </label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="粘贴你的简历文本…"
                rows={10}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1.5px solid var(--color-line)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-ink)',
                  fontSize: '13px',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'var(--font-sans)',
                  lineHeight: 1.6,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-brand)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(10,132,255,0.12)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-line)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          ) : (
            /* File upload */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-ink-2)' }}>
                文件 (PDF / Word)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '28px 20px',
                  borderRadius: '10px',
                  border: `2px dashed ${file ? 'var(--color-brand)' : 'var(--color-line-2)'}`,
                  background: file ? 'var(--color-brand-soft)' : 'var(--color-surface-2)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {file ? (
                  <>
                    <FileText size={28} color="var(--color-brand)" />
                    <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-brand-ink)' }}>
                      {file.name}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--color-ink-3)' }}>
                      点击更换文件
                    </span>
                  </>
                ) : (
                  <>
                    <Upload size={28} color="var(--color-ink-4)" />
                    <span style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--color-ink-2)' }}>
                      点击上传 PDF 或 Word 文件
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--color-ink-4)' }}>
                      支持 .pdf / .doc / .docx
                    </span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Is Primary toggle */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--color-brand)', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '13.5px', color: 'var(--color-ink-2)', fontWeight: 500 }}>
              设为主版本简历
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
              disabled={loading}
              style={{
                padding: '9px 22px',
                borderRadius: '9px',
                border: 'none',
                background: loading ? 'var(--color-ink-3)' : 'var(--color-brand)',
                color: '#fff',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.12s',
              }}
            >
              {loading ? '上传中…' : '确认上传'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
