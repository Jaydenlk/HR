'use client';

import { useEffect, useState, useMemo } from 'react';
import { Search, SlidersHorizontal, Plus, Heart, ExternalLink, X } from 'lucide-react';
import { api } from '@/lib/api';

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface FeedItem {
  id: string;
  title: string;
  content: string;
  company: string | null;
  role: string | null;
  outcome: string | null;
  source: string;
  category: string;
  source_url: string | null;
  created_at: string;
  user: { id: string; name: string } | null;
}

interface FormState {
  title: string;
  content: string;
  company: string;
  role: string;
  outcome: string;
  category: string;
}

type TabKey = 'all' | 'interview' | 'trending' | 'story' | 'quiz' | 'editorial';

/* ─── Constants ──────────────────────────────────────────────────────────── */

const EMPTY_FORM: FormState = {
  title: '',
  content: '',
  company: '',
  role: '',
  outcome: '',
  category: 'interview_exp',
};

const COVER_CLASSES = ['b1', 'b2', 'b3', 'b4', 'b5', 'b6'] as const;

const COVER_GRADIENTS: Record<string, string> = {
  b1: 'linear-gradient(135deg,#dee5ed 0%,#c2cdd8 100%)',
  b2: 'linear-gradient(135deg,#f1ddd5 0%,#dec3b6 100%)',
  b3: 'linear-gradient(135deg,#dcebe1 0%,#bfd3c5 100%)',
  b4: 'linear-gradient(135deg,#e5e0eb 0%,#cac0d4 100%)',
  b5: 'linear-gradient(135deg,#ebe6d2 0%,#d4cba8 100%)',
  b6: 'linear-gradient(135deg,#dedee8 0%,#b8b8c8 100%)',
};

const PERSONAL_GRADIENT = 'linear-gradient(135deg,#e8efff 0%,#cad9f4 100%)';

const CATEGORY_TAG: Record<string, { label: string; color: string }> = {
  interview_exp: { label: '面经', color: 'default' },
  trending: { label: '热点', color: 'hot' },
  market_insight: { label: '故事', color: 'default' },
  job_tips: { label: '题库', color: 'default' },
};

const TRENDING_TOPICS = [
  { text: '字节二面', hot: true },
  { text: 'PDD 996', hot: true },
  { text: 'Tech Lead 信号', hot: false },
  { text: 'SSR / hydration', hot: false },
  { text: 'offer 谈判', hot: false },
  { text: '秋招倒计时', hot: false },
  { text: '海外校招', hot: false },
  { text: 'STAR 法则', hot: false },
  { text: '反问环节', hot: false },
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function getCategoryTag(category: string): { label: string; isHot: boolean } {
  const mapping = CATEGORY_TAG[category];
  if (mapping) {
    return { label: mapping.label, isHot: mapping.color === 'hot' };
  }
  return { label: '面经', isHot: false };
}

function getCompanyGradient(company: string | null, index: number): string {
  // company-specific override
  const companyGradients: Record<string, string> = {
    '字节跳动': COVER_GRADIENTS.b1,
    '拼多多': COVER_GRADIENTS.b2,
    '美团': COVER_GRADIENTS.b5,
    'Shopee': COVER_GRADIENTS.b3,
    '腾讯': COVER_GRADIENTS.b6,
    '腾讯 IEG': COVER_GRADIENTS.b6,
    '阿里巴巴': COVER_GRADIENTS.b4,
    '网易': COVER_GRADIENTS.b4,
  };
  if (company && companyGradients[company]) {
    return companyGradients[company];
  }
  return COVER_GRADIENTS[COVER_CLASSES[index % COVER_CLASSES.length]];
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '...';
}

/* ─── Styles (injected as <style>) ───────────────────────────────────────── */

const MONTHLY_CSS = `
/* hero strip */
.mthly .feat-row{display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:14px;flex-shrink:0}
.mthly .feat-hero{
  background:var(--color-ink);color:#fff;border-radius:24px;padding:28px 30px;
  position:relative;overflow:hidden;display:flex;flex-direction:column;gap:14px;min-height:200px;
}
.mthly .feat-hero::before{
  content:"";position:absolute;inset:0;
  background:radial-gradient(600px 320px at 90% -10%,rgba(10,132,255,.22),transparent 60%);
}
.mthly .feat-hero > *{position:relative;z-index:2}
.mthly .feat-hero .topline{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.55);display:flex;gap:10px;align-items:center}
.mthly .feat-hero h2{margin:0;font-size:36px;line-height:1.05;letter-spacing:-.03em;font-weight:800}
.mthly .feat-hero p{margin:0;font-size:14px;color:rgba(255,255,255,.7);font-weight:500;line-height:1.55;max-width:48ch}
.mthly .feat-hero .meta-row{font-size:11.5px;color:rgba(255,255,255,.5);font-weight:500;margin-top:auto;display:flex;gap:14px}

.mthly .feat-side{background:var(--color-surface);border:1px solid var(--color-line);border-radius:18px;padding:20px;display:flex;flex-direction:column;gap:8px}
.mthly .feat-side .top{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:var(--color-ink-3);letter-spacing:.04em;text-transform:uppercase}
.mthly .feat-side .top.hot{color:var(--color-danger)}
.mthly .feat-side .top.you{color:var(--color-brand)}
.mthly .feat-side h3{margin:0;font-size:17px;font-weight:700;color:var(--color-ink);line-height:1.3;letter-spacing:-.008em}
.mthly .feat-side p{margin:0;font-size:12.5px;color:var(--color-ink-3);font-weight:500;line-height:1.5}
.mthly .feat-side .by{margin-top:auto;font-size:11.5px;color:var(--color-ink-3);font-weight:500;display:flex;align-items:center;gap:6px}
.mthly .feat-side .by b{color:var(--color-ink-2);font-weight:600}

/* tabs */
.mthly .tabs-row{display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.mthly .tabs{display:flex;gap:2px;background:var(--color-surface-2);border-radius:999px;padding:3px}
.mthly .tab{appearance:none;border:0;background:transparent;color:var(--color-ink-3);padding:7px 14px;font-size:13px;font-weight:600;border-radius:999px;display:flex;align-items:center;gap:6px;letter-spacing:-.003em;cursor:pointer;transition:all .12s}
.mthly .tab.active{background:var(--color-surface);color:var(--color-ink);box-shadow:0 1px 2px rgba(0,0,0,.06)}
.mthly .tab .cnt{font-family:var(--font-mono);font-size:10px;color:var(--color-ink-4);font-weight:600}
.mthly .tab.active .cnt{color:var(--color-ink-3)}
.mthly .tabs-row .right{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--color-ink-3);font-weight:500}

/* trending */
.mthly .trending{display:flex;align-items:center;gap:14px;flex-shrink:0;padding:10px 4px;font-size:12.5px;color:var(--color-ink-3);font-weight:500;overflow:hidden}
.mthly .trending .label{flex-shrink:0;font-weight:700;color:var(--color-ink);display:flex;align-items:center;gap:5px;font-size:12px}
.mthly .trending .topics{display:flex;gap:6px;overflow:auto}
.mthly .trending .t{flex-shrink:0;padding:4px 12px;border-radius:999px;background:var(--color-surface);border:1px solid var(--color-line);font-weight:600;color:var(--color-ink-2);font-size:12px;letter-spacing:-.003em;cursor:pointer;transition:all .12s}
.mthly .trending .t:hover{border-color:var(--color-line-2)}
.mthly .trending .t.hot{background:var(--color-ink);color:#fff;border-color:var(--color-ink)}
.mthly .trending .t.hot::before{content:"";display:inline-block;width:5px;height:5px;border-radius:50%;background:var(--color-danger);margin-right:5px;vertical-align:middle}

/* feed grid */
.mthly .feed{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;flex:1;min-height:0;overflow:auto;align-content:start;padding:2px 0}

.mthly .post{background:var(--color-surface);border:1px solid var(--color-line);border-radius:18px;overflow:hidden;display:flex;flex-direction:column;break-inside:avoid;transition:.12s;cursor:pointer}
.mthly .post:hover{border-color:var(--color-line-2);box-shadow:0 2px 8px rgba(0,0,0,.04)}
.mthly .post .cover{
  aspect-ratio:1.5/1;position:relative;overflow:hidden;
  background:var(--color-surface-2);
  display:flex;align-items:flex-end;padding:14px;
}
.mthly .post .cover .blob{
  position:absolute;width:200px;height:200px;border-radius:50%;
  background:rgba(0,0,0,.06);right:-40px;top:-40px;filter:blur(2px);
}
.mthly .post .cover .co-mark{
  position:relative;z-index:2;font-size:14px;font-weight:700;color:var(--color-ink);letter-spacing:-.01em;
}
.mthly .post .cover .co-mark .small{display:block;font-size:11px;color:var(--color-ink-3);font-weight:500;margin-top:2px;letter-spacing:0}
.mthly .post .cover .tag-text{
  position:absolute;top:12px;left:14px;z-index:2;
  font-size:10.5px;font-weight:700;color:var(--color-ink);
  letter-spacing:.04em;background:rgba(255,255,255,.7);
  padding:3px 9px;border-radius:6px;backdrop-filter:blur(8px);
}
.mthly .post .cover .tag-text.hot{background:var(--color-ink);color:#fff}
.mthly .post .cover .tag-text.coach{background:var(--color-brand);color:#fff}
.mthly .post .cover .like-text{
  position:absolute;top:12px;right:14px;z-index:2;
  font-size:11px;font-weight:600;color:var(--color-ink);
  letter-spacing:0;background:rgba(255,255,255,.7);
  padding:3px 9px;border-radius:6px;backdrop-filter:blur(8px);
  display:flex;align-items:center;gap:4px;
}
.mthly .post .cover .like-text svg{width:11px;height:11px}

.mthly .post .body{padding:14px 16px 16px;display:flex;flex-direction:column;gap:8px;flex:1}
.mthly .post .ttl{font-size:14.5px;font-weight:600;color:var(--color-ink);line-height:1.35;letter-spacing:-.005em}
.mthly .post .ex{font-size:12.5px;color:var(--color-ink-3);font-weight:500;line-height:1.5;margin:0}
.mthly .post .foot{display:flex;align-items:center;gap:8px;margin-top:auto;padding-top:6px;font-size:11.5px;color:var(--color-ink-3);font-weight:500}
.mthly .post .foot .av-init{
  width:20px;height:20px;border-radius:50%;background:var(--color-surface-2);
  display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--color-ink-2);flex-shrink:0;
  border:1px solid var(--color-line);
}
.mthly .post .foot b{color:var(--color-ink);font-weight:600}
.mthly .post .foot .stats{margin-left:auto;display:flex;gap:8px;color:var(--color-ink-3);font-family:var(--font-mono);font-size:11px;font-weight:600}

/* personal Coach card */
.mthly .post.personal{border:1.5px solid var(--color-brand)}

/* modal */
.mthly .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:1000;padding:24px}
.mthly .modal-form{background:var(--color-bg);border-radius:16px;padding:28px;width:100%;max-width:560px;display:flex;flex-direction:column;gap:16px;box-shadow:0 24px 48px rgba(0,0,0,0.2)}
.mthly .modal-form input,.mthly .modal-form select,.mthly .modal-form textarea{width:100%;padding:9px 12px;border:1px solid var(--color-line);border-radius:8px;font-size:14px;color:var(--color-ink);background:var(--color-bg);outline:none;box-sizing:border-box;font-family:inherit}
.mthly .modal-form textarea{resize:vertical;line-height:1.6;min-height:120px}
.mthly .modal-form label{font-size:13px;font-weight:600;color:var(--color-ink-2);margin-bottom:2px}

/* source link */
.mthly .post .source-link{
  display:inline-flex;align-items:center;gap:3px;
  font-size:11px;color:var(--color-brand);font-weight:500;
  text-decoration:none;margin-top:4px;
}
.mthly .post .source-link:hover{text-decoration:underline}

/* responsive */
@media(max-width:900px){
  .mthly .feat-row{grid-template-columns:1fr;gap:10px}
  .mthly .feed{grid-template-columns:repeat(2,1fr)}
}
@media(max-width:600px){
  .mthly .feed{grid-template-columns:1fr}
  .mthly .tabs{overflow-x:auto}
}
`;

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function DigestPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Data loading ───────────────────────────────────────────────────────── */

  async function loadItems() {
    try {
      const data = await api.get<FeedItem[]>('/feed');
      setItems(data);
    } catch {
      // empty list is fine
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    api.get<FeedItem[]>('/feed')
      .then((data) => { if (!cancelled) setItems(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  /* ── Derived data ───────────────────────────────────────────────────────── */

  const counts = useMemo(() => {
    const c = { all: items.length, interview: 0, trending: 0, story: 0, quiz: 0, editorial: 0 };
    for (const item of items) {
      if (item.category === 'interview_exp') c.interview++;
      else if (item.category === 'trending') c.trending++;
      else if (item.category === 'market_insight') { c.story++; c.editorial++; }
      else if (item.category === 'job_tips') c.quiz++;
      else c.interview++; // fallback
    }
    return c;
  }, [items]);

  const filteredItems = useMemo(() => {
    if (activeTab === 'all') return items;
    const categoryMap: Record<TabKey, string[]> = {
      all: [],
      interview: ['interview_exp'],
      trending: ['trending'],
      story: ['market_insight'],
      quiz: ['job_tips'],
      editorial: ['market_insight'],
    };
    const cats = categoryMap[activeTab];
    if (!cats || cats.length === 0) return items;
    return items.filter((i) => cats.includes(i.category));
  }, [items, activeTab]);

  /* ── Featured items ─────────────────────────────────────────────────────── */

  const featuredHero = useMemo(() => {
    // Use the first editorial/story item as the hero, or first item
    return items.find((i) => i.category === 'market_insight') ?? items[0] ?? null;
  }, [items]);

  const hotItem = useMemo(() => {
    return items.find((i) => i.category === 'trending') ?? null;
  }, [items]);

  /* ── Handlers ───────────────────────────────────────────────────────────── */

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/feed', {
        title: form.title.trim(),
        content: form.content.trim(),
        company: form.company.trim() || undefined,
        role: form.role.trim() || undefined,
        outcome: form.outcome || undefined,
        category: form.category,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }

  function handleCardClick(item: FeedItem) {
    if (item.source_url) {
      window.open(item.source_url, '_blank', 'noopener,noreferrer');
    }
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: 0,
      overflow: 'hidden',
      padding: '32px 32px 0',
      boxSizing: 'border-box',
    }}>
      <style>{MONTHLY_CSS}</style>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '18px',
        flexShrink: 0,
      }}>
        <div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--color-ink)',
            letterSpacing: '-0.4px',
            marginBottom: '4px',
            margin: 0,
          }}>
            月刊 · 面经
          </h1>
          <p style={{
            fontSize: '13.5px',
            color: 'var(--color-ink-3)',
            lineHeight: 1.5,
            margin: '4px 0 0',
          }}>
            叫月刊，更新是实时的 · 24h 内新增 {counts.all} 篇
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            border: '1px solid var(--color-line)',
            borderRadius: '10px',
            background: 'var(--color-surface)',
            color: 'var(--color-ink-2)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
          }}>
            <Search size={14} />
            <span>搜面经</span>
          </button>
          <button style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            border: '1px solid var(--color-line)',
            borderRadius: '10px',
            background: 'var(--color-surface)',
            color: 'var(--color-ink-2)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
          }}>
            <SlidersHorizontal size={14} />
            <span>筛选</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              border: 'none',
              borderRadius: '10px',
              background: 'var(--color-brand)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Plus size={14} />
            <span>写一篇</span>
          </button>
        </div>
      </div>

      {/* ── Scrollable content ─────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        paddingBottom: '32px',
      }} className="mthly">

        {loading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 0',
            color: 'var(--color-ink-3)',
            fontSize: '14px',
          }}>
            加载中...
          </div>
        ) : (
          <>
            {/* ── Featured Row ───────────────────────────────────────────────── */}
            <div className="feat-row">
              {/* LEFT: Editor's pick hero */}
              <div className="feat-hero">
                <div className="topline">
                  <span>编辑精选 · Vol. 24</span>
                  <span>·</span>
                  <span>本周话题</span>
                </div>
                {featuredHero ? (
                  <>
                    <h2>{featuredHero.title}</h2>
                    <p>{truncate(featuredHero.content, 100)}</p>
                    <div className="meta-row">
                      <span>12 min 阅读</span>
                      <span>·</span>
                      <span>{featuredHero.user?.name ?? '编辑部'}</span>
                      <span>·</span>
                      <span>{timeAgo(featuredHero.created_at)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <h2>「具体」<br/>是最被低估的能力。</h2>
                    <p>我们看了 1,247 份应届简历，发现最大的问题不是排版 -- 是它们读起来像同一个人写的：模糊、谦虚、安全。</p>
                    <div className="meta-row">
                      <span>12 min 阅读</span>
                      <span>·</span>
                      <span>编辑部</span>
                      <span>·</span>
                      <span>248 收藏</span>
                    </div>
                  </>
                )}
              </div>

              {/* MIDDLE: 24H hot */}
              <div className="feat-side">
                <div className="top hot">24h 热点{hotItem?.company ? ` · ${hotItem.company}` : ''}</div>
                {hotItem ? (
                  <>
                    <h3>{hotItem.title}</h3>
                    <p>{truncate(hotItem.content, 80)}</p>
                    <div className="by">
                      <div className="av-init" style={{ width: 18, height: 18, fontSize: 9 }}>
                        {(hotItem.user?.name ?? 'C')[0].toUpperCase()}
                      </div>
                      <span><b>{hotItem.user?.name ?? 'Coach 编辑部'}</b> · {timeAgo(hotItem.created_at)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <h3>PDD 校招前端真实 base 38-46k，但有个 catch</h3>
                    <p>我们核对了 32 位拿到 PDD offer 的同学。数字漂亮，但 996.5 你需要先知道。</p>
                    <div className="by">
                      <div className="av-init" style={{ width: 18, height: 18, fontSize: 9 }}>C</div>
                      <span><b>Coach 编辑部</b> · 5h</span>
                    </div>
                  </>
                )}
              </div>

              {/* RIGHT: Your review */}
              <div className="feat-side">
                <div className="top you">你的复盘</div>
                <h3>你的最新面试复盘 -- Coach 已帮你生成</h3>
                <p>面试结束后，Coach 会自动分析你的表现并生成结构化复盘报告。</p>
                <div className="by">
                  <div className="av-init" style={{
                    width: 18, height: 18, fontSize: 9,
                    background: 'var(--color-brand)', color: '#fff',
                    borderColor: 'transparent',
                  }}>M</div>
                  <span><b>自动生成</b> · 仅你可见 · 等你查看</span>
                </div>
              </div>
            </div>

            {/* ── Tabs ───────────────────────────────────────────────────────── */}
            <div className="tabs-row">
              <div className="tabs">
                {([
                  { key: 'all' as TabKey, label: '全部', count: counts.all },
                  { key: 'interview' as TabKey, label: '面经', count: counts.interview },
                  { key: 'trending' as TabKey, label: '热点', count: counts.trending },
                  { key: 'story' as TabKey, label: '故事', count: counts.story },
                  { key: 'quiz' as TabKey, label: '题库', count: counts.quiz },
                  { key: 'editorial' as TabKey, label: '编辑精选', count: undefined },
                ]).map((t) => (
                  <button
                    key={t.key}
                    className={`tab${activeTab === t.key ? ' active' : ''}`}
                    onClick={() => setActiveTab(t.key)}
                  >
                    <span>{t.label}</span>
                    {t.count !== undefined && t.count > 0 && (
                      <span className="cnt">{t.count}</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="right">
                <span>排序：</span>
                <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>最新发布</span>
                <span>·</span>
                <span>仅校招</span>
              </div>
            </div>

            {/* ── Trending Keywords ──────────────────────────────────────────── */}
            <div className="trending">
              <span className="label">本周热词</span>
              <div className="topics">
                {TRENDING_TOPICS.map((t) => (
                  <span key={t.text} className={`t${t.hot ? ' hot' : ''}`}>
                    {t.text}
                  </span>
                ))}
              </div>
            </div>

            {/* ── Feed Grid ──────────────────────────────────────────────────── */}
            {filteredItems.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '64px 32px',
                textAlign: 'center',
                gap: '12px',
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: 'linear-gradient(135deg, #eaf2ff 0%, #f0f4ff 100%)',
                  border: '1px solid rgba(10,132,255,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Search size={24} color="var(--color-brand)" />
                </div>
                <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-ink)' }}>
                  暂无内容
                </p>
                <p style={{ fontSize: '13px', color: 'var(--color-ink-3)', maxWidth: 320, lineHeight: 1.6 }}>
                  点击右上角「写一篇」分享你的面试经验，或等待 Coach 自动导入最新面经
                </p>
              </div>
            ) : (
              <div className="feed">
                {filteredItems.map((item, i) => {
                  const tag = getCategoryTag(item.category);
                  const isPersonal = item.source === 'ugc' && item.user !== null;
                  const gradient = isPersonal
                    ? PERSONAL_GRADIENT
                    : getCompanyGradient(item.company, i);

                  return (
                    <div
                      key={item.id}
                      className={`post${isPersonal ? ' personal' : ''}`}
                      onClick={() => handleCardClick(item)}
                      role={item.source_url ? 'link' : undefined}
                    >
                      {/* Cover */}
                      <div className="cover" style={{ background: gradient }}>
                        <div className="blob" />
                        <span className={`tag-text${tag.isHot ? ' hot' : isPersonal ? ' coach' : ''}`}>
                          {tag.label}
                        </span>
                        <span className="like-text">
                          <Heart size={11} />
                          <span>0</span>
                        </span>
                        <div className="co-mark">
                          {item.company ?? tag.label}
                          <span className="small">
                            {item.role ?? 'Coach 整理'}
                          </span>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="body">
                        <div className="ttl">{item.title}</div>
                        <p className="ex">{truncate(item.content, 100)}</p>
                        {item.source_url && (
                          <a
                            href={item.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="source-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            查看原文 <ExternalLink size={10} />
                          </a>
                        )}
                        <div className="foot">
                          <span className="av-init">
                            {(item.user?.name ?? item.source ?? 'U')[0].toUpperCase()}
                          </span>
                          <span>
                            <b>{item.user?.name ?? item.source}</b> · {timeAgo(item.created_at)}
                          </span>
                          <span className="stats">
                            <span>·</span>
                            <span>{timeAgo(item.created_at)}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Write Form Modal ─────────────────────────────────────────────── */}
      {showForm && (
        <div
          className="mthly"
          style={{ position: 'contents' as 'fixed' }}
        >
          <div
            className="modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowForm(false);
            }}
          >
            <form
              className="modal-form"
              onSubmit={(e) => void handleSubmit(e)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>
                  写一篇面经
                </h2>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-ink-3)', padding: '4px', display: 'flex',
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label>标题 *</label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="例：字节跳动 产品经理 一面体验"
                  maxLength={200}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label>公司</label>
                  <input
                    name="company"
                    value={form.company}
                    onChange={handleChange}
                    placeholder="字节跳动"
                    maxLength={100}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label>岗位</label>
                  <input
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    placeholder="产品经理"
                    maxLength={100}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label>分类</label>
                  <select name="category" value={form.category} onChange={handleChange}>
                    <option value="interview_exp">面经</option>
                    <option value="trending">热点</option>
                    <option value="market_insight">故事</option>
                    <option value="job_tips">题库</option>
                  </select>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label>结果</label>
                  <select name="outcome" value={form.outcome} onChange={handleChange}>
                    <option value="">不填写</option>
                    <option value="pass">通过</option>
                    <option value="fail">未通过</option>
                    <option value="offer">拿到 Offer</option>
                    <option value="pending">等待结果</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label>内容 *</label>
                <textarea
                  name="content"
                  value={form.content}
                  onChange={handleChange}
                  placeholder="分享面试题目、考察重点、面试官风格、复盘建议等..."
                  maxLength={5000}
                  required
                  rows={8}
                />
                <span style={{ fontSize: '12px', color: 'var(--color-ink-3)', textAlign: 'right' }}>
                  {form.content.length} / 5000
                </span>
              </div>

              {error && (
                <p style={{ fontSize: '13px', color: 'var(--color-danger)', margin: 0 }}>{error}</p>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{
                    padding: '9px 18px',
                    border: '1px solid var(--color-line)',
                    borderRadius: '8px',
                    background: 'none',
                    fontSize: '14px',
                    cursor: 'pointer',
                    color: 'var(--color-ink-2)',
                  }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting || !form.title.trim() || !form.content.trim()}
                  style={{
                    padding: '9px 24px',
                    background: 'var(--color-brand)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? '发布中...' : '发布'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
