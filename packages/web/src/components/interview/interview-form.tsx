'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface InterviewFormData {
  company: string;
  role: string;
  round: string;
  interview_at: string;
  duration_min: string;
  interviewer: string;
  transcript: string;
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
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-line)',
  borderRadius: '10px',
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
  });

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
    /* Backdrop */
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Dialog */}
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: '20px',
          border: '1px solid var(--color-line)',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '22px 24px 16px',
            borderBottom: '1px solid var(--color-line)',
          }}
        >
          <div>
            <div
              style={{
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

          {/* Transcript */}
          <div>
            <label style={labelStyle}>面试记录 / 转写文字（选填）</label>
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
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '4px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                background: 'transparent',
                border: '1px solid var(--color-line)',
                borderRadius: '10px',
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
                background: 'var(--color-ink)',
                border: 'none',
                borderRadius: '10px',
                fontSize: '13.5px',
                fontWeight: 600,
                color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                letterSpacing: '-0.005em',
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
