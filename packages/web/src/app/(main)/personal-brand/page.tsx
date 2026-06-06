'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import type {
  BrandStrategyResult,
  BrandStrategyRequest,
  PortfolioAdviceResult,
  PortfolioAdviceRequest,
  BrandFocus,
} from '@/lib/types';
import {
  Loader2,
  Sparkles,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  BadgeCheck,
  Target,
  Lightbulb,
  FolderGit2,
  ShieldX,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'brand' | 'portfolio';

// ─── Constants ────────────────────────────────────────────────────────────────

const BRAND_TYPE_LABELS: Record<string, string> = {
  technical_depth: '技术深度型',
  industry_insight: '行业洞察型',
  career_experience: '职业经验型',
};

const BRAND_FOCUS_OPTIONS: Array<{ value: BrandFocus; label: string }> = [
  { value: 'auto', label: '自动判断' },
  { value: 'technical_depth', label: '技术深度型' },
  { value: 'industry_insight', label: '行业洞察型' },
  { value: 'career_experience', label: '职业经验型' },
];

const PROJECT_SIZE_LABELS: Record<string, string> = {
  small: '小型（2-4周）',
  medium: '中型（1-3个月）',
  large: '大型（3-6个月）',
};

const CONTENT_FORMAT_LABELS: Record<string, string> = {
  article: '文章',
  tutorial: '教程',
  case_study: '案例研究',
  opinion: '观点',
  thread: '帖子串',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'var(--color-danger)',
  medium: 'var(--color-brand)',
  low: 'var(--color-ink-3)',
};

const CONFIDENCE_LABELS: Record<string, string> = {
  high: '信息充足',
  medium: '信息较完整',
  low: '信息有限',
  insufficient: '信息不足',
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'var(--color-success)',
  medium: 'var(--color-brand)',
  low: 'var(--color-warn, #f59e0b)',
  insufficient: 'var(--color-danger)',
};

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
        background: `${CONFIDENCE_COLORS[confidence] ?? 'var(--color-ink-4)'}22`,
        color: CONFIDENCE_COLORS[confidence] ?? 'var(--color-ink-3)',
      }}
    >
      {CONFIDENCE_LABELS[confidence] ?? confidence}
    </span>
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

function SectionTitle({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '12px' }}>
      {icon}
      <span style={{ ...labelStyle, marginBottom: 0 }}>{text}</span>
    </div>
  );
}

function InsufficientState({ items }: { items: string[] }) {
  return (
    <div
      style={{
        ...cardStyle,
        textAlign: 'center',
        padding: '32px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      <AlertCircle size={28} color="var(--color-warn, #f59e0b)" />
      <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink-2)' }}>
        信息不足，无法生成建议
      </p>
      {items.length > 0 && (
        <div style={{ textAlign: 'left', width: '100%' }}>
          <TagList items={items} label="需补充的信息" />
        </div>
      )}
    </div>
  );
}

// ─── Brand Strategy Result Panel ──────────────────────────────────────────────

function BrandResultPanel({ result }: { result: BrandStrategyResult }) {
  const [showMore, setShowMore] = useState(false);

  if (result.confidence === 'insufficient') {
    return <InsufficientState items={result.cannot_determine} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
      {/* Summary + confidence */}
      <div style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ fontSize: '13px', color: 'var(--color-ink-2)' }}>{result.summary}</div>
        <ConfidenceBadge confidence={result.confidence} />
      </div>

      {/* Brand strategy core */}
      <div style={cardStyle}>
        <SectionTitle icon={<BadgeCheck size={14} color="var(--color-brand)" />} text="品牌定位" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' as const }}>
          <span
            style={{
              padding: '4px 12px',
              borderRadius: '999px',
              background: 'var(--color-brand-soft)',
              color: 'var(--color-brand-ink)',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            {BRAND_TYPE_LABELS[result.brand_strategy?.type] ?? result.brand_strategy?.type}
          </span>
        </div>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--color-ink)',
            marginBottom: '10px',
            padding: '10px 14px',
            background: 'var(--color-surface-2)',
            borderRadius: '10px',
          }}
        >
          {result.brand_strategy?.positioning}
        </div>
        {result.brand_strategy?.evidence_basis?.length > 0 && (
          <div>
            <div style={{ ...labelStyle, marginBottom: '4px' }}>依据来源</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
              {result.brand_strategy.evidence_basis.map((b, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: '11.5px',
                    padding: '2px 9px',
                    borderRadius: '999px',
                    background: 'var(--color-surface-2)',
                    color: 'var(--color-ink-3)',
                  }}
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Platform actions */}
      {result.platform_actions?.length > 0 && (
        <div style={cardStyle}>
          <SectionTitle icon={<Target size={14} color="var(--color-brand)" />} text="平台行动计划" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {result.platform_actions.map((pa, i) => (
              <div
                key={i}
                style={{
                  padding: '10px 14px',
                  background: 'var(--color-surface-2)',
                  borderRadius: '10px',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-start',
                }}
              >
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '999px',
                    background: `${PRIORITY_COLORS[pa.priority] ?? 'var(--color-ink-4)'}22`,
                    color: PRIORITY_COLORS[pa.priority] ?? 'var(--color-ink-3)',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  {pa.priority === 'high' ? '高' : pa.priority === 'medium' ? '中' : '低'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '3px' }}>
                    <span style={{ color: 'var(--color-brand-ink)', fontWeight: 700 }}>{pa.platform}</span>
                    {' — '}
                    {pa.action}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-ink-3)' }}>{pa.rationale}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content ideas */}
      {result.content_ideas?.length > 0 && (
        <div style={cardStyle}>
          <SectionTitle icon={<Lightbulb size={14} color="var(--color-brand)" />} text="内容创意" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {result.content_ideas.map((ci, i) => (
              <div
                key={i}
                style={{ padding: '10px 14px', background: 'var(--color-surface-2)', borderRadius: '10px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-ink)' }}>{ci.title}</div>
                  {ci.format && (
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: '999px',
                        background: 'var(--color-surface)',
                        color: 'var(--color-ink-3)',
                        border: '1px solid var(--color-line)',
                      }}
                    >
                      {CONTENT_FORMAT_LABELS[ci.format] ?? ci.format}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--color-ink-2)', marginBottom: '3px' }}>{ci.angle}</div>
                <div style={{ fontSize: '11.5px', color: 'var(--color-ink-4)' }}>来源：{ci.source_experience}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Profile optimization */}
      {result.profile_optimization?.length > 0 && (
        <div style={cardStyle}>
          <SectionTitle icon={<Sparkles size={14} color="var(--color-brand)" />} text="Profile 优化建议" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {result.profile_optimization.map((po, i) => (
              <div key={i} style={{ padding: '10px 14px', background: 'var(--color-surface-2)', borderRadius: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-brand-ink)', marginBottom: '4px' }}>
                  {po.platform}
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--color-ink-3)', marginBottom: '4px' }}>
                  现状：{po.current_issue}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-ink-2)' }}>
                  建议：{po.suggested_change}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expandable: recommendations, risks, next_actions */}
      <button
        onClick={() => setShowMore((v) => !v)}
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
        {showMore ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {showMore ? '收起建议' : '查看更多建议'}
      </button>

      {showMore && (
        <div style={cardStyle}>
          <TagList items={result.recommendations} label="额外建议" />
          {result.risks.length > 0 && <TagList items={result.risks} label="注意风险" />}
          {result.next_actions.length > 0 && <TagList items={result.next_actions} label="后续行动" />}
        </div>
      )}
    </div>
  );
}

// ─── Portfolio Result Panel ───────────────────────────────────────────────────

function PortfolioResultPanel({ result }: { result: PortfolioAdviceResult }) {
  const [showMore, setShowMore] = useState(false);

  if (result.confidence === 'insufficient') {
    return <InsufficientState items={result.cannot_determine} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
      {/* Summary + confidence */}
      <div style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ fontSize: '13px', color: 'var(--color-ink-2)' }}>{result.summary}</div>
        <ConfidenceBadge confidence={result.confidence} />
      </div>

      {/* Project ideas */}
      {result.project_ideas?.length > 0 && (
        <div style={cardStyle}>
          <SectionTitle icon={<FolderGit2 size={14} color="var(--color-brand)" />} text="推荐项目方向" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {result.project_ideas.map((pi, i) => (
              <div
                key={i}
                style={{
                  padding: '14px 16px',
                  background: 'var(--color-surface-2)',
                  borderRadius: '12px',
                  border: '1px solid var(--color-line)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-ink)' }}>{pi.title}</div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0, marginLeft: '8px' }}>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: 'var(--color-brand-soft)',
                        color: 'var(--color-brand-ink)',
                      }}
                    >
                      {PROJECT_SIZE_LABELS[pi.size] ?? pi.size}
                    </span>
                    {pi.github_visibility && (
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: 'var(--color-surface)',
                          color: 'var(--color-ink-3)',
                          border: '1px solid var(--color-line)',
                        }}
                      >
                        GitHub 可开源
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: '13px', color: 'var(--color-ink-2)', marginBottom: '8px' }}>{pi.description}</div>

                {pi.skills_demonstrated?.length > 0 && (
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' as const, marginBottom: '8px' }}>
                    {pi.skills_demonstrated.map((s, j) => (
                      <span
                        key={j}
                        style={{
                          fontSize: '11.5px',
                          padding: '2px 9px',
                          borderRadius: '999px',
                          background: 'var(--color-surface)',
                          color: 'var(--color-ink-3)',
                          border: '1px solid var(--color-line)',
                        }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                {pi.interview_talking_points?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-ink-4)', marginBottom: '4px', letterSpacing: '0.04em' }}>
                      面试可展示
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {pi.interview_talking_points.map((tp, j) => (
                        <div key={j} style={{ fontSize: '12.5px', color: 'var(--color-ink-3)', paddingLeft: '6px' }}>
                          • {tp}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Anti patterns */}
      {result.anti_patterns?.length > 0 && (
        <div style={cardStyle}>
          <SectionTitle icon={<ShieldX size={14} color="var(--color-danger)" />} text="应避免的反模式" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {result.anti_patterns.map((ap, i) => (
              <div
                key={i}
                style={{ padding: '10px 14px', background: 'var(--color-danger-soft, rgba(239,68,68,0.07))', borderRadius: '10px' }}
              >
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '3px' }}>
                  {ap.pattern}
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--color-ink-3)' }}>{ap.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expandable */}
      <button
        onClick={() => setShowMore((v) => !v)}
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
        {showMore ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {showMore ? '收起建议' : '查看更多建议'}
      </button>

      {showMore && (
        <div style={cardStyle}>
          <TagList items={result.recommendations} label="额外建议" />
          {result.risks.length > 0 && <TagList items={result.risks} label="注意风险" />}
          {result.next_actions.length > 0 && <TagList items={result.next_actions} label="后续行动" />}
        </div>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
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
        {icon}
      </div>
      <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink-2)', letterSpacing: '-0.01em' }}>
        {title}
      </p>
      <p style={{ fontSize: '13.5px', color: 'var(--color-ink-4)' }}>{desc}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PersonalBrandPage() {
  const [activeTab, setActiveTab] = useState<TabId>('brand');

  // Brand strategy state
  const [profileText, setProfileText] = useState('');
  const [brandFocus, setBrandFocus] = useState<BrandFocus>('auto');
  const [targetAudience, setTargetAudience] = useState('');
  const [brandLoading, setBrandLoading] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);
  const [brandResult, setBrandResult] = useState<BrandStrategyResult | null>(null);

  // Portfolio advice state
  const [portfolioProfileText, setPortfolioProfileText] = useState('');
  const [skillGapsText, setSkillGapsText] = useState('');
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [portfolioResult, setPortfolioResult] = useState<PortfolioAdviceResult | null>(null);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function parseProfile(text: string): Record<string, unknown> | null {
    const trimmed = text.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      return { raw_text: trimmed };
    }
  }

  async function handleBrandSubmit() {
    const profile = parseProfile(profileText);
    if (!profile) {
      setBrandError('请填写用户画像（JSON 格式或文本描述）');
      return;
    }
    setBrandError(null);
    setBrandLoading(true);
    setBrandResult(null);
    try {
      const body: BrandStrategyRequest = { profile, brand_focus: brandFocus };
      if (targetAudience.trim()) body.target_audience = targetAudience.trim();
      const data = await api.post<BrandStrategyResult>('/personal-brand/brand-strategy', body);
      setBrandResult(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('profile_insufficient') || msg.includes('信息')) {
        setBrandError('用户画像信息不足，请补充 experience（工作/项目经历）、skills（技能列表）或 education（教育背景）');
      } else {
        setBrandError(msg || '生成失败，请稍后重试');
      }
    } finally {
      setBrandLoading(false);
    }
  }

  async function handlePortfolioSubmit() {
    const profile = parseProfile(portfolioProfileText);
    if (!profile) {
      setPortfolioError('请填写用户画像（JSON 格式或文本描述）');
      return;
    }
    setPortfolioError(null);
    setPortfolioLoading(true);
    setPortfolioResult(null);
    try {
      const body: PortfolioAdviceRequest = { profile };
      const gaps = skillGapsText.trim().split('\n').map((g) => g.trim()).filter(Boolean);
      if (gaps.length > 0) body.skill_gaps = gaps;
      const data = await api.post<PortfolioAdviceResult>('/personal-brand/portfolio-advice', body);
      setPortfolioResult(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('profile_insufficient') || msg.includes('信息')) {
        setPortfolioError('用户画像信息不足，请补充 experience（工作/项目经历）、skills（技能列表）或 education（教育背景）');
      } else {
        setPortfolioError(msg || '生成失败，请稍后重试');
      }
    } finally {
      setPortfolioLoading(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

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
          个人品牌
        </h1>
        <p style={{ fontSize: '13.5px', color: 'var(--color-ink-3)' }}>
          品牌定位 · 平台行动 · 内容创意 · 作品集规划
        </p>
      </div>

      {/* Tab switcher */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          marginBottom: '20px',
          flexShrink: 0,
        }}
      >
        {([
          { id: 'brand' as TabId, label: '品牌策略' },
          { id: 'portfolio' as TabId, label: '作品集规划' },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 20px',
              borderRadius: '10px',
              border: '1px solid',
              borderColor: activeTab === tab.id ? 'var(--color-brand)' : 'var(--color-line)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: activeTab === tab.id ? 700 : 500,
              background: activeTab === tab.id ? 'var(--color-brand-soft)' : 'var(--color-surface)',
              color: activeTab === tab.id ? 'var(--color-brand-ink)' : 'var(--color-ink-2)',
              fontFamily: 'inherit',
              transition: 'all 0.12s',
            }}
          >
            {tab.label}
          </button>
        ))}
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
        {/* ── Brand Strategy Tab ─────────────────────────────────────────────── */}
        {activeTab === 'brand' && (
          <>
            {/* Left: form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
              <div style={cardStyle}>
                {/* Profile input */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={labelStyle}>用户画像（必填）</label>
                  <textarea
                    style={{ ...inputStyle, height: '120px', resize: 'vertical' as const, lineHeight: '1.6' }}
                    value={profileText}
                    onChange={(e) => setProfileText(e.target.value)}
                    placeholder={'{\n  "name": "张三",\n  "skills": { "technical": [...] },\n  "experience": [...]\n}'}
                  />
                  <div style={{ fontSize: '11.5px', color: 'var(--color-ink-4)', marginTop: '4px' }}>
                    支持 JSON 格式的 profile-builder 输出，或直接粘贴文本描述
                  </div>
                </div>

                {/* Brand focus */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={labelStyle}>品牌方向偏好</label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
                    {BRAND_FOCUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setBrandFocus(opt.value)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '8px',
                          border: '1px solid',
                          borderColor: brandFocus === opt.value ? 'var(--color-brand)' : 'var(--color-line)',
                          cursor: 'pointer',
                          fontSize: '12.5px',
                          fontWeight: brandFocus === opt.value ? 700 : 500,
                          background: brandFocus === opt.value ? 'var(--color-brand-soft)' : 'var(--color-surface)',
                          color: brandFocus === opt.value ? 'var(--color-brand-ink)' : 'var(--color-ink-2)',
                          fontFamily: 'inherit',
                          transition: 'all 0.12s',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target audience */}
                <div style={{ marginBottom: '18px' }}>
                  <label style={labelStyle}>目标受众（可选）</label>
                  <input
                    style={inputStyle}
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="如：前端开发者、产品经理招聘者、技术团队负责人"
                  />
                </div>

                {/* Error */}
                {brandError && (
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
                    {brandError}
                  </div>
                )}

                <button onClick={handleBrandSubmit} disabled={brandLoading} style={btnPrimaryStyle(brandLoading)}>
                  {brandLoading ? (
                    <>
                      <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                      生成中…
                    </>
                  ) : (
                    '生成品牌策略'
                  )}
                </button>
              </div>
            </div>

            {/* Right: result */}
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {brandLoading ? (
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
                  AI 正在分析品牌定位…
                </div>
              ) : brandResult ? (
                <BrandResultPanel result={brandResult} />
              ) : (
                <EmptyState
                  icon={<Sparkles size={24} color="var(--color-ink-4)" />}
                  title="填写画像，生成个人品牌策略"
                  desc="基于真实技能和经历，给出平台行动计划和内容创意"
                />
              )}
            </div>
          </>
        )}

        {/* ── Portfolio Tab ─────────────────────────────────────────────────── */}
        {activeTab === 'portfolio' && (
          <>
            {/* Left: form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
              <div style={cardStyle}>
                {/* Profile input */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={labelStyle}>用户画像（必填）</label>
                  <textarea
                    style={{ ...inputStyle, height: '120px', resize: 'vertical' as const, lineHeight: '1.6' }}
                    value={portfolioProfileText}
                    onChange={(e) => setPortfolioProfileText(e.target.value)}
                    placeholder={'{\n  "name": "李四",\n  "skills": { "technical": [...] },\n  "experience": [...]\n}'}
                  />
                </div>

                {/* Skill gaps */}
                <div style={{ marginBottom: '18px' }}>
                  <label style={labelStyle}>技能差距（可选，每行一项）</label>
                  <textarea
                    style={{ ...inputStyle, height: '80px', resize: 'vertical' as const, lineHeight: '1.6' }}
                    value={skillGapsText}
                    onChange={(e) => setSkillGapsText(e.target.value)}
                    placeholder={'系统设计\n分布式架构\n数据库优化'}
                  />
                  <div style={{ fontSize: '11.5px', color: 'var(--color-ink-4)', marginTop: '4px' }}>
                    来自技能差距分析的输出，可提升推荐精准度
                  </div>
                </div>

                {/* Error */}
                {portfolioError && (
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
                    {portfolioError}
                  </div>
                )}

                <button onClick={handlePortfolioSubmit} disabled={portfolioLoading} style={btnPrimaryStyle(portfolioLoading)}>
                  {portfolioLoading ? (
                    <>
                      <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                      生成中…
                    </>
                  ) : (
                    '生成作品集规划'
                  )}
                </button>
              </div>
            </div>

            {/* Right: result */}
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {portfolioLoading ? (
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
                  AI 正在分析项目方向…
                </div>
              ) : portfolioResult ? (
                <PortfolioResultPanel result={portfolioResult} />
              ) : (
                <EmptyState
                  icon={<FolderGit2 size={24} color="var(--color-ink-4)" />}
                  title="填写画像，生成作品集推荐"
                  desc="基于真实技能锚定项目方向，并列出应避免的反模式"
                />
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
