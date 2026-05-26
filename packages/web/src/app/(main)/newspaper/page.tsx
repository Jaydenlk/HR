'use client';

import {
  AlertCircle,
  ArrowUpRight,
  ExternalLink,
  Lightbulb,
  Loader2,
  Newspaper,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type {
  CoachAction,
  FeedItem,
  FeedSourceKind,
  InsightCard,
  NewspaperEdition,
} from '@/lib/types';

type TabKey = 'all' | 'interview_exp' | 'hot' | 'job_tips' | 'editorial' | 'insight';
type SortMode = 'latest' | 'campus';

const SOURCE_KIND_LABELS: Record<FeedSourceKind, string> = {
  xhs: '小红书',
  nowcoder: '牛客',
  wechat: '公众号',
  blog: '博客',
  ugc: '用户投稿',
  coach: 'Coach',
};

const SOURCE_KIND_COLORS: Record<FeedSourceKind, string> = {
  xhs: '#ff2442',
  nowcoder: '#00c853',
  wechat: '#1677ff',
  blog: '#8b5cf6',
  ugc: '#6b7280',
  coach: '#f59e0b',
};

const CATEGORY_LABELS: Record<string, string> = {
  interview_exp: '面经',
  market_insight: '市场观察',
  job_tips: '故事',
  hiring_signal: '招聘信号',
  editorial: '编辑精选',
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '请求失败，请稍后再试';
}

function formatRelativeTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

function excerptText(text: string, max: number): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max).trimEnd()}...` : trimmed;
}

function getAllItems(edition: NewspaperEdition): FeedItem[] {
  const seen = new Set<string>();
  const result: FeedItem[] = [];
  for (const item of [...edition.user_voice, ...edition.tech_radar]) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }
  return result;
}

export default function NewspaperPage() {
  const [edition, setEdition] = useState<NewspaperEdition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [sortMode, setSortMode] = useState<SortMode>('latest');

  useEffect(() => {
    let cancelled = false;
    api.get<NewspaperEdition>('/newspaper')
      .then(data => { if (!cancelled) setEdition(data); })
      .catch(err => { if (!cancelled) setError(getErrorMessage(err)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const allItems = useMemo(() => {
    if (!edition) return [];
    return getAllItems(edition);
  }, [edition]);

  const filteredItems = useMemo(() => {
    if (!edition) return [];
    let items: FeedItem[];
    switch (activeTab) {
      case 'interview_exp':
        items = allItems.filter(i => i.category === 'interview_exp');
        break;
      case 'hot':
        items = [...allItems].sort((a, b) => b.quality_score - a.quality_score);
        break;
      case 'job_tips':
        items = allItems.filter(i => i.category === 'job_tips');
        break;
      case 'editorial':
        items = allItems.filter(i => i.category === 'editorial');
        break;
      default:
        items = allItems;
    }
    if (sortMode === 'campus') {
      items = items.filter(i => {
        const text = `${i.title} ${i.content} ${i.role ?? ''}`.toLowerCase();
        return text.includes('校招') || text.includes('实习') || text.includes('应届');
      });
    }
    return items;
  }, [edition, activeTab, sortMode, allItems]);

  const showInsightOnly = activeTab === 'insight';

  const tabs: Array<{ key: TabKey; label: string; count?: number }> = useMemo(() => {
    if (!edition) return [];
    return [
      { key: 'all' as TabKey, label: '全部', count: edition.total_count },
      { key: 'interview_exp' as TabKey, label: '面经', count: edition.categories.interview_exp ?? 0 },
      { key: 'hot' as TabKey, label: '热点', count: allItems.filter(i => i.quality_score >= 7).length },
      { key: 'job_tips' as TabKey, label: '故事', count: edition.categories.job_tips ?? 0 },
      { key: 'editorial' as TabKey, label: '题库', count: edition.categories.editorial ?? 0 },
      { key: 'insight' as TabKey, label: '编辑精选' },
    ];
  }, [edition, allItems]);

  return (
    <main className="np-shell">
      <style>{NP_CSS}</style>

      {/* Header */}
      <section className="np-header">
        <div>
          <p className="np-eyebrow">Monthly Newspaper</p>
          <h1>
            <Newspaper size={26} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
            月刊 &middot; 面经
          </h1>
          <p className="np-subtitle">
            叫月刊，更新是实时的 &middot;{' '}
            {edition ? `24h 内新增 ${edition.total_count} 篇` : '加载中...'}
          </p>
        </div>
        <div className="np-header-actions">
          <Link href="/newspaper/radar" className="np-secondary-btn">
            <Search size={15} />
            搜面经
          </Link>
          <Link href="/digest" className="np-primary-btn">
            <Plus size={15} />
            写一篇
          </Link>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="np-error" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="np-loading">
          <Loader2 className="np-spin" size={20} />
          正在加载面经数据...
        </div>
      ) : !edition ? (
        <EmptyState />
      ) : (
        <>
          {/* Hero Section */}
          <HeroSection edition={edition} />

          {/* Category Tabs */}
          <div className="np-tabs" role="tablist" aria-label="分类筛选">
            {tabs.map(tab => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.key}
                className={activeTab === tab.key ? 'active' : ''}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                {tab.count !== undefined && <span className="np-tab-count">{tab.count}</span>}
              </button>
            ))}
          </div>

          {/* Trending Tags */}
          {edition.trending_tags.length > 0 && (
            <div className="np-trending-bar">
              <span className="np-trending-label">
                <TrendingUp size={14} />
                本周热词:
              </span>
              {edition.trending_tags.map(tag => (
                <Link
                  key={tag}
                  href={`/newspaper/radar?keyword=${encodeURIComponent(tag)}`}
                  className="np-tag-pill np-tag-clickable"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}

          {/* Sort Controls */}
          <div className="np-sort-bar">
            <span>排序:</span>
            <button
              type="button"
              className={sortMode === 'latest' ? 'active' : ''}
              onClick={() => setSortMode('latest')}
            >
              最新发布
            </button>
            <span className="np-sort-divider">|</span>
            <button
              type="button"
              className={sortMode === 'campus' ? 'active' : ''}
              onClick={() => setSortMode('campus')}
            >
              仅校招
            </button>
          </div>

          {/* Content Grid */}
          {showInsightOnly ? (
            edition.insight_cards.length > 0 ? (
              <section className="np-grid" aria-label="编辑精选">
                {edition.insight_cards.map((card, i) => (
                  <InsightCardComponent key={`insight-${i}`} card={card} />
                ))}
              </section>
            ) : (
              <div className="np-empty-tab">暂无编辑精选内容。</div>
            )
          ) : filteredItems.length > 0 ? (
            <section className="np-grid" aria-label="面经列表">
              {filteredItems.map(item => (
                <FeedItemCard key={item.id} item={item} />
              ))}
            </section>
          ) : (
            <div className="np-empty-tab">
              当前筛选下暂无内容。
            </div>
          )}

          {/* Coach Actions */}
          {edition.coach_actions.length > 0 && (
            <CoachActionsSection actions={edition.coach_actions} />
          )}
        </>
      )}
    </main>
  );
}

/* ---- Sub-components ---- */

function HeroSection({ edition }: { edition: NewspaperEdition }) {
  const headline = edition.headline_observations[0] ?? null;
  const hotItem = [...edition.user_voice, ...edition.tech_radar]
    .sort((a, b) => b.quality_score - a.quality_score)[0] ?? null;
  const coachAction = edition.coach_actions[0] ?? null;

  return (
    <section className="np-hero" aria-label="精选头条">
      {/* Left: Editor's Pick */}
      <article className="np-hero-card np-hero-main">
        <span className="np-hero-badge">
          <Sparkles size={13} />
          编辑精选
        </span>
        {headline ? (
          <>
            <h2>{excerptText(headline.observation, 120)}</h2>
            <p className="np-hero-meta">
              基于 {headline.evidence_items.length} 篇内容分析
            </p>
          </>
        ) : (
          <p className="np-hero-placeholder">暂无编辑精选观点</p>
        )}
      </article>

      {/* Center: 24H Hot */}
      <article className="np-hero-card np-hero-hot">
        <span className="np-hero-badge np-badge-hot">
          <Zap size={13} />
          24H 热点
        </span>
        {hotItem ? (
          <>
            <h2>{excerptText(hotItem.title, 60)}</h2>
            <p>{excerptText(hotItem.summary ?? hotItem.content, 80)}</p>
            <div className="np-hero-meta">
              {hotItem.company && <span>{hotItem.company}</span>}
              {hotItem.role && <span>{hotItem.role}</span>}
              <span>质量 {hotItem.quality_score}</span>
            </div>
          </>
        ) : (
          <p className="np-hero-placeholder">暂无热点内容</p>
        )}
      </article>

      {/* Right: Coach Action */}
      <article className="np-hero-card np-hero-coach">
        <span className="np-hero-badge np-badge-coach">
          <Lightbulb size={13} />
          Coach 建议
        </span>
        {coachAction ? (
          <>
            <h2>{excerptText(coachAction.action, 60)}</h2>
            <p>{coachAction.reason}</p>
            <p className="np-hero-datasource">
              数据来源: {coachAction.data_source || '暂无'}
            </p>
          </>
        ) : (
          <p className="np-hero-placeholder">暂无行动建议</p>
        )}
      </article>
    </section>
  );
}

function FeedItemCard({ item }: { item: FeedItem }) {
  const summary = item.summary?.trim() || item.content.trim();
  const displayText = excerptText(summary, 150);
  const kindColor = SOURCE_KIND_COLORS[item.source_kind];

  return (
    <article className="np-card">
      <div className="np-card-top">
        <span className={`np-category-badge cat-${item.category}`}>
          {CATEGORY_LABELS[item.category] ?? item.category}
        </span>
        <span
          className="np-source-badge"
          style={{ color: kindColor, borderColor: `${kindColor}33`, background: `${kindColor}0d` }}
        >
          {SOURCE_KIND_LABELS[item.source_kind]}
        </span>
        {item.quality_score > 0 && (
          <span className="np-quality">
            {item.quality_score}
          </span>
        )}
      </div>

      {item.company && (
        <div className="np-card-company-row">
          <strong>{item.company}</strong>
          {item.role && <span className="np-role-tag">{item.role}</span>}
        </div>
      )}

      <h2>{item.title}</h2>
      <p className="np-card-excerpt">{displayText}</p>

      <div className="np-card-footer">
        <div className="np-card-author">
          <div className="np-avatar">
            {(item.author ?? item.source_name ?? '?')[0]}
          </div>
          <div>
            <strong>{item.author ?? item.source_name ?? SOURCE_KIND_LABELS[item.source_kind]}</strong>
            <small>{formatRelativeTime(item.published_at ?? item.fetched_at ?? item.created_at)}</small>
          </div>
        </div>
        {item.source_url && (
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="np-card-link"
            onClick={e => e.stopPropagation()}
          >
            原文
            <ExternalLink size={12} />
          </a>
        )}
      </div>
    </article>
  );
}

function InsightCardComponent({ card }: { card: InsightCard }) {
  return (
    <article className="np-card np-insight-card">
      <div className="np-card-top">
        <span className="np-category-badge cat-insight">认知补给</span>
      </div>
      <h2>{card.title}</h2>
      <p className="np-card-excerpt">{card.why_read}</p>
      {card.career_implication && (
        <p className="np-insight-implication">
          <ArrowUpRight size={13} />
          {card.career_implication}
        </p>
      )}
      {card.impact_tags.length > 0 && (
        <div className="np-insight-tags">
          {card.impact_tags.map(tag => (
            <span key={tag} className="np-micro-tag">{tag}</span>
          ))}
        </div>
      )}
      <div className="np-card-footer">
        <strong className="np-insight-source">{card.source_name}</strong>
        {card.source_url && (
          <a
            href={card.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="np-card-link"
          >
            阅读原文
            <ExternalLink size={12} />
          </a>
        )}
      </div>
    </article>
  );
}

function CoachActionsSection({ actions }: { actions: CoachAction[] }) {
  return (
    <section className="np-coach-section" aria-label="行动建议">
      <h2 className="np-section-title">
        <Lightbulb size={18} />
        Coach 给你的行动建议
      </h2>
      <div className="np-coach-grid">
        {actions.map((action, i) => (
          <article key={`coach-${i}`} className="np-coach-card">
            <h3>{action.action}</h3>
            <p>{action.reason}</p>
            <small className={action.data_source ? '' : 'np-no-data'}>
              数据来源: {action.data_source || '暂无数据支撑'}
            </small>
          </article>
        ))}
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="np-empty">
      <Newspaper size={32} />
      <h2>暂无面经数据</h2>
      <p>配置数据来源或写一篇面经。</p>
      <Link href="/digest" className="np-primary-btn">
        <Plus size={15} />
        写一篇面经
      </Link>
    </div>
  );
}

/* ---- Styles ---- */

const NP_CSS = `
.np-shell {
  min-height: 100%;
  padding: 28px 32px 40px;
  color: var(--color-ink);
}

/* Header */
.np-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}

.np-eyebrow {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-brand);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.np-header h1 {
  margin: 0;
  font-size: 28px;
  line-height: 1.15;
  font-weight: 800;
}

.np-subtitle {
  max-width: 760px;
  margin: 10px 0 0;
  color: var(--color-ink-3);
  font-size: 14px;
  line-height: 1.65;
}

.np-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.np-primary-btn,
.np-secondary-btn {
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
  text-decoration: none;
  font-family: inherit;
}

.np-primary-btn {
  padding: 0 14px;
  background: var(--color-brand);
  color: white;
}

.np-secondary-btn {
  padding: 0 12px;
  color: var(--color-ink-2);
  background: var(--color-surface);
  border-color: var(--color-line);
}

/* Error */
.np-error {
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

/* Loading */
.np-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  color: var(--color-ink-3);
  gap: 8px;
}

.np-spin {
  animation: np-spin 0.8s linear infinite;
}

@keyframes np-spin {
  to { transform: rotate(360deg); }
}

/* Empty */
.np-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  text-align: center;
  color: var(--color-ink-3);
  border: 1px dashed var(--color-line-2);
  border-radius: 8px;
  background: var(--color-surface);
  padding: 42px 20px;
  gap: 8px;
}

.np-empty h2 {
  margin: 4px 0 0;
  color: var(--color-ink);
  font-size: 18px;
}

.np-empty p {
  max-width: 400px;
  margin: 0 0 8px;
  line-height: 1.7;
  font-size: 14px;
}

/* Hero Section */
.np-hero {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  gap: 14px;
  margin-bottom: 20px;
}

.np-hero-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: 10px;
  padding: 18px;
  min-height: 170px;
}

.np-hero-card h2 {
  margin: 0;
  font-size: 16px;
  line-height: 1.45;
  font-weight: 700;
}

.np-hero-card p {
  margin: 0;
  font-size: 13px;
  color: var(--color-ink-3);
  line-height: 1.6;
}

.np-hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  width: fit-content;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  background: var(--color-brand-soft);
  color: var(--color-brand-ink);
}

.np-badge-hot {
  background: rgba(255, 149, 0, 0.12);
  color: #b35900;
}

.np-badge-coach {
  background: rgba(52, 199, 89, 0.12);
  color: #175f2b;
}

.np-hero-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--color-ink-3);
  margin-top: auto;
}

.np-hero-meta span {
  padding: 3px 8px;
  background: var(--color-surface-2);
  border-radius: 999px;
  font-size: 11px;
}

.np-hero-placeholder {
  color: var(--color-ink-4);
  font-style: italic;
}

.np-hero-datasource {
  font-size: 11.5px;
  color: var(--color-ink-4);
  margin-top: auto;
}

/* Tabs */
.np-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.np-tabs button {
  border: 1px solid var(--color-line);
  background: var(--color-surface);
  color: var(--color-ink-3);
  border-radius: 999px;
  padding: 7px 14px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.np-tabs button.active {
  background: var(--color-ink);
  border-color: var(--color-ink);
  color: white;
}

.np-tab-count {
  font-size: 11px;
  font-weight: 600;
  opacity: 0.7;
}

/* Trending Tags */
.np-trending-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 14px;
  padding: 10px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: 8px;
}

.np-trending-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--color-ink-2);
  flex-shrink: 0;
}

.np-tag-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: var(--color-brand-soft);
  color: var(--color-brand-ink);
  cursor: pointer;
  text-decoration: none;
}

.np-tag-clickable:hover {
  opacity: 0.85;
}

/* Sort Controls */
.np-sort-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 13px;
  color: var(--color-ink-3);
}

.np-sort-bar button {
  background: none;
  border: none;
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  padding: 2px 4px;
  color: var(--color-ink-3);
  font-weight: 500;
}

.np-sort-bar button.active {
  color: var(--color-brand);
  font-weight: 700;
}

.np-sort-divider {
  color: var(--color-line);
}

/* Content Grid */
.np-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 28px;
}

.np-empty-tab {
  text-align: center;
  color: var(--color-ink-3);
  padding: 48px 20px;
  font-size: 14px;
  margin-bottom: 28px;
}

/* Feed Item Card */
.np-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: 10px;
  padding: 16px;
  transition: border-color 0.12s, box-shadow 0.12s;
}

.np-card:hover {
  border-color: var(--color-brand);
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.np-card-top {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.np-category-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
}

.cat-interview_exp { background: rgba(0, 122, 255, 0.1); color: #0062cc; }
.cat-market_insight { background: rgba(255, 149, 0, 0.1); color: #b35900; }
.cat-job_tips { background: rgba(52, 199, 89, 0.1); color: #175f2b; }
.cat-hiring_signal { background: rgba(175, 82, 222, 0.1); color: #6b21a8; }
.cat-editorial { background: var(--color-brand-soft); color: var(--color-brand-ink); }
.cat-insight { background: rgba(255, 59, 48, 0.1); color: #c0392b; }

.np-source-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  border: 1px solid;
}

.np-quality {
  margin-left: auto;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-ink-3);
  background: var(--color-surface-2);
  padding: 3px 7px;
  border-radius: 999px;
}

.np-card-company-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.np-card-company-row strong {
  font-size: 14px;
  font-weight: 700;
}

.np-role-tag {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-ink-3);
  background: var(--color-surface-2);
  padding: 3px 8px;
  border-radius: 999px;
}

.np-card h2 {
  margin: 0;
  font-size: 15px;
  line-height: 1.4;
  font-weight: 700;
}

.np-card-excerpt {
  margin: 0;
  color: var(--color-ink-3);
  font-size: 13px;
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.np-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-top: 1px solid var(--color-line);
  padding-top: 10px;
  margin-top: auto;
}

.np-card-author {
  display: flex;
  align-items: center;
  gap: 8px;
}

.np-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--color-surface-2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-ink-3);
  flex-shrink: 0;
}

.np-card-author strong {
  display: block;
  font-size: 12px;
  font-weight: 600;
}

.np-card-author small {
  display: block;
  font-size: 11px;
  color: var(--color-ink-3);
  margin-top: 1px;
}

.np-card-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--color-brand);
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  flex-shrink: 0;
}

.np-card-link:hover {
  text-decoration: underline;
}

/* Insight Card */
.np-insight-card {
  border-left: 3px solid var(--color-brand);
}

.np-insight-implication {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  margin: 0;
  font-size: 12.5px;
  color: var(--color-ink-2);
  line-height: 1.6;
}

.np-insight-tags {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.np-micro-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--color-surface-2);
  color: var(--color-ink-3);
}

.np-insight-source {
  font-size: 12px;
  color: var(--color-ink-2);
}

/* Coach Actions Section */
.np-coach-section {
  margin-top: 12px;
  padding-top: 24px;
  border-top: 1px solid var(--color-line);
}

.np-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 800;
}

.np-coach-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.np-coach-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: 10px;
  padding: 16px;
}

.np-coach-card h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
}

.np-coach-card p {
  margin: 0;
  font-size: 13px;
  color: var(--color-ink-3);
  line-height: 1.6;
}

.np-coach-card small {
  font-size: 11.5px;
  color: var(--color-ink-3);
  margin-top: auto;
}

.np-no-data {
  color: var(--color-ink-4);
  font-style: italic;
}

/* Responsive */
@media (max-width: 1040px) {
  .np-grid,
  .np-coach-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .np-hero {
    grid-template-columns: 1fr 1fr;
  }

  .np-hero-coach {
    grid-column: 1 / -1;
  }
}

@media (max-width: 720px) {
  .np-shell {
    padding: 20px 16px 28px;
  }

  .np-header {
    flex-direction: column;
  }

  .np-header-actions {
    width: 100%;
  }

  .np-header-actions > a {
    flex: 1 1 auto;
  }

  .np-header h1 {
    font-size: 24px;
  }

  .np-hero,
  .np-grid,
  .np-coach-grid {
    grid-template-columns: 1fr;
  }

  .np-hero-coach {
    grid-column: auto;
  }
}
`;
