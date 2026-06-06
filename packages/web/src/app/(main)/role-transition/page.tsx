'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import type {
  RoleTransitionResult,
  RoleTransitionFeasibility,
  GapSeverity,
  SuccessFactorStatus,
} from '@/lib/types';
import { ArrowRight, Loader2, AlertCircle, GitMerge, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Sub-components ───────────────────────────────────────────────────────

function FeasibilityBadge({ level }: { level: RoleTransitionFeasibility }) {
  const map: Record<RoleTransitionFeasibility, { label: string; color: string; bg: string }> = {
    high: { label: '高可行', color: 'var(--color-success)', bg: '#edfaf0' },
    medium: { label: '中等可行', color: '#a86200', bg: 'var(--color-warn-soft)' },
    low: { label: '较难可行', color: 'var(--color-danger)', bg: 'var(--color-danger-soft)' },
    not_feasible: { label: '当前不可行', color: '#fff', bg: 'var(--color-danger)' },
  };
  const { label, color, bg } = map[level];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 14px',
        borderRadius: '999px',
        background: bg,
        color,
        fontWeight: 700,
        fontSize: '13px',
        letterSpacing: '-0.01em',
      }}
    >
      {label}
    </span>
  );
}

function SeverityDot({ severity }: { severity: GapSeverity }) {
  const map: Record<GapSeverity, { color: string; label: string }> = {
    critical: { color: 'var(--color-danger)', label: '关键' },
    important: { color: '#a86200', label: '重要' },
    nice_to_have: { color: 'var(--color-ink-3)', label: '加分' },
  };
  const { color, label } = map[severity];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '11px',
        fontWeight: 600,
        color,
      }}
    >
      <span
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}

function StatusIcon({ status }: { status: SuccessFactorStatus }) {
  const map: Record<SuccessFactorStatus, { icon: string; color: string }> = {
    has: { icon: '✓', color: 'var(--color-success)' },
    partial: { icon: '◑', color: '#a86200' },
    missing: { icon: '✗', color: 'var(--color-danger)' },
  };
  const { icon, color } = map[status];
  return (
    <span style={{ color, fontWeight: 700, fontSize: '14px', flexShrink: 0, width: '18px' }}>
      {icon}
    </span>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────

export default function RoleTransitionPage() {
  const [profile, setProfile] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [targetCompanyType, setTargetCompanyType] = useState('');
  const [timelineMonths, setTimelineMonths] = useState('');

  const [result, setResult] = useState<RoleTransitionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile.trim() || !targetRole.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const body: Record<string, unknown> = {
        profile: profile.trim(),
        target_role: targetRole.trim(),
      };
      if (targetCompanyType) body.target_company_type = targetCompanyType;
      if (timelineMonths) body.timeline_months = parseInt(timelineMonths, 10);

      const data = await api.post<RoleTransitionResult>('/role-transition/analyze', body);
      setResult(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '分析失败，请稍后重试';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-line)',
    borderRadius: '16px',
    padding: '20px 22px',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--color-ink-2)',
    marginBottom: '6px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid var(--color-line)',
    background: 'var(--color-surface)',
    color: 'var(--color-ink)',
    fontSize: '14px',
    boxSizing: 'border-box',
    outline: 'none',
    fontFamily: 'inherit',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        padding: '40px 32px 40px',
        gap: '20px',
        boxSizing: 'border-box',
        maxWidth: '780px',
      }}
    >
      {/* Header */}
      <div>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--color-ink)',
            letterSpacing: '-0.4px',
            marginBottom: '4px',
          }}
        >
          转岗顾问
        </h1>
        <p style={{ fontSize: '13.5px', color: 'var(--color-ink-3)' }}>
          输入背景与目标职位，AI 分析转型可行性与技能差距
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={labelStyle}>你的背景（工作经历、技能、教育经历等）</label>
          <textarea
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
            placeholder="例：3年互联网运营经验，负责用户增长和数据分析，熟悉 SQL 基础，本科汉语言文学…"
            rows={5}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }}
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={labelStyle}>目标职位</label>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="例：产品经理、研发经理"
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label style={labelStyle}>目标公司类型（可选）</label>
            <select
              value={targetCompanyType}
              onChange={(e) => setTargetCompanyType(e.target.value)}
              style={inputStyle}
            >
              <option value="">不限</option>
              <option value="internet">互联网公司</option>
              <option value="state_owned">国有企业 / 体制内</option>
              <option value="foreign">外资企业</option>
              <option value="startup">创业公司</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px', alignItems: 'end' }}>
          <div>
            <label style={labelStyle}>期望转型时长（月，可选）</label>
            <input
              type="number"
              value={timelineMonths}
              onChange={(e) => setTimelineMonths(e.target.value)}
              placeholder="例：12"
              min={1}
              max={60}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={loading || !profile.trim() || !targetRole.trim()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '11px 24px',
                borderRadius: '10px',
                border: 'none',
                background: loading || !profile.trim() || !targetRole.trim()
                  ? 'var(--color-surface-3)'
                  : 'var(--color-brand)',
                color: loading || !profile.trim() || !targetRole.trim()
                  ? 'var(--color-ink-3)'
                  : '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading || !profile.trim() || !targetRole.trim() ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <GitMerge size={16} />}
              {loading ? '分析中…' : '开始分析'}
            </button>
          </div>
        </div>
      </form>

      {/* Loading state */}
      {loading && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
            padding: '48px 32px',
            background: 'var(--color-surface)',
            borderRadius: '16px',
            border: '1px solid var(--color-line)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'var(--color-brand-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Loader2 size={26} color="var(--color-brand)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
          <div>
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink-2)', marginBottom: '4px' }}>
              AI 正在分析转岗可行性…
            </p>
            <p style={{ fontSize: '13px', color: 'var(--color-ink-4)' }}>
              结合背景与目标职位进行差距评估，通常需要 8-15 秒
            </p>
          </div>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div
          style={{
            display: 'flex',
            gap: '12px',
            padding: '16px 20px',
            background: 'var(--color-danger-soft)',
            borderRadius: '12px',
            color: 'var(--color-danger)',
            fontSize: '14px',
            alignItems: 'flex-start',
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <p style={{ fontWeight: 600, margin: '0 0 4px' }}>分析失败</p>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-danger)', opacity: 0.85 }}>{error}</p>
          </div>
        </div>
      )}

      {/* Insufficient data state */}
      {!loading && result?.confidence === 'insufficient' && (
        <div
          style={{
            ...cardStyle,
            borderColor: '#a86200',
            background: 'var(--color-warn-soft)',
          }}
        >
          <p style={{ fontWeight: 700, color: '#a86200', marginBottom: '8px', fontSize: '15px' }}>
            背景信息不足，无法完成分析
          </p>
          {result.cannot_determine.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: '18px', color: '#a86200', fontSize: '13.5px', lineHeight: 1.7 }}>
              {result.cannot_determine.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          )}
          {result.follow_up_questions.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#a86200', marginBottom: '6px' }}>
                请补充以下信息后重新提交：
              </p>
              <ul style={{ margin: 0, paddingLeft: '18px', color: '#a86200', fontSize: '13px', lineHeight: 1.7 }}>
                {result.follow_up_questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {!loading && result && result.confidence !== 'insufficient' && (
        <>
          {/* Hero: feasibility */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-brand)',
              borderRadius: '18px',
              padding: '22px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <FeasibilityBadge level={result.feasibility} />
              <span style={{ fontSize: '13px', color: 'var(--color-ink-3)', fontWeight: 500 }}>
                置信度：{result.confidence === 'high' ? '高' : result.confidence === 'medium' ? '中' : '低'}
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: '14.5px',
                color: 'var(--color-ink)',
                lineHeight: 1.6,
                fontWeight: 500,
              }}
            >
              {result.summary}
            </p>
            {result.feasibility_rationale && (
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-ink-3)', lineHeight: 1.55 }}>
                {result.feasibility_rationale}
              </p>
            )}
          </div>

          {/* First step */}
          {result.first_step && (
            <div
              style={{
                ...cardStyle,
                background: '#eaf2ff',
                borderColor: 'rgba(10,132,255,0.2)',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
              }}
            >
              <ArrowRight size={18} color="var(--color-brand)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '13px', color: 'var(--color-brand)' }}>
                  立即行动（30天内）
                </p>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-ink)', lineHeight: 1.55 }}>
                  {result.first_step}
                </p>
              </div>
            </div>
          )}

          {/* Skill gap */}
          {result.skill_gap.length > 0 && (
            <div style={cardStyle}>
              <h3
                style={{
                  margin: '0 0 14px',
                  fontSize: '16px',
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  color: 'var(--color-ink)',
                }}
              >
                技能差距分析
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {result.skill_gap.map((gap, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '12px 14px',
                      background: 'var(--color-surface-2)',
                      borderRadius: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-ink)' }}>
                        {gap.skill_name}
                      </span>
                      <SeverityDot severity={gap.gap_severity} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '12.5px', color: 'var(--color-ink-3)', flexWrap: 'wrap' }}>
                      <span>现有：{gap.current_level}</span>
                      <span style={{ color: 'var(--color-line)' }}>→</span>
                      <span>要求：{gap.required_level}</span>
                      {gap.estimated_months > 0 && (
                        <span style={{ marginLeft: 'auto', fontWeight: 600 }}>预计 {gap.estimated_months} 个月</span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-ink-2)', lineHeight: 1.5 }}>
                      {gap.remedy}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Typical transition paths */}
          {result.typical_transition_path.length > 0 && (
            <div style={cardStyle}>
              <h3
                style={{
                  margin: '0 0 14px',
                  fontSize: '16px',
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  color: 'var(--color-ink)',
                }}
              >
                典型转型路径
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {result.typical_transition_path.map((path, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '14px 16px',
                      border: '1px solid var(--color-line)',
                      borderRadius: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-ink)' }}>
                        {path.path_name}
                      </span>
                      <span
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 600,
                          color: 'var(--color-ink-3)',
                          background: 'var(--color-surface-2)',
                          padding: '2px 10px',
                          borderRadius: '6px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {path.duration}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-ink-2)', lineHeight: 1.55 }}>
                      {path.description}
                    </p>
                    {path.success_rate_note && (
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-ink-3)', fontStyle: 'italic' }}>
                        {path.success_rate_note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success factors */}
          {result.success_factors.length > 0 && (
            <div style={cardStyle}>
              <h3
                style={{
                  margin: '0 0 14px',
                  fontSize: '16px',
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  color: 'var(--color-ink)',
                }}
              >
                成功关键因素
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {result.success_factors.map((f, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'flex-start',
                      padding: '10px 12px',
                      background: 'var(--color-surface-2)',
                      borderRadius: '8px',
                    }}
                  >
                    <StatusIcon status={f.user_status} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-ink)' }}>
                        {f.factor}
                      </span>
                      {f.evidence && (
                        <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--color-ink-3)', lineHeight: 1.5 }}>
                          {f.evidence}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations + risks + next actions */}
          {(result.recommendations.length > 0 || result.risks.length > 0 || result.next_actions.length > 0) && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: result.recommendations.length > 0 && result.risks.length > 0 ? '1fr 1fr' : '1fr',
                gap: '14px',
              }}
            >
              {result.recommendations.length > 0 && (
                <div style={cardStyle}>
                  <h3 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 700, color: 'var(--color-ink)' }}>
                    建议
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {result.recommendations.map((r, i) => (
                      <li key={i} style={{ fontSize: '13px', color: 'var(--color-ink-2)', lineHeight: 1.55 }}>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.risks.length > 0 && (
                <div style={{ ...cardStyle, borderColor: 'rgba(220,53,69,0.2)', background: 'var(--color-danger-soft)' }}>
                  <h3 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 700, color: 'var(--color-danger)' }}>
                    主要风险
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {result.risks.map((r, i) => (
                      <li key={i} style={{ fontSize: '13px', color: 'var(--color-danger)', lineHeight: 1.55, opacity: 0.85 }}>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {result.next_actions.length > 0 && (
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 700, color: 'var(--color-ink)' }}>
                行动清单
              </h3>
              <ol style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {result.next_actions.map((a, i) => (
                  <li key={i} style={{ fontSize: '13.5px', color: 'var(--color-ink-2)', lineHeight: 1.55 }}>
                    {a}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Evidence (collapsible) */}
          {result.evidence_used.length > 0 && (
            <div style={{ ...cardStyle, background: 'var(--color-surface-2)' }}>
              <button
                onClick={() => setShowEvidence((v) => !v)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  color: 'var(--color-ink-3)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                }}
              >
                <span>引用来源（共 {result.evidence_used.length} 条）</span>
                {showEvidence ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showEvidence && (
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {result.evidence_used.map((e, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '8px 10px',
                        background: 'var(--color-surface)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: 'var(--color-ink-2)',
                        lineHeight: 1.5,
                      }}
                    >
                      <span style={{ fontWeight: 600, color: 'var(--color-ink)', fontFamily: 'var(--font-mono)' }}>
                        {e.field}
                      </span>
                      {': '}
                      <span>{e.value}</span>
                      {e.relevance && (
                        <span style={{ color: 'var(--color-ink-3)' }}> — {e.relevance}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
