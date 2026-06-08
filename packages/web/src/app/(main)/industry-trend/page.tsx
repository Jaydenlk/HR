'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import type {
  IndustryTrendResult,
  IndustryGrowthSignal,
  IndustryRiskSignal,
  IndustryEntryRole,
} from '@/lib/types';
import {
  Loader2,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  TrendingDown,
  Users,
  ChevronDown,
  ChevronUp,
  Info,
  Link as LinkIcon,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const HIRING_OUTLOOK_LABELS: Record<string, string> = {
  strong: '强劲',
  growing: '增长',
  stable: '稳定',
  declining: '下降',
  contracting: '收缩',
  unknown: '未知',
};

const HIRING_OUTLOOK_COLORS: Record<string, string> = {
  strong: 'var(--color-success)',
  growing: 'var(--color-brand)',
  stable: 'var(--color-ink-3)',
  declining: 'var(--color-warn, #f59e0b)',
  contracting: 'var(--color-danger)',
  unknown: 'var(--color-ink-4)',
};

const CONFIDENCE_LABELS: Record<string, string> = {
  high: '数据充分',
  medium: '数据较充分',
  low: '数据有限',
  insufficient: '无实时数据',
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'var(--color-success)',
  medium: 'var(--color-brand)',
  low: 'var(--color-warn, #f59e0b)',
  insufficient: 'var(--color-danger)',
};

const STRENGTH_LABELS: Record<string, string> = {
  strong: '强',
  moderate: '中',
  weak: '弱',
};

const SEVERITY_LABELS: Record<string, string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
};

const DEMAND_LABELS: Record<string, string> = {
  high: '需求旺',
  medium: '需求中',
  low: '需求低',
  unknown: '待研判',
};

// 枚举缺失时的统一兜底文案（#22）
const UNLABELED = '未标注';

// 颜色映射缺失时的中性兜底色，避免拼出 'undefined22' 非法色值（#98）
const FALLBACK_COLOR = 'var(--color-ink-4)';

// ─── Shared styles ────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-line)',
  borderRadius: '18px',
  padding: '20px 22px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11.5px',
  fontWeight: 700,
  color: 'var(--color-ink-2)',
  letterSpacing: '0.04em',
  marginBottom: '6px',
  textTransform: 'uppercase' as const,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: 'var(--color-surface)',
  border: '1px solid var(--color-line)',
  borderRadius: '10px',
  fontFamily: 'inherit',
  fontSize: '13.5px',
  color: 'var(--color-ink)',
  fontWeight: 500,
  boxSizing: 'border-box' as const,
  outline: 'none',
};

const btnPrimaryStyle = (loading: boolean): React.CSSProperties => ({
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '12px 0',
  borderRadius: '10px',
  border: 'none',
  background: loading ? 'var(--color-surface-3)' : 'var(--color-brand)',
  color: loading ? 'var(--color-ink-3)' : '#fff',
  fontSize: '14px',
  fontWeight: 700,
  cursor: loading ? 'not-allowed' : 'pointer',
  letterSpacing: '-0.01em',
  transition: 'background 0.12s',
});

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const color = CONFIDENCE_COLORS[confidence] ?? FALLBACK_COLOR;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 10px',
        borderRadius: '999px',
        fontSize: '11.5px',
        fontWeight: 700,
        background: `color-mix(in srgb, ${color} 13%, transparent)`,
        color,
      }}
    >
      {CONFIDENCE_LABELS[confidence] ?? '置信度未知'}
    </span>
  );
}

function GrowthSignalCard({ signal }: { signal: IndustryGrowthSignal }) {
  return (
    <div
      style={{
        padding: '12px 14px',
        background: 'var(--color-surface-2)',
        borderRadius: '10px',
        borderLeft: '3px solid var(--color-success)',
        marginBottom: '8px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ fontSize: '13.5px', color: 'var(--color-ink)', fontWeight: 500, flex: 1 }}>
          {signal.signal}
        </div>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '999px',
            background: signal.strength
              ? 'var(--color-success-soft, #d1fae5)'
              : 'var(--color-surface-3)',
            color: signal.strength ? 'var(--color-success)' : 'var(--color-ink-4)',
            flexShrink: 0,
          }}
        >
          {signal.strength ? STRENGTH_LABELS[signal.strength] ?? signal.strength : UNLABELED}
        </span>
      </div>
      <div style={{ fontSize: '11.5px', color: 'var(--color-ink-4)', marginTop: '4px' }}>
        {signal.source} · {signal.date}
      </div>
    </div>
  );
}

function RiskSignalCard({ signal }: { signal: IndustryRiskSignal }) {
  return (
    <div
      style={{
        padding: '12px 14px',
        background: 'var(--color-surface-2)',
        borderRadius: '10px',
        borderLeft: '3px solid var(--color-warn, #f59e0b)',
        marginBottom: '8px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ fontSize: '13.5px', color: 'var(--color-ink)', fontWeight: 500, flex: 1 }}>
          {signal.signal}
        </div>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '999px',
            background: signal.severity
              ? 'var(--color-warn-soft, #fef3c7)'
              : 'var(--color-surface-3)',
            color: signal.severity ? 'var(--color-warn, #f59e0b)' : 'var(--color-ink-4)',
            flexShrink: 0,
          }}
        >
          {signal.severity ? SEVERITY_LABELS[signal.severity] ?? signal.severity : UNLABELED}
        </span>
      </div>
      <div style={{ fontSize: '11.5px', color: 'var(--color-ink-4)', marginTop: '4px' }}>
        {signal.source} · {signal.date}
      </div>
    </div>
  );
}

function EntryRoleCard({ role }: { role: IndustryEntryRole }) {
  return (
    <div
      style={{
        padding: '12px 14px',
        background: 'var(--color-surface-2)',
        borderRadius: '10px',
        marginBottom: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '12px',
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '2px' }}>
          {role.role_name}
        </div>
        <div style={{ fontSize: '12.5px', color: 'var(--color-ink-3)' }}>
          {role.rationale}
        </div>
      </div>
      <span
        style={{
          fontSize: '11px',
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: '999px',
          background: role.demand_level ? 'var(--color-brand-soft)' : 'var(--color-surface-3)',
          color: role.demand_level ? 'var(--color-brand-ink)' : 'var(--color-ink-4)',
          flexShrink: 0,
        }}
      >
        {role.demand_level ? DEMAND_LABELS[role.demand_level] ?? role.demand_level : UNLABELED}
      </span>
    </div>
  );
}

function TagList({ items, label }: { items: string[]; label: string }) {
  if (!items.length) return null;
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={labelStyle}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              fontSize: '13px',
              color: 'var(--color-ink-2)',
              padding: '5px 10px',
              background: 'var(--color-surface-2)',
              borderRadius: '7px',
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function EvidenceList({ items }: { items: IndustryTrendResult['evidence_used'] }) {
  if (!items.length) return null;
  return (
    <div style={cardStyle}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          marginBottom: '12px',
        }}
      >
        <LinkIcon size={15} color="var(--color-ink-3)" />
        <span style={labelStyle}>数据来源（{items.length} 条）</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map((ev, i) => (
          <div
            key={i}
            style={{
              padding: '10px 12px',
              background: 'var(--color-surface-2)',
              borderRadius: '10px',
            }}
          >
            <div style={{ fontSize: '13px', color: 'var(--color-ink)', fontWeight: 500 }}>
              {ev.source}
            </div>
            <div style={{ marginTop: '4px', fontSize: '11.5px' }}>
              {ev.url ? (
                <a
                  href={ev.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: 'var(--color-brand)',
                    textDecoration: 'none',
                    wordBreak: 'break-all',
                  }}
                >
                  {ev.url}
                </a>
              ) : (
                <span style={{ color: 'var(--color-ink-4)' }}>无可核验链接</span>
              )}
              {ev.date && (
                <span style={{ color: 'var(--color-ink-4)' }}> · {ev.date}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IndustryTrendPage() {
  const [industry, setIndustry] = useState('');
  const [region, setRegion] = useState('');
  const [timeframe, setTimeframe] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IndustryTrendResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  async function handleSubmit() {
    if (!industry.trim()) {
      setError('请输入行业或赛道名称');
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const data = await api.post<IndustryTrendResult>('/industry-trend/analyze', {
        industry: industry.trim(),
        region: region.trim() || undefined,
        timeframe: timeframe.trim() || undefined,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '40px 32px 24px',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ flexShrink: 0, marginBottom: '24px' }}>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--color-ink)',
            letterSpacing: '-0.4px',
            marginBottom: '4px',
          }}
        >
          行业趋势
        </h1>
        <p style={{ fontSize: '13.5px', color: 'var(--color-ink-3)' }}>
          增长信号 · 风险预警 · 招聘前景 · 推荐入行岗位
        </p>
      </div>

      {/* Main content — two column */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 1.3fr',
          gap: '14px',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {/* Left: form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
          <div style={cardStyle}>
            {/* Industry */}
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>行业 / 赛道（必填）</label>
              <input
                style={inputStyle}
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="如：新能源汽车、大模型、跨境电商"
              />
            </div>

            {/* Region */}
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>地区（可选）</label>
              <input
                style={inputStyle}
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="如：中国、长三角、北京"
              />
            </div>

            {/* Timeframe */}
            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>时间维度（可选）</label>
              <input
                style={inputStyle}
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                placeholder="如：2024年、近一年、未来3年"
              />
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'var(--color-danger-soft)',
                  color: 'var(--color-danger)',
                  fontSize: '13px',
                  fontWeight: 500,
                  marginBottom: '12px',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-start',
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
                {error}
              </div>
            )}

            <button onClick={handleSubmit} disabled={loading} style={btnPrimaryStyle(loading)}>
              {loading ? (
                <>
                  <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                  分析中…
                </>
              ) : (
                '分析行业趋势'
              )}
            </button>
          </div>
        </div>

        {/* Right: result */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {loading ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: 'var(--color-ink-3)',
                fontSize: '14px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-line)',
                borderRadius: '18px',
              }}
            >
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              AI 正在分析行业趋势…
            </div>
          ) : result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
              {/* Summary + confidence */}
              <div
                style={{
                  ...cardStyle,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <div style={{ fontSize: '13px', color: 'var(--color-ink-2)', flex: 1 }}>
                  {result.summary}
                </div>
                <ConfidenceBadge confidence={result.confidence} />
              </div>

              {/* Insufficient state: explicit degradation notice */}
              {result.confidence === 'insufficient' && (
                <div
                  style={{
                    ...cardStyle,
                    borderColor: 'var(--color-warn, #f59e0b)',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                  }}
                >
                  <Info size={18} color="var(--color-warn, #f59e0b)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '6px' }}>
                      无实时数据——以下为分析框架，非结论性判断
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-ink-3)', lineHeight: '1.7' }}>
                      本服务无内置实时检索能力，无法获取当前行业数据。
                      历史训练数据不足以判断此时此刻的行业趋势，信号数组已置空以避免误导。
                      请参考以下渠道获取权威数据后自行研判。
                    </div>
                    {result.next_actions.length > 0 && (
                      <div style={{ marginTop: '12px' }}>
                        <TagList items={result.next_actions} label="建议查阅渠道" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Cannot-determine: honest degradation, render in any branch (#64) */}
              {result.cannot_determine.length > 0 && (
                <div
                  style={{
                    ...cardStyle,
                    borderColor: 'var(--color-line-2)',
                    background: 'var(--color-surface-2)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      marginBottom: '10px',
                    }}
                  >
                    <Info size={15} color="var(--color-ink-3)" />
                    <span style={labelStyle}>无法判定（数据不足）</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {result.cannot_determine.map((item, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: '13px',
                          color: 'var(--color-ink-2)',
                          lineHeight: '1.6',
                          paddingLeft: '14px',
                          position: 'relative',
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            left: 0,
                            color: 'var(--color-ink-4)',
                          }}
                        >
                          ·
                        </span>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trend summary (if not empty) */}
              {result.trend_summary && (
                <div style={cardStyle}>
                  <div style={labelStyle}>趋势概述</div>
                  <div style={{ fontSize: '13.5px', color: 'var(--color-ink)', lineHeight: '1.7' }}>
                    {result.trend_summary}
                  </div>
                </div>
              )}

              {/* Hiring outlook */}
              {(() => {
                const outlookColor =
                  HIRING_OUTLOOK_COLORS[result.hiring_outlook] ?? FALLBACK_COLOR;
                const outlookLabel =
                  HIRING_OUTLOOK_LABELS[result.hiring_outlook] ?? '前景未知';
                const isNegative =
                  result.hiring_outlook === 'declining' ||
                  result.hiring_outlook === 'contracting';
                return (
                  <div
                    style={{
                      ...cardStyle,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                    }}
                  >
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: `color-mix(in srgb, ${outlookColor} 13%, transparent)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {isNegative ? (
                        <TrendingDown size={20} color={outlookColor} />
                      ) : (
                        <TrendingUp size={20} color={outlookColor} />
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '11.5px', color: 'var(--color-ink-3)', marginBottom: '2px' }}>
                        招聘前景
                      </div>
                      <div
                        style={{
                          fontSize: '18px',
                          fontWeight: 700,
                          color: outlookColor,
                        }}
                      >
                        {outlookLabel}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Growth signals */}
              {result.growth_signals.length > 0 && (
                <div style={cardStyle}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      marginBottom: '12px',
                    }}
                  >
                    <TrendingUp size={15} color="var(--color-success)" />
                    <span style={labelStyle}>增长信号（{result.growth_signals.length} 条）</span>
                  </div>
                  {result.growth_signals.map((s, i) => (
                    <GrowthSignalCard key={i} signal={s} />
                  ))}
                </div>
              )}

              {/* Risk signals */}
              {result.risk_signals.length > 0 && (
                <div style={cardStyle}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      marginBottom: '12px',
                    }}
                  >
                    <AlertTriangle size={15} color="var(--color-warn, #f59e0b)" />
                    <span style={labelStyle}>风险信号（{result.risk_signals.length} 条）</span>
                  </div>
                  {result.risk_signals.map((s, i) => (
                    <RiskSignalCard key={i} signal={s} />
                  ))}
                </div>
              )}

              {/* Recommended entry roles */}
              {result.recommended_entry_roles.length > 0 && (
                <div style={cardStyle}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      marginBottom: '12px',
                    }}
                  >
                    <Users size={15} color="var(--color-brand)" />
                    <span style={labelStyle}>推荐入行岗位</span>
                  </div>
                  {result.recommended_entry_roles.map((role, i) => (
                    <EntryRoleCard key={i} role={role} />
                  ))}
                </div>
              )}

              {/* Data sources — verifiable evidence (#21) */}
              <EvidenceList items={result.evidence_used} />

              {/* Expandable details */}
              <button
                onClick={() => setShowDetails((v) => !v)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-line)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-ink-2)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: '100%',
                  justifyContent: 'center',
                }}
              >
                {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showDetails ? '收起详情' : '查看更多建议'}
              </button>

              {showDetails && (
                <div style={cardStyle}>
                  {result.confidence !== 'insufficient' && (
                    <TagList items={result.next_actions} label="下一步行动" />
                  )}
                  <TagList items={result.recommendations} label="额外建议" />
                  {result.risks.length > 0 && <TagList items={result.risks} label="注意风险" />}
                  {result.follow_up_questions.length > 0 && (
                    <TagList items={result.follow_up_questions} label="延伸问题" />
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Empty state */
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                background: 'var(--color-surface)',
                border: '1.5px dashed var(--color-line-2)',
                borderRadius: '18px',
                padding: '48px 32px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  background: 'var(--color-surface-2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TrendingUp size={24} color="var(--color-ink-4)" />
              </div>
              <p
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--color-ink-2)',
                  letterSpacing: '-0.01em',
                }}
              >
                输入行业名称，获取趋势分析
              </p>
              <p style={{ fontSize: '13.5px', color: 'var(--color-ink-4)' }}>
                增长/风险信号 · 招聘前景 · 推荐入行岗位
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
