'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type {
  Application,
  ApplicationStrategyRequest,
  ApplicationStrategyResult,
  ApplicationCompanyTier,
} from '@/lib/types';
import { TrackerStats } from '@/components/tracker/tracker-stats';
import { KanbanBoard } from '@/components/tracker/kanban-board';
import { ApplicationForm } from '@/components/tracker/application-form';
import {
  Plus,
  Briefcase,
  Target,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  LayoutList,
} from 'lucide-react';

// ─── Strategy panel ───────────────────────────────────────────────────────────

type StrategyState = 'idle' | 'loading' | 'done' | 'error' | 'insufficient';

const TIER_LABELS: Record<ApplicationCompanyTier['tier'], string> = {
  stretch: '冲刺目标',
  target: '核心目标',
  safety: '保底目标',
};

const TIER_COLORS: Record<ApplicationCompanyTier['tier'], string> = {
  stretch: 'var(--color-warn)',
  target: 'var(--color-brand)',
  safety: 'var(--color-success)',
};

const CONFIDENCE_LABELS: Record<ApplicationStrategyResult['confidence'], string> = {
  high: '高',
  medium: '中',
  low: '低',
  insufficient: '信息不足',
};

// m8 审计校准:接收页面已拉取的 applications 列表,预填"当前在投公司",不让用户重打一遍。
function StrategyPanel({ applications }: { applications: Application[] }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<StrategyState>('idle');
  const [result, setResult] = useState<ApplicationStrategyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<ApplicationStrategyRequest>({
    user_profile: '',
    application_timeline: '',
    current_applications: [],
  });
  const [appsInput, setAppsInput] = useState('');
  // 只预填一次:applications 首次到手时把公司名塞进输入框,之后用户编辑不会被覆盖。
  // Defer via setTimeout 避免 set-state-in-effect 同步 cascade 问题(同款处理见 cover-letter/page.tsx)。
  const prefilledRef = useRef(false);
  useEffect(() => {
    if (prefilledRef.current || applications.length === 0) return;
    const companies = Array.from(new Set(applications.map((a) => a.company).filter(Boolean)));
    if (companies.length === 0) return;
    prefilledRef.current = true;
    setTimeout(() => setAppsInput(companies.join('，')), 0);
  }, [applications]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.user_profile.trim()) return;

    setState('loading');
    setError(null);
    setResult(null);

    try {
      const current_applications = appsInput
        .split(/[，,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);

      const data = await api.post<ApplicationStrategyResult>('/applications/strategy', {
        user_profile: form.user_profile,
        application_timeline: form.application_timeline || undefined,
        current_applications: current_applications.length > 0 ? current_applications : undefined,
      });

      if (data.confidence === 'insufficient') {
        setState('insufficient');
      } else {
        setState('done');
      }
      setResult(data);
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : '生成失败，请稍后重试');
    }
  }

  function handleReset() {
    setState('idle');
    setResult(null);
    setError(null);
  }

  return (
    <div
      className="lg"
      style={{
        marginBottom: '20px',
        flexShrink: 0,
      }}
    >
      {/* Collapsible header */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <Target size={16} color="var(--color-brand)" />
          <span
            style={{
              fontFamily: 'var(--serif)',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--color-ink)',
              letterSpacing: '-0.01em',
            }}
          >
            制定投递策略
          </span>
          <span
            style={{
              fontSize: '11px',
              color: 'var(--color-ink-4)',
              fontWeight: 500,
              padding: '2px 8px',
              background: 'rgba(47,143,255,.05)',
              border: '1px solid var(--hair)',
              borderRadius: '5px',
            }}
          >
            AI 生成
          </span>
        </div>
        {open ? (
          <ChevronUp size={15} color="var(--color-ink-3)" />
        ) : (
          <ChevronDown size={15} color="var(--color-ink-3)" />
        )}
      </button>

      {open && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--color-line-2)' }}>
          {/* Form — visible when idle */}
          {(state === 'idle' || state === 'error') && (
            <form onSubmit={handleSubmit} style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: 'var(--color-ink-2)',
                      marginBottom: '5px',
                    }}
                  >
                    用户画像 <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <textarea
                    value={form.user_profile}
                    onChange={(e) => setForm((f) => ({ ...f, user_profile: e.target.value }))}
                    placeholder="例：应届本科生，计算机专业，有2段后端实习，熟悉Java/Spring，目标互联网后端岗位，期望城市上海"
                    required
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--color-line)',
                      fontSize: '13px',
                      color: 'var(--color-ink)',
                      background: 'var(--color-surface)',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                      lineHeight: 1.5,
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: 'var(--color-ink-2)',
                      marginBottom: '5px',
                    }}
                  >
                    投递时间安排
                    <span style={{ fontWeight: 400, color: 'var(--color-ink-4)', marginLeft: '4px' }}>
                      （可选）
                    </span>
                  </label>
                  <input
                    type="text"
                    value={form.application_timeline}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, application_timeline: e.target.value }))
                    }
                    placeholder="例：秋招，截止11月底"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--color-line)',
                      fontSize: '13px',
                      color: 'var(--color-ink)',
                      background: 'var(--color-surface)',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: 'var(--color-ink-2)',
                      marginBottom: '5px',
                    }}
                  >
                    当前在投公司
                    <span style={{ fontWeight: 400, color: 'var(--color-ink-4)', marginLeft: '4px' }}>
                      （可选，逗号分隔）
                    </span>
                  </label>
                  <input
                    type="text"
                    value={appsInput}
                    onChange={(e) => setAppsInput(e.target.value)}
                    placeholder="例：字节跳动，腾讯，美团"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--color-line)',
                      fontSize: '13px',
                      color: 'var(--color-ink)',
                      background: 'var(--color-surface)',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {state === 'error' && error && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      padding: '10px 12px',
                      background: 'var(--color-danger-soft)',
                      borderRadius: '8px',
                    }}
                  >
                    <AlertCircle size={14} color="var(--color-danger)" style={{ marginTop: '1px', flexShrink: 0 }} />
                    <span style={{ fontSize: '12.5px', color: 'var(--color-danger)', lineHeight: 1.5 }}>
                      {error}
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignSelf: 'flex-start' }}>
                  <button
                    type="submit"
                    disabled={!form.user_profile.trim()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '7px',
                      padding: '9px 18px',
                      borderRadius: 'var(--radius-default)',
                      border: 'none',
                      background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      opacity: form.user_profile.trim() ? 1 : 0.5,
                      boxShadow: '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
                      transition: 'opacity 0.12s',
                    }}
                  >
                    <Target size={14} />
                    生成策略
                  </button>
                  <span style={{ fontSize: '11px', color: 'var(--color-ink-4)', fontWeight: 500 }}>消耗 1 点</span>
                </div>
              </div>
            </form>
          )}

          {/* Loading state */}
          {state === 'loading' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '24px 0',
                color: 'var(--color-ink-3)',
                fontSize: '13.5px',
              }}
            >
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              AI 正在分析画像，生成个性化投递策略…
            </div>
          )}

          {/* Insufficient state */}
          {state === 'insufficient' && result && (
            <div style={{ marginTop: '16px' }}>
              <div
                style={{
                  padding: '14px 16px',
                  background: 'var(--color-warn-soft)',
                  borderRadius: '10px',
                  marginBottom: '12px',
                }}
              >
                <p
                  style={{
                    margin: '0 0 8px',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    color: 'var(--color-ink)',
                  }}
                >
                  画像信息不足，无法生成完整策略
                </p>
                <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--color-ink-3)', lineHeight: 1.5 }}>
                  {result.summary}
                </p>
              </div>

              {/* Cannot-determine items — honest degradation signal */}
              {result.cannot_determine.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <p
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--color-ink-3)',
                      marginBottom: '6px',
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase',
                    }}
                  >
                    待补充信息
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '16px' }}>
                    {result.cannot_determine.map((c, i) => (
                      <li
                        key={i}
                        style={{ fontSize: '12.5px', color: 'var(--color-ink-2)', lineHeight: 1.6 }}
                      >
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <p
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--color-ink-3)',
                    marginBottom: '6px',
                    letterSpacing: '0.02em',
                    textTransform: 'uppercase',
                  }}
                >
                  需要补充
                </p>
                <ul style={{ margin: 0, paddingLeft: '16px' }}>
                  {result.follow_up_questions.length > 0 ? (
                    result.follow_up_questions.map((q, i) => (
                      <li
                        key={i}
                        style={{ fontSize: '12.5px', color: 'var(--color-ink-2)', lineHeight: 1.6 }}
                      >
                        {q}
                      </li>
                    ))
                  ) : (
                    <>
                      <li style={{ fontSize: '12.5px', color: 'var(--color-ink-2)', lineHeight: 1.6 }}>
                        补充学历、专业、实习/项目经历等核心背景信息
                      </li>
                      <li style={{ fontSize: '12.5px', color: 'var(--color-ink-2)', lineHeight: 1.6 }}>
                        明确目标岗位方向与期望城市
                      </li>
                      <li style={{ fontSize: '12.5px', color: 'var(--color-ink-2)', lineHeight: 1.6 }}>
                        填写投递时间安排（如秋招/春招及截止时间）
                      </li>
                    </>
                  )}
                </ul>
              </div>
              <button
                onClick={handleReset}
                style={{
                  marginTop: '12px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--color-line)',
                  background: 'transparent',
                  color: 'var(--color-ink-2)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                重新填写
              </button>
            </div>
          )}

          {/* Done state — full strategy result */}
          {state === 'done' && result && (() => {
            // #46 — include recommendations/risks/next_actions in hasContent check
            const hasContent =
              result.target_company_tiers.length > 0 ||
              result.application_sequence.length > 0 ||
              result.daily_action_plan.length > 0 ||
              result.risk_assessment.main_risks.length > 0 ||
              result.risk_assessment.mitigation.length > 0 ||
              result.recommendations.length > 0 ||
              result.risks.length > 0 ||
              result.next_actions.length > 0;

            // #62 — confidence='low' 且所有结果数组为空时不可当作成功，给出补充提示
            if (!hasContent) {
              return (
                <div style={{ marginTop: '16px' }}>
                  <div
                    style={{
                      padding: '14px 16px',
                      background: 'var(--color-warn-soft)',
                      borderRadius: '10px',
                      marginBottom: '12px',
                    }}
                  >
                    <p
                      style={{
                        margin: '0 0 8px',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        color: 'var(--color-ink)',
                      }}
                    >
                      信息不足，暂未生成可执行的策略内容
                    </p>
                    <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--color-ink-3)', lineHeight: 1.5 }}>
                      {result.summary || '请补充更完整的用户画像（学历、专业、实习/项目、目标岗位与城市）后重新生成。'}
                    </p>
                  </div>
                  {result.cannot_determine.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <p
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--color-ink-3)',
                          marginBottom: '6px',
                          letterSpacing: '0.02em',
                          textTransform: 'uppercase',
                        }}
                      >
                        无法判定项
                      </p>
                      <ul style={{ margin: 0, paddingLeft: '16px' }}>
                        {result.cannot_determine.map((c, i) => (
                          <li key={i} style={{ fontSize: '12.5px', color: 'var(--color-ink-2)', lineHeight: 1.6 }}>
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <button
                    onClick={handleReset}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--color-line)',
                      background: 'transparent',
                      color: 'var(--color-ink-2)',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    重新填写
                  </button>
                </div>
              );
            }

            return (
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Summary + confidence */}
              <div
                style={{
                  padding: '12px 16px',
                  background: 'var(--color-brand-soft)',
                  borderRadius: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--color-ink-2)',
                      background: 'rgba(47,143,255,.05)',
                      border: '1px solid var(--hair)',
                      padding: '2px 9px',
                      borderRadius: 'var(--radius-pill)',
                    }}
                  >
                    置信度：{CONFIDENCE_LABELS[result.confidence]}
                  </span>
                </div>
                {result.confidence === 'low' && (
                  <p
                    style={{
                      margin: '0 0 8px',
                      fontSize: '12px',
                      color: 'var(--color-warn)',
                      lineHeight: 1.5,
                      fontWeight: 500,
                    }}
                  >
                    画像信息有限，以下策略置信度较低，建议补充更多背景后再参考。
                  </p>
                )}
                <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--color-ink)', lineHeight: 1.6 }}>
                  {result.summary}
                </p>
              </div>

              {/* Cannot-determine items — honest degradation signal */}
              {result.cannot_determine.length > 0 && (
                <section>
                  <SectionTitle icon={<AlertCircle size={13} />} label="无法判定项" />
                  <ul style={{ margin: 0, paddingLeft: '16px' }}>
                    {result.cannot_determine.map((c, i) => (
                      <li key={i} style={{ fontSize: '12.5px', color: 'var(--color-ink-2)', lineHeight: 1.6 }}>
                        {c}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Company tiers */}
              {result.target_company_tiers.length > 0 && (
                <section>
                  <SectionTitle icon={<Target size={13} />} label="公司分层" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {result.target_company_tiers.map((tier, i) => (
                      <TierCard key={i} tier={tier} />
                    ))}
                  </div>
                </section>
              )}

              {/* Application sequence */}
              {result.application_sequence.length > 0 && (
                <section>
                  <SectionTitle icon={<LayoutList size={13} />} label="投递节奏" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {result.application_sequence.map((week, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '100px 1fr',
                          gap: '12px',
                          padding: '10px 14px',
                          background: 'rgba(47,143,255,.05)',
                          border: '1px solid var(--hair)',
                          borderRadius: 'var(--radius-default)',
                          alignItems: 'start',
                        }}
                      >
                        <div>
                          <div
                            style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--color-ink-2)' }}
                          >
                            {week.week}
                          </div>
                          <div
                            style={{
                              fontSize: '10.5px',
                              color: 'var(--color-ink-4)',
                              marginTop: '2px',
                            }}
                          >
                            目标 {week.target_count} 份
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12.5px', color: 'var(--color-ink)', fontWeight: 500 }}>
                            {week.focus}
                          </div>
                          {week.channels.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '5px' }}>
                              {week.channels.map((ch, ci) => (
                                <span
                                  key={ci}
                                  style={{
                                    fontSize: '10px',
                                    padding: '2px 7px',
                                    background: 'rgba(47,143,255,.05)',
                                    border: '1px solid var(--hair)',
                                    borderRadius: '4px',
                                    color: 'var(--color-ink-3)',
                                    fontWeight: 500,
                                  }}
                                >
                                  {ch}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Daily action plan */}
              {result.daily_action_plan.length > 0 && (
                <section>
                  <SectionTitle icon={<LayoutList size={13} />} label="今日行动清单" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {result.daily_action_plan.map((action, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 14px',
                          background: 'rgba(47,143,255,.05)',
                          border: '1px solid var(--hair)',
                          borderRadius: 'var(--radius-default)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              background:
                                action.priority === 'high'
                                  ? 'var(--color-danger)'
                                  : action.priority === 'medium'
                                    ? 'var(--color-warn)'
                                    : 'var(--color-ink-4)',
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ fontSize: '12.5px', color: 'var(--color-ink)' }}>
                            {action.action}
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--color-ink-4)', flexShrink: 0 }}>
                          {action.time_estimate}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Risk assessment — main_risks 与 mitigation 各自按自身长度渲染 */}
              {(result.risk_assessment.main_risks.length > 0 ||
                result.risk_assessment.mitigation.length > 0) && (
                <section>
                  <SectionTitle icon={<AlertCircle size={13} />} label="风险与应对" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {result.risk_assessment.main_risks.length > 0 && (
                      <div
                        style={{
                          padding: '12px 14px',
                          background: 'var(--color-danger-soft)',
                          borderRadius: 'var(--radius-default)',
                        }}
                      >
                        <p
                          style={{
                            margin: '0 0 6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: 'var(--color-danger)',
                            letterSpacing: '0.03em',
                          }}
                        >
                          主要风险
                        </p>
                        <ul style={{ margin: 0, paddingLeft: '14px' }}>
                          {result.risk_assessment.main_risks.map((r, i) => (
                            <li
                              key={i}
                              style={{ fontSize: '12px', color: 'var(--color-ink-2)', lineHeight: 1.6 }}
                            >
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.risk_assessment.mitigation.length > 0 && (
                      <div
                        style={{
                          padding: '12px 14px',
                          background: 'var(--color-success-soft)',
                          borderRadius: 'var(--radius-default)',
                        }}
                      >
                        <p
                          style={{
                            margin: '0 0 6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: 'var(--color-success)',
                            letterSpacing: '0.03em',
                          }}
                        >
                          应对措施
                        </p>
                        <ul style={{ margin: 0, paddingLeft: '14px' }}>
                          {result.risk_assessment.mitigation.map((m, i) => (
                            <li
                              key={i}
                              style={{ fontSize: '12px', color: 'var(--color-ink-2)', lineHeight: 1.6 }}
                            >
                              {m}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* #46 — recommendations / risks / next_actions */}
              {result.recommendations.length > 0 && (
                <section>
                  <SectionTitle icon={<AlertCircle size={13} />} label="额外建议" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {result.recommendations.map((rec, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '8px 12px',
                          background: 'rgba(47,143,255,.05)',
                          border: '1px solid var(--hair)',
                          borderRadius: 'var(--radius-default)',
                          fontSize: '12.5px',
                          color: 'var(--color-ink-2)',
                          lineHeight: 1.5,
                        }}
                      >
                        {rec}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {result.risks.length > 0 && (
                <section>
                  <SectionTitle icon={<AlertCircle size={13} />} label="注意风险" />
                  <ul style={{ margin: 0, paddingLeft: '16px' }}>
                    {result.risks.map((r, i) => (
                      <li key={i} style={{ fontSize: '12.5px', color: 'var(--color-ink-2)', lineHeight: 1.6 }}>
                        {r}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {result.next_actions.length > 0 && (
                <section>
                  <SectionTitle icon={<LayoutList size={13} />} label="下一步行动" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {result.next_actions.map((action, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px',
                          padding: '8px 12px',
                          background: 'rgba(47,143,255,.05)',
                          border: '1px solid var(--hair)',
                          borderRadius: 'var(--radius-default)',
                        }}
                      >
                        <span
                          style={{
                            flexShrink: 0,
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: 'var(--color-brand-soft)',
                            color: 'var(--color-brand)',
                            fontSize: '10px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: '1px',
                          }}
                        >
                          {i + 1}
                        </span>
                        <span style={{ fontSize: '12.5px', color: 'var(--color-ink)', lineHeight: 1.5 }}>
                          {action}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <button
                onClick={handleReset}
                style={{
                  alignSelf: 'flex-start',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--color-line)',
                  background: 'transparent',
                  color: 'var(--color-ink-3)',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                重新生成
              </button>
            </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '9px',
        color: 'var(--color-ink-2)',
      }}
    >
      {icon}
      <span style={{ fontFamily: 'var(--serif)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.02em' }}>{label}</span>
    </div>
  );
}

function TierCard({ tier }: { tier: ApplicationCompanyTier }) {
  return (
    <div
      style={{
        padding: '11px 14px',
        background: 'rgba(47,143,255,.05)',
        border: '1px solid var(--hair)',
        borderRadius: 'var(--radius-default)',
        borderLeft: `3px solid ${TIER_COLORS[tier.tier]}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '4px',
        }}
      >
        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: TIER_COLORS[tier.tier],
            letterSpacing: '0.02em',
          }}
        >
          {TIER_LABELS[tier.tier]}
        </span>
      </div>
      <p style={{ margin: '0 0 4px', fontSize: '12.5px', color: 'var(--color-ink)', fontWeight: 500 }}>
        {tier.description}
      </p>
      <p style={{ margin: '0 0 7px', fontSize: '12px', color: 'var(--color-ink-3)', lineHeight: 1.5 }}>
        {tier.rationale}
      </p>
      {tier.example_types.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {tier.example_types.map((type, i) => (
            <span
              key={i}
              style={{
                fontSize: '10.5px',
                padding: '2px 8px',
                background: 'rgba(47,143,255,.05)',
                border: '1px solid var(--hair)',
                borderRadius: '5px',
                color: 'var(--color-ink-2)',
                fontWeight: 500,
              }}
            >
              {type}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [defaultStage, setDefaultStage] = useState<string>('wishlist');

  // #45 — separate initial-load flag from mutation refresh; mutations use silent refetch
  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const [apps, statsData] = await Promise.all([
        api.get<Application[]>('/applications'),
        api.get<Record<string, number>>('/applications/stats'),
      ]);
      setApplications(apps);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await fetchData();
    })();
  }, [fetchData]);

  async function handleCreate(data: Record<string, string>) {
    try {
      setActionError(null);
      await api.post('/applications', data);
      setFormOpen(false);
      // silent=true: board stays visible, no full-screen spinner
      await fetchData(true);
      toast.success('已添加投递');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '创建失败，请稍后重试');
    }
  }

  function handleCloseForm() {
    setFormOpen(false);
  }

  async function handleStageChange(id: string, stage: string) {
    try {
      setActionError(null);
      // Optimistic update: flip stage immediately so board doesn't flicker
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, stage: stage as Application['stage'] } : a)),
      );
      await api.patch(`/applications/${id}`, { stage });
      // Silent background sync to reconcile any server-side diff
      await fetchData(true);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '移动卡片失败，请稍后重试');
      // Revert optimistic update on failure
      await fetchData(true);
    }
  }

  function handleAddFromColumn(stage: string) {
    setDefaultStage(stage);
    setFormOpen(true);
  }

  function handleAddNew() {
    setDefaultStage('wishlist');
    setFormOpen(true);
  }

  return (
    <>
      {formOpen && (
        <ApplicationForm defaultStage={defaultStage} onSubmit={handleCreate} onCancel={handleCloseForm} />
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          padding: '40px 32px 24px',
          gap: '0',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
            flexShrink: 0,
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: 'var(--serif)',
                fontSize: '24px',
                fontWeight: 700,
                color: 'var(--color-ink)',
                letterSpacing: '-0.4px',
                marginBottom: '4px',
              }}
            >
              投递追踪
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--color-ink-3)' }}>
              管理你的所有求职投递
            </p>
          </div>
          <button
            onClick={handleAddNew}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '10px 18px',
              borderRadius: 'var(--radius-default)',
              border: 'none',
              background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
              color: '#fff',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
              transition: 'opacity 0.12s',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.92';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            <Plus size={16} />
            新增公司
          </button>
        </div>

        {/* Stats */}
        <div style={{ flexShrink: 0 }}>
          <TrackerStats stats={stats} />
        </div>

        {/* Inline action error (create / move card failures) */}
        {actionError && (
          <div
            style={{
              flexShrink: 0,
              marginTop: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '11px 14px',
              background: 'var(--color-danger-soft)',
              borderRadius: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <AlertCircle
                size={15}
                color="var(--color-danger)"
                style={{ marginTop: '1px', flexShrink: 0 }}
              />
              <span style={{ fontSize: '13px', color: 'var(--color-danger)', lineHeight: 1.5, fontWeight: 500 }}>
                {actionError}
              </span>
            </div>
            <button
              onClick={() => setActionError(null)}
              style={{
                flexShrink: 0,
                border: 'none',
                background: 'transparent',
                color: 'var(--color-danger)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              知道了
            </button>
          </div>
        )}

        {/* Strategy panel */}
        <div style={{ flexShrink: 0, marginTop: '16px' }}>
          <StrategyPanel applications={applications} />
        </div>

        {/* Content */}
        {loading ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-ink-3)',
              fontSize: '14px',
            }}
          >
            加载中…
          </div>
        ) : error ? (
          <div
            style={{
              padding: '40px 24px',
              textAlign: 'center',
              background: 'var(--color-danger-soft)',
              borderRadius: '14px',
              color: 'var(--color-danger)',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            {error}
            <div style={{ marginTop: '12px' }}>
              <button
                onClick={() => fetchData()}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--color-danger)',
                  background: 'transparent',
                  color: 'var(--color-danger)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                重新加载
              </button>
            </div>
          </div>
        ) : applications.length === 0 ? (
          /* Empty state */
          <div
            className="lg"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '64px 32px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: 'var(--radius-default)',
                background: 'rgba(47,143,255,.05)',
                border: '1px solid var(--hair)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Briefcase size={26} color="var(--color-ink-4)" />
            </div>
            <p
              style={{
                fontFamily: 'var(--serif)',
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--color-ink-2)',
                marginBottom: '8px',
                letterSpacing: '-0.01em',
              }}
            >
              还没有投递记录
            </p>
            <p
              style={{
                fontSize: '13.5px',
                color: 'var(--color-ink-4)',
                marginBottom: '24px',
              }}
            >
              添加你的第一家目标公司
            </p>
            <button
              onClick={handleAddNew}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '10px 22px',
                borderRadius: 'var(--radius-default)',
                border: 'none',
                background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
                color: '#fff',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
              }}
            >
              <Plus size={15} />
              新增公司
            </button>
          </div>
        ) : (
          /* Kanban board */
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <KanbanBoard
              applications={applications}
              onStageChange={handleStageChange}
              onAdd={handleAddFromColumn}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
