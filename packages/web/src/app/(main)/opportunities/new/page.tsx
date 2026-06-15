'use client';

import { AlertCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ChangeEvent, type FormEvent, useState } from 'react';
import { api } from '@/lib/api';
import type { Opportunity } from '@/lib/types';

interface FormState {
  jd_text: string;
  source_url: string;
  company: string;
  role: string;
}

const EMPTY_FORM: FormState = {
  jd_text: '',
  source_url: '',
  company: '',
  role: '',
};

const JD_MIN = 20;
const JD_MAX = 10000;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '请求失败，请稍后再试';
}

export default function NewOpportunityPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const jdLen = form.jd_text.length;
  const canSubmit = jdLen >= JD_MIN && jdLen <= JD_MAX;

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const payload: Record<string, string> = {
        jd_text: form.jd_text.trim(),
      };
      if (form.source_url.trim()) payload.source_url = form.source_url.trim();
      if (form.company.trim()) payload.company = form.company.trim();
      if (form.role.trim()) payload.role = form.role.trim();

      const created = await api.post<Opportunity>('/opportunities', payload);
      router.push(`/opportunities/${created.id}`);
    } catch (error) {
      setFormError(getErrorMessage(error));
      setSubmitting(false);
    }
  }

  return (
    <main className="new-opp-shell">
      <style>{NEW_OPP_CSS}</style>

      <div className="page-header">
        <p className="eyebrow">Opportunity Intelligence</p>
        <h1>新建机会评估</h1>
        <p className="subtitle">
          粘贴职位描述，AI 将分析你的简历匹配度、投递价值和信息可信度。
        </p>
      </div>

      <form className="opp-form lg" onSubmit={(e) => void handleSubmit(e)}>
        <label className="field-label">
          职位描述（JD）*
          <textarea
            name="jd_text"
            value={form.jd_text}
            onChange={handleChange}
            placeholder="将完整的职位描述粘贴到这里，包括岗位要求、职责说明、公司介绍等信息..."
            minLength={JD_MIN}
            maxLength={JD_MAX}
            rows={12}
            required
            disabled={submitting}
          />
          <span className={`char-count ${jdLen > JD_MAX ? 'over' : ''}`}>
            {jdLen} / {JD_MAX}
            {jdLen < JD_MIN && jdLen > 0 && (
              <span className="hint">（至少 {JD_MIN} 个字符）</span>
            )}
          </span>
        </label>

        <div className="form-grid">
          <label className="field-label">
            公司名称
            <input
              name="company"
              value={form.company}
              onChange={handleChange}
              placeholder="字节跳动"
              maxLength={100}
              disabled={submitting}
            />
          </label>
          <label className="field-label">
            岗位名称
            <input
              name="role"
              value={form.role}
              onChange={handleChange}
              placeholder="产品经理"
              maxLength={100}
              disabled={submitting}
            />
          </label>
        </div>

        <label className="field-label">
          职位链接（可选）
          <input
            name="source_url"
            value={form.source_url}
            onChange={handleChange}
            placeholder="https://..."
            maxLength={2000}
            type="url"
            disabled={submitting}
          />
        </label>

        {formError && (
          <div className="form-error" role="alert">
            <AlertCircle size={14} />
            {formError}
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => router.back()}
            disabled={submitting}
          >
            取消
          </button>
          <button
            type="submit"
            className="primary-button"
            disabled={!canSubmit || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="spin" size={15} />
                提交中...
              </>
            ) : (
              '开始评估'
            )}
          </button>
        </div>
      </form>
    </main>
  );
}

const NEW_OPP_CSS = `
.new-opp-shell {
  min-height: 100%;
  padding: 28px 32px 40px;
  color: var(--color-ink);
}

.page-header {
  margin-bottom: 28px;
}

.eyebrow {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-brand);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.page-header h1 {
  margin: 0;
  font-family: var(--serif);
  font-size: 26px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.3px;
}

.subtitle {
  max-width: 640px;
  margin: 8px 0 0;
  color: var(--color-ink-3);
  font-size: 14px;
  line-height: 1.65;
}

.opp-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 760px;
  padding: 28px;
}

.field-label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-ink-2);
}

.opp-form input,
.opp-form textarea {
  width: 100%;
  border: 1px solid var(--color-line);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-ink);
  font: inherit;
  font-size: 14px;
  padding: 10px 12px;
  outline: none;
  line-height: 1.65;
  resize: vertical;
  box-sizing: border-box;
}

.opp-form input:focus,
.opp-form textarea:focus {
  border-color: var(--color-brand);
}

.opp-form input:disabled,
.opp-form textarea:disabled {
  opacity: 0.6;
}

.char-count {
  align-self: flex-end;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-ink-3);
}

.char-count.over {
  color: var(--color-danger);
}

.char-count .hint {
  margin-left: 4px;
  color: var(--color-warn);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.form-error {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-danger);
  font-size: 13px;
  padding: 10px 12px;
  background: var(--color-danger-soft);
  border-radius: 8px;
}

.form-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 4px;
}

.primary-button,
.secondary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border-radius: var(--radius-default);
  border: 1px solid transparent;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  min-height: 38px;
  font-family: inherit;
  transition: opacity 0.12s;
}

.primary-button {
  padding: 0 20px;
  background: linear-gradient(135deg, var(--color-brand), var(--color-brand-deep));
  color: #fff;
  box-shadow: 0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4);
}

.primary-button:hover {
  opacity: 0.92;
}

.secondary-button {
  padding: 0 14px;
  color: var(--color-ink-2);
  background: rgba(47,143,255,.05);
  border-color: var(--hair);
}

.secondary-button:hover {
  border-color: var(--color-brand);
}

.primary-button:disabled,
.secondary-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.spin {
  animation: new-opp-spin 0.8s linear infinite;
}

@keyframes new-opp-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 720px) {
  .new-opp-shell {
    padding: 20px 16px 32px;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .primary-button,
  .secondary-button {
    justify-content: center;
    min-height: 44px;
  }
}
`;
