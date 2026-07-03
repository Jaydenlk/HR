'use client';

import { useState } from 'react';
import type { Application } from '@/lib/types';
import { STAGE_META } from '@/lib/tracker-stages';

type ApplicationFormData = {
  company: string;
  role: string;
  location: string;
  stage: string;
  salary_range: string;
  deadline: string;
  referrer: string;
  notes: string;
};

interface ApplicationFormProps {
  onSubmit: (data: ApplicationFormData) => void;
  onCancel: () => void;
  initial?: Partial<Application>;
  defaultStage?: string;
  footer?: React.ReactNode;
}

export function ApplicationForm({ onSubmit, onCancel, initial, defaultStage, footer }: ApplicationFormProps) {
  const [form, setForm] = useState<ApplicationFormData>({
    company:      initial?.company      ?? '',
    role:         initial?.role         ?? '',
    location:     initial?.location     ?? '',
    stage:        initial?.stage        ?? defaultStage ?? 'wishlist',
    salary_range: initial?.salary_range ?? '',
    deadline:     initial?.deadline     ? initial.deadline.slice(0, 10) : '',
    referrer:     initial?.referrer     ?? '',
    notes:        initial?.notes        ?? '',
  });

  function handleChange(key: keyof ApplicationFormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company.trim() || !form.role.trim()) return;
    onSubmit(form);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: '9px',
    border: '1px solid var(--color-line)',
    background: 'var(--color-surface)',
    color: 'var(--color-ink)',
    fontSize: '13.5px',
    fontWeight: 500,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.12s',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--color-ink-2)',
    marginBottom: '5px',
    display: 'block',
    letterSpacing: '-0.003em',
  };

  return (
    /* Overlay */
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="modal-scrim" onClick={onCancel} />
      <div
        className="lg"
        style={{
          position: 'relative',
          zIndex: 1,
          padding: '28px 32px',
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Dialog header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--serif)',
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--color-ink)',
              letterSpacing: '-0.012em',
              margin: 0,
            }}
          >
            {initial?.id ? '编辑投递' : '新增公司'}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-ink-3)',
              fontSize: '20px',
              lineHeight: 1,
              padding: '2px 6px',
              borderRadius: '6px',
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Row: company + role */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>公司名称 *</label>
              <input
                style={inputStyle}
                placeholder="字节跳动"
                value={form.company}
                onChange={(e) => handleChange('company', e.target.value)}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>岗位 *</label>
              <input
                style={inputStyle}
                placeholder="产品经理"
                value={form.role}
                onChange={(e) => handleChange('role', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Row: stage + location */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>阶段</label>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={form.stage}
                onChange={(e) => handleChange('stage', e.target.value)}
              >
                {STAGE_META.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>城市</label>
              <input
                style={inputStyle}
                placeholder="北京"
                value={form.location}
                onChange={(e) => handleChange('location', e.target.value)}
              />
            </div>
          </div>

          {/* Row: salary + deadline */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>薪资范围</label>
              <input
                style={inputStyle}
                placeholder="25k–35k"
                value={form.salary_range}
                onChange={(e) => handleChange('salary_range', e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>截止日期</label>
              <input
                type="date"
                style={inputStyle}
                value={form.deadline}
                onChange={(e) => handleChange('deadline', e.target.value)}
              />
            </div>
          </div>

          {/* Referrer */}
          <div>
            <label style={labelStyle}>内推人</label>
            <input
              style={inputStyle}
              placeholder="留空表示无内推"
              value={form.referrer}
              onChange={(e) => handleChange('referrer', e.target.value)}
            />
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>备注</label>
            <textarea
              style={{
                ...inputStyle,
                resize: 'vertical',
                minHeight: '72px',
                fontFamily: 'inherit',
              }}
              placeholder="面试流程、联系人等"
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
            />
          </div>

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end',
              marginTop: '6px',
            }}
          >
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
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
              style={{
                padding: '10px 24px',
                borderRadius: 'var(--radius-default)',
                border: 'none',
                background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
                color: '#fff',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
                transition: 'opacity 0.12s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.92';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              {initial?.id ? '保存' : '添加'}
            </button>
          </div>
        </form>

        {footer}
      </div>
    </div>
  );
}
