'use client';

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Database,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  Settings,
  X,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { api } from '@/lib/api';
import type {
  DigestRun,
  DigestRunStatus,
  FeedCategory,
  FeedItem,
  FeedSource,
  FeedSourceKind,
  FeedSourceStatus,
} from '@/lib/types';

type SourceFilter = FeedSourceKind | 'all';
type CategoryFilter = FeedCategory | 'all';

interface FormState {
  title: string;
  company: string;
  role: string;
  outcome: string;
  content: string;
}

const EMPTY_FORM: FormState = {
  title: '',
  company: '',
  role: '',
  outcome: '',
  content: '',
};

const SOURCE_KIND_LABELS: Record<FeedSourceKind, string> = {
  xhs: '小红书',
  nowcoder: '牛客',
  wechat: '公众号',
  blog: '博客',
  ugc: '用户内容',
  coach: 'Coach',
};

const CATEGORY_LABELS: Record<FeedCategory, string> = {
  interview_exp: '面经',
  market_insight: '市场观察',
  job_tips: '求职策略',
  hiring_signal: '招聘信号',
  editorial: '编辑精选',
};

const SOURCE_STATUS_LABELS: Record<FeedSourceStatus, string> = {
  active: '可采集',
  paused: '已暂停',
  needs_config: '待配置',
};

const RUN_STATUS_LABELS: Record<DigestRunStatus, string> = {
  running: '运行中',
  success: '成功',
  partial: '部分成功',
  failed: '失败',
};

const OUTCOME_LABELS: Record<string, string> = {
  pass: '通过',
  fail: '未通过',
  offer: '拿到 Offer',
  pending: '等待结果',
};

const SOURCE_FILTERS: Array<{ value: SourceFilter; label: string }> = [
  { value: 'all', label: '全部来源' },
  { value: 'xhs', label: '小红书' },
  { value: 'nowcoder', label: '牛客' },
  { value: 'wechat', label: '公众号' },
  { value: 'coach', label: 'Coach' },
  { value: 'ugc', label: '用户内容' },
];

const CATEGORY_FILTERS: Array<{ value: CategoryFilter; label: string }> = [
  { value: 'all', label: '全部类型' },
  { value: 'interview_exp', label: '面经' },
  { value: 'market_insight', label: '市场观察' },
  { value: 'job_tips', label: '求职策略' },
  { value: 'hiring_signal', label: '招聘信号' },
  { value: 'editorial', label: '编辑精选' },
];

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '请求失败，请稍后再试';
}

function formatDate(value: string | null): string {
  if (!value) return '从未运行';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '时间未知';
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function displaySourceName(item: FeedItem): string {
  return item.source_name ?? SOURCE_KIND_LABELS[item.source_kind];
}

function excerpt(item: FeedItem): string {
  const text = item.summary?.trim() || item.content.trim();
  return text.length > 180 ? `${text.slice(0, 180).trimEnd()}...` : text;
}

function sourceFilterToQuery(source: SourceFilter): string | null {
  return source === 'all' ? null : source;
}

function categoryFilterToQuery(category: CategoryFilter): string | null {
  return category === 'all' ? null : category;
}

export default function DigestPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [sources, setSources] = useState<FeedSource[]>([]);
  const [runs, setRuns] = useState<DigestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [keyword, setKeyword] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const feedPath = useMemo(() => {
    const params = new URLSearchParams();
    const source = sourceFilterToQuery(sourceFilter);
    const category = categoryFilterToQuery(categoryFilter);
    const trimmedKeyword = keyword.trim();
    if (source) params.set('source_kind', source);
    if (category) params.set('category', category);
    if (trimmedKeyword) params.set('keyword', trimmedKeyword);
    return params.size > 0 ? `/feed?${params.toString()}` : '/feed';
  }, [categoryFilter, keyword, sourceFilter]);

  async function loadSourcesAndRuns() {
    const [feedSources, digestRuns] = await Promise.all([
      api.get<FeedSource[]>('/feed/sources'),
      api.get<DigestRun[]>('/feed/runs'),
    ]);
    setSources(feedSources);
    setRuns(digestRuns);
  }

  useEffect(() => {
    // 用 AbortController 真正中止旧请求(api.get 已支持 signal),切换 feedPath 时取消上一笔。
    const controller = new AbortController();
    let active = true;
    async function run() {
      setLoading(true);
      try {
        const feedItems = await api.get<FeedItem[]>(feedPath, { signal: controller.signal });
        if (!active) return;
        setItems(feedItems);
        setPageError(null);
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        setPageError(getErrorMessage(error));
      } finally {
        if (active) setLoading(false);
      }
    }
    void run();
    return () => {
      active = false;
      controller.abort();
    };
  }, [feedPath]);

  useEffect(() => {
    Promise.all([
      api.get<FeedSource[]>('/feed/sources'),
      api.get<DigestRun[]>('/feed/runs'),
    ])
      .then(([feedSources, digestRuns]) => {
        setSources(feedSources);
        setRuns(digestRuns);
      })
      .catch(() => {});
  }, []);

  async function loadDigest() {
    setLoading(true);
    setPageError(null);
    try {
      const [feedItems] = await Promise.all([
        api.get<FeedItem[]>(feedPath),
        loadSourcesAndRuns(),
      ]);
      setItems(feedItems);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  const latestRun = runs[0] ?? null;
  const sourceSummary = useMemo(() => {
    return {
      active: sources.filter((source) => source.status === 'active').length,
      needsConfig: sources.filter((source) => source.status === 'needs_config').length,
      total: sources.length,
    };
  }, [sources]);

  async function handleImport() {
    setImporting(true);
    setPageError(null);
    try {
      await api.post<{ runs: DigestRun[] }>('/feed/import', {});
      await loadDigest();
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setImporting(false);
    }
  }

  function handleFormChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        ...(form.company.trim() ? { company: form.company.trim() } : {}),
        ...(form.role.trim() ? { role: form.role.trim() } : {}),
        ...(form.outcome ? { outcome: form.outcome } : {}),
      };
      await api.post<FeedItem>('/feed', payload);
      setForm(EMPTY_FORM);
      setShowForm(false);
      setSourceFilter('all');
      setCategoryFilter('all');
      setKeyword('');
      await loadDigest();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  function resetFilters() {
    setSourceFilter('all');
    setCategoryFilter('all');
    setKeyword('');
  }

  return (
    <main className="digest-shell">
      <style>{DIGEST_CSS}</style>

      <section className="digest-header">
        <div>
          <p className="eyebrow">Source-backed Digest</p>
          <h1>求职情报月刊</h1>
          <p className="subtitle">
            面经、市场观察和求职策略只展示有来源的内容。没有来源时，页面会诚实显示配置或空状态。
          </p>
        </div>
        <div className="header-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={() => void loadDigest()}
            disabled={loading || importing}
          >
            <RefreshCcw size={16} />
            刷新
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => void handleImport()}
            disabled={loading || importing || sources.length === 0}
          >
            {importing ? <Loader2 className="spin" size={16} /> : <Database size={16} />}
            {importing ? '导入中' : '导入来源'}
          </button>
          <button className="primary-button" type="button" onClick={() => setShowForm(true)}>
            <Plus size={16} />
            写面经
          </button>
        </div>
      </section>

      <section className="status-grid" aria-label="来源状态">
        <div className="lg status-card">
          <span>来源配置</span>
          <strong>{sourceSummary.active}/{sourceSummary.total}</strong>
          <small>{sourceSummary.needsConfig > 0 ? `${sourceSummary.needsConfig} 个待配置` : '全部可用'}</small>
        </div>
        <div className="lg status-card">
          <span>最近导入</span>
          <strong>{latestRun ? RUN_STATUS_LABELS[latestRun.status] : '未运行'}</strong>
          <small>{latestRun ? formatDate(latestRun.created_at) : '点击导入来源开始采集'}</small>
        </div>
        <div className="lg status-card">
          <span>当前结果</span>
          <strong>{items.length}</strong>
          <small>按筛选条件返回的真实记录</small>
        </div>
      </section>

      <SourceStrip sources={sources} />
      <RunNotice run={latestRun} />

      <section className="controls" aria-label="月刊筛选">
        <div className="search-box">
          <Search size={16} />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索公司、岗位、主题"
            maxLength={100}
          />
        </div>
        <div className="segmented" aria-label="来源筛选">
          {SOURCE_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={sourceFilter === option.value ? 'active' : ''}
              onClick={() => { setLoading(true); setSourceFilter(option.value); }}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="tabs" aria-label="类型筛选">
          {CATEGORY_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={categoryFilter === option.value ? 'active' : ''}
              onClick={() => { setLoading(true); setCategoryFilter(option.value); }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {pageError && (
        <div className="error-banner" role="alert">
          <AlertCircle size={16} />
          <span>{pageError}</span>
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <Loader2 className="spin" size={20} />
          正在读取真实来源...
        </div>
      ) : items.length === 0 ? (
        <EmptyDigestState
          hasSources={sources.length > 0}
          hasFilters={sourceFilter !== 'all' || categoryFilter !== 'all' || keyword.trim().length > 0}
          onImport={() => void handleImport()}
          onReset={resetFilters}
          importing={importing}
        />
      ) : (
        <section className="digest-grid" aria-label="月刊内容">
          {items.map((item) => (
            <DigestCard key={item.id} item={item} />
          ))}
        </section>
      )}

      {showForm && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <form className="lg digest-form" onSubmit={(event) => void handleSubmit(event)}>
            <div className="form-title-row">
              <div>
                <h2>写一篇面经</h2>
                <p>这会作为用户内容显示，不会伪装成外部来源。</p>
              </div>
              <button className="icon-button" type="button" onClick={() => setShowForm(false)}>
                <X size={18} />
              </button>
            </div>

            <label>
              标题 *
              <input
                name="title"
                value={form.title}
                onChange={handleFormChange}
                placeholder="例：字节跳动产品经理一面复盘"
                maxLength={200}
                required
              />
            </label>

            <div className="form-grid">
              <label>
                公司
                <input
                  name="company"
                  value={form.company}
                  onChange={handleFormChange}
                  placeholder="字节跳动"
                  maxLength={100}
                />
              </label>
              <label>
                岗位
                <input
                  name="role"
                  value={form.role}
                  onChange={handleFormChange}
                  placeholder="产品经理"
                  maxLength={100}
                />
              </label>
            </div>

            <label>
              结果
              <select name="outcome" value={form.outcome} onChange={handleFormChange}>
                <option value="">不填写</option>
                <option value="pass">通过</option>
                <option value="fail">未通过</option>
                <option value="offer">拿到 Offer</option>
                <option value="pending">等待结果</option>
              </select>
            </label>

            <label>
              内容 *
              <textarea
                name="content"
                value={form.content}
                onChange={handleFormChange}
                placeholder="记录题目、追问、面试官风格、你当时的回答和复盘建议。"
                maxLength={5000}
                required
                rows={8}
              />
              <span className="char-count">{form.content.length} / 5000</span>
            </label>

            {formError && (
              <p className="form-error">
                <AlertCircle size={14} />
                {formError}
              </p>
            )}

            <div className="form-actions">
              <button className="secondary-button" type="button" onClick={() => setShowForm(false)}>
                取消
              </button>
              <button
                className="primary-button"
                type="submit"
                disabled={submitting || !form.title.trim() || !form.content.trim()}
              >
                {submitting ? <Loader2 className="spin" size={16} /> : null}
                {submitting ? '发布中' : '发布'}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

function SourceStrip({ sources }: { sources: FeedSource[] }) {
  if (sources.length === 0) {
    return (
      <section className="source-strip empty">
        <Settings size={16} />
        还没有配置情报来源。月刊不会展示任何伪造内容。
      </section>
    );
  }

  return (
    <section className="source-strip" aria-label="来源明细">
      {sources.map((source) => (
        <article key={source.id} className={`source-chip ${source.status}`}>
          <div>
            <strong>{source.name}</strong>
            <span>{source.description ?? SOURCE_KIND_LABELS[source.kind]}</span>
          </div>
          <small>
            {SOURCE_STATUS_LABELS[source.status]} · {formatDate(source.last_run_at)}
          </small>
        </article>
      ))}
    </section>
  );
}

function RunNotice({ run }: { run: DigestRun | null }) {
  if (!run) return null;

  const icon = run.status === 'success' ? <CheckCircle2 size={16} /> : <Clock size={16} />;
  return (
    <section className={`run-notice ${run.status}`}>
      {icon}
      <span>
        最近一次导入：{RUN_STATUS_LABELS[run.status]}，抓取 {run.fetched_count} 条，保存 {run.saved_count} 条，跳过{' '}
        {run.skipped_count} 条。
        {run.error_message ? ` ${run.error_message}` : ''}
      </span>
    </section>
  );
}

function EmptyDigestState({
  hasSources,
  hasFilters,
  importing,
  onImport,
  onReset,
}: {
  hasSources: boolean;
  hasFilters: boolean;
  importing: boolean;
  onImport: () => void;
  onReset: () => void;
}) {
  return (
    <section className="empty-state">
      <Database size={26} />
      <h2>{hasFilters ? '当前筛选下没有内容' : hasSources ? '还没有抓取到新情报' : '还没有配置情报来源'}</h2>
      <p>
        {hasFilters
          ? '可以清空筛选重新查看，或先写一篇自己的面经。'
          : hasSources
            ? '请稍后重新导入，或先写一篇自己的面经。页面不会用假卡片填充空白。'
            : '需要配置小红书 MCP、牛客 RSS 或人工校验来源后，月刊才会展示内容。'}
      </p>
      <div className="empty-actions">
        {hasFilters && (
          <button className="secondary-button" type="button" onClick={onReset}>
            清空筛选
          </button>
        )}
        <button className="primary-button" type="button" onClick={onImport} disabled={!hasSources || importing}>
          {importing ? <Loader2 className="spin" size={16} /> : <Database size={16} />}
          {importing ? '导入中' : '导入来源'}
        </button>
      </div>
    </section>
  );
}

function DigestCard({ item }: { item: FeedItem }) {
  return (
    <article className="lg digest-card">
      <div className="card-top">
        <span className={`category-pill ${item.category}`}>{CATEGORY_LABELS[item.category]}</span>
        <span className={`source-badge ${item.source_kind}`}>{SOURCE_KIND_LABELS[item.source_kind]}</span>
      </div>
      <h2>{item.title}</h2>
      <p>{excerpt(item)}</p>
      <div className="card-meta">
        {item.company && <span>{item.company}</span>}
        {item.role && <span>{item.role}</span>}
        {item.outcome && <span>{OUTCOME_LABELS[item.outcome] ?? item.outcome}</span>}
      </div>
      <div className="card-footer">
        <div>
          <strong>{displaySourceName(item)}</strong>
          <small>
            {formatDate(item.published_at ?? item.fetched_at ?? item.created_at)}
            {item.quality_score > 0 ? ` · 质量 ${item.quality_score}` : ''}
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

const DIGEST_CSS = `
.digest-shell {
  min-height: 100%;
  padding: 28px 32px 40px;
  color: var(--color-ink);
}

.digest-header {
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

.digest-header h1 {
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

.header-actions,
.form-actions,
.empty-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

button {
  font-family: inherit;
}

.primary-button,
.secondary-button,
.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border-radius: 8px;
  border: 1px solid transparent;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  min-height: 36px;
}

.primary-button {
  padding: 0 14px;
  background: linear-gradient(135deg, var(--color-brand), var(--color-brand-deep));
  color: #fff;
  box-shadow: 0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4);
}

.secondary-button {
  padding: 0 12px;
  color: var(--color-ink-2);
  background: rgba(47,143,255,.05);
  border-color: var(--hair);
}

.icon-button {
  width: 34px;
  color: var(--color-ink-3);
  background: rgba(47,143,255,.05);
  border-color: var(--hair);
}

.primary-button:disabled,
.secondary-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

/* 外层玻璃由 .lg 提供(JSX 上加 className="lg status-card");此处仅留内边距。 */
.status-card {
  padding: 14px 16px;
}

.status-card span,
.status-card small {
  display: block;
  color: var(--color-ink-3);
  font-size: 12px;
  line-height: 1.45;
}

.status-card strong {
  display: block;
  margin: 4px 0;
  font-size: 22px;
  line-height: 1.1;
}

.source-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.source-strip.empty {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-ink-3);
  background: transparent;
  border: 1px dashed var(--hair-2);
  border-radius: var(--radius-default);
  padding: 14px 16px;
}

.source-chip {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  background: rgba(47,143,255,.05);
  border: 1px solid var(--hair);
  border-radius: var(--radius-default);
  padding: 12px;
}

.source-chip strong,
.source-chip span,
.source-chip small {
  display: block;
}

.source-chip strong {
  font-size: 13px;
}

.source-chip span,
.source-chip small {
  margin-top: 3px;
  color: var(--color-ink-3);
  font-size: 11.5px;
  line-height: 1.4;
}

.source-chip.needs_config {
  border-color: var(--color-warn);
  background: var(--color-warn-soft);
}

.run-notice,
.error-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  border-radius: 8px;
  padding: 11px 13px;
  font-size: 13px;
  line-height: 1.55;
  margin-bottom: 12px;
}

.run-notice {
  color: var(--color-ink-2);
  background: rgba(47,143,255,.05);
  border: 1px solid var(--hair);
}

.run-notice.failed {
  background: var(--color-danger-soft);
  border-color: rgba(255, 59, 48, 0.25);
}

.run-notice.success {
  background: var(--color-success-soft);
  border-color: rgba(52, 199, 89, 0.25);
}

.error-banner {
  color: var(--color-danger);
  background: var(--color-danger-soft);
}

.controls {
  display: grid;
  grid-template-columns: minmax(220px, 320px) 1fr;
  gap: 10px;
  margin: 18px 0;
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
}

.search-box input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--color-ink);
  font-size: 13px;
}

.segmented,
.tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  grid-column: span 1;
}

.tabs {
  grid-column: 1 / -1;
}

.segmented button,
.tabs button {
  border: 1px solid var(--hair);
  background: rgba(47,143,255,.05);
  color: var(--color-ink-3);
  border-radius: var(--radius-pill);
  padding: 7px 12px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}

/* 选中态:品牌渐变(暗色不再 ink 实底+白字撞色)。 */
.segmented button.active,
.tabs button.active {
  background: linear-gradient(135deg, var(--color-brand), var(--color-brand-deep));
  border-color: transparent;
  color: #fff;
  box-shadow: 0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4);
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
  border: 1px dashed var(--hair-2);
  border-radius: var(--radius-default);
  background: transparent;
  padding: 42px 20px;
}

.empty-state h2 {
  margin: 12px 0 6px;
  font-family: var(--serif);
  color: var(--color-ink);
  font-size: 18px;
}

.empty-state p {
  max-width: 520px;
  margin: 0 0 18px;
  line-height: 1.7;
}

.digest-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

/* 外层玻璃由 .lg 提供(JSX 上加 className="lg digest-card");此处仅留布局/内边距。 */
.digest-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 260px;
  padding: 16px;
}

.card-top,
.card-meta,
.card-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.category-pill,
.source-badge,
.card-meta span {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
}

.category-pill {
  padding: 5px 8px;
  color: var(--color-brand-ink);
  background: var(--color-brand-soft);
}

.source-badge {
  padding: 5px 8px;
  color: var(--color-ink-2);
  background: rgba(47,143,255,.05);
  border: 1px solid var(--hair);
}

.source-badge.ugc {
  color: var(--color-success);
  background: var(--color-success-soft);
}

.digest-card h2 {
  margin: 0;
  font-family: var(--serif);
  font-size: 16px;
  line-height: 1.4;
}

.digest-card p {
  margin: 0;
  color: var(--color-ink-3);
  font-size: 13px;
  line-height: 1.7;
}

.card-meta span {
  padding: 5px 8px;
  color: var(--color-ink-2);
  background: rgba(47,143,255,.05);
  border: 1px solid var(--hair);
}

.card-footer {
  margin-top: auto;
  justify-content: space-between;
  border-top: 1px solid var(--color-line);
  padding-top: 12px;
}

.card-footer strong,
.card-footer small {
  display: block;
}

.card-footer strong {
  font-size: 12.5px;
}

.card-footer small {
  margin-top: 2px;
  color: var(--color-ink-3);
  font-size: 11.5px;
}

.card-footer a {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--color-brand);
  font-size: 12px;
  font-weight: 800;
  text-decoration: none;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.42);
}

/* 外层玻璃由 .lg 提供(JSX 上加 className="lg digest-form");此处仅留尺寸/布局。 */
.digest-form {
  width: min(620px, 100%);
  max-height: calc(100vh - 40px);
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 22px;
}

.form-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.form-title-row h2 {
  margin: 0;
  font-family: var(--serif);
  font-size: 18px;
}

.form-title-row p {
  margin: 4px 0 0;
  color: var(--color-ink-3);
  font-size: 13px;
}

.digest-form label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--color-ink-2);
  font-size: 13px;
  font-weight: 700;
}

.digest-form input,
.digest-form select,
.digest-form textarea {
  width: 100%;
  border: 1px solid var(--color-line);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-ink);
  font: inherit;
  padding: 9px 11px;
  outline: none;
}

.digest-form textarea {
  resize: vertical;
  min-height: 160px;
  line-height: 1.65;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.char-count {
  align-self: flex-end;
  color: var(--color-ink-3);
  font-size: 12px;
  font-weight: 500;
}

.form-error {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: var(--color-danger);
  font-size: 13px;
}

.spin {
  animation: digest-spin 0.8s linear infinite;
}

@keyframes digest-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1040px) {
  .digest-grid,
  .status-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .controls {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .digest-shell {
    padding: 20px 16px 28px;
  }

  .digest-header {
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions > button {
    flex: 1 1 auto;
  }

  .status-grid,
  .digest-grid,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .source-chip,
  .card-footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .digest-header h1 {
    font-size: 24px;
  }

  .modal-backdrop {
    align-items: flex-end;
    padding: 12px;
  }
}
`;
