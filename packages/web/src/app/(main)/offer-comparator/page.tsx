'use client';

import { useState, useRef } from 'react';
import { api } from '@/lib/api';
import type {
  OfferItem,
  OfferCompareRequest,
  OfferCompareResult,
  OfferCompareEntry,
  OfferHourlyRate,
  OfferMissingInfo,
} from '@/lib/types';
import { Scale, Plus, X, Loader2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMoney(v: number | undefined | null): string {
  if (v == null) return '—';
  if (v >= 10000) return `${(v / 10000).toFixed(1)}w`;
  return v.toLocaleString();
}

function confidenceLabel(c: string): string {
  const map: Record<string, string> = {
    high: '高',
    medium: '中',
    low: '低',
    insufficient: '信息不足',
    uncertain: '不确定',
  };
  return map[c] ?? c;
}

function confidenceColor(c: string): string {
  if (c === 'high') return '#10b981';
  if (c === 'medium') return 'var(--color-brand)';
  return 'var(--color-ink-3)';
}

// ── Offer Form Item ───────────────────────────────────────────────────────────

interface OfferFormData {
  id: string;
  company: string;
  base_monthly: string;
  months_per_year: string;
  annual_bonus: string;
  city: string;
  level: string;
  weekly_hours: string;
  probation_discount: string;
  probation_months: string;
  social_insurance_monthly: string;
  equity_annual: string;
  equity_type: string;
  notes: string;
}

function emptyForm(id: string): OfferFormData {
  return {
    id,
    company: '',
    base_monthly: '',
    months_per_year: '',
    annual_bonus: '',
    city: '',
    level: '',
    weekly_hours: '',
    probation_discount: '',
    probation_months: '',
    social_insurance_monthly: '',
    equity_annual: '',
    equity_type: '',
    notes: '',
  };
}

function parsePositiveNumber(s: string): number | undefined {
  const n = Number(s);
  return s.trim() !== '' && !isNaN(n) && n > 0 ? n : undefined;
}

function parseNonNegativeNumber(s: string): number | undefined {
  const n = Number(s);
  return s.trim() !== '' && !isNaN(n) && n >= 0 ? n : undefined;
}

function formToItem(f: OfferFormData): OfferItem {
  const item: OfferItem = {
    id: f.id,
    company: f.company,
    base_monthly: Number(f.base_monthly),
  };
  const monthsPerYear = parsePositiveNumber(f.months_per_year);
  if (monthsPerYear !== undefined) item.months_per_year = monthsPerYear;
  const annualBonus = parseNonNegativeNumber(f.annual_bonus);
  if (annualBonus !== undefined) item.annual_bonus = annualBonus;
  if (f.city) item.city = f.city;
  if (f.level) item.level = f.level;
  const weeklyHours = parsePositiveNumber(f.weekly_hours);
  if (weeklyHours !== undefined) item.weekly_hours = weeklyHours;
  const probationDiscountPct = parsePositiveNumber(f.probation_discount);
  if (probationDiscountPct !== undefined) item.probation_discount = probationDiscountPct / 100;
  const probationMonths = parsePositiveNumber(f.probation_months);
  if (probationMonths !== undefined) item.probation_months = probationMonths;
  const socialInsurance = parseNonNegativeNumber(f.social_insurance_monthly);
  if (socialInsurance !== undefined) item.social_insurance_monthly = socialInsurance;
  const equityAnnual = parseNonNegativeNumber(f.equity_annual);
  if (equityAnnual !== undefined) item.equity_annual = equityAnnual;
  if (f.equity_type) item.equity_type = f.equity_type;
  if (f.notes) item.notes = f.notes;
  return item;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-line)',
  borderRadius: '7px',
  fontFamily: 'inherit',
  fontSize: '13px',
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
  marginBottom: '4px',
};

// ── Offer Card (input form) ───────────────────────────────────────────────────

// 可选数值字段的校验规则
interface NumericRule {
  min?: number;
  max?: number;
  allowZero?: boolean;
  errorMsg: (val: string) => string;
}

const NUMERIC_RULES: Partial<Record<keyof OfferFormData, NumericRule>> = {
  weekly_hours: {
    min: 1,
    max: 100,
    allowZero: false,
    errorMsg: () => '周工时须在 1–100 小时之间',
  },
  months_per_year: {
    min: 0.1,
    allowZero: false,
    errorMsg: () => '年薪月数须为正数',
  },
  annual_bonus: {
    min: 0,
    allowZero: true,
    errorMsg: () => '年终奖须为非负数',
  },
  probation_months: {
    min: 0.1,
    allowZero: false,
    errorMsg: () => '试用期月数须为正数',
  },
  social_insurance_monthly: {
    min: 0,
    allowZero: true,
    errorMsg: () => '五险一金月缴须为非负数',
  },
  equity_annual: {
    min: 0,
    allowZero: true,
    errorMsg: () => '股权年均须为非负数',
  },
};

function validateOptionalNumeric(key: keyof OfferFormData, val: string): string | null {
  const rule = NUMERIC_RULES[key];
  if (!rule || val.trim() === '') return null; // 空值合法（选填）
  const n = Number(val);
  if (isNaN(n)) return rule.errorMsg(val);
  if (!rule.allowZero && n <= 0) return rule.errorMsg(val);
  if (rule.allowZero && n < 0) return rule.errorMsg(val);
  if (rule.min !== undefined && n < rule.min) return rule.errorMsg(val);
  if (rule.max !== undefined && n > rule.max) return rule.errorMsg(val);
  return null;
}

function OfferCard({
  form,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  form: OfferFormData;
  index: number;
  onChange: (id: string, key: keyof OfferFormData, val: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof OfferFormData, string>>>({});

  function handleFieldChange(key: keyof OfferFormData, val: string) {
    onChange(form.id, key, val);
    // 实时校验可选数值字段
    const err = validateOptionalNumeric(key, val);
    setFieldErrors((prev) => {
      if (err === null && !prev[key]) return prev; // 无变化，不触发重渲
      return { ...prev, [key]: err ?? undefined };
    });
  }

  function field(key: keyof OfferFormData, label: string, placeholder?: string, type = 'text') {
    const errMsg = fieldErrors[key];
    const hasError = Boolean(errMsg);
    return (
      <div>
        <label style={labelStyle}>{label}</label>
        <input
          style={{
            ...inputStyle,
            borderColor: hasError ? 'var(--color-danger, #ef4444)' : inputStyle.borderColor,
          }}
          type={type}
          placeholder={placeholder}
          value={form[key]}
          onChange={(e) => handleFieldChange(key, e.target.value)}
        />
        {hasError && (
          <span
            style={{
              display: 'block',
              marginTop: '3px',
              fontSize: '11px',
              color: 'var(--color-danger, #ef4444)',
              fontWeight: 600,
            }}
          >
            {errMsg}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-line)',
        borderRadius: '14px',
        padding: '18px 18px 14px',
        position: 'relative',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
        }}
      >
        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: 'var(--color-brand)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          Offer {index + 1}
        </span>
        {canRemove && (
          <button
            onClick={() => onRemove(form.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-ink-4)',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
            }}
            title="删除此 offer"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Core fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div style={{ gridColumn: '1 / -1' }}>
          {field('company', '公司名称 *', '字节跳动')}
        </div>
        <div>
          {field('base_monthly', '月薪（元）*', '35000', 'number')}
        </div>
        <div>
          {field('months_per_year', '年薪月数', '14', 'number')}
        </div>
        <div>
          {field('annual_bonus', '年终奖（元）', '70000', 'number')}
        </div>
        <div>
          {field('weekly_hours', '周工时', '60', 'number')}
        </div>
      </div>

      {/* Expand for more fields */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginTop: '12px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-ink-3)',
          fontSize: '12px',
          fontWeight: 600,
          padding: '2px 0',
          fontFamily: 'inherit',
        }}
      >
        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {expanded ? '收起' : '更多字段（五险一金 / 试用期 / 股权）'}
      </button>

      {expanded && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
          <div>
            {field('city', '城市', '上海')}
          </div>
          <div>
            {field('level', '职级', 'P7 / T3')}
          </div>
          <div>
            {field('probation_discount', '试用期折扣（%）', '80', 'number')}
          </div>
          <div>
            {field('probation_months', '试用期月数', '3', 'number')}
          </div>
          <div>
            {field('social_insurance_monthly', '五险一金公司月缴（元）', '3000', 'number')}
          </div>
          <div>
            {field('equity_annual', '股权/期权年均（元）', '50000', 'number')}
          </div>
          <div>
            {field('equity_type', '股票类型', 'A股 / 美股 / 虚拟股')}
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            {field('notes', '备注', '其他说明')}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Result Panel ──────────────────────────────────────────────────────────────

function ResultPanel({ result }: { result: OfferCompareResult }) {
  // #28: null-guard all array/object fields to prevent white-screen on partial API response
  const comparison: OfferCompareEntry[] = result.comparison ?? [];
  const weighted_scores = result.weighted_scores ?? [];
  const recommendation = result.recommendation ?? null;
  const hourly_rate_comparison = result.hourly_rate_comparison ?? [];
  const missing_info = result.missing_info ?? [];

  const risks: string[] = result.risks ?? [];
  const next_actions: string[] = result.next_actions ?? [];
  const follow_up_questions: string[] = result.follow_up_questions ?? [];

  // Build lookup map
  const compMap = new Map<string, OfferCompareEntry>(comparison.map((c) => [c.offer_id, c]));

  const offerIds = comparison.map((c) => c.offer_id);

  const cardStyle: React.CSSProperties = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-line)',
    borderRadius: '14px',
    padding: '18px 20px',
  };

  const sectionTitle = (text: string) => (
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Summary + Confidence */}
      <div style={{ ...cardStyle, borderLeft: `4px solid ${confidenceColor(result.confidence)}` }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '10px',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: confidenceColor(result.confidence),
              background: `${confidenceColor(result.confidence)}18`,
              padding: '2px 9px',
              borderRadius: '99px',
            }}
          >
            置信度：{confidenceLabel(result.confidence)}
          </span>
        </div>
        <p
          style={{
            fontSize: '14px',
            color: 'var(--color-ink)',
            lineHeight: 1.6,
            margin: 0,
            fontWeight: 500,
          }}
        >
          {result.summary}
        </p>
      </div>

      {/* Recommendation — skip entire block when absent (#28) */}
      {recommendation && (
        <div style={cardStyle}>
          {sectionTitle('推荐意见')}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(16,185,129,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Scale size={18} color="#10b981" />
            </div>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '4px' }}>
                优选：{compMap.get(recommendation.preferred_offer_id)?.company ?? recommendation.preferred_offer_id}
                <span
                  style={{
                    marginLeft: '8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: confidenceColor(recommendation.confidence),
                  }}
                >
                  ({confidenceLabel(recommendation.confidence)}确信度)
                </span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-ink-2)', lineHeight: 1.5 }}>
                {recommendation.rationale}
              </div>
              {recommendation.caveats && recommendation.caveats.length > 0 && (
                <ul style={{ margin: '8px 0 0', paddingLeft: '18px', fontSize: '12.5px', color: 'var(--color-ink-3)' }}>
                  {recommendation.caveats.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Comparison table */}
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid var(--color-line)' }}>
          {sectionTitle('各维度对比')}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>
                <th
                  style={{
                    padding: '10px 18px',
                    textAlign: 'left',
                    background: 'var(--color-surface-2)',
                    borderBottom: '1px solid var(--color-line)',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--color-ink-3)',
                    letterSpacing: '0.03em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}
                >
                  维度
                </th>
                {offerIds.map((id) => (
                  <th
                    key={id}
                    style={{
                      padding: '10px 18px',
                      textAlign: 'right',
                      background: recommendation?.preferred_offer_id === id
                        ? 'rgba(16,185,129,0.06)'
                        : 'var(--color-surface-2)',
                      borderBottom: '1px solid var(--color-line)',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: recommendation?.preferred_offer_id === id ? '#10b981' : 'var(--color-ink)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {compMap.get(id)?.company ?? id}
                    {recommendation?.preferred_offer_id === id && ' ★'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { key: 'annual_total_compensation', label: '年总包', fmt: (v: number) => `${formatMoney(v)}元` },
                { key: 'effective_monthly', label: '月均到手（估）', fmt: (v: number) => `${formatMoney(v)}元` },
                { key: 'social_insurance_annual', label: '五险一金（年）', fmt: (v: number) => `${formatMoney(v)}元` },
                { key: 'probation_loss', label: '试用期损失', fmt: (v: number) => `${formatMoney(v)}元` },
                { key: 'stability_score', label: '稳定性评分', fmt: (v: number) => `${v}/10` },
                { key: 'growth_potential', label: '成长潜力', fmt: (v: string) => v },
              ].map(({ key, label, fmt }) => {
                const hasAny = offerIds.some((id) => {
                  const dims = compMap.get(id)?.dimensions;
                  return dims && key in dims && dims[key as keyof typeof dims] != null;
                });
                if (!hasAny) return null;
                return (
                  <tr key={key}>
                    <td
                      style={{
                        padding: '9px 18px',
                        borderBottom: '1px solid var(--color-line)',
                        color: 'var(--color-ink-3)',
                        fontWeight: 600,
                        fontSize: '12px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {label}
                    </td>
                    {offerIds.map((id) => {
                      const dims = compMap.get(id)?.dimensions ?? {};
                      const val = dims[key as keyof typeof dims];
                      return (
                        <td
                          key={id}
                          style={{
                            padding: '9px 18px',
                            borderBottom: '1px solid var(--color-line)',
                            textAlign: 'right',
                            color: 'var(--color-ink)',
                            fontFamily: typeof val === 'number' ? 'var(--font-mono)' : 'inherit',
                            fontWeight: 600,
                            background: recommendation?.preferred_offer_id === id
                              ? 'rgba(16,185,129,0.03)'
                              : 'transparent',
                          }}
                        >
                          {val != null ? (fmt as (v: unknown) => string)(val) : <span style={{ color: 'var(--color-ink-4)' }}>—</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Weighted scores */}
      {weighted_scores.length > 0 && weighted_scores.some((ws) => ws.total_score != null) && (
        <div style={cardStyle}>
          {sectionTitle('加权综合评分')}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {weighted_scores.map((ws) => (
              <div
                key={ws.offer_id}
                style={{
                  flex: 1,
                  minWidth: '100px',
                  background: 'var(--color-surface-2)',
                  borderRadius: '10px',
                  padding: '14px',
                  textAlign: 'center',
                  border: recommendation?.preferred_offer_id === ws.offer_id
                    ? '2px solid #10b981'
                    : '1px solid var(--color-line)',
                }}
              >
                <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--color-ink-2)', marginBottom: '6px' }}>
                  {ws.company}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '28px',
                    fontWeight: 800,
                    color: recommendation?.preferred_offer_id === ws.offer_id ? '#10b981' : 'var(--color-ink)',
                    lineHeight: 1,
                  }}
                >
                  {ws.total_score?.toFixed(0) ?? '—'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--color-ink-4)', marginTop: '3px' }}>总分</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hourly rate */}
      {hourly_rate_comparison.length > 0 && (
        <div style={cardStyle}>
          {sectionTitle('时薪对比（考虑实际工时）')}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {hourly_rate_comparison.map((hr: OfferHourlyRate) => (
              <div
                key={hr.offer_id}
                style={{
                  flex: 1,
                  minWidth: '100px',
                  background: 'var(--color-surface-2)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                }}
              >
                <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--color-ink-2)', marginBottom: '4px' }}>
                  {hr.company}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 800, color: 'var(--color-ink)' }}>
                  {hr.hourly_rate_rmb != null ? `¥${hr.hourly_rate_rmb.toFixed(0)}/h` : '周工时未知'}
                </div>
                {hr.weekly_hours != null && (
                  <div style={{ fontSize: '11px', color: 'var(--color-ink-4)', marginTop: '2px' }}>
                    {hr.weekly_hours}h/周
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risks & next actions */}
      {(risks.length > 0 || next_actions.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          {risks.length > 0 && (
            <div style={cardStyle}>
              {sectionTitle('风险提示')}
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: 'var(--color-ink-2)', lineHeight: 1.7 }}>
                {risks.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}
          {next_actions.length > 0 && (
            <div style={cardStyle}>
              {sectionTitle('建议下一步')}
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: 'var(--color-ink-2)', lineHeight: 1.7 }}>
                {next_actions.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Missing info */}
      {missing_info.length > 0 && (
        <div
          style={{
            background: 'rgba(245,158,11,0.07)',
            border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: '12px',
            padding: '14px 16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '10px',
            }}
          >
            <AlertCircle size={14} color="#f59e0b" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              缺失字段（补充后可提高分析质量）
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {(missing_info as OfferMissingInfo[]).map((m, i) => (
              <div key={i} style={{ fontSize: '12.5px', color: 'var(--color-ink-2)' }}>
                <span style={{ fontWeight: 700 }}>{m.offer_id}</span>
                {' · '}
                <span style={{ color: 'var(--color-ink)' }}>{m.field}</span>
                <span style={{ color: 'var(--color-ink-3)' }}> — {m.impact}</span>
              </div>
            ))}
          </div>
          {follow_up_questions.length > 0 && (
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(245,158,11,0.15)' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--color-ink-3)', marginBottom: '6px' }}>
                追问建议
              </div>
              {follow_up_questions.map((q, i) => (
                <div key={i} style={{ fontSize: '12.5px', color: 'var(--color-ink-2)', lineHeight: 1.5 }}>
                  · {q}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OfferComparatorPage() {
  // #53: 初始两张卡用固定 id(offer_1/offer_2),计数器从 3 起,只在事件回调(addOffer)里自增。
  // 不在 render/惰性初始化中读 ref —— 否则触发 react-hooks/refs「Cannot access refs during render」。
  const idRef = useRef(3);
  function nextId(): string {
    return `offer_${idRef.current++}`;
  }

  const [forms, setForms] = useState<OfferFormData[]>(() => [
    emptyForm('offer_1'),
    emptyForm('offer_2'),
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OfferCompareResult | null>(null);

  // ── Form state handlers ──────────────────────────────────────────────────

  function handleChange(id: string, key: keyof OfferFormData, val: string) {
    setForms((prev) => prev.map((f) => (f.id === id ? { ...f, [key]: val } : f)));
  }

  function addOffer() {
    if (forms.length >= 5) return;
    const newForm = emptyForm(nextId());
    setForms((prev) => [...prev, newForm]);
  }

  function removeOffer(id: string) {
    setForms((prev) => prev.filter((f) => f.id !== id));
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  async function handleCompare() {
    // Validate: company required; base_monthly must be a valid positive number (#68)
    for (const f of forms) {
      if (!f.company.trim()) {
        setError('请填写每个 offer 的公司名称');
        return;
      }
      const salary = Number(f.base_monthly);
      if (!f.base_monthly.trim() || isNaN(salary) || salary <= 0) {
        setError(`"${f.company || '某个 offer'}"的月薪必须填写有效正数（元）`);
        return;
      }
      if (f.probation_discount.trim()) {
        const pct = Number(f.probation_discount);
        if (isNaN(pct) || pct <= 0 || pct > 100) {
          setError(`"${f.company || '某个 offer'}"的试用期折扣必须在 1-100 之间`);
          return;
        }
      }
      // #54/#55: 检查所有可选数值字段是否合法（含 weekly_hours 范围校验）
      const optionalNumericKeys = Object.keys(NUMERIC_RULES) as Array<keyof OfferFormData>;
      for (const key of optionalNumericKeys) {
        const err = validateOptionalNumeric(key, f[key] as string);
        if (err) {
          setError(`"${f.company || '某个 offer'}"：${err}`);
          return;
        }
      }
    }

    setError(null);
    setLoading(true);
    setResult(null);

    try {
      const payload: OfferCompareRequest = {
        offers: forms.map(formToItem),
      };

      const data = await api.post<OfferCompareResult>('/offer-comparator/compare', payload);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

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
            Offer 比对
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--color-ink-3)', margin: 0 }}>
            多维度量化比较 · 中国市场特有要素 · 防编造分析
          </p>
        </div>

        {/* Offer forms */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {forms.map((form, index) => (
            <OfferCard
              key={form.id}
              form={form}
              index={index}
              onChange={handleChange}
              onRemove={removeOffer}
              canRemove={forms.length > 2}
            />
          ))}
        </div>

        {/* Add offer / compare buttons */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {forms.length < 5 && (
            <button
              onClick={addOffer}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '9px',
                border: '1.5px dashed var(--color-line-2)',
                background: 'transparent',
                color: 'var(--color-ink-3)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <Plus size={14} />
              添加 Offer（最多 5 个）
            </button>
          )}
          <button
            onClick={handleCompare}
            disabled={loading}
            style={{
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
              marginLeft: 'auto',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                分析中…
              </>
            ) : (
              <>
                <Scale size={15} />
                开始比对
              </>
            )}
          </button>
        </div>

        {/* Error state */}
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

        {/* Empty state (before first compare) */}
        {!loading && !error && !result && (
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
            <Scale size={28} />
            <p style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--color-ink-3)' }}>
              填写 2 个以上 offer 后点击「开始比对」
            </p>
            <p style={{ fontSize: '12.5px', margin: 0 }}>
              支持薪酬结构 · 五险一金 · 试用期折扣 · 时薪 · 成长潜力等多维度分析
            </p>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '40px',
              color: 'var(--color-ink-3)',
              fontSize: '14px',
            }}
          >
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            AI 正在分析中，通常需要 10-30 秒…
          </div>
        )}

        {/* Insufficient state */}
        {result && result.confidence === 'insufficient' && (
          <div
            style={{
              padding: '16px 18px',
              background: 'var(--color-surface-2)',
              borderRadius: '12px',
              border: '1px solid var(--color-line)',
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '8px' }}>
              信息不足，无法完成完整比较
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-ink-2)', margin: '0 0 10px' }}>
              {result.summary}
            </p>
            {(result.follow_up_questions ?? []).length > 0 && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-ink-3)', marginBottom: '6px' }}>
                  请补充以下信息后重试：
                </div>
                {(result.follow_up_questions ?? []).map((q, i) => (
                  <div key={i} style={{ fontSize: '13px', color: 'var(--color-ink-2)', lineHeight: 1.6 }}>
                    · {q}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Result panel */}
        {result && result.confidence !== 'insufficient' && (
          <ResultPanel result={result} />
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
