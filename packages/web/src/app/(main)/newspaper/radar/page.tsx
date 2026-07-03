'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Search,
  AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import type {
  FeedItem,
  FeedSourceKind,
  DateConfidence,
  RadarResult,
  CompanyRadarItem,
  CompanyRadarResponse,
  RoleRadarItem,
  RoleRadarResponse,
  TrendRadarResponse,
} from '@/lib/types';

/* ---- Constants ---- */

type RadarTab = 'search' | 'company' | 'role' | 'trend';

const TAB_LIST: Array<{ value: RadarTab; label: string }> = [
  { value: 'search', label: '搜索' },
  { value: 'company', label: '公司雷达' },
  { value: 'role', label: '岗位雷达' },
  { value: 'trend', label: '趋势' },
];

const SOURCE_KIND_LABELS: Record<FeedSourceKind, string> = {
  xhs: '小红书',
  nowcoder: '牛客',
  wechat: '公众号',
  blog: '博客',
  ugc: '用户内容',
  coach: 'Coach',
  // T2 三类源不产出 FeedItem,radar 页不会遇到,仅为满足 Record<FeedSourceKind, string> 的完整性。
  sheet_file: '校招表格',
  sheet_link: '校招表格(链接)',
  wechat_dump: '公众号整理稿',
};

const CATEGORY_LABELS: Record<string, string> = {
  interview_exp: '面经',
  market_insight: '市场观察',
  job_tips: '求职策略',
  hiring_signal: '招聘信号',
  editorial: '编辑精选',
};

const ROLE_CATEGORY_LABELS: Record<string, string> = {
  backend: '后端开发',
  frontend: '前端开发',
  algorithm: '算法工程师',
  product: '产品经理',
  operations: '运营',
  hr: '人力资源',
  design: '设计',
  data: '数据分析',
  finance: '金融/财务',
  consulting: '咨询',
  marketing: '市场营销',
  management_trainee: '管培生',
  embedded: '嵌入式开发',
  testing: '测试开发',
  client: '客户端开发',
  general: '综合',
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

/* ---- Interfaces ---- */

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

/* ---- Helpers ---- */

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

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m 前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h 前`;
  const days = Math.floor(hrs / 24);
  return `${days}d 前`;
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}.${d.getDate()}`;
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

function getYearQuarter(iso: string | null): string {
  if (!iso) return '时间未知';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '时间未知';
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `${d.getFullYear()}Q${q}`;
}

function isDateUncertain(dc: DateConfidence | undefined): boolean {
  return dc === 'low' || dc === 'unknown' || dc === undefined;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '请求失败，请稍后再试';
}

/* ---- Exported Page (Suspense boundary for useSearchParams) ---- */

export default function RadarPage() {
  return (
    <Suspense fallback={<RadarLoading />}>
      <RadarPageInner />
    </Suspense>
  );
}

function RadarLoading() {
  return (
    <main className="radar-shell">
      <style>{RADAR_CSS}</style>
      <div className="loading-state">
        <Loader2 className="spin" size={20} />
        正在加载...
      </div>
    </main>
  );
}

/* ---- Main Page Component ---- */

function RadarPageInner() {
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<RadarTab>('search');
  const [result, setResult] = useState<RadarResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(() => {
    const urlKeyword = searchParams.get('keyword') ?? '';
    return { ...INITIAL_FILTERS, keyword: urlKeyword };
  });

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
          setResult((prev) =>
            filters.page > 1 && prev
              ? { ...data, items: [...prev.items, ...data.items] }
              : data,
          );
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

  const handleViewCompany = useCallback((company: string) => {
    setFilters((prev) => ({ ...prev, company, page: 1 }));
    setLoading(true);
    setPageError(null);
    setActiveTab('search');
  }, []);

  const handleViewRole = useCallback((roleCategory: string) => {
    setFilters((prev) => ({ ...prev, role_category: roleCategory, page: 1 }));
    setLoading(true);
    setPageError(null);
    setActiveTab('search');
  }, []);

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

      {/* Tab Bar */}
      <div className="radar-tabs" role="tablist" aria-label="雷达模式">
        {TAB_LIST.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.value}
            className={`radar-tab${activeTab === tab.value ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'search' && (
        <SearchTab
          filters={filters}
          updateFilter={updateFilter}
          result={result}
          loading={loading}
          pageError={pageError}
        />
      )}
      {activeTab === 'company' && (
        <CompanyTab onViewCompany={handleViewCompany} />
      )}
      {activeTab === 'role' && (
        <RoleTab onViewRole={handleViewRole} />
      )}
      {activeTab === 'trend' && <TrendTab />}
    </main>
  );
}

/* ---- Search Tab (existing functionality preserved) ---- */

function SearchTab({
  filters,
  updateFilter,
  result,
  loading,
  pageError,
}: {
  filters: Filters;
  updateFilter: (key: keyof Filters, value: string | number) => void;
  result: RadarResult | null;
  loading: boolean;
  pageError: string | null;
}) {
  const items = result?.items ?? [];
  const total = result?.total ?? 0;
  const companyStats = result?.company_stats ?? [];
  const roleStats = result?.role_stats ?? [];
  const hasMore = total > filters.page * 20;

  return (
    <>
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
              {companyStats
                .filter((stat) => stat.company && stat.company !== 'null' && stat.company.trim() !== '')
                .slice(0, 5)
                .map((stat) => (
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
                  {ROLE_CATEGORY_LABELS[stat.role_category] ?? stat.role_category}({stat.count})
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
    </>
  );
}

/* ---- Radar Card (existing search result card) ---- */

function RadarCard({ item }: { item: FeedItem }) {
  const confidence = getConfidence(item);
  const isLow = confidence === 'low';
  const dateStr = formatDate(item.published_at ?? item.fetched_at ?? item.created_at);
  const quarterLabel = getYearQuarter(item.published_at);
  const dateUncertain = isDateUncertain(item.date_confidence);

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
        <span className="quarter-label">{quarterLabel}</span>
        <span className={`confidence-badge confidence-${confidence}`}>
          {confidence === 'high' ? '高置信' : confidence === 'medium' ? '中置信' : '低置信'}
        </span>
      </div>

      {((item.company && item.company !== 'null' && item.company.trim() !== '') ||
        (item.role && item.role !== 'null' && item.role.trim() !== '')) && (
        <div className="card-company-role">
          {item.company && item.company !== 'null' && item.company.trim() !== '' && (
            <span className="company-tag">{item.company}</span>
          )}
          {item.role && item.role !== 'null' && item.role.trim() !== '' && (
            <span className="role-tag">{item.role}</span>
          )}
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
          {dateUncertain && (
            <small className="date-uncertain-label">发布时间待确认</small>
          )}
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

/* ---- Company Tab ---- */

function CompanyTab({ onViewCompany }: { onViewCompany: (company: string) => void }) {
  const [data, setData] = useState<CompanyRadarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get<CompanyRadarResponse>('/newspaper/radar/companies')
      .then((d) => { if (!cancelled) { setData(d); setError(null); } })
      .catch((e) => { if (!cancelled) setError(getErrorMessage(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="loading-state"><Loader2 className="spin" size={20} />加载公司雷达...</div>;
  if (error) return <div className="error-banner" role="alert"><AlertCircle size={16} /><span>{error}</span></div>;
  if (!data || data.companies.length === 0) {
    return (
      <div className="empty-state">
        <Search size={26} />
        <h2>暂无公司数据</h2>
        <p>还没有采集到带公司标签的面经。</p>
      </div>
    );
  }

  return (
    <section className="radar-grid" aria-label="公司雷达">
      {data.companies.map((c) => (
        <CompanyCard key={c.company} item={c} onView={() => onViewCompany(c.company)} />
      ))}
    </section>
  );
}

function CompanyCard({ item, onView }: { item: CompanyRadarItem; onView: () => void }) {
  const total = item.total_count || 1;
  const xhsPct = Math.round((item.xhs_count / total) * 100);
  const ncPct = Math.round((item.nowcoder_count / total) * 100);
  const wxPct = 100 - xhsPct - ncPct;

  const latestStr = item.latest_collected_at ? formatRelativeTime(item.latest_collected_at) : '';

  return (
    <article
      className="radar-card company-card"
      style={item.priority === 'B' ? { opacity: 0.85 } : undefined}
    >
      <div className="card-top">
        <span className="company-name">{item.company}</span>
        <span className="company-meta">
          {item.priority && <span className="priority-badge">{item.priority}</span>}
          {item.sector && <span className="sector-label">{item.sector}</span>}
        </span>
      </div>

      <div className="company-stats-row">
        <span>面经 <strong>{item.total_count}</strong> 条</span>
        <span className="dot-sep" />
        <span>可用 <strong>{item.usable_count}</strong> 条</span>
      </div>

      {/* Source distribution bar */}
      <div className="source-bar">
        {item.xhs_count > 0 && (
          <div className="source-seg xhs" style={{ width: `${xhsPct}%` }}
            title={`小红书 ${item.xhs_count}`} />
        )}
        {item.nowcoder_count > 0 && (
          <div className="source-seg nowcoder" style={{ width: `${ncPct}%` }}
            title={`牛客 ${item.nowcoder_count}`} />
        )}
        {item.wechat_count > 0 && (
          <div className="source-seg wechat" style={{ width: `${wxPct}%` }}
            title={`公众号 ${item.wechat_count}`} />
        )}
      </div>
      <div className="source-legend">
        {item.xhs_count > 0 && <span className="legend-item xhs">XHS {item.xhs_count}</span>}
        {item.nowcoder_count > 0 && <span className="legend-item nowcoder">牛客 {item.nowcoder_count}</span>}
        {item.wechat_count > 0 && <span className="legend-item wechat">公众号 {item.wechat_count}</span>}
      </div>

      {/* Top roles */}
      {item.top_roles.length > 0 && (
        <div className="card-company-role">
          {item.top_roles.map((r) => (
            <span key={r} className="role-tag">{ROLE_CATEGORY_LABELS[r] ?? r}</span>
          ))}
        </div>
      )}

      <div className="company-signal-row">
        <span>质量分 {item.quality_score_avg}</span>
        {item.dominant_signal && (
          <>
            <span className="dot-sep" />
            <span className="signal-text">{item.dominant_signal}</span>
          </>
        )}
      </div>

      <div className="card-footer">
        <small>{latestStr ? `最新采集 ${latestStr}` : ''}</small>
        <button type="button" className="view-company-btn" onClick={onView}>
          查看该公司面经 →
        </button>
      </div>
    </article>
  );
}

/* ---- Role Tab ---- */

function RoleTab({ onViewRole }: { onViewRole: (role: string) => void }) {
  const [data, setData] = useState<RoleRadarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get<RoleRadarResponse>('/newspaper/radar/roles')
      .then((d) => { if (!cancelled) { setData(d); setError(null); } })
      .catch((e) => { if (!cancelled) setError(getErrorMessage(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="loading-state"><Loader2 className="spin" size={20} />加载岗位雷达...</div>;
  if (error) return <div className="error-banner" role="alert"><AlertCircle size={16} /><span>{error}</span></div>;
  if (!data || data.roles.length === 0) {
    return (
      <div className="empty-state">
        <Search size={26} />
        <h2>暂无岗位数据</h2>
        <p>还没有按岗位分类的面经数据。</p>
      </div>
    );
  }

  return (
    <section className="radar-grid" aria-label="岗位雷达">
      {data.roles.map((r) => (
        <RoleCard key={r.role_category} item={r} onView={() => onViewRole(r.role_category)} />
      ))}
    </section>
  );
}

function RoleCard({ item, onView }: { item: RoleRadarItem; onView: () => void }) {
  const sourcePreference =
    item.xhs_count > item.nowcoder_count * 2 ? '偏 XHS'
    : item.nowcoder_count > item.xhs_count * 2 ? '偏牛客'
    : '均衡';

  const total = item.total_count || 1;
  const xhsPct = Math.round((item.xhs_count / total) * 100);
  const ncPct = Math.round((item.nowcoder_count / total) * 100);
  const wxPct = Math.max(100 - xhsPct - ncPct, 0);

  return (
    <article className="radar-card role-card">
      <div className="card-top">
        <span className="role-card-name">{ROLE_CATEGORY_LABELS[item.role_category] ?? item.label}</span>
        <span className={`source-pref-badge ${sourcePreference === '偏 XHS' ? 'xhs' : sourcePreference === '偏牛客' ? 'nowcoder' : ''}`}>
          {sourcePreference}
        </span>
      </div>

      <div className="company-stats-row">
        <span>面经 <strong>{item.total_count}</strong> 条</span>
        <span className="dot-sep" />
        <span>覆盖 <strong>{item.companies_covered}</strong> 家公司</span>
      </div>

      {/* Source bar */}
      <div className="source-bar">
        {item.xhs_count > 0 && <div className="source-seg xhs" style={{ width: `${xhsPct}%` }} />}
        {item.nowcoder_count > 0 && <div className="source-seg nowcoder" style={{ width: `${ncPct}%` }} />}
        {item.wechat_count > 0 && <div className="source-seg wechat" style={{ width: `${wxPct}%` }} />}
      </div>

      {/* Top companies */}
      {item.top_companies.length > 0 && (
        <div className="card-company-role">
          {item.top_companies.map((c) => (
            <span key={c} className="company-tag">{c}</span>
          ))}
        </div>
      )}

      {/* Common question keywords */}
      {item.common_question_keywords.length > 0 && (
        <div className="question-keywords">
          <small className="section-label">常见考点:</small>
          <div className="keyword-tags">
            {item.common_question_keywords.map((kw) => (
              <span key={kw} className="keyword-tag">{kw}</span>
            ))}
          </div>
        </div>
      )}

      {/* Representative posts */}
      {item.representative_posts.length > 0 && (
        <div className="repr-posts">
          <small className="section-label">精选面经:</small>
          {item.representative_posts.map((post, i) => (
            <a
              key={i}
              href={post.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="repr-post-link"
            >
              {post.title}
              {post.company && post.company !== 'null' && post.company.trim() !== '' && (
                <span className="repr-company">({post.company})</span>
              )}
              <ExternalLink size={11} />
            </a>
          ))}
        </div>
      )}

      <div className="card-footer">
        <small>可用 {item.usable_count} 条</small>
        <button type="button" className="view-company-btn" onClick={onView}>
          查看该岗位面经 →
        </button>
      </div>
    </article>
  );
}

/* ---- Trend Tab ---- */

function TrendTab() {
  const [data, setData] = useState<TrendRadarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get<TrendRadarResponse>('/newspaper/radar/trends')
      .then((d) => { if (!cancelled) { setData(d); setError(null); } })
      .catch((e) => { if (!cancelled) setError(getErrorMessage(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="loading-state"><Loader2 className="spin" size={20} />加载趋势...</div>;
  if (error) return <div className="error-banner" role="alert"><AlertCircle size={16} /><span>{error}</span></div>;
  if (!data) return null;

  const periodLabel = `${formatDateShort(data.period.current_start)} - ${formatDateShort(data.period.current_end)}`;

  return (
    <section className="trend-section" aria-label="趋势">
      {/* Header */}
      <div className="trend-header">
        <h2>本周趋势</h2>
        <span className="trend-period">{periodLabel}</span>
      </div>

      {/* This week stats */}
      <div className="trend-stat-card">
        <div className="trend-big-number">
          本周新增 <strong>{data.this_week.new_items}</strong> 条面经
        </div>
        <div className={`trend-comparison ${!data.comparison.has_baseline ? 'muted' : ''}`}>
          {data.comparison.message}
        </div>
      </div>

      {/* New companies & roles */}
      {data.this_week.new_companies.length > 0 && (
        <div className="trend-new-section">
          <h3>新增公司</h3>
          <div className="card-company-role">
            {data.this_week.new_companies.map((c) => (
              <span key={c} className="company-tag">{c}</span>
            ))}
          </div>
        </div>
      )}

      {data.this_week.new_role_categories.length > 0 && (
        <div className="trend-new-section">
          <h3>新增岗位类</h3>
          <div className="card-company-role">
            {data.this_week.new_role_categories.map((r) => (
              <span key={r} className="role-tag">{ROLE_CATEGORY_LABELS[r] ?? r}</span>
            ))}
          </div>
        </div>
      )}

      {/* Source distribution */}
      {data.this_week.top_sources.length > 0 && (
        <div className="trend-new-section">
          <h3>本周来源分布</h3>
          <div className="source-legend">
            {data.this_week.top_sources.map((s) => (
              <span key={s.source_kind} className={`legend-item ${s.source_kind}`}>
                {SOURCE_KIND_LABELS[s.source_kind as FeedSourceKind] ?? s.source_kind} {s.count} 条
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Hot posts */}
      {data.hot_posts.length > 0 && (
        <div className="trend-new-section">
          <h3>本周热门面经</h3>
          <div className="hot-posts-list">
            {data.hot_posts.map((post, i) => (
              <a
                key={i}
                href={post.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hot-post-item"
              >
                <span className="hot-post-rank">{i + 1}</span>
                <span className="hot-post-title">{post.title}</span>
                {post.company && post.company !== 'null' && post.company.trim() !== '' && (
                  <span className="hot-post-company">{post.company}</span>
                )}
                {(!post.published_at || isDateUncertain(post.date_confidence)) && (
                  <span className="date-uncertain-label">发布时间待确认</span>
                )}
                <span className={`source-badge ${post.source_kind}`}>
                  {SOURCE_KIND_LABELS[post.source_kind as FeedSourceKind] ?? post.source_kind}
                </span>
                <ExternalLink size={11} />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Empty state for no hot_posts and no new_items */}
      {data.this_week.new_items === 0 && data.hot_posts.length === 0 && (
        <div className="empty-state">
          <Search size={26} />
          <h2>本周暂无新增面经</h2>
          <p>系统会持续采集，请稍后再查看。</p>
        </div>
      )}
    </section>
  );
}

/* ---- Styles ---- */

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
  font-family: var(--serif);
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

/* Tab bar */
.radar-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 18px;
  border-bottom: 2px solid var(--color-line);
  padding-bottom: 0;
}

.radar-tab {
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-ink-3);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  font-family: inherit;
  transition: color 0.15s, border-color 0.15s;
}

.radar-tab.active {
  color: var(--color-brand);
  border-bottom-color: var(--color-brand);
}

.radar-tab:hover:not(.active) {
  color: var(--color-ink);
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
  border-radius: var(--radius-default);
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
  border: 1px solid var(--hair);
  background: rgba(47, 143, 255, 0.05);
  color: var(--color-ink-3);
  border-radius: var(--radius-pill);
  padding: 7px 12px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
}

.tabs button.active {
  background: linear-gradient(135deg, var(--color-brand), var(--color-brand-deep));
  border-color: transparent;
  color: #fff;
  box-shadow: 0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

/* Stats bar */
.stats-bar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 16px;
  padding: 12px 14px;
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(160%);
  backdrop-filter: blur(var(--glass-blur)) saturate(160%);
  border: 1px solid var(--glass-bd);
  border-radius: 22px;
  box-shadow: var(--glass-sh), inset 0 1px 0 var(--glass-rim);
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
  border: 1px solid var(--hair);
  background: rgba(47, 143, 255, 0.05);
  color: var(--color-ink-2);
  border-radius: var(--radius-pill);
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
  background: rgba(47, 143, 255, 0.05);
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
  border-radius: var(--radius-default);
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
  position: relative;
  border-radius: 22px;
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(160%);
  backdrop-filter: blur(var(--glass-blur)) saturate(160%);
  border: 1px solid var(--glass-bd);
  box-shadow: var(--glass-sh), inset 0 1px 0 var(--glass-rim);
  padding: 42px 20px;
  gap: 8px;
}

.empty-state h2 {
  margin: 4px 0 0;
  font-family: var(--serif);
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
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(160%);
  backdrop-filter: blur(var(--glass-blur)) saturate(160%);
  border: 1px solid var(--glass-bd);
  border-radius: 22px;
  box-shadow: var(--glass-sh), inset 0 1px 0 var(--glass-rim);
  padding: 16px;
  transition: border-color 0.12s, box-shadow 0.12s;
}

.radar-card:hover {
  border-color: var(--color-brand);
  box-shadow: var(--glass-sh), inset 0 1px 0 var(--glass-rim), 0 0 0 1px var(--color-brand);
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
  border-radius: var(--radius-pill);
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
  background: rgba(47, 143, 255, 0.05);
  border: 1px solid var(--hair);
}

.confidence-badge {
  margin-left: auto;
}

.confidence-high {
  color: var(--color-success);
  background: var(--color-success-soft);
}

.confidence-medium {
  color: var(--color-warn);
  background: var(--color-warn-soft);
}

.confidence-low {
  color: var(--color-ink-4);
  background: rgba(47, 143, 255, 0.05);
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
  border-radius: var(--radius-pill);
  font-size: 12px;
  font-weight: 600;
  color: var(--color-ink-2);
  background: rgba(47, 143, 255, 0.05);
  border: 1px solid var(--hair);
}

.radar-card h2 {
  margin: 0;
  font-family: var(--serif);
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
  border-top: 1px solid var(--hair);
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
  border-radius: var(--radius-default);
  border: 1px solid var(--glass-bd);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  min-height: 36px;
  padding: 0 20px;
  color: var(--color-ink-2);
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(14px) saturate(150%);
  backdrop-filter: blur(14px) saturate(150%);
  box-shadow: inset 0 1px 0 var(--glass-rim);
  font-family: inherit;
}

/* Company card */
.company-card .company-name {
  font-size: 16px;
  font-weight: 800;
}

.company-meta {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-left: auto;
}

.priority-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 800;
  background: var(--color-brand-soft);
  color: var(--color-brand-ink);
}

.sector-label {
  font-size: 11px;
  color: var(--color-ink-3);
}

.company-stats-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-ink-2);
}

.dot-sep {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--color-ink-4);
}

.source-bar {
  display: flex;
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
  background: rgba(47, 143, 255, 0.05);
  border: 1px solid var(--hair);
}

.source-seg { min-width: 3px; }
.source-seg.xhs { background: #ff2442; }
.source-seg.nowcoder { background: #00c853; }
.source-seg.wechat { background: #1890ff; }

.source-legend {
  display: flex;
  gap: 10px;
  font-size: 11px;
  color: var(--color-ink-3);
}

.legend-item::before {
  content: '';
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  margin-right: 4px;
  vertical-align: middle;
}

.legend-item.xhs::before { background: #ff2442; }
.legend-item.nowcoder::before { background: #00c853; }
.legend-item.wechat::before { background: #1890ff; }

.company-signal-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-ink-3);
}

.signal-text {
  color: var(--color-brand);
  font-weight: 600;
}

.view-company-btn {
  border: none;
  background: none;
  color: var(--color-brand);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  font-family: inherit;
  padding: 0;
}

/* Role card */
.role-card-name {
  font-size: 16px;
  font-weight: 800;
}

.source-pref-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: var(--radius-pill);
  margin-left: auto;
  color: var(--color-ink-3);
  background: rgba(47, 143, 255, 0.05);
  border: 1px solid var(--hair);
}

.source-pref-badge.xhs { color: #ff2442; background: rgba(255,36,66,0.08); }
.source-pref-badge.nowcoder { color: #00c853; background: rgba(0,200,83,0.08); }

.question-keywords {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-label {
  font-size: 11.5px;
  color: var(--color-ink-4);
  font-weight: 600;
}

.keyword-tags {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.keyword-tag {
  font-size: 11px;
  padding: 3px 7px;
  border-radius: 6px;
  background: rgba(47, 143, 255, 0.05);
  border: 1px solid var(--hair);
  color: var(--color-ink-2);
}

.repr-posts {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.repr-post-link {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--color-ink-2);
  text-decoration: none;
  line-height: 1.5;
}

.repr-post-link:hover { color: var(--color-brand); }
.repr-company { color: var(--color-ink-4); font-size: 11px; }

/* Trend tab */
.trend-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.trend-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.trend-header h2 {
  margin: 0;
  font-family: var(--serif);
  font-size: 20px;
  font-weight: 800;
}

.trend-period {
  font-size: 13px;
  color: var(--color-ink-3);
}

.trend-stat-card {
  position: relative;
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(160%);
  backdrop-filter: blur(var(--glass-blur)) saturate(160%);
  border: 1px solid var(--glass-bd);
  border-radius: 22px;
  box-shadow: var(--glass-sh), inset 0 1px 0 var(--glass-rim);
  padding: 20px;
}

.trend-big-number {
  font-size: 16px;
  color: var(--color-ink);
  margin-bottom: 8px;
}

.trend-big-number strong {
  font-size: 28px;
  font-weight: 800;
  color: var(--color-brand);
}

.trend-comparison {
  font-size: 14px;
  color: var(--color-ink-2);
}

.trend-comparison.muted {
  color: var(--color-ink-4);
  font-style: italic;
}

.trend-new-section {
  position: relative;
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(160%);
  backdrop-filter: blur(var(--glass-blur)) saturate(160%);
  border: 1px solid var(--glass-bd);
  border-radius: 22px;
  box-shadow: var(--glass-sh), inset 0 1px 0 var(--glass-rim);
  padding: 16px;
}

.trend-new-section h3 {
  margin: 0 0 10px;
  font-family: var(--serif);
  font-size: 14px;
  font-weight: 700;
}

.hot-posts-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hot-post-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-ink);
  text-decoration: none;
  padding: 8px 0;
  border-bottom: 1px solid var(--hair);
}

.hot-post-item:last-child { border-bottom: none; }
.hot-post-item:hover { color: var(--color-brand); }

.hot-post-rank {
  font-size: 14px;
  font-weight: 800;
  color: var(--color-brand);
  min-width: 20px;
}

.hot-post-title { flex: 1; }

.hot-post-company {
  font-size: 11px;
  color: var(--color-ink-3);
}

.quarter-label {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 7px;
  border-radius: 6px;
  background: rgba(47, 143, 255, 0.05);
  border: 1px solid var(--hair);
  color: var(--color-ink-3);
}

.date-uncertain-label {
  display: inline-block;
  font-size: 10.5px;
  color: var(--color-warn);
  background: var(--color-warn-soft);
  padding: 2px 6px;
  border-radius: 6px;
  font-weight: 600;
  white-space: nowrap;
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
