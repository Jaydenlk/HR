'use client';

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MessageSquare,
  RefreshCcw,
  Target,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type {
  ActionType,
  ConfidenceLevel,
  EvidenceKind,
  Opportunity,
  Recommendation,
} from '@/lib/types';

const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  strongly_recommend: '强烈推荐',
  recommend: '推荐',
  neutral: '中性',
  cautious: '谨慎',
  not_recommend: '不推荐',
};

const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: '置信度高',
  medium: '置信度中',
  low: '置信度低',
  insufficient: '数据不足',
};

const EVIDENCE_KIND_LABELS: Record<EvidenceKind, string> = {
  resume_match: '简历匹配',
  feed_item: '情报来源',
  diagnosis_history: '诊断历史',
  market_signal: '市场信号',
  jd_analysis: 'JD 分析',
};

const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  optimize_resume: '优化简历',
  write_cover_letter: '写求职信',
  prepare_interview: '面试准备',
  research_company: '研究公司',
  apply: '立即申请',
  dismiss: '忽略此机会',
};

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  fulltime: '全职',
  intern: '实习',
  contract: '合同制',
  parttime: '兼职',
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'var(--color-danger)',
  high: 'var(--color-danger)',
  medium: 'var(--color-warn)',
  low: 'var(--color-ink-3)',
};

// 风险严重度 → 中文标签。后端把 risk_flags 存为 'type:severity' 字符串(权威契约),
// 前端按此拆分并映射严重度,critical/high 都显示为「高风险」而非默认「低风险」。
const SEVERITY_LABELS: Record<string, string> = {
  critical: '高风险',
  high: '高风险',
  medium: '中风险',
  low: '低风险',
};

// 风险类型代码 → 中文标签(与后端 RISK_SYSTEM 的 8 类一致)。未知代码回退显示原代码。
const RISK_TYPE_LABELS: Record<string, string> = {
  jd_too_short: 'JD 信息过少',
  responsibilities_unclear: '职责描述模糊',
  suspected_od: '疑似外包/劳务派遣',
  suspected_training_lure: '疑似培训钓鱼',
  salary_unrealistic: '薪资异常',
  long_term_repost: '长期重复发布',
  entity_mismatch: '招聘主体不一致',
  untrusted_source: '来源不可信',
};

// 后端权威存储形状(string[] / 'type:severity'),不依赖共享 types.ts 的对象数组声明。
interface RiskFlagView {
  type: string;
  severity: string;
}

function parseStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

// 'type:severity' → { type, severity }。缺冒号时整体当作 type,severity 兜底 'low'。
function parseRiskFlags(raw: unknown): RiskFlagView[] {
  if (!Array.isArray(raw)) return [];
  const result: RiskFlagView[] = [];
  for (const item of raw) {
    if (typeof item !== 'string' || item.trim().length === 0) continue;
    const idx = item.lastIndexOf(':');
    if (idx > 0) {
      result.push({ type: item.slice(0, idx), severity: item.slice(idx + 1) });
    } else {
      result.push({ type: item, severity: 'low' });
    }
  }
  return result;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '请求失败，请稍后再试';
}

function formatDate(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OpportunityDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [reevaluating, setReevaluating] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Polling ref for evaluating state
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchOpportunity = useCallback(async () => {
    try {
      const data = await api.get<Opportunity>(`/opportunities/${id}`);
      setOpportunity(data);
      setPageError(null);
      return data;
    } catch (error) {
      setPageError(getErrorMessage(error));
      return null;
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      const data = await fetchOpportunity();
      if (!cancelled) {
        setLoading(false);
        if (data?.status === 'evaluating') {
          startPolling();
        }
      }
    }
    void init();
    return () => {
      cancelled = true;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function startPolling() {
    if (pollRef.current) clearTimeout(pollRef.current);
    pollRef.current = setTimeout(async () => {
      const data = await fetchOpportunity();
      if (data?.status === 'evaluating') {
        startPolling();
      }
    }, 3000);
  }

  async function handleReevaluate() {
    setReevaluating(true);
    setActionError(null);
    try {
      await api.post(`/opportunities/${id}/evaluate`, {});
      const data = await fetchOpportunity();
      if (data?.status === 'evaluating') startPolling();
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setReevaluating(false);
    }
  }

  async function handleTrack() {
    setTracking(true);
    setActionError(null);
    try {
      await api.post(`/opportunities/${id}/track`, {});
      await fetchOpportunity();
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setTracking(false);
    }
  }

  if (loading) {
    return (
      <main className="opp-detail-shell">
        <style>{DETAIL_CSS}</style>
        <div className="loading-state">
          <Loader2 className="spin" size={22} />
          正在加载...
        </div>
      </main>
    );
  }

  if (pageError || !opportunity) {
    return (
      <main className="opp-detail-shell">
        <style>{DETAIL_CSS}</style>
        <div className="error-fullpage">
          <AlertCircle size={28} />
          <h2>{pageError ?? '机会不存在'}</h2>
          <button
            type="button"
            className="secondary-button"
            onClick={() => router.push('/opportunities')}
          >
            返回机会中心
          </button>
        </div>
      </main>
    );
  }

  const opp = opportunity;
  const evaluation = opp.evaluations?.[0] ?? null;
  // 按后端权威存储形状解析(string[] / 'type:severity'),不受共享 types.ts 声明影响。
  const riskFlags = parseRiskFlags(evaluation?.risk_flags);
  const strengths = parseStringList(evaluation?.strengths);
  const gaps = parseStringList(evaluation?.gaps);
  const evidences = opp.evidences ?? [];
  const actions = opp.actions ?? [];
  const isEvaluating = opp.status === 'draft' || opp.status === 'evaluating';
  const isFailed = opp.status === 'failed';
  const isTracked = opp.status === 'tracked';
  const hasEvaluation = evaluation !== null && (opp.status === 'evaluated' || isTracked);

  const chatLink = `/chat?context=opportunity&id=${opp.id}`;

  return (
    <main className="opp-detail-shell">
      <style>{DETAIL_CSS}</style>

      {/* Breadcrumb */}
      <nav className="breadcrumb" aria-label="面包屑导航">
        <Link href="/opportunities">机会中心</Link>
        <span>/</span>
        <span>{opp.company ?? '未知公司'}</span>
      </nav>

      {/* Header */}
      <section className="detail-header">
        <div className="detail-title-group">
          <div className="detail-title-row">
            <h1>{opp.company ?? '未知公司'}</h1>
            {isTracked && (
              <span className="tracked-badge">已在投递看板</span>
            )}
          </div>
          <div className="detail-meta-row">
            {opp.role && <span className="meta-chip">{opp.role}</span>}
            {opp.location && <span className="meta-chip">{opp.location}</span>}
            {opp.employment_type && (
              <span className="meta-chip">
                {EMPLOYMENT_TYPE_LABELS[opp.employment_type] ?? opp.employment_type}
              </span>
            )}
          </div>
          {opp.source_url && (
            <a
              href={opp.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="source-link"
            >
              查看原始职位
              <ExternalLink size={13} />
            </a>
          )}
        </div>
        <span className={`status-badge status-${opp.status}`}>
          {opp.status === 'evaluating' ? (
            <>
              <Loader2 className="spin" size={13} />
              评估中
            </>
          ) : opp.status === 'draft' ? (
            '待评估'
          ) : opp.status === 'evaluated' ? (
            '已评估'
          ) : opp.status === 'failed' ? (
            '评估失败'
          ) : opp.status === 'tracked' ? (
            '已追踪'
          ) : (
            '已忽略'
          )}
        </span>
      </section>

      {actionError && (
        <div className="error-banner" role="alert">
          <AlertCircle size={16} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Evaluating state */}
      {isEvaluating && (
        <section className="evaluating-section lg">
          <Loader2 className="spin" size={28} />
          <h2>正在评估中...</h2>
          <p>AI 正在分析 JD 与你的简历匹配度、投递价值和来源可信度，通常需要 20–60 秒。</p>
        </section>
      )}

      {/* Failed state */}
      {isFailed && (
        <section className="failed-section lg">
          <AlertCircle size={24} />
          <h2>评估失败</h2>
          {opp.error_message && <p className="error-message">{opp.error_message}</p>}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
            <button
              type="button"
              className="primary-button"
              onClick={() => void handleReevaluate()}
              disabled={reevaluating}
            >
              {reevaluating ? <Loader2 className="spin" size={15} /> : <RefreshCcw size={15} />}
              {reevaluating ? '重试中...' : '重新评估'}
            </button>
            <span style={{ fontSize: '11px', color: 'var(--color-ink-4)', fontWeight: 500 }}>消耗 1 点</span>
          </div>
        </section>
      )}

      {/* Evaluation results */}
      {hasEvaluation && evaluation && (
        <>
          {/* Score cards */}
          <section className="score-section" aria-label="评估得分">
            <ScoreCard label="匹配度" value={evaluation.match_score} />
            <ScoreCard label="投递价值" value={evaluation.value_score} />
            <ScoreCard label="可信度" value={evaluation.credibility_score} />
          </section>

          {/* Recommendation */}
          <section className="recommendation-section">
            <span className={`rec-badge rec-${evaluation.recommendation}`}>
              {RECOMMENDATION_LABELS[evaluation.recommendation]}
            </span>
            <span className="confidence-label">
              {CONFIDENCE_LABELS[evaluation.confidence]}
            </span>
            <span className="overall-score-label">
              综合评分 {evaluation.overall_score}
            </span>
          </section>

          {/* Risk flags — 后端存为 'type:severity' 字符串,前端拆分映射严重度标签 */}
          {riskFlags.length > 0 && (
            <section className="detail-section" aria-label="风险信号">
              <h2 className="section-title">
                <AlertTriangle size={17} />
                风险信号
              </h2>
              <div className="risk-list">
                {riskFlags.map((flag, i) => (
                  <div
                    key={i}
                    className="risk-card"
                    style={{ borderLeftColor: SEVERITY_COLORS[flag.severity] ?? SEVERITY_COLORS.low }}
                  >
                    <div className="risk-header">
                      <span className="risk-type">{RISK_TYPE_LABELS[flag.type] ?? flag.type}</span>
                      <span
                        className="risk-severity"
                        style={{ color: SEVERITY_COLORS[flag.severity] ?? SEVERITY_COLORS.low }}
                      >
                        {SEVERITY_LABELS[flag.severity] ?? '低风险'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Strengths — 后端存为纯字符串数组 */}
          {strengths.length > 0 && (
            <section className="detail-section" aria-label="匹配优势">
              <h2 className="section-title">
                <CheckCircle2 size={17} />
                匹配优势
              </h2>
              <div className="strength-list">
                {strengths.map((s, i) => (
                  <div key={i} className="strength-card">
                    <p className="strength-desc">{s}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Gaps — 后端存为纯字符串数组 */}
          {gaps.length > 0 && (
            <section className="detail-section" aria-label="差距与建议">
              <h2 className="section-title">
                <AlertTriangle size={17} />
                差距与建议
              </h2>
              <div className="gap-list">
                {gaps.map((g, i) => (
                  <div key={i} className="gap-card">
                    <p className="gap-desc">{g}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Evidence list */}
      {evidences.length > 0 && (
        <section className="detail-section" aria-label="参考依据">
          <h2 className="section-title">
            <Target size={17} />
            参考依据
          </h2>
          <div className="evidence-list">
            {evidences.map((ev) => (
              <div key={ev.id} className="evidence-card">
                <div className="evidence-header">
                  <span className="evidence-kind-badge">
                    {EVIDENCE_KIND_LABELS[ev.kind]}
                  </span>
                  <span className={`evidence-confidence conf-${ev.confidence}`}>
                    {CONFIDENCE_LABELS[ev.confidence]}
                  </span>
                </div>
                <h3 className="evidence-title">{ev.title}</h3>
                <p className="evidence-excerpt">{ev.excerpt}</p>
                <div className="evidence-footer">
                  {ev.source_platform && (
                    <span className="evidence-source">{ev.source_platform}</span>
                  )}
                  {ev.published_at && (
                    <span className="evidence-date">{formatDate(ev.published_at)}</span>
                  )}
                  {ev.source_url && (
                    <a
                      href={ev.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="evidence-link"
                    >
                      来源
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Actions */}
      {actions.length > 0 && (
        <section className="detail-section" aria-label="建议行动">
          <h2 className="section-title">
            <Target size={17} />
            建议行动
          </h2>
          <div className="action-list">
            {actions.map((action) => (
              <div key={action.id} className={`action-card action-status-${action.status}`}>
                <div className="action-type-label">
                  {ACTION_TYPE_LABELS[action.action_type]}
                </div>
                <div className="action-title">{action.title}</div>
                <p className="action-reason">{action.reason}</p>
                {action.due_date && (
                  <span className="action-due">截止：{formatDate(action.due_date)}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Bottom action buttons */}
      <section className="bottom-actions">
        {!isTracked && (opp.status === 'evaluated') && (
          <button
            type="button"
            className="primary-button"
            onClick={() => void handleTrack()}
            disabled={tracking}
          >
            {tracking ? <Loader2 className="spin" size={15} /> : null}
            {tracking ? '添加中...' : '加入投递看板'}
          </button>
        )}

        <Link href={chatLink} className="secondary-button">
          <MessageSquare size={15} />
          在 Chat 中追问
        </Link>

        {!isEvaluating && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
            <button
              type="button"
              className="secondary-button"
              onClick={() => void handleReevaluate()}
              disabled={reevaluating}
            >
              {reevaluating ? (
                <Loader2 className="spin" size={15} />
              ) : (
                <RefreshCcw size={15} />
              )}
              {reevaluating ? '评估中...' : '重新评估'}
            </button>
            <span style={{ fontSize: '11px', color: 'var(--color-ink-4)', fontWeight: 500 }}>消耗 1 点</span>
          </div>
        )}
      </section>
    </main>
  );
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const color =
    pct >= 70
      ? 'var(--color-success)'
      : pct >= 40
        ? 'var(--color-warn)'
        : 'var(--color-danger)';
  return (
    <div className="score-card lg">
      <div
        className="score-ring"
        style={{ '--score-pct': `${pct}`, '--score-color': color } as React.CSSProperties}
        role="img"
        aria-label={`${label} ${pct} 分`}
      >
        <span className="score-value">{pct}</span>
      </div>
      <span className="score-card-label">{label}</span>
    </div>
  );
}

const DETAIL_CSS = `
.opp-detail-shell {
  min-height: 100%;
  padding: 24px 32px 48px;
  color: var(--color-ink);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  gap: 12px;
  color: var(--color-ink-3);
}

.error-fullpage {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  gap: 14px;
  text-align: center;
  color: var(--color-ink-3);
}

.error-fullpage h2 {
  margin: 0;
  font-family: var(--serif);
  font-size: 18px;
  font-weight: 600;
  color: var(--color-ink);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 18px;
  font-size: 13px;
  color: var(--color-ink-3);
}

.breadcrumb a {
  color: var(--color-brand);
  text-decoration: none;
  font-weight: 600;
}

.breadcrumb a:hover {
  text-decoration: underline;
}

.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 22px;
  padding-bottom: 22px;
  border-bottom: 1px solid var(--hair);
}

.detail-title-group {
  flex: 1;
  min-width: 0;
}

.detail-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.detail-title-row h1 {
  margin: 0;
  font-family: var(--serif);
  font-size: 24px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.3px;
}

.tracked-badge {
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  background: var(--color-success-soft);
  color: var(--color-success);
}

.detail-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.meta-chip {
  font-size: 13px;
  color: var(--color-ink-2);
  padding: 4px 10px;
  background: rgba(47,143,255,.05);
  border: 1px solid var(--hair);
  border-radius: var(--radius-pill);
}

.source-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-size: 13px;
  color: var(--color-brand);
  text-decoration: none;
  font-weight: 600;
}

.source-link:hover {
  text-decoration: underline;
}

.status-badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 700;
  padding: 6px 12px;
  border-radius: 999px;
}

.status-draft { background: rgba(47,143,255,.05); border: 1px solid var(--hair); color: var(--color-ink-3); }
.status-evaluating { background: var(--color-brand-soft); color: var(--color-brand-ink); }
.status-evaluated { background: var(--color-brand-soft); color: var(--color-brand-ink); }
.status-failed { background: var(--color-danger-soft); color: var(--color-danger); }
.status-tracked { background: var(--color-success-soft); color: var(--color-success); }
.status-dismissed { background: rgba(47,143,255,.05); border: 1px solid var(--hair); color: var(--color-ink-4); }

.error-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  border-radius: 8px;
  padding: 11px 13px;
  font-size: 13px;
  line-height: 1.55;
  margin-bottom: 16px;
  color: var(--color-danger);
  background: var(--color-danger-soft);
}

.evaluating-section,
.failed-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px 24px;
  text-align: center;
  margin-bottom: 24px;
  color: var(--color-ink-3);
}

.evaluating-section h2,
.failed-section h2 {
  margin: 0;
  font-family: var(--serif);
  font-size: 20px;
  font-weight: 600;
  color: var(--color-ink);
}

.evaluating-section p,
.failed-section p {
  margin: 0;
  max-width: 480px;
  line-height: 1.65;
  font-size: 14px;
}

.failed-section {
  color: var(--color-danger);
}

.error-message {
  color: var(--color-ink-2) !important;
}

.score-section {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.score-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px 16px;
}

.score-ring {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: conic-gradient(
    var(--score-color, var(--color-brand)) calc(var(--score-pct, 0) * 1%),
    var(--hair-2) 0
  );
}

.score-ring::before {
  content: '';
  position: absolute;
  inset: 10px;
  border-radius: 50%;
  background: var(--color-surface);
}

.score-value {
  position: relative;
  font-size: 20px;
  font-weight: 800;
  color: var(--color-ink);
}

.score-card-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-ink-2);
}

.recommendation-section {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.rec-badge {
  font-size: 13px;
  font-weight: 700;
  padding: 6px 14px;
  border-radius: 999px;
}

.rec-strongly_recommend { background: var(--color-success-soft); color: var(--color-success); }
.rec-recommend { background: var(--color-success-soft); color: var(--color-success); }
.rec-neutral { background: rgba(47,143,255,.05); border: 1px solid var(--hair); color: var(--color-ink-2); }
.rec-cautious { background: var(--color-warn-soft); color: var(--color-warn); }
.rec-not_recommend { background: var(--color-danger-soft); color: var(--color-danger); }

.confidence-label,
.overall-score-label {
  font-size: 13px;
  color: var(--color-ink-3);
}

.detail-section {
  margin-bottom: 28px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 14px;
  font-family: var(--serif);
  font-size: 16px;
  font-weight: 600;
  color: var(--color-ink);
}

.risk-list,
.strength-list,
.gap-list,
.evidence-list,
.action-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.risk-card {
  padding: 14px 16px;
  background: rgba(47,143,255,.05);
  border: 1px solid var(--hair);
  border-left: 4px solid;
  border-radius: 0 var(--radius-default) var(--radius-default) 0;
}

.risk-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}

.risk-type {
  font-size: 14px;
  font-weight: 700;
}

.risk-severity {
  font-size: 12px;
  font-weight: 700;
}

.risk-evidence {
  margin: 0;
  font-size: 13px;
  color: var(--color-ink-2);
  line-height: 1.6;
}

.strength-card {
  padding: 14px 16px;
  background: var(--color-success-soft);
  border: 1px solid var(--hair);
  border-radius: var(--radius-default);
}

.strength-dim {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-success);
  margin-bottom: 4px;
}

.strength-desc {
  margin: 0;
  font-size: 13px;
  color: var(--color-ink-2);
  line-height: 1.6;
}

.gap-card {
  padding: 14px 16px;
  background: rgba(47,143,255,.05);
  border: 1px solid var(--hair);
  border-radius: var(--radius-default);
}

.gap-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}

.gap-dim {
  font-size: 13px;
  font-weight: 700;
}

.gap-severity {
  font-size: 12px;
  font-weight: 700;
}

.gap-desc {
  margin: 0 0 6px;
  font-size: 13px;
  color: var(--color-ink-2);
  line-height: 1.6;
}

.gap-suggestion {
  margin: 0;
  font-size: 13px;
  color: var(--color-ink-2);
  line-height: 1.6;
  padding: 8px 10px;
  background: rgba(47,143,255,.05);
  border: 1px solid var(--hair);
  border-radius: 6px;
}

.evidence-card {
  padding: 14px 16px;
  background: rgba(47,143,255,.05);
  border: 1px solid var(--hair);
  border-radius: var(--radius-default);
}

.evidence-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.evidence-kind-badge {
  font-size: 11.5px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--color-brand-soft);
  color: var(--color-brand-ink);
}

.evidence-confidence {
  font-size: 11.5px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: var(--radius-pill);
  background: rgba(47,143,255,.05);
  color: var(--color-ink-3);
}

.conf-high { color: var(--color-success); background: var(--color-success-soft); }
.conf-medium { color: var(--color-warn); background: var(--color-warn-soft); }
.conf-low { color: var(--color-danger); background: var(--color-danger-soft); }
.conf-insufficient { color: var(--color-ink-4); background: rgba(47,143,255,.05); }

.evidence-title {
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 600;
}

.evidence-excerpt {
  margin: 0 0 10px;
  font-size: 13px;
  color: var(--color-ink-2);
  line-height: 1.65;
}

.evidence-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--color-ink-3);
}

.evidence-link {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--color-brand);
  text-decoration: none;
  font-weight: 600;
}

.action-card {
  padding: 14px 16px;
  background: rgba(47,143,255,.05);
  border: 1px solid var(--hair);
  border-radius: var(--radius-default);
}

.action-status-done {
  opacity: 0.55;
}

.action-status-skipped {
  opacity: 0.45;
}

.action-type-label {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--color-brand-ink);
  background: var(--color-brand-soft);
  padding: 3px 9px;
  border-radius: 999px;
  display: inline-block;
  margin-bottom: 6px;
}

.action-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.action-reason {
  margin: 0;
  font-size: 13px;
  color: var(--color-ink-2);
  line-height: 1.6;
}

.action-due {
  display: inline-block;
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-ink-3);
}

.bottom-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding-top: 24px;
  border-top: 1px solid var(--hair);
  margin-top: 12px;
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
  text-decoration: none;
  transition: opacity 0.12s;
}

.primary-button {
  padding: 0 18px;
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
  animation: detail-spin 0.8s linear infinite;
}

@keyframes detail-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 720px) {
  .opp-detail-shell {
    padding: 16px 16px 40px;
  }

  .detail-header {
    flex-direction: column;
  }

  .score-section {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .score-card {
    padding: 14px 8px;
  }

  .score-ring {
    width: 56px;
    height: 56px;
  }

  .score-value {
    font-size: 16px;
  }

  .bottom-actions {
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
