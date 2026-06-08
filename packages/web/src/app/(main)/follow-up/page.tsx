'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import type {
  FollowUpResult,
  FollowUpScenario,
} from '@/lib/types';
import {
  Loader2,
  Mail,
  Copy,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Clock,
} from 'lucide-react';

// ─── Validation messages ──────────────────────────────────────────────────────

const VALIDATION_MESSAGES = {
  thank_you_details_required:
    '面试详情是感谢信的核心，请描述面试时间、面试官及关键对话内容',
} as const;

// ─── Insufficient-state default guidance ─────────────────────────────────────

const INSUFFICIENT_DEFAULT_GUIDANCE =
  '请在左侧补充相关背景信息（如面试时间、面试官、公司岗位），再重新生成';

// ─── Scenario config ──────────────────────────────────────────────────────────

interface ScenarioConfig {
  label: string;
  desc: string;
  detailsLabel: string;
  detailsPlaceholder: string;
  detailsRequired: boolean;
  timing: string;
}

const SCENARIOS: Record<FollowUpScenario, ScenarioConfig> = {
  thank_you: {
    label: '面试感谢信',
    desc: '面试后24-48小时内发送',
    detailsLabel: '面试详情（必填，感谢信核心）',
    detailsPlaceholder: '2024-01-15，字节跳动产品经理面试，面试官张总，谈到了用户增长方法论和数据驱动决策…',
    detailsRequired: true,
    timing: '面试后24小时内',
  },
  status_inquiry: {
    label: '投递进度询问',
    desc: '投递14天+无回音',
    detailsLabel: '投递情况（可选）',
    detailsPlaceholder: '2024-01-01 投递字节跳动产品经理岗位，至今未收到回复…',
    detailsRequired: false,
    timing: '投递14天后',
  },
  rejection_reply: {
    label: '拒信礼貌回复',
    desc: '收到拒信后1-2天内',
    detailsLabel: '拒信内容摘要（可选）',
    detailsPlaceholder: '收到XXX公司拒信，申请产品经理岗位…',
    detailsRequired: false,
    timing: '收到拒信后1-2天',
  },
  offer_urge: {
    label: 'Offer 催促',
    desc: 'Offer 期限前3-5天',
    detailsLabel: 'Offer 情况（推荐填写）',
    detailsPlaceholder: 'XXX公司 offer，截止日期2024-02-01，需确认是否有延期空间…',
    detailsRequired: false,
    timing: 'Offer 截止前3-5天',
  },
  acceptance: {
    label: '录用确认',
    desc: '正式接受 offer 时',
    detailsLabel: '入职信息（推荐填写）',
    detailsPlaceholder: '接受XXX公司产品经理offer，预计入职日期2024-03-01…',
    detailsRequired: false,
    timing: '接受 offer 当天',
  },
};

const SCENARIO_KEYS = Object.keys(SCENARIOS) as FollowUpScenario[];

// ─── Confidence display ───────────────────────────────────────────────────────

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

// ─── Tone labels ──────────────────────────────────────────────────────────────

const TONE_LABELS: Record<string, string> = {
  formal: '正式',
  semi_formal: '半正式',
  casual: '轻松',
  grateful: '感谢',
  professional: '专业',
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
        background: `${CONFIDENCE_COLORS[confidence]}22`,
        color: CONFIDENCE_COLORS[confidence],
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FollowUpPage() {
  const [scenario, setScenario] = useState<FollowUpScenario>('thank_you');
  const [interviewDetails, setInterviewDetails] = useState('');
  const [contact, setContact] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FollowUpResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const config = SCENARIOS[scenario];

  async function handleSubmit() {
    if (config.detailsRequired && !interviewDetails.trim()) {
      setError(VALIDATION_MESSAGES.thank_you_details_required);
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const data = await api.post<FollowUpResult>('/follow-up/generate', {
        scenario,
        interview_details: interviewDetails.trim() || undefined,
        contact: contact.trim() || undefined,
        // TODO(application_id): 后端 DTO 支持 application_id 关联投递记录，但前端目前
        // 无投递管理模块，无法提供此 ID。待投递跟踪功能上线后，从路由参数或 context
        // 读取 application_id 并在此传入，以解锁跟进消息与投递记录的联动能力。
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!result?.message_draft) return;
    if (!navigator.clipboard) {
      setError('当前环境不支持自动复制，请手动选中文本后复制');
      return;
    }
    navigator.clipboard.writeText(result.message_draft).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      setError('复制失败，请手动选中文本后复制');
    });
  }

  function handleScenarioChange(s: FollowUpScenario) {
    setScenario(s);
    setResult(null);
    setError(null);
    setInterviewDetails('');
    setContact('');
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
          跟进消息
        </h1>
        <p style={{ fontSize: '13.5px', color: 'var(--color-ink-3)' }}>
          感谢信 · 进度询问 · 拒信回复 · Offer 催促 · 录用确认
        </p>
      </div>

      {/* Scenario picker */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          flexWrap: 'wrap' as const,
          marginBottom: '20px',
          flexShrink: 0,
        }}
      >
        {SCENARIO_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => handleScenarioChange(key)}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: '1px solid',
              borderColor: scenario === key ? 'var(--color-brand)' : 'var(--color-line)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: scenario === key ? 700 : 500,
              background: scenario === key ? 'var(--color-brand-soft)' : 'var(--color-surface)',
              color: scenario === key ? 'var(--color-brand-ink)' : 'var(--color-ink-2)',
              fontFamily: 'inherit',
              transition: 'all 0.12s',
            }}
          >
            {SCENARIOS[key].label}
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
        {/* Left: form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
          <div style={cardStyle}>
            {/* Scenario hint */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'var(--color-surface-2)',
                marginBottom: '16px',
              }}
            >
              <Clock size={13} color="var(--color-ink-3)" />
              <span style={{ fontSize: '12.5px', color: 'var(--color-ink-3)' }}>
                推荐时机：{config.timing}
              </span>
            </div>

            {/* Details field */}
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>
                {config.detailsLabel}
              </label>
              <textarea
                style={{
                  ...inputStyle,
                  height: '110px',
                  resize: 'vertical' as const,
                  lineHeight: '1.6',
                }}
                value={interviewDetails}
                onChange={(e) => setInterviewDetails(e.target.value)}
                placeholder={config.detailsPlaceholder}
              />
              {config.detailsRequired && !interviewDetails.trim() && (
                <div style={{ fontSize: '11.5px', color: 'var(--color-warn, #f59e0b)', marginTop: '4px' }}>
                  感谢信需要面试详情才能个性化生成，否则无法引用具体对话
                </div>
              )}
            </div>

            {/* Contact field */}
            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>联系人信息（可选）</label>
              <input
                style={inputStyle}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="张总，字节跳动产品总监"
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
                  生成中…
                </>
              ) : (
                '生成跟进消息'
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
              AI 正在生成消息草稿…
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
                <div style={{ fontSize: '13px', color: 'var(--color-ink-2)' }}>
                  {result.summary}
                </div>
                <ConfidenceBadge confidence={result.confidence} />
              </div>

              {/* Insufficient state */}
              {result.confidence === 'insufficient' ? (
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
                    信息不足，无法生成消息
                  </p>
                  {result.cannot_determine.length > 0 ? (
                    <div style={{ textAlign: 'left', width: '100%' }}>
                      <TagList items={result.cannot_determine} label="需补充的信息" />
                    </div>
                  ) : (
                    <p style={{ fontSize: '13px', color: 'var(--color-ink-3)', marginTop: '4px' }}>
                      {INSUFFICIENT_DEFAULT_GUIDANCE}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {/* Message draft */}
                  <div style={cardStyle}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '12px',
                      }}
                    >
                      <span style={{ ...labelStyle, marginBottom: 0 }}>消息草稿</span>
                      <button
                        onClick={handleCopy}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid var(--color-line)',
                          background: 'var(--color-surface)',
                          color: copied ? 'var(--color-success)' : 'var(--color-ink)',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <Copy size={12} />
                        {copied ? '已复制' : '复制'}
                      </button>
                    </div>
                    <div
                      style={{
                        background: 'var(--color-surface-2)',
                        borderRadius: '12px',
                        padding: '16px 18px',
                        fontSize: '14px',
                        lineHeight: '1.75',
                        color: 'var(--color-ink)',
                        whiteSpace: 'pre-wrap' as const,
                      }}
                    >
                      {result.message_draft}
                    </div>
                  </div>

                  {/* Timing advice */}
                  <div style={cardStyle}>
                    <div style={labelStyle}>发送时机</div>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' as const, marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '11.5px', color: 'var(--color-ink-3)', marginBottom: '2px' }}>
                          建议发送时间
                        </div>
                        <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-ink)' }}>
                          {result.timing_advice.recommended_send_time}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11.5px', color: 'var(--color-ink-3)', marginBottom: '2px' }}>
                          时机是否合适
                        </div>
                        <div
                          style={{
                            fontSize: '13.5px',
                            fontWeight: 600,
                            color: result.timing_advice.is_timing_appropriate
                              ? 'var(--color-success)'
                              : 'var(--color-warn, #f59e0b)',
                          }}
                        >
                          {result.timing_advice.is_timing_appropriate ? '适合发送' : '时机欠佳'}
                        </div>
                      </div>
                    </div>
                    {result.timing_advice.timing_note && (
                      <div style={{ fontSize: '13px', color: 'var(--color-ink-3)' }}>
                        {result.timing_advice.timing_note}
                      </div>
                    )}
                  </div>

                  {/* Tone guide */}
                  <div style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <span style={{ ...labelStyle, marginBottom: 0 }}>语气指南</span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 9px',
                          borderRadius: '999px',
                          background: 'var(--color-brand-soft)',
                          color: 'var(--color-brand-ink)',
                        }}
                      >
                        {TONE_LABELS[result.tone_guide.tone] ?? result.tone_guide.tone}
                      </span>
                    </div>
                    <TagList items={result.tone_guide.key_tone_points} label="核心要点" />
                    <TagList items={result.tone_guide.avoid} label="避免表达" />
                  </div>

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
                    {showDetails ? '收起建议' : '查看更多建议'}
                  </button>

                  {showDetails && (
                    <div style={cardStyle}>
                      <TagList items={result.recommendations} label="额外建议" />
                      {result.risks.length > 0 && <TagList items={result.risks} label="注意风险" />}
                      {result.next_actions.length > 0 && (
                        <TagList items={result.next_actions} label="后续行动" />
                      )}
                    </div>
                  )}
                </>
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
                <Mail size={24} color="var(--color-ink-4)" />
              </div>
              <p
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--color-ink-2)',
                  letterSpacing: '-0.01em',
                }}
              >
                选择场景，填写信息，生成跟进消息
              </p>
              <p style={{ fontSize: '13.5px', color: 'var(--color-ink-4)' }}>
                支持5种场景：感谢信、进度询问、拒信回复、Offer催促、录用确认
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
