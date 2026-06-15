'use client';

import { useState, useEffect } from 'react';
import { X, FileText, Mic } from 'lucide-react';
import { api } from '@/lib/api';
import type { Application } from '@/lib/types';

interface InterviewFormData {
  company: string;
  role: string;
  round: string;
  interview_at: string;
  duration_min: string;
  interviewer: string;
  transcript: string;
  application_id: string;
}

interface InterviewFormProps {
  onSubmit: (data: InterviewFormData) => void;
  onClose: () => void;
  loading?: boolean;
}

const ROUND_OPTIONS = [
  { value: '一面·技术', label: '一面 · 技术' },
  { value: '二面', label: '二面' },
  { value: 'HR面', label: 'HR 面' },
  { value: '终面', label: '终面' },
  { value: '笔试', label: '笔试' },
];

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: 'var(--color-surface)',
  border: '1px solid var(--color-line-2)',
  borderRadius: 'var(--radius-default)',
  fontSize: '13.5px',
  color: 'var(--color-ink)',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--color-ink-3)',
  marginBottom: '6px',
  letterSpacing: '0.02em',
};

export function InterviewForm({ onSubmit, onClose, loading = false }: InterviewFormProps) {
  const [form, setForm] = useState<InterviewFormData>({
    company: '',
    role: '',
    round: '一面·技术',
    interview_at: '',
    duration_min: '',
    interviewer: '',
    transcript: '',
    application_id: '',
  });
  const [applications, setApplications] = useState<Application[]>([]);
  // 录入方式 tab:text=粘贴文字记录(当场分析);audio=录音转写(需先建面试再到复盘页上传)。
  const [inputTab, setInputTab] = useState<'text' | 'audio'>('text');

  useEffect(() => {
    api
      .get<Application[]>('/applications')
      .then((data) => setApplications(data))
      .catch(() => {});
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    /* Overlay: 作业区内居中,不压侧栏 */
    <div className="modal-overlay">
      {/* Scrim: 点击空白处关闭 */}
      <div className="modal-scrim" onClick={onClose} />
      {/* Dialog */}
      <div
        className="lg"
        style={{
          position: 'relative',
          zIndex: 1,
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '22px 24px 16px',
            borderBottom: '1px solid var(--hair)',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--serif)',
                fontSize: '17px',
                fontWeight: 700,
                color: 'var(--color-ink)',
                letterSpacing: '-0.01em',
              }}
            >
              录入新面试
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--color-ink-3)', marginTop: '2px' }}>
              填写基本信息，AI 将自动生成复盘分析
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-ink-3)',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Link to existing application */}
          {applications.length > 0 && (
            <div>
              <label style={labelStyle}>关联投递（选填）</label>
              <select
                name="application_id"
                value={form.application_id}
                onChange={handleChange}
                style={fieldStyle}
              >
                <option value="">不关联投递</option>
                {applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.company} · {app.role}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Row: company + role */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>公司</label>
              <input
                name="company"
                value={form.company}
                onChange={handleChange}
                placeholder="如：字节跳动"
                required
                style={fieldStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>岗位</label>
              <input
                name="role"
                value={form.role}
                onChange={handleChange}
                placeholder="如：前端工程师"
                required
                style={fieldStyle}
              />
            </div>
          </div>

          {/* Round */}
          <div>
            <label style={labelStyle}>面试轮次</label>
            <select
              name="round"
              value={form.round}
              onChange={handleChange}
              required
              style={fieldStyle}
            >
              {ROUND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Row: date + duration */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>面试时间</label>
              <input
                type="datetime-local"
                name="interview_at"
                value={form.interview_at}
                onChange={handleChange}
                style={fieldStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>时长（分钟）</label>
              <input
                type="number"
                name="duration_min"
                value={form.duration_min}
                onChange={handleChange}
                placeholder="如：60"
                min="1"
                style={fieldStyle}
              />
            </div>
          </div>

          {/* Interviewer */}
          <div>
            <label style={labelStyle}>面试官（选填）</label>
            <input
              name="interviewer"
              value={form.interviewer}
              onChange={handleChange}
              placeholder="如：技术主管 / 招聘负责人"
              style={fieldStyle}
            />
          </div>

          {/* Transcript with text / audio tabs */}
          <div>
            <label style={labelStyle}>面试记录（选填）</label>
            {/* Tab strip */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
              <button
                type="button"
                onClick={() => setInputTab('text')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-default)',
                  border: `1.5px solid ${inputTab === 'text' ? 'var(--color-brand)' : 'var(--color-line-2)'}`,
                  background: inputTab === 'text' ? 'var(--color-brand-soft)' : 'transparent',
                  color: inputTab === 'text' ? 'var(--color-brand-ink)' : 'var(--color-ink-2)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                }}
              >
                <FileText size={13} />
                粘贴文字
              </button>
              <button
                type="button"
                onClick={() => setInputTab('audio')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-default)',
                  border: `1.5px solid ${inputTab === 'audio' ? 'var(--color-brand)' : 'var(--color-line-2)'}`,
                  background: inputTab === 'audio' ? 'var(--color-brand-soft)' : 'transparent',
                  color: inputTab === 'audio' ? 'var(--color-brand-ink)' : 'var(--color-ink-2)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                }}
              >
                <Mic size={13} />
                上传录音
              </button>
            </div>

            {inputTab === 'text' ? (
              <textarea
                name="transcript"
                value={form.transcript}
                onChange={handleChange}
                placeholder="粘贴面试录音转写，或手动记录关键问题和回答…"
                rows={6}
                style={{
                  ...fieldStyle,
                  resize: 'vertical',
                  lineHeight: 1.6,
                }}
              />
            ) : (
              // 录音转写需面试 id(转写端点为 /interviews/:id/transcribe),故引导先建再到复盘页上传。
              <div
                style={{
                  padding: '18px 16px',
                  borderRadius: 'var(--radius-default)',
                  border: '1px dashed var(--color-line-2)',
                  background: 'rgba(47,143,255,.04)',
                  fontSize: '12.5px',
                  color: 'var(--color-ink-3)',
                  lineHeight: 1.7,
                }}
              >
                先保存这条面试记录，进入复盘详情页后点击「上传录音转写」上传音频，
                系统会自动转写并标注「面试官 / 用户」，确认后生成复盘分析。
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '4px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                background: 'transparent',
                border: '1px solid var(--hair-2)',
                borderRadius: 'var(--radius-default)',
                fontSize: '13.5px',
                fontWeight: 600,
                color: 'var(--color-ink-2)',
                cursor: 'pointer',
              }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 22px',
                background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
                border: 'none',
                borderRadius: 'var(--radius-default)',
                fontSize: '13.5px',
                fontWeight: 600,
                color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                letterSpacing: '-0.005em',
                boxShadow: '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
              }}
            >
              {loading ? '提交中…' : '保存并分析'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
