'use client';

import {
  AlertCircle,
  ExternalLink,
  Loader2,
  Plus,
  Target,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type {
  Opportunity,
  OpportunityStatus,
  Recommendation,
} from '@/lib/types';

type StatusFilter = OpportunityStatus | 'all';

const STATUS_LABELS: Record<OpportunityStatus, string> = {
  draft: '待评估',
  evaluating: '评估中',
  evaluated: '已评估',
  failed: '评估失败',
  tracked: '已追踪',
  dismissed: '已忽略',
};

const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  strongly_recommend: '强烈推荐',
  recommend: '推荐',
  neutral: '中性',
  cautious: '谨慎',
  not_recommend: '不推荐',
};

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  fulltime: '全职',
  intern: '实习',
  contract: '合同制',
  parttime: '兼职',
};

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'draft', label: '待评估' },
  { value: 'evaluated', label: '已评估' },
  { value: 'tracked', label: '已追踪' },
];

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '请求失败，请稍后再试';
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '时间未知';
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setPageError(null);
      try {
        const data = await api.get<Opportunity[]>('/opportunities');
        if (!cancelled) setOpportunities(data);
      } catch (error) {
        if (!cancelled) setPageError(getErrorMessage(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered =
    statusFilter === 'all'
      ? opportunities
      : opportunities.filter((o) => o.status === statusFilter);

  return (
    <main className="opp-shell">
      <style>{OPP_CSS}</style>

      <section className="opp-header">
        <div>
          <p className="eyebrow">Opportunity Intelligence</p>
          <h1>机会中心</h1>
          <p className="subtitle">
            粘贴 JD，让 AI 评估匹配度、投递价值和信息可信度，再决定要不要花时间申请。
          </p>
        </div>
        <div className="header-actions">
          <Link href="/opportunities/new" className="primary-button">
            <Plus size={16} />
            新建评估
          </Link>
        </div>
      </section>

      <div className="tabs" role="tablist" aria-label="状态筛选">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            role="tab"
            aria-selected={statusFilter === f.value}
            className={statusFilter === f.value ? 'active' : ''}
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {pageError && (
        <div className="error-banner" role="alert">
          <AlertCircle size={16} />
          <span>{pageError}</span>
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <Loader2 className="spin" size={20} />
          正在加载...
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state lg">
          <Target size={26} />
          {opportunities.length === 0 ? (
            <>
              <h2>还没有评估过任何机会</h2>
              <p>粘贴一份 JD 开始你的第一次评估。</p>
              <Link href="/opportunities/new" className="primary-button">
                <Plus size={16} />
                新建评估
              </Link>
            </>
          ) : (
            <>
              <h2>当前筛选下没有机会</h2>
              <p>切换到&ldquo;全部&rdquo;查看所有记录。</p>
            </>
          )}
        </div>
      ) : (
        <section className="opp-list" aria-label="机会列表">
          {filtered.map((opp) => (
            <OpportunityCard key={opp.id} opportunity={opp} />
          ))}
        </section>
      )}
    </main>
  );
}

function OpportunityCard({ opportunity: opp }: { opportunity: Opportunity }) {
  const evaluation = opp.evaluations?.[0] ?? null;

  return (
    <Link href={`/opportunities/${opp.id}`} className="opp-card lg" aria-label={`${opp.company ?? '未知公司'} · ${opp.role ?? '未知岗位'}`}>
      <div className="card-top-row">
        <div className="card-title-group">
          <h2>{opp.company ?? '未知公司'}</h2>
          <span className="card-role">{opp.role ?? '未知岗位'}</span>
          {opp.location && <span className="card-location">{opp.location}</span>}
          {opp.employment_type && (
            <span className="card-location">
              {EMPLOYMENT_TYPE_LABELS[opp.employment_type] ?? opp.employment_type}
            </span>
          )}
        </div>
        <span className={`status-badge status-${opp.status}`}>
          {STATUS_LABELS[opp.status]}
        </span>
      </div>

      {evaluation && (
        <>
          <div className="score-bars">
            <ScoreBar label="匹配度" value={evaluation.match_score} />
            <ScoreBar label="投递价值" value={evaluation.value_score} />
            <ScoreBar label="可信度" value={evaluation.credibility_score} />
          </div>
          <div className="recommendation-row">
            <span className={`recommendation-badge rec-${evaluation.recommendation}`}>
              {RECOMMENDATION_LABELS[evaluation.recommendation]}
            </span>
            <span className="overall-score">综合 {evaluation.overall_score}</span>
          </div>
        </>
      )}

      <div className="card-footer-row">
        <span className="card-source">
          {opp.source_platform ?? '手动添加'}
          {opp.source_url && (
            <ExternalLink size={12} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
          )}
        </span>
        <span className="card-time">{formatDate(opp.created_at)}</span>
      </div>
    </Link>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const color = pct >= 70 ? 'var(--color-success)' : pct >= 40 ? 'var(--color-warn)' : 'var(--color-danger)';
  return (
    <div className="score-bar-row">
      <span className="score-label">{label}</span>
      <div className="score-track">
        <div
          className="score-fill"
          style={{ width: `${pct}%`, background: color }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label} ${pct}`}
        />
      </div>
      <span className="score-num">{pct}</span>
    </div>
  );
}

const OPP_CSS = `
.opp-shell {
  min-height: 100%;
  padding: 28px 32px 40px;
  color: var(--color-ink);
}

.opp-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;
}

.eyebrow {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-brand);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.opp-header h1 {
  margin: 0;
  font-family: var(--serif);
  font-size: 28px;
  line-height: 1.15;
  font-weight: 600;
  letter-spacing: -0.4px;
}

.subtitle {
  max-width: 760px;
  margin: 10px 0 0;
  color: var(--color-ink-3);
  font-size: 14px;
  line-height: 1.65;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.primary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border-radius: var(--radius-default);
  border: 1px solid transparent;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  min-height: 36px;
  padding: 0 14px;
  background: linear-gradient(135deg, var(--color-brand), var(--color-brand-deep));
  color: #fff;
  text-decoration: none;
  font-family: inherit;
  box-shadow: 0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4);
  transition: opacity 0.12s;
}

.primary-button:hover {
  opacity: 0.92;
}

.primary-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}

.tabs button {
  border: 1px solid var(--hair);
  background: rgba(47,143,255,.05);
  color: var(--color-ink-3);
  border-radius: var(--radius-pill);
  padding: 7px 14px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: color 0.12s, background 0.12s, border-color 0.12s;
}

.tabs button.active {
  background: var(--color-brand-soft);
  border-color: var(--color-brand);
  color: var(--color-brand-ink);
}

.error-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  border-radius: 8px;
  padding: 11px 13px;
  font-size: 13px;
  line-height: 1.55;
  margin-bottom: 12px;
  color: var(--color-danger);
  background: var(--color-danger-soft);
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  text-align: center;
  color: var(--color-ink-3);
}

.empty-state {
  padding: 42px 20px;
  gap: 8px;
}

.empty-state h2 {
  margin: 4px 0 0;
  font-family: var(--serif);
  color: var(--color-ink);
  font-size: 18px;
  font-weight: 600;
}

.empty-state p {
  max-width: 400px;
  margin: 0 0 8px;
  line-height: 1.7;
  font-size: 14px;
}

.spin {
  animation: opp-spin 0.8s linear infinite;
}

@keyframes opp-spin {
  to { transform: rotate(360deg); }
}

.opp-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.opp-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 18px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.12s, transform 0.12s;
}

.opp-card:hover {
  border-color: var(--color-brand);
  transform: translateY(-1px);
}

.card-top-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.card-title-group {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}

.card-title-group h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-ink);
}

.card-role {
  font-size: 14px;
  color: var(--color-ink-2);
}

.card-location {
  font-size: 12px;
  color: var(--color-ink-3);
  padding: 2px 8px;
  background: rgba(47,143,255,.05);
  border: 1px solid var(--hair);
  border-radius: var(--radius-pill);
}

.status-badge {
  flex-shrink: 0;
  font-size: 11.5px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
}

.status-draft { background: rgba(47,143,255,.05); border: 1px solid var(--hair); color: var(--color-ink-3); }
.status-evaluating { background: var(--color-brand-soft); color: var(--color-brand-ink); }
.status-evaluated { background: var(--color-brand-soft); color: var(--color-brand-ink); }
.status-failed { background: var(--color-danger-soft); color: var(--color-danger); }
.status-tracked { background: var(--color-success-soft); color: var(--color-success); }
.status-dismissed { background: rgba(47,143,255,.05); border: 1px solid var(--hair); color: var(--color-ink-4); }

.score-bars {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.score-bar-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.score-label {
  font-size: 12px;
  color: var(--color-ink-3);
  width: 60px;
  flex-shrink: 0;
}

.score-track {
  flex: 1;
  height: 6px;
  background: var(--color-line);
  border-radius: 999px;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s ease;
}

.score-num {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-ink-2);
  width: 28px;
  text-align: right;
  flex-shrink: 0;
}

.recommendation-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.recommendation-badge {
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
}

.rec-strongly_recommend { background: var(--color-success-soft); color: var(--color-success); }
.rec-recommend { background: var(--color-success-soft); color: var(--color-success); }
.rec-neutral { background: rgba(47,143,255,.05); border: 1px solid var(--hair); color: var(--color-ink-2); }
.rec-cautious { background: var(--color-warn-soft); color: var(--color-warn); }
.rec-not_recommend { background: var(--color-danger-soft); color: var(--color-danger); }

.overall-score {
  font-size: 12px;
  color: var(--color-ink-3);
}

.card-footer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-top: 1px solid var(--hair);
  padding-top: 10px;
  font-size: 12px;
  color: var(--color-ink-3);
}

.card-source {
  display: flex;
  align-items: center;
}

@media (max-width: 720px) {
  .opp-shell {
    padding: 20px 16px 28px;
  }

  .opp-header {
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions .primary-button {
    width: 100%;
  }

  .card-top-row {
    flex-direction: column;
  }

  .score-label {
    width: 52px;
  }
}
`;
