'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Search,
  AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { FeedItem, FeedSourceKind, RadarResult } from '@/lib/types';

const SOURCE_KIND_LABELS: Record<FeedSourceKind, string> = {
  xhs: '小红书',
  nowcoder: '牛客',
  wechat: '公众号',
  blog: '博客',
  ugc: '用户内容',
  coach: 'Coach',
};

const CATEGORY_LABELS: Record<string, string> = {
  interview_exp: '面经',
  market_insight: '市场观察',
  job_tips: '求职策略',
  hiring_signal: '招聘信号',
  editorial: '编辑精选',
};

const ROLE_TABS: Array<{ value: string; label: string }> = [
  { value: '', label: '全部' },
  { value: '后端', label: '后端' },
  { value: '前端', label: '前端' },
  { value: '算法', label: '算法' },
  { value: '产品', label: '产品' },
  { value: '运营', label: '运营' },
  { value: '设计', label: '设计' },
];

const SOURCE_TABS: Array<{ value: string; label: string }> = [
  { value: '', label: '全部' },
  { value: 'xhs', label: '小红书' },
  { value: 'nowcoder', label: '牛客' },
  { value: 'wechat', label: '公众号' },
];

const QUARTER_TABS: Array<{ value: string; label: string }> = [
  { value: '', label: '全部' },
  { value: 'current', label: '本季度' },
  { value: 'previous', label: '上季度' },
];

interface Filters {
  company: string;
  role_category: string;
  source_kind: string;
  quarter: string;
  keyword: string;
  page: number;
}

const INITIAL_FILTERS: Filters = {
  company: '',
  role_category: '',
  source_kind: '',
  quarter: '',
  keyword: '',
  page: 1,
};

function formatDate(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function excerpt(item: FeedItem): string {
  const text = item.summary?.trim() || item.content.trim();
  return text.length > 160 ? `${text.slice(0, 160).trimEnd()}...` : text;
}

function getConfidence(item: FeedItem): 'high' | 'medium' | 'low' {
  if (item.quality_score >= 70) return 'high';
  if (item.quality_score >= 40) return 'medium';
  return 'low';
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '请求失败，请稍后再试';
}

export default function RadarPage() {
  const [result, setResult] = useState<RadarResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);

  const updateFilter = useCallback(
    (key: keyof Filters, value: string | number) => {
      setLoading(true);
      setPageError(null);
      setFilters((prev) => ({
        ...prev,
        [key]: value,
        ...(key !== 'page' ? { page: 1 } : {}),
      }));
    },
    [],
  );

  const fetchRadar = useCallback(async (f: Filters) => {
    const params = new URLSearchParams();
    if (f.company) params.set('company', f.company);
    if (f.role_category) params.set('role_category', f.role_category);
    if (f.source_kind) params.set('source_kind', f.source_kind);
    if (f.quarter) params.set('quarter', f.quarter);
    if (f.keyword) params.set('keyword', f.keyword);
    params.set('page', String(f.page));
    params.set('limit', '20');
    return api.get<RadarResult>(`/newspaper/radar?${params.toString()}`);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchRadar(filters)
      .then((data) => {
        if (!cancelled) {
          setResult(data);
          setPageError(null);
        }
      })
      .catch((error) => {
        if (!cancelled) setPageError(getErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, fetchRadar]);

  const items = result?.items ?? [];
  const total = result?.total ?? 0;
  const companyStats = result?.company_stats ?? [];
  const roleStats = result?.role_stats ?? [];
  const hasMore = total > filters.page * 20;

  return (
    <main className="radar-shell">
      <style>{RADAR_CSS}</style>

      {/* Header */}
      <section className="radar-header">
        <div>
          <Link href="/newspaper" className="back-link">
            <ArrowLeft size={16} />
            月刊
          </Link>
          <h1>面经雷达</h1>
          <p className="subtitle">
            按公司、岗位、来源搜索面经和求职情报
          </p>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="filter-bar" aria-label="筛选条件">
        <div className="filter-row">
          <div className="search-box">
            <Search size={16} />
            <input
              value={filters.company}
              onChange={(e) => updateFilter('company', e.target.value)}
              placeholder="搜索公司"
              maxLength={100}
            />
          </div>
          <div className="search-box">
            <Search size={16} />
            <input
              value={filters.keyword}
              onChange={(e) => updateFilter('keyword', e.target.value)}
              placeholder="关键词搜索"
              maxLength={100}
            />
          </div>
        </div>

        <div className="tabs" role="tablist" aria-label="岗位筛选">
          {ROLE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={filters.role_category === tab.value}
              className={filters.role_category === tab.value ? 'active' : ''}
              onClick={() => updateFilter('role_category', tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="filter-row">
          <div className="tabs" role="tablist" aria-label="来源筛选">
            {SOURCE_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={filters.source_kind === tab.value}
                className={filters.source_kind === tab.value ? 'active' : ''}
                onClick={() => updateFilter('source_kind', tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="tabs" role="tablist" aria-label="时间筛选">
            {QUARTER_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={filters.quarter === tab.value}
                className={filters.quarter === tab.value ? 'active' : ''}
                onClick={() => updateFilter('quarter', tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Error */}
      {pageError && (
        <div className="error-banner" role="alert">
          <AlertCircle size={16} />
          <span>{pageError}</span>
        </div>
      )}

      {/* Stats Bar */}
      {!loading && result && (
        <section className="stats-bar" aria-label="统计概览">
          <span className="stats-total">共 {total} 条结果</span>
          {companyStats.length > 0 && (
            <div className="stats-pills">
              {companyStats.slice(0, 5).map((stat) => (
                <button
                  key={stat.company}
                  type="button"
                  className={`stat-pill${filters.company === stat.company ? ' active' : ''}`}
                  onClick={() =>
                    updateFilter(
                      'company',
                      filters.company === stat.company ? '' : stat.company,
                    )
                  }
                >
                  {stat.company}({stat.count})
                </button>
              ))}
            </div>
          )}
          {roleStats.length > 0 && (
            <div className="stats-pills">
              {roleStats.slice(0, 5).map((stat) => (
                <button
                  key={stat.role_category}
                  type="button"
                  className={`stat-pill role-pill${filters.role_category === stat.role_category ? ' active' : ''}`}
                  onClick={() =>
                    updateFilter(
                      'role_category',
                      filters.role_category === stat.role_category
                        ? ''
                        : stat.role_category,
                    )
                  }
                >
                  {stat.role_category}({stat.count})
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Content */}
      {loading ? (
        <div className="loading-state">
          <Loader2 className="spin" size={20} />
          正在搜索...
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <Search size={26} />
          <h2>没有找到匹配的面经</h2>
          <p>尝试调整筛选条件。</p>
        </div>
      ) : (
        <>
          <section className="radar-grid" aria-label="搜索结果">
            {items.map((item) => (
              <RadarCard key={item.id} item={item} />
            ))}
          </section>
          {hasMore && (
            <div className="load-more-row">
              <button
                type="button"
                className="secondary-button"
                onClick={() => updateFilter('page', filters.page + 1)}
              >
                加载更多
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function RadarCard({ item }: { item: FeedItem }) {
  const confidence = getConfidence(item);
  const isLow = confidence === 'low';
  const dateStr = formatDate(item.published_at ?? item.fetched_at ?? item.created_at);

  return (
    <article
      className="radar-card"
      style={isLow ? { opacity: 0.6 } : undefined}
    >
      <div className="card-top">
        <span className={`category-pill ${item.category}`}>
          {CATEGORY_LABELS[item.category] ?? item.category}
        </span>
        <span className={`source-badge ${item.source_kind}`}>
          {SOURCE_KIND_LABELS[item.source_kind] ?? item.source_kind}
        </span>
        <span className={`confidence-badge confidence-${confidence}`}>
          {confidence === 'high' ? '高置信' : confidence === 'medium' ? '中置信' : '低置信'}
        </span>
      </div>

      {(item.company || item.role) && (
        <div className="card-company-role">
          {item.company && <span className="company-tag">{item.company}</span>}
          {item.role && <span className="role-tag">{item.role}</span>}
        </div>
      )}

      <h2>{item.title}</h2>
      <p>{excerpt(item)}</p>

      {isLow && (
        <small className="low-confidence-note">
          AI 分类置信度低，仅供参考
        </small>
      )}

      <div className="card-footer">
        <div>
          <small>
            {item.source_name ?? SOURCE_KIND_LABELS[item.source_kind]}
            {dateStr ? ` · ${dateStr}` : ''}
          </small>
        </div>
        {item.source_url && (
          <a href={item.source_url} target="_blank" rel="noopener noreferrer">
            原文
            <ExternalLink size={13} />
          </a>
        )}
      </div>
    </article>
  );
}

const RADAR_CSS = `
.radar-shell {
  min-height: 100%;
  padding: 28px 32px 40px;
  color: var(--color-ink);
}

.radar-header {
  margin-bottom: 20px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-brand);
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  margin-bottom: 10px;
}

.radar-header h1 {
  margin: 0;
  font-size: 28px;
  line-height: 1.15;
  font-weight: 800;
}

.subtitle {
  max-width: 760px;
  margin: 10px 0 0;
  color: var(--color-ink-3);
  font-size: 14px;
  line-height: 1.65;
}

/* Filter bar */
.filter-bar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 18px;
}

.filter-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: 8px;
  flex: 1;
  min-width: 160px;
}

.search-box input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--color-ink);
  font-size: 13px;
  font-family: inherit;
}

.tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tabs button {
  border: 1px solid var(--color-line);
  background: var(--color-surface);
  color: var(--color-ink-3);
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
}

.tabs button.active {
  background: var(--color-ink);
  border-color: var(--color-ink);
  color: white;
}

/* Stats bar */
.stats-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 16px;
  padding: 12px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: 8px;
}

.stats-total {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-ink);
  flex-shrink: 0;
}

.stats-pills {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.stat-pill {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--color-line);
  background: var(--color-surface-2);
  color: var(--color-ink-2);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}

.stat-pill.active {
  background: var(--color-brand-soft);
  border-color: var(--color-brand);
  color: var(--color-brand-ink);
}

.stat-pill.role-pill {
  background: var(--color-surface-3);
}

.stat-pill.role-pill.active {
  background: var(--color-brand-soft);
  border-color: var(--color-brand);
  color: var(--color-brand-ink);
}

/* Error banner */
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

/* Loading and empty */
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
  border: 1px dashed var(--color-line-2);
  border-radius: 8px;
  background: var(--color-surface);
  padding: 42px 20px;
  gap: 8px;
}

.empty-state h2 {
  margin: 4px 0 0;
  color: var(--color-ink);
  font-size: 18px;
}

.empty-state p {
  max-width: 400px;
  margin: 0;
  line-height: 1.7;
  font-size: 14px;
}

.spin {
  animation: radar-spin 0.8s linear infinite;
}

@keyframes radar-spin {
  to { transform: rotate(360deg); }
}

/* Results grid */
.radar-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.radar-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: 8px;
  padding: 16px;
  transition: border-color 0.12s, box-shadow 0.12s;
}

.radar-card:hover {
  border-color: var(--color-brand);
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.card-top {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.category-pill,
.source-badge,
.confidence-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
  padding: 5px 8px;
}

.category-pill {
  color: var(--color-brand-ink);
  background: var(--color-brand-soft);
}

.source-badge {
  color: var(--color-ink-2);
  background: var(--color-surface-2);
  border: 1px solid var(--color-line);
}

.confidence-badge {
  margin-left: auto;
}

.confidence-high {
  color: #175f2b;
  background: var(--color-success-soft);
}

.confidence-medium {
  color: #b35900;
  background: rgba(255, 149, 0, 0.12);
}

.confidence-low {
  color: var(--color-ink-4);
  background: var(--color-surface-3);
}

.card-company-role {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.company-tag,
.role-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-ink-2);
  background: var(--color-surface-2);
}

.radar-card h2 {
  margin: 0;
  font-size: 15px;
  line-height: 1.4;
  font-weight: 700;
}

.radar-card p {
  margin: 0;
  color: var(--color-ink-3);
  font-size: 13px;
  line-height: 1.7;
}

.low-confidence-note {
  display: block;
  color: var(--color-ink-4);
  font-size: 11.5px;
  font-style: italic;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
  border-top: 1px solid var(--color-line);
  padding-top: 10px;
}

.card-footer small {
  display: block;
  color: var(--color-ink-3);
  font-size: 11.5px;
  line-height: 1.4;
}

.card-footer a {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--color-brand);
  font-size: 12px;
  font-weight: 800;
  text-decoration: none;
  flex-shrink: 0;
}

/* Load more */
.load-more-row {
  display: flex;
  justify-content: center;
  margin-top: 18px;
}

.secondary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border-radius: 8px;
  border: 1px solid var(--color-line);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  min-height: 36px;
  padding: 0 20px;
  color: var(--color-ink-2);
  background: var(--color-surface);
  font-family: inherit;
}

/* Responsive */
@media (max-width: 720px) {
  .radar-shell {
    padding: 20px 16px 28px;
  }

  .radar-header h1 {
    font-size: 24px;
  }

  .filter-row {
    flex-direction: column;
  }

  .radar-grid {
    grid-template-columns: 1fr;
  }

  .stats-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
`;
