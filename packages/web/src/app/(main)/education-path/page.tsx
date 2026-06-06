'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import type {
  EducationPathResult,
  EducationPathAnalysis,
  EducationPathCriticalFactor,
  PathImpact,
} from '@/lib/types';
import {
  BookMarked,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  MinusCircle,
} from 'lucide-react';

// ─── Sub-components ──────────────────────────────────────────────────────────

function ImpactBadge({ impact }: { impact: PathImpact }) {
  const map: Record<PathImpact, { icon: React.ReactNode; label: string; color: string }> = {
    supports_grad_school: {
      icon: <CheckCircle size={13} />,
      label: '支持读研',
      color: '#1a7f5e',
    },
    supports_work: {
      icon: <XCircle size={13} />,
      label: '支持就业',
      color: '#a86200',
    },
    neutral: {
      icon: <MinusCircle size={13} />,
      label: '中性',
      color: 'var(--color-ink-3)',
    },
  };
  const { icon, label, color } = map[impact];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '11px',
        fontWeight: 600,
        color,
        flexShrink: 0,
      }}
    >
      {icon}
      {label}
    </span>
  );
}

function PathCard({ path }: { path: EducationPathAnalysis }) {
  return (
    <div
      style={{
        border: '1px solid var(--color-line)',
        borderRadius: '12px',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        background: 'var(--color-surface)',
      }}
    >
      <div
        style={{
          fontWeight: 700,
          fontSize: '15px',
          color: 'var(--color-ink)',
          letterSpacing: '-0.01em',
        }}
      >
        {path.path_name}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {/* Pros */}
        <div>
          <p
            style={{
              margin: '0 0 6px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#1a7f5e',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            优势
          </p>
          <ul
            style={{
              margin: 0,
              paddingLeft: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {path.pros.map((pro, i) => (
              <li key={i} style={{ fontSize: '13px', color: 'var(--color-ink-2)', lineHeight: 1.5 }}>
                {pro}
              </li>
            ))}
          </ul>
        </div>

        {/* Cons */}
        <div>
          <p
            style={{
              margin: '0 0 6px',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--color-danger)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            风险 / 缺点
          </p>
          <ul
            style={{
              margin: 0,
              paddingLeft: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {path.cons.map((con, i) => (
              <li
                key={i}
                style={{ fontSize: '13px', color: 'var(--color-danger)', lineHeight: 1.5, opacity: 0.85 }}
              >
                {con}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Feasibility note */}
      <p
        style={{
          margin: 0,
          fontSize: '13px',
          color: 'var(--color-ink-2)',
          lineHeight: 1.55,
          paddingTop: '6px',
          borderTop: '1px solid var(--color-line)',
        }}
      >
        {path.feasibility_note}
      </p>

      {/* Opportunity cost */}
      {path.opportunity_cost && (
        <div
          style={{
            background: 'var(--color-surface-2)',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '12.5px',
            color: 'var(--color-ink-2)',
            lineHeight: 1.5,
          }}
        >
          <span style={{ fontWeight: 700, color: '#a86200' }}>机会成本：</span>
          {path.opportunity_cost}
        </div>
      )}
    </div>
  );
}

function CriticalFactorRow({ factor }: { factor: EducationPathCriticalFactor }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-start',
        padding: '10px 12px',
        background: 'var(--color-surface-2)',
        borderRadius: '8px',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--color-ink)' }}>
            {factor.factor}
          </span>
          <ImpactBadge impact={factor.impact} />
        </div>
        <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: 'var(--color-ink-3)', lineHeight: 1.5 }}>
          {factor.user_situation}
        </p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EducationPathPage() {
  const [profile, setProfile] = useState('');
  const [gpa, setGpa] = useState('');
  const [gpaPercentile, setGpaPercentile] = useState('');
  const [targetSchoolTier, setTargetSchoolTier] = useState('');
  const [economicPressure, setEconomicPressure] = useState('');
  const [hasInternship, setHasInternship] = useState('');

  const [result, setResult] = useState<EducationPathResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const body: Record<string, unknown> = { profile: profile.trim() };
      if (gpa) body.gpa = parseFloat(gpa);
      if (gpaPercentile) body.gpa_percentile = parseInt(gpaPercentile, 10);
      if (targetSchoolTier) body.target_school_tier = targetSchoolTier;
      if (economicPressure !== '') body.economic_pressure = economicPressure === 'true';
      if (hasInternship !== '') body.has_internship = hasInternship === 'true';

      const data = await api.post<EducationPathResult>('/education-path/analyze', body);
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

  const isSubmitDisabled = loading || !profile.trim();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        padding: '40px 32px',
        gap: '20px',
        boxSizing: 'border-box',
        maxWidth: '820px',
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
          读研 vs 就业
        </h1>
        <p style={{ fontSize: '13.5px', color: 'var(--color-ink-3)' }}>
          输入背景信息，AI 对比分析各路径的机会成本与可行性，不给情绪化建议
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '16px' }}
      >
        {/* Profile */}
        <div>
          <label style={labelStyle}>你的背景（教育经历、实习、目标职位等）</label>
          <textarea
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
            placeholder="例：本科计算机，985院校，GPA 3.65，有两段字节跳动后端实习，大四应届生，目标做大厂后端研发，家庭经济状况一般…"
            rows={5}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }}
            required
          />
        </div>

        {/* Row 1: GPA + percentile */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={labelStyle}>GPA（可选，0-4 分制）</label>
            <input
              type="number"
              value={gpa}
              onChange={(e) => setGpa(e.target.value)}
              placeholder="例：3.65"
              step="0.01"
              min={0}
              max={4}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>绩点排名（可选，top X%）</label>
            <input
              type="number"
              value={gpaPercentile}
              onChange={(e) => setGpaPercentile(e.target.value)}
              placeholder="例：15（表示前 15%）"
              min={1}
              max={100}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Row 2: school tier + economic pressure */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={labelStyle}>意向院校层次（可选）</label>
            <select
              value={targetSchoolTier}
              onChange={(e) => setTargetSchoolTier(e.target.value)}
              style={inputStyle}
            >
              <option value="">不限</option>
              <option value="985">985 院校</option>
              <option value="211">211 院校</option>
              <option value="double_first_class">双一流</option>
              <option value="regular">普通本科</option>
              <option value="any">任意</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>家庭经济压力（可选）</label>
            <select
              value={economicPressure}
              onChange={(e) => setEconomicPressure(e.target.value)}
              style={inputStyle}
            >
              <option value="">未填写</option>
              <option value="true">较大（难以支撑读研费用）</option>
              <option value="false">不大（可负担读研成本）</option>
            </select>
          </div>
        </div>

        {/* Row 3: internship + submit */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 2fr',
            gap: '14px',
            alignItems: 'end',
          }}
        >
          <div>
            <label style={labelStyle}>是否有实习经历（可选）</label>
            <select
              value={hasInternship}
              onChange={(e) => setHasInternship(e.target.value)}
              style={inputStyle}
            >
              <option value="">未填写</option>
              <option value="true">有</option>
              <option value="false">无</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '11px 24px',
                borderRadius: '10px',
                border: 'none',
                background: isSubmitDisabled ? 'var(--color-surface-3)' : 'var(--color-brand)',
                color: isSubmitDisabled ? 'var(--color-ink-3)' : '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {loading ? (
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <BookMarked size={16} />
              )}
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
            <Loader2
              size={26}
              color="var(--color-brand)"
              style={{ animation: 'spin 1s linear infinite' }}
            />
          </div>
          <div>
            <p
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--color-ink-2)',
                marginBottom: '4px',
              }}
            >
              AI 正在对比各路径的机会成本…
            </p>
            <p style={{ fontSize: '13px', color: 'var(--color-ink-4)' }}>
              综合 GPA、目标职位、经济状况进行分析，通常需要 8-15 秒
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
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-danger)', opacity: 0.85 }}>
              {error}
            </p>
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
          <p
            style={{
              fontWeight: 700,
              color: '#a86200',
              marginBottom: '8px',
              fontSize: '15px',
            }}
          >
            背景信息不足，无法完成分析
          </p>
          {result.cannot_determine.length > 0 && (
            <ul
              style={{
                margin: 0,
                paddingLeft: '18px',
                color: '#a86200',
                fontSize: '13.5px',
                lineHeight: 1.7,
              }}
            >
              {result.cannot_determine.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          )}
          {result.follow_up_questions.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <p
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#a86200',
                  marginBottom: '6px',
                }}
              >
                请补充以下信息后重新提交：
              </p>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '18px',
                  color: '#a86200',
                  fontSize: '13px',
                  lineHeight: 1.7,
                }}
              >
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
          {/* Summary hero */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--color-ink-3)',
                  background: 'var(--color-surface-2)',
                  padding: '3px 10px',
                  borderRadius: '6px',
                }}
              >
                置信度：
                {result.confidence === 'high'
                  ? '高'
                  : result.confidence === 'medium'
                  ? '中'
                  : '低'}
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
          </div>

          {/* Path comparison grid */}
          {result.analysis.length > 0 && (
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
                路径对比
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {result.analysis.map((path, i) => (
                  <PathCard key={i} path={path} />
                ))}
              </div>
            </div>
          )}

          {/* Recommendation */}
          {result.recommendation && (
            <div
              style={{
                ...cardStyle,
                background: '#eaf2ff',
                borderColor: 'rgba(10,132,255,0.2)',
              }}
            >
              <p
                style={{
                  margin: '0 0 8px',
                  fontWeight: 700,
                  fontSize: '13px',
                  color: 'var(--color-brand)',
                }}
              >
                综合建议
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: '14px',
                  color: 'var(--color-ink)',
                  lineHeight: 1.6,
                }}
              >
                {result.recommendation}
              </p>
            </div>
          )}

          {/* Critical factors */}
          {result.critical_factors.length > 0 && (
            <div style={cardStyle}>
              <h3
                style={{
                  margin: '0 0 12px',
                  fontSize: '16px',
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  color: 'var(--color-ink)',
                }}
              >
                关键决策因素
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {result.critical_factors.map((f, i) => (
                  <CriticalFactorRow key={i} factor={f} />
                ))}
              </div>
            </div>
          )}

          {/* Recommendations + risks */}
          {(result.recommendations.length > 0 || result.risks.length > 0) && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  result.recommendations.length > 0 && result.risks.length > 0
                    ? '1fr 1fr'
                    : '1fr',
                gap: '14px',
              }}
            >
              {result.recommendations.length > 0 && (
                <div style={cardStyle}>
                  <h3
                    style={{
                      margin: '0 0 10px',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: 'var(--color-ink)',
                    }}
                  >
                    建议
                  </h3>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    {result.recommendations.map((r, i) => (
                      <li
                        key={i}
                        style={{ fontSize: '13px', color: 'var(--color-ink-2)', lineHeight: 1.55 }}
                      >
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.risks.length > 0 && (
                <div
                  style={{
                    ...cardStyle,
                    borderColor: 'rgba(220,53,69,0.2)',
                    background: 'var(--color-danger-soft)',
                  }}
                >
                  <h3
                    style={{
                      margin: '0 0 10px',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: 'var(--color-danger)',
                    }}
                  >
                    主要风险
                  </h3>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    {result.risks.map((r, i) => (
                      <li
                        key={i}
                        style={{
                          fontSize: '13px',
                          color: 'var(--color-danger)',
                          lineHeight: 1.55,
                          opacity: 0.85,
                        }}
                      >
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Next actions */}
          {result.next_actions.length > 0 && (
            <div style={cardStyle}>
              <h3
                style={{
                  margin: '0 0 10px',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--color-ink)',
                }}
              >
                行动清单
              </h3>
              <ol
                style={{
                  margin: 0,
                  paddingLeft: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                {result.next_actions.map((a, i) => (
                  <li
                    key={i}
                    style={{ fontSize: '13.5px', color: 'var(--color-ink-2)', lineHeight: 1.55 }}
                  >
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
                <div
                  style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}
                >
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
                      <span
                        style={{
                          fontWeight: 600,
                          color: 'var(--color-ink)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
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
