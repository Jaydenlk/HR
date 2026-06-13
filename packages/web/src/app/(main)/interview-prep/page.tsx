'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import type {
  CompanyPlaybookRequest,
  CompanyPlaybookResult,
  StarStoriesRequest,
  StarStoriesResult,
  TechCoachRequest,
  TechCoachResult,
  CaseCoachRequest,
  CaseCoachResult,
  CaseInterviewType,
  InterviewPrepConfidence,
} from '@/lib/types';
import {
  Building2,
  BookOpen,
  Code2,
  Lightbulb,
  Loader2,
  AlertCircle,
  Plus,
  X,
  Search,
} from 'lucide-react';

// ── Shared style tokens ─────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 11px',
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-line)',
  borderRadius: '8px',
  fontFamily: 'inherit',
  fontSize: '13.5px',
  color: 'var(--color-ink)',
  fontWeight: 500,
  boxSizing: 'border-box',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 700,
  color: 'var(--color-ink-3)',
  letterSpacing: '0.03em',
  marginBottom: '5px',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-line)',
  borderRadius: '14px',
  padding: '18px 20px',
};

function sectionTitle(text: string) {
  return (
    <div
      style={{
        fontSize: '12px',
        fontWeight: 700,
        color: 'var(--color-ink-3)',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        marginBottom: '12px',
      }}
    >
      {text}
    </div>
  );
}

function confidenceLabel(c: string): string {
  const map: Record<string, string> = { high: '高', medium: '中', low: '低', insufficient: '信息不足' };
  return map[c] ?? c;
}

function confidenceColor(c: string): string {
  if (c === 'high') return 'var(--color-success)';
  if (c === 'medium') return 'var(--color-brand)';
  return 'var(--color-ink-3)';
}

const PRIMARY_BTN = (loading: boolean): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '7px',
  padding: '10px 24px',
  borderRadius: '10px',
  border: 'none',
  background: loading ? 'var(--color-surface-3)' : 'var(--color-brand)',
  color: loading ? 'var(--color-ink-3)' : '#fff',
  fontSize: '13.5px',
  fontWeight: 700,
  cursor: loading ? 'not-allowed' : 'pointer',
  fontFamily: 'inherit',
});

// ── Shared envelope renderers ───────────────────────────────────────────────────

interface Envelope {
  confidence: InterviewPrepConfidence;
  summary: string;
  recommendations: string[];
  risks: string[];
  next_actions: string[];
  follow_up_questions: string[];
  cannot_determine: string[];
}

function SummaryCard({ env }: { env: Envelope }) {
  return (
    <div style={{ ...cardStyle, borderLeft: `4px solid ${confidenceColor(env.confidence)}` }}>
      <span
        style={{
          fontSize: '11px',
          fontWeight: 700,
          color: confidenceColor(env.confidence),
          background: `color-mix(in srgb, ${confidenceColor(env.confidence)} 10%, transparent)`,
          padding: '2px 9px',
          borderRadius: '99px',
        }}
      >
        置信度：{confidenceLabel(env.confidence)}
      </span>
      <p style={{ fontSize: '14px', color: 'var(--color-ink)', lineHeight: 1.6, margin: '10px 0 0', fontWeight: 500 }}>
        {env.summary}
      </p>
    </div>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={cardStyle}>
      {sectionTitle(title)}
      <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: 'var(--color-ink-2)', lineHeight: 1.7 }}>
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

function CannotDetermineCard({ env }: { env: Envelope }) {
  const cannotDetermine = env.cannot_determine ?? [];
  const followUpQuestions = env.follow_up_questions ?? [];
  if (cannotDetermine.length === 0 && followUpQuestions.length === 0) return null;
  return (
    <div
      style={{
        background: 'rgba(245,158,11,0.07)',
        border: '1px solid rgba(245,158,11,0.25)',
        borderRadius: '12px',
        padding: '14px 16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
        <AlertCircle size={14} color="var(--color-warn)" />
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-warn)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          数据不足 · 无法确定的部分
        </span>
      </div>
      {cannotDetermine.map((c, i) => (
        <div key={i} style={{ fontSize: '12.5px', color: 'var(--color-ink-2)', lineHeight: 1.5 }}>
          · {c}
        </div>
      ))}
      {followUpQuestions.length > 0 && (
        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(245,158,11,0.15)' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--color-ink-3)', marginBottom: '6px' }}>追问建议</div>
          {followUpQuestions.map((q, i) => (
            <div key={i} style={{ fontSize: '12.5px', color: 'var(--color-ink-2)', lineHeight: 1.5 }}>
              · {q}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 信息不足专用面板（confidence === 'insufficient'）
function InsufficientPanel({ env }: { env: Envelope }) {
  const followUpQuestions = env.follow_up_questions ?? [];
  return (
    <div style={{ padding: '16px 18px', background: 'var(--color-surface-2)', borderRadius: '12px', border: '1px solid var(--color-line)' }}>
      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '8px' }}>
        信息不足，无法生成完整结果
      </div>
      <p style={{ fontSize: '13px', color: 'var(--color-ink-2)', margin: '0 0 10px' }}>{env.summary}</p>
      {followUpQuestions.length > 0 && (
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-ink-3)', marginBottom: '6px' }}>请补充以下信息后重试：</div>
          {followUpQuestions.map((q, i) => (
            <div key={i} style={{ fontSize: '13px', color: 'var(--color-ink-2)', lineHeight: 1.6 }}>
              · {q}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input style={inputStyle} type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

// 通用提交按钮 + 四态壳。children = 表单；resultNode = 结果。
function TabShell({
  loading,
  error,
  emptyHint,
  hasResult,
  children,
  resultNode,
}: {
  loading: boolean;
  error: string | null;
  emptyHint: string;
  hasResult: boolean;
  children: React.ReactNode;
  resultNode: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {children}

      {error && (
        <div
          style={{
            padding: '14px 16px',
            background: 'var(--color-danger-soft)',
            borderRadius: '10px',
            color: 'var(--color-danger)',
            fontSize: '13.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {!loading && !error && !hasResult && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '32px',
            textAlign: 'center',
            background: 'var(--color-surface)',
            borderRadius: '14px',
            border: '1.5px dashed var(--color-line-2)',
            gap: '8px',
            color: 'var(--color-ink-4)',
          }}
        >
          <Search size={26} />
          <p style={{ fontSize: '13.5px', fontWeight: 600, margin: 0, color: 'var(--color-ink-3)' }}>{emptyHint}</p>
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '40px', color: 'var(--color-ink-3)', fontSize: '14px' }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          AI 正在生成，通常需要 10-30 秒…
        </div>
      )}

      {resultNode}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Tab 1: 公司面试手册
// ════════════════════════════════════════════════════════════════════════════════

interface PlaybookState {
  companyName: string;
  jobTitle: string;
  intel: string;
  loading: boolean;
  error: string | null;
  result: CompanyPlaybookResult | null;
}

const PLAYBOOK_INIT: PlaybookState = {
  companyName: '',
  jobTitle: '',
  intel: '',
  loading: false,
  error: null,
  result: null,
};

function PlaybookTab({ state, patch }: { state: PlaybookState; patch: (p: Partial<PlaybookState>) => void }) {
  const { companyName, jobTitle, intel, loading, error, result } = state;
  const setCompanyName = (v: string) => patch({ companyName: v });
  const setJobTitle = (v: string) => patch({ jobTitle: v });
  const setIntel = (v: string) => patch({ intel: v });

  async function submit() {
    if (!companyName.trim()) {
      patch({ error: '请填写公司名称' });
      return;
    }
    patch({ error: null, loading: true, result: null });
    try {
      const payload: CompanyPlaybookRequest = { company_name: companyName.trim() };
      if (jobTitle.trim()) payload.job_title = jobTitle.trim();
      if (intel.trim()) payload.interview_intelligence = { notes: intel.trim() };
      const playbookResult = await api.post<CompanyPlaybookResult>('/interview-prep/playbook', payload);
      window.dispatchEvent(new Event('coach:credit-refresh'));
      patch({ result: playbookResult });
    } catch (err) {
      patch({ error: err instanceof Error ? err.message : '生成失败，请稍后重试' });
    } finally {
      patch({ loading: false });
    }
  }

  const result_node =
    result && result.confidence === 'insufficient' ? (
      <InsufficientPanel env={result} />
    ) : result ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <SummaryCard env={result} />
        {result.company_profile ? (
          <div style={cardStyle}>
            {sectionTitle('公司画像')}
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '4px' }}>
              {result.company_profile.company_name}
              <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--color-ink-3)' }}>
                {result.company_profile.stage}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '8px 0' }}>
              {(result.company_profile.culture_keywords ?? []).map((k, i) => (
                <span key={i} style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--color-brand)', background: 'var(--color-surface-2)', padding: '3px 9px', borderRadius: '99px' }}>
                  {k}
                </span>
              ))}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-ink-2)', lineHeight: 1.6, margin: '6px 0 0' }}>
              {result.company_profile.reputation_summary}
            </p>
          </div>
        ) : null}

        {(result.interview_process ?? []).length > 0 && (
          <div style={cardStyle}>
            {sectionTitle('面试流程')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(result.interview_process ?? []).map((p, i) => (
                <div key={i} style={{ paddingLeft: '12px', borderLeft: '2px solid var(--color-line-2)' }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--color-ink)' }}>{p.stage}</div>
                  <div style={{ fontSize: '12.5px', color: 'var(--color-ink-2)', margin: '2px 0' }}>{p.description}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-ink-3)' }}>考察重点：{p.key_assessment_angle}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(result.culture_fit_tips ?? []).length > 0 && (
          <div style={cardStyle}>
            {sectionTitle('文化契合攻略')}
            {(result.culture_fit_tips ?? []).map((t, i) => (
              <div key={i} style={{ marginBottom: i < (result.culture_fit_tips ?? []).length - 1 ? '10px' : 0 }}>
                <div style={{ fontSize: '13px', color: 'var(--color-ink)', fontWeight: 600 }}>· {t.tip}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-danger)', marginTop: '2px' }}>避免：{t.anti_pattern}</div>
              </div>
            ))}
          </div>
        )}

        {(result.common_pitfalls ?? []).length > 0 && (
          <div style={cardStyle}>
            {sectionTitle('常见踩坑预警')}
            {(result.common_pitfalls ?? []).map((p, i) => (
              <div key={i} style={{ marginBottom: i < (result.common_pitfalls ?? []).length - 1 ? '10px' : 0 }}>
                <div style={{ fontSize: '13px', color: 'var(--color-ink)', fontWeight: 600 }}>{p.pitfall}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-ink-3)', margin: '2px 0' }}>后果：{p.consequence}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-ink-2)' }}>规避：{p.avoidance_strategy}</div>
              </div>
            ))}
          </div>
        )}

        {result.salary_negotiation_notes ? (
          <div style={cardStyle}>
            {sectionTitle('薪资谈判注记')}
            <div style={{ fontSize: '13px', color: 'var(--color-ink)' }}>
              薪资范围：
              {result.salary_negotiation_notes.salary_range_estimate ? (
                <span style={{ fontWeight: 700 }}>{result.salary_negotiation_notes.salary_range_estimate}</span>
              ) : (
                <span style={{ color: 'var(--color-ink-4)' }}>无可靠来源，不提供估算（防编造）</span>
              )}
            </div>
            {result.salary_negotiation_notes.negotiation_timing && (
              <div style={{ fontSize: '12.5px', color: 'var(--color-ink-2)', marginTop: '4px' }}>
                谈判时机：{result.salary_negotiation_notes.negotiation_timing}
              </div>
            )}
          </div>
        ) : null}

        <ListCard title="建议" items={result.recommendations} />
        <ListCard title="风险提示" items={result.risks} />
        <ListCard title="下一步行动" items={result.next_actions} />
        <CannotDetermineCard env={result} />
      </div>
    ) : null;

  return (
    <TabShell
      loading={loading}
      error={error}
      emptyHint="填写公司名称后点击「生成手册」"
      hasResult={!!result}
      resultNode={result_node}
    >
      <div style={cardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Field label="公司名称 *" value={companyName} onChange={setCompanyName} placeholder="字节跳动" />
          <Field label="目标岗位" value={jobTitle} onChange={setJobTitle} placeholder="后端工程师" />
        </div>
        <div style={{ marginTop: '12px' }}>
          <label style={labelStyle}>真实面经（可选，提供后置信度更高）</label>
          <textarea
            style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }}
            value={intel}
            placeholder="粘贴你了解到的真实面试流程、面经细节…无面经时文化判断会自动降级标注"
            onChange={(e) => setIntel(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', flexDirection: 'column', gap: '4px', marginTop: '14px' }}>
          <button onClick={submit} disabled={loading} style={PRIMARY_BTN(loading)}>
            {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Building2 size={15} />}
            {loading ? '生成中…' : '生成手册'}
          </button>
          <span style={{ fontSize: '11px', color: 'var(--color-ink-4)', fontWeight: 500 }}>消耗 1 点</span>
        </div>
      </div>
    </TabShell>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Tab 2: STAR 行为故事
// ════════════════════════════════════════════════════════════════════════════════

function polishLabel(p: string): { text: string; color: string } {
  if (p === 'ready') return { text: '可直接使用', color: 'var(--color-success)' };
  if (p === 'needs_polish') return { text: '需打磨', color: 'var(--color-brand)' };
  return { text: '仅骨架', color: 'var(--color-ink-3)' };
}

interface StarState {
  experiences: string[];
  loading: boolean;
  error: string | null;
  result: StarStoriesResult | null;
}

const STAR_INIT: StarState = {
  experiences: [''],
  loading: false,
  error: null,
  result: null,
};

function StarTab({ state, patch }: { state: StarState; patch: (p: Partial<StarState>) => void }) {
  const { experiences, loading, error, result } = state;

  function setExp(i: number, v: string) {
    patch({ experiences: experiences.map((e, idx) => (idx === i ? v : e)) });
  }
  function addExp() {
    patch({ experiences: [...experiences, ''] });
  }
  function removeExp(i: number) {
    patch({ experiences: experiences.filter((_, idx) => idx !== i) });
  }

  async function submit() {
    const filled = experiences.map((e) => e.trim()).filter(Boolean);
    if (filled.length === 0) {
      patch({ error: '请至少填写 1 段工作经历' });
      return;
    }
    patch({ error: null, loading: true, result: null });
    try {
      const payload: StarStoriesRequest = { experiences: filled };
      const starResult = await api.post<StarStoriesResult>('/interview-prep/star-stories', payload);
      window.dispatchEvent(new Event('coach:credit-refresh'));
      patch({ result: starResult });
    } catch (err) {
      patch({ error: err instanceof Error ? err.message : '生成失败，请稍后重试' });
    } finally {
      patch({ loading: false });
    }
  }

  const result_node =
    result && result.confidence === 'insufficient' ? (
      <InsufficientPanel env={result} />
    ) : result ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <SummaryCard env={result} />
        {(result.story_bank ?? []).map((s, i) => {
          const pl = polishLabel(s.polish_level);
          return (
            <div key={i} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-ink)' }}>{s.title}</div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: pl.color, background: `color-mix(in srgb, ${pl.color} 10%, transparent)`, padding: '2px 9px', borderRadius: '99px' }}>
                  {pl.text}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {(s.competency ?? []).map((c, ci) => (
                  <span key={ci} style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-ink-2)', background: 'var(--color-surface-2)', padding: '2px 8px', borderRadius: '99px' }}>
                    {c}
                  </span>
                ))}
              </div>
              {[
                ['S 情境', s.situation],
                ['T 任务', s.task],
                ['A 行动', s.action],
                ['R 结果', s.result],
              ].map(([k, v]) => (
                <div key={k} style={{ marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-brand)' }}>{k}</span>
                  <span style={{ fontSize: '13px', color: 'var(--color-ink-2)', marginLeft: '6px', lineHeight: 1.5 }}>{v}</span>
                </div>
              ))}
            </div>
          );
        })}

        {result.coverage_map && (
          <div style={cardStyle}>
            {sectionTitle('能力维度覆盖度')}
            <div style={{ fontSize: '13px', color: 'var(--color-ink-2)', lineHeight: 1.7 }}>
              <div>强项（2+ 故事）：{(result.coverage_map.strong_dimensions ?? []).join('、') || '—'}</div>
              <div>偏弱（仅 1 个）：{(result.coverage_map.weak_dimensions ?? []).join('、') || '—'}</div>
              <div style={{ color: 'var(--color-danger)' }}>空白（无覆盖）：{(result.coverage_map.missing_dimensions ?? []).join('、') || '—'}</div>
            </div>
          </div>
        )}

        {(result.gaps ?? []).length > 0 && (
          <div style={cardStyle}>
            {sectionTitle('空白维度建议')}
            {(result.gaps ?? []).map((g, i) => (
              <div key={i} style={{ fontSize: '13px', color: 'var(--color-ink-2)', marginBottom: '4px' }}>
                · <span style={{ fontWeight: 700, color: 'var(--color-ink)' }}>{g.dimension}</span>
                {g.severity ? `（${SEVERITY_LABEL[g.severity] ?? g.severity}）` : ''}
                {g.experience_hint ? ` — ${g.experience_hint}` : ''}
              </div>
            ))}
          </div>
        )}
        <ListCard title="建议" items={result.recommendations} />
        <ListCard title="风险提示" items={result.risks} />
        <ListCard title="下一步行动" items={result.next_actions} />
        <CannotDetermineCard env={result} />
      </div>
    ) : null;

  return (
    <TabShell
      loading={loading}
      error={error}
      emptyHint="填写工作经历后点击「提炼故事」"
      hasResult={!!result}
      resultNode={result_node}
    >
      <div style={cardStyle}>
        <label style={labelStyle}>工作经历（每段一个，故事中的量化数字必须来自你填写的原文）</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {experiences.map((e, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <textarea
                style={{ ...inputStyle, minHeight: '64px', resize: 'vertical' }}
                value={e}
                placeholder={`经历 ${i + 1}：例「我牵头重构支付系统，故障率下降 30%，团队 5 人」`}
                onChange={(ev) => setExp(i, ev.target.value)}
              />
              {experiences.length > 1 && (
                <button
                  onClick={() => removeExp(i)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-ink-4)', padding: '6px', flexShrink: 0 }}
                  title="删除"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
          <button
            onClick={addExp}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '8px 14px', borderRadius: '8px', border: '1.5px dashed var(--color-line-2)', background: 'transparent', color: 'var(--color-ink-3)', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <Plus size={13} />
            添加一段经历
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <button onClick={submit} disabled={loading} style={PRIMARY_BTN(loading)}>
              {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <BookOpen size={15} />}
              {loading ? '提炼中…' : '提炼故事'}
            </button>
            <span style={{ fontSize: '11px', color: 'var(--color-ink-4)', fontWeight: 500 }}>消耗 1 点</span>
          </div>
        </div>
      </div>
    </TabShell>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Tab 3: 技术面辅导
// ════════════════════════════════════════════════════════════════════════════════

// ── 英文枚举 → 中文标签映射表 (#65) ─────────────────────────────────────────────

const PRIORITY_LABEL: Record<string, string> = {
  critical: '必备',
  high: '重要',
  medium: '一般',
  low: '次要',
};

const QUESTION_TYPE_LABEL: Record<string, string> = {
  algorithm: '算法',
  system_design: '系统设计',
  coding: '编程',
  cs_fundamentals: '计算机基础',
};

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: '严重缺失',
  moderate: '有所欠缺',
  minor: '轻微不足',
};

const WEIGHT_LABEL: Record<string, string> = {
  primary: '主要维度',
  secondary: '次要维度',
  minor: '参考维度',
};

function priorityColor(p: string): string {
  if (p === 'critical') return 'var(--color-danger)';
  if (p === 'high') return 'var(--color-brand)';
  return 'var(--color-ink-3)';
}

interface TechState {
  jobTitle: string;
  companyName: string;
  weeks: string;
  intel: string;
  loading: boolean;
  error: string | null;
  result: TechCoachResult | null;
}

const TECH_INIT: TechState = {
  jobTitle: '',
  companyName: '',
  weeks: '',
  intel: '',
  loading: false,
  error: null,
  result: null,
};

function TechTab({ state, patch }: { state: TechState; patch: (p: Partial<TechState>) => void }) {
  const { jobTitle, companyName, weeks, intel, loading, error, result } = state;
  const setJobTitle = (v: string) => patch({ jobTitle: v });
  const setCompanyName = (v: string) => patch({ companyName: v });
  const setWeeks = (v: string) => patch({ weeks: v });
  const setIntel = (v: string) => patch({ intel: v });

  async function submit() {
    if (!jobTitle.trim()) {
      patch({ error: '请填写目标技术岗位' });
      return;
    }
    // #99: 整数范围校验
    if (weeks.trim()) {
      const weeksNum = Number(weeks);
      if (!Number.isInteger(weeksNum) || weeksNum < 1 || weeksNum > 52) {
        patch({ error: '备考周数必须为 1–52 之间的整数' });
        return;
      }
    }
    patch({ error: null, loading: true, result: null });
    try {
      const payload: TechCoachRequest = { job_title: jobTitle.trim() };
      if (companyName.trim()) payload.company_name = companyName.trim();
      if (weeks.trim()) payload.available_weeks = Math.round(Number(weeks));
      if (intel.trim()) payload.interview_intelligence = { notes: intel.trim() };
      const techResult = await api.post<TechCoachResult>('/interview-prep/tech-coach', payload);
      window.dispatchEvent(new Event('coach:credit-refresh'));
      patch({ result: techResult });
    } catch (err) {
      patch({ error: err instanceof Error ? err.message : '生成失败，请稍后重试' });
    } finally {
      patch({ loading: false });
    }
  }

  const result_node =
    result && result.confidence === 'insufficient' ? (
      <InsufficientPanel env={result} />
    ) : result ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <SummaryCard env={result} />
        {(result.preparation_plan ?? []).length > 0 && (
          <div style={cardStyle}>
            {sectionTitle('备考计划（按优先级）')}
            {(result.preparation_plan ?? []).map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 700, color: priorityColor(p.priority), background: `${priorityColor(p.priority)}18`, padding: '2px 8px', borderRadius: '99px', flexShrink: 0 }}>
                  {PRIORITY_LABEL[p.priority] ?? p.priority}
                </span>
                <span style={{ fontSize: '13.5px', color: 'var(--color-ink)', fontWeight: 600 }}>{p.area}</span>
                <span style={{ fontSize: '12px', color: 'var(--color-ink-3)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>{p.estimated_hours}h</span>
              </div>
            ))}
          </div>
        )}

        {(result.practice_questions ?? []).length > 0 && (
          <div style={cardStyle}>
            {sectionTitle('练习题（类型题，非真题）')}
            {(result.practice_questions ?? []).map((q, i) => (
              <div key={i} style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--color-ink)', fontWeight: 600 }}>{q.title}</span>
                <span style={{ fontSize: '11px', color: 'var(--color-ink-3)', marginLeft: '8px' }}>
                  {QUESTION_TYPE_LABEL[q.type] ?? q.type} · {DIFFICULTY_LABEL[q.difficulty] ?? q.difficulty}
                </span>
                <div style={{ fontSize: '11.5px', color: 'var(--color-ink-3)', marginTop: '2px' }}>{(q.key_concepts ?? []).join(' / ')}</div>
              </div>
            ))}
          </div>
        )}

        <div style={cardStyle}>
          {sectionTitle('公司专项重点')}
          {(result.company_specific_focus ?? []).length > 0 ? (
            (result.company_specific_focus ?? []).map((f, i) => (
              <div key={i} style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>{f.focus_area}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-ink-2)' }}>{f.rationale}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-ink-4)' }}>来源：{f.evidence_source}</div>
              </div>
            ))
          ) : (
            <p style={{ fontSize: '12.5px', color: 'var(--color-ink-4)', margin: 0 }}>
              未提供真实面经，无法定制公司特定重点（防编造，留空）。
            </p>
          )}
        </div>
        <ListCard title="建议" items={result.recommendations} />
        <ListCard title="风险提示" items={result.risks} />
        <ListCard title="下一步行动" items={result.next_actions} />
        <CannotDetermineCard env={result} />
      </div>
    ) : null;

  return (
    <TabShell
      loading={loading}
      error={error}
      emptyHint="填写技术岗位后点击「生成计划」"
      hasResult={!!result}
      resultNode={result_node}
    >
      <div style={cardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Field label="目标技术岗位 *" value={jobTitle} onChange={setJobTitle} placeholder="后端工程师 / 算法工程师" />
          <Field label="目标公司" value={companyName} onChange={setCompanyName} placeholder="字节跳动" />
          <div>
            <label style={labelStyle}>可用备考周数</label>
            <input
              style={inputStyle}
              type="number"
              step={1}
              min={1}
              max={52}
              value={weeks}
              placeholder="8"
              onChange={(e) => setWeeks(e.target.value)}
            />
          </div>
        </div>
        <div style={{ marginTop: '12px' }}>
          <label style={labelStyle}>真实面经（可选，公司专项重点的唯一来源）</label>
          <textarea
            style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
            value={intel}
            placeholder="无面经时公司专项重点会留空（防编造）"
            onChange={(e) => setIntel(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', flexDirection: 'column', gap: '4px', marginTop: '14px' }}>
          <button onClick={submit} disabled={loading} style={PRIMARY_BTN(loading)}>
            {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Code2 size={15} />}
            {loading ? '生成中…' : '生成计划'}
          </button>
          <span style={{ fontSize: '11px', color: 'var(--color-ink-4)', fontWeight: 500 }}>消耗 1 点</span>
        </div>
      </div>
    </TabShell>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Tab 4: 案例面辅导
// ════════════════════════════════════════════════════════════════════════════════

const CASE_TYPES: { value: CaseInterviewType; label: string }[] = [
  { value: 'product_design', label: '产品设计题' },
  { value: 'market_estimation', label: '市场估算题' },
  { value: 'case_consulting', label: '咨询 Case 面' },
  { value: 'group_discussion', label: '无领导小组（群面）' },
  { value: 'business_analysis', label: '商业案例分析' },
];

interface CaseState {
  interviewType: CaseInterviewType;
  targetCompany: string;
  focusArea: string;
  loading: boolean;
  error: string | null;
  result: CaseCoachResult | null;
}

const CASE_INIT: CaseState = {
  interviewType: 'product_design',
  targetCompany: '',
  focusArea: '',
  loading: false,
  error: null,
  result: null,
};

function CaseTab({ state, patch }: { state: CaseState; patch: (p: Partial<CaseState>) => void }) {
  const { interviewType, targetCompany, focusArea, loading, error, result } = state;
  const setInterviewType = (v: CaseInterviewType) => patch({ interviewType: v });
  const setTargetCompany = (v: string) => patch({ targetCompany: v });
  const setFocusArea = (v: string) => patch({ focusArea: v });

  async function submit() {
    patch({ error: null, loading: true, result: null });
    try {
      const payload: CaseCoachRequest = { interview_type: interviewType };
      if (targetCompany.trim()) payload.target_company = targetCompany.trim();
      if (focusArea.trim()) payload.focus_area = focusArea.trim();
      const caseResult = await api.post<CaseCoachResult>('/interview-prep/case-coach', payload);
      window.dispatchEvent(new Event('coach:credit-refresh'));
      patch({ result: caseResult });
    } catch (err) {
      patch({ error: err instanceof Error ? err.message : '生成失败，请稍后重试' });
    } finally {
      patch({ loading: false });
    }
  }

  const result_node =
    result && result.confidence === 'insufficient' ? (
      <InsufficientPanel env={result} />
    ) : result ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <SummaryCard env={result} />
        {(result.framework_library ?? []).length > 0 && (
          <div style={cardStyle}>
            {sectionTitle('框架库')}
            {(result.framework_library ?? []).map((f, i) => (
              <div key={i} style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--color-ink)' }}>{f.name}</div>
                <div style={{ fontSize: '12.5px', color: 'var(--color-ink-2)', margin: '2px 0', lineHeight: 1.5 }}>{f.structure}</div>
                {f.common_mistake && <div style={{ fontSize: '12px', color: 'var(--color-danger)' }}>常见误用：{f.common_mistake}</div>}
              </div>
            ))}
          </div>
        )}

        {(result.practice_cases ?? []).length > 0 && (
          <div style={cardStyle}>
            {sectionTitle('练习案例')}
            {(result.practice_cases ?? []).map((c, i) => (
              <div key={i} style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--color-ink)' }}>{c.title}</div>
                <div style={{ fontSize: '12.5px', color: 'var(--color-ink-2)', margin: '3px 0' }}>{c.question}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-ink-3)' }}>
                  解题路径：{(c.suggested_approach ?? []).join(' → ')}
                </div>
              </div>
            ))}
          </div>
        )}

        {(result.common_mistakes ?? []).length > 0 && (
          <div style={cardStyle}>
            {sectionTitle('常见错误')}
            {(result.common_mistakes ?? []).map((m, i) => (
              <div key={i} style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', color: 'var(--color-danger)', fontWeight: 600 }}>✗ {m.mistake}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-ink-3)' }}>{m.why_bad}</div>
                <div style={{ fontSize: '12.5px', color: 'var(--color-ink-2)' }}>✓ {m.fix}</div>
              </div>
            ))}
          </div>
        )}

        {(result.evaluation_criteria ?? []).length > 0 && (
          <div style={cardStyle}>
            {sectionTitle('面试官评分维度')}
            {(result.evaluation_criteria ?? []).map((c, i) => (
              <div key={i} style={{ fontSize: '13px', color: 'var(--color-ink-2)', marginBottom: '4px' }}>
                · <span style={{ fontWeight: 700, color: 'var(--color-ink)' }}>{c.dimension}</span>
                {c.weight ? `（${WEIGHT_LABEL[c.weight] ?? c.weight}）` : ''}
              </div>
            ))}
          </div>
        )}
        <ListCard title="建议" items={result.recommendations} />
        <ListCard title="风险提示" items={result.risks} />
        <ListCard title="下一步行动" items={result.next_actions} />
        <CannotDetermineCard env={result} />
      </div>
    ) : null;

  return (
    <TabShell
      loading={loading}
      error={error}
      emptyHint="选择面试类型后点击「生成指导」"
      hasResult={!!result}
      resultNode={result_node}
    >
      <div style={cardStyle}>
        <div style={{ marginBottom: '12px' }}>
          <label style={labelStyle}>面试类型 *</label>
          <select style={inputStyle} value={interviewType} onChange={(e) => setInterviewType(e.target.value as CaseInterviewType)}>
            {CASE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Field label="目标公司/行业" value={targetCompany} onChange={setTargetCompany} placeholder="麦肯锡 / 互联网产品岗" />
          <Field label="重点方向" value={focusArea} onChange={setFocusArea} placeholder="B端产品设计 / 盈利型 Case" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', flexDirection: 'column', gap: '4px', marginTop: '14px' }}>
          <button onClick={submit} disabled={loading} style={PRIMARY_BTN(loading)}>
            {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Lightbulb size={15} />}
            {loading ? '生成中…' : '生成指导'}
          </button>
          <span style={{ fontSize: '11px', color: 'var(--color-ink-4)', fontWeight: 500 }}>消耗 1 点</span>
        </div>
      </div>
    </TabShell>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Main page with tabs
// ════════════════════════════════════════════════════════════════════════════════

type TabId = 'playbook' | 'star' | 'tech' | 'case';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'playbook', label: '公司手册', icon: <Building2 size={15} /> },
  { id: 'star', label: 'STAR 故事', icon: <BookOpen size={15} /> },
  { id: 'tech', label: '技术面', icon: <Code2 size={15} /> },
  { id: 'case', label: '案例面', icon: <Lightbulb size={15} /> },
];

// 父组件持有 4 个 tab 的完整状态（表单 + 结果 + loading/error），
// 切 tab 时子组件不卸载（display:none），已生成的 AI 结果与表单输入全程保留。
function usePatch<T>(initial: T): [T, (p: Partial<T>) => void] {
  const [state, setState] = useState<T>(initial);
  const patch = (p: Partial<T>) => setState((prev) => ({ ...prev, ...p }));
  return [state, patch];
}

export default function InterviewPrepPage() {
  const [tab, setTab] = useState<TabId>('playbook');
  const [playbookState, patchPlaybook] = usePatch<PlaybookState>(PLAYBOOK_INIT);
  const [starState, patchStar] = usePatch<StarState>(STAR_INIT);
  const [techState, patchTech] = usePatch<TechState>(TECH_INIT);
  const [caseState, patchCase] = usePatch<CaseState>(CASE_INIT);

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100%',
          padding: '40px 32px 40px',
          gap: '20px',
          boxSizing: 'border-box',
          maxWidth: '900px',
          margin: '0 auto',
        }}
      >
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.4px', marginBottom: '4px' }}>
            面试备战
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--color-ink-3)', margin: 0 }}>
            公司手册 · STAR 故事 · 技术面 · 案例面 — 全程防编造，数据不足时如实标注
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--color-line)', flexWrap: 'wrap' }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                background: 'none',
                border: 'none',
                borderBottom: tab === t.id ? '2px solid var(--color-brand)' : '2px solid transparent',
                color: tab === t.id ? 'var(--color-brand)' : 'var(--color-ink-3)',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                marginBottom: '-1px',
              }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* 4 个 tab 全程挂载，仅用 display 切换可见性，切回时结果与表单仍在 */}
        <div style={{ display: tab === 'playbook' ? 'block' : 'none' }}>
          <PlaybookTab state={playbookState} patch={patchPlaybook} />
        </div>
        <div style={{ display: tab === 'star' ? 'block' : 'none' }}>
          <StarTab state={starState} patch={patchStar} />
        </div>
        <div style={{ display: tab === 'tech' ? 'block' : 'none' }}>
          <TechTab state={techState} patch={patchTech} />
        </div>
        <div style={{ display: tab === 'case' ? 'block' : 'none' }}>
          <CaseTab state={caseState} patch={patchCase} />
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
