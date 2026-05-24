'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  X,
  Trash2,
  Download,
  GitBranch,
  Rss,
  Sparkles,
  Search,
  ExternalLink,
  Building2,
  TrendingUp,
  Users,
  Lightbulb,
  MessageCircle,
} from 'lucide-react';
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
}

type TabKey = 'interview' | 'community' | 'insights' | 'advantage';

/* ─── Constants ──────────────────────────────────────────────────────────── */

const EMPTY_FORM: FormState = {
  title: '',
  content: '',
  company: '',
  role: '',
  outcome: '',
};

const TAB_CONFIG: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'interview', label: '面经', icon: <MessageCircle size={14} /> },
  { key: 'community', label: '社区', icon: <Users size={14} /> },
  { key: 'insights', label: '市场洞察', icon: <TrendingUp size={14} /> },
  { key: 'advantage', label: '信息差', icon: <Lightbulb size={14} /> },
];

/* ─── Editorial content (curated recommendations) ────────────────────────── */

interface EditorialItem {
  id: string;
  title: string;
  source: string;
  summary: string;
  url?: string;
}

const MARKET_INSIGHTS: EditorialItem[] = [
  {
    id: 'insight-1',
    title: '2026年AI人才市场：大厂在抢什么样的人',
    source: '晚点LatePost',
    summary: '从字节、阿里到腾讯，AI岗位需求同比增长180%，但真正被争抢的不是"会用AI"的人，而是能定义AI产品边界的复合型人才。',
  },
  {
    id: 'insight-2',
    title: '校招季观察：前端岗位为什么越来越难投',
    source: '极客公园',
    summary: '前端岗位HC缩减的背后，是低代码平台和AI代码生成工具的崛起。本文分析了前端工程师的转型方向和技能升级路径。',
  },
  {
    id: 'insight-3',
    title: '互联网大厂2026秋招提前批复盘',
    source: '36氪',
    summary: '提前批录取率仅3.2%，但拿到提前批offer的候选人有一个共同特征——他们都在简历中量化了业务影响力。',
  },
  {
    id: 'insight-4',
    title: '从技术面试官角度看候选人常犯的5个错误',
    source: 'InfoQ',
    summary: '面了500+候选人后总结：最致命的不是技术不够硬，而是沟通方式——80%的人在描述项目经历时"只说做了什么，不说为什么"。',
  },
  {
    id: 'insight-5',
    title: 'AI重塑招聘：简历筛选率下降40%的背后',
    source: '虎嗅',
    summary: 'AI简历筛选系统的普及让"海投"策略彻底失效。数据显示，针对JD定制的简历通过率是通用简历的4.7倍。',
  },
];

const INFO_ADVANTAGE: EditorialItem[] = [
  {
    id: 'adv-1',
    title: '字节内推的正确姿势 — 从内推码到面试全流程',
    source: '编辑推荐',
    summary: '内推不是"递简历"，而是一次信息对齐。本文拆解了如何找到靠谱内推人、如何写内推沟通话术、以及内推后如何跟进进度。',
  },
  {
    id: 'adv-2',
    title: '如何用STAR法则让面试官记住你',
    source: '编辑推荐',
    summary: 'STAR不是模板填空，而是一种结构化叙事能力。关键在于Situation要具体到数字，Result要与岗位JD呼应。',
  },
  {
    id: 'adv-3',
    title: '薪资谈判的3个关键时刻和话术',
    source: '编辑推荐',
    summary: '谈薪的最佳时机不是HR问"期望薪资"的时候。掌握这3个时间窗口和对应话术，平均可以多争取15-20%的薪酬空间。',
  },
  {
    id: 'adv-4',
    title: '大厂校招时间线完整梳理（2026秋招）',
    source: '编辑推荐',
    summary: '字节7月开提前批，腾讯8月，阿里8月中旬——完整收录30+大厂校招时间节点，不再错过任何投递窗口。',
  },
  {
    id: 'adv-5',
    title: 'offer选择困难症？一个决策框架帮你理清',
    source: '编辑推荐',
    summary: '从薪资、成长性、团队氛围、技术栈匹配度四个维度建立量化评分模型，让offer选择从"感觉"变成"分析"。',
  },
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function outcomeLabel(outcome: string | null) {
  if (!outcome) return null;
  const map: Record<string, string> = {
    pass: '通过',
    fail: '未通过',
    offer: '拿到 Offer',
    pending: '等待结果',
  };
  return map[outcome] ?? outcome;
}

function outcomeColor(outcome: string | null) {
  if (!outcome) return 'var(--color-ink-3)';
  const map: Record<string, string> = {
    pass: '#34c759',
    fail: '#ff3b30',
    offer: 'var(--color-brand)',
    pending: 'var(--color-warn)',
  };
  return map[outcome] ?? 'var(--color-ink-3)';
}

interface SourceBadgeConfig {
  label: string;
  bg: string;
  color: string;
}

function getSourceBadge(source: string): SourceBadgeConfig {
  const map: Record<string, SourceBadgeConfig> = {
    github: { label: 'GitHub', bg: 'rgba(36,41,46,0.09)', color: '#24292e' },
    nowcoder: { label: '牛客', bg: 'rgba(92,107,192,0.09)', color: '#5c6bc0' },
    xhs_trend: { label: '小红书', bg: 'rgba(255,32,69,0.09)', color: '#ff2045' },
    ai_digest: { label: 'AI 精选', bg: 'rgba(10,132,255,0.09)', color: '#0a84ff' },
    ugc: { label: '用户分享', bg: 'rgba(52,199,89,0.09)', color: '#34c759' },
    market_research: { label: '市场调研', bg: 'rgba(175,82,222,0.09)', color: '#af52de' },
  };
  return map[source] ?? { label: source, bg: 'var(--color-surface)', color: 'var(--color-ink-3)' };
}

function getEditorialSourceBadge(source: string): SourceBadgeConfig {
  const map: Record<string, SourceBadgeConfig> = {
    '晚点LatePost': { label: '晚点LatePost', bg: 'rgba(0,122,255,0.09)', color: '#007aff' },
    '极客公园': { label: '极客公园', bg: 'rgba(88,86,214,0.09)', color: '#5856d6' },
    '36氪': { label: '36氪', bg: 'rgba(255,149,0,0.09)', color: '#ff9500' },
    'InfoQ': { label: 'InfoQ', bg: 'rgba(0,199,190,0.09)', color: '#00c7be' },
    '虎嗅': { label: '虎嗅', bg: 'rgba(255,69,58,0.09)', color: '#ff453a' },
    '编辑推荐': { label: '编辑推荐', bg: 'rgba(10,132,255,0.09)', color: '#0a84ff' },
  };
  return map[source] ?? { label: source, bg: 'var(--color-surface)', color: 'var(--color-ink-3)' };
}

function truncateContent(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + '…';
}

/** Classify a feed item into one of the 4 tabs */
function classifyItem(item: FeedItem): TabKey {
  // 面经: xhs_trend, market_research, ugc with company/role info
  if (
    item.source === 'xhs_trend' ||
    item.source === 'market_research' ||
    item.source === 'ugc'
  ) {
    return 'interview';
  }
  // 社区: nowcoder RSS, GitHub imports
  if (item.source === 'nowcoder' || item.source === 'github') {
    return 'community';
  }
  // AI digest goes to community as well
  if (item.source === 'ai_digest') {
    return 'community';
  }
  // Fallback: interview
  return 'interview';
}

/** Group interview items by company */
function groupByCompany(items: FeedItem[]): { company: string; items: FeedItem[] }[] {
  const groups = new Map<string, FeedItem[]>();
  for (const item of items) {
    const key = item.company?.trim() || '其他公司';
    const existing = groups.get(key);
    if (existing) {
      existing.push(item);
    } else {
      groups.set(key, [item]);
    }
  }
  return Array.from(groups.entries()).map(([company, items]) => ({ company, items }));
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid var(--color-line)',
  borderRadius: '8px',
  fontSize: '14px',
  color: 'var(--color-ink)',
  background: 'var(--color-bg)',
  outline: 'none',
  boxSizing: 'border-box',
};

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function DigestPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('interview');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [companyFilter, setCompanyFilter] = useState<string | null>(null);

  /* ── Data loading ───────────────────────────────────────────────────────── */

  async function loadItems() {
    try {
      const data = await api.get<FeedItem[]>('/feed');
      setItems(data);
    } catch {
      // silently ignore — empty list is fine
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
  }, []);

  /* ── Derived data ───────────────────────────────────────────────────────── */

  const classified = useMemo(() => {
    const result: Record<TabKey, FeedItem[]> = {
      interview: [],
      community: [],
      insights: [],
      advantage: [],
    };
    for (const item of items) {
      const tab = classifyItem(item);
      result[tab].push(item);
    }
    return result;
  }, [items]);

  const interviewGroups = useMemo(() => {
    return groupByCompany(classified.interview);
  }, [classified.interview]);

  const companies = useMemo(() => {
    return interviewGroups.map((g) => g.company);
  }, [interviewGroups]);

  const filteredGroups = useMemo(() => {
    if (!companyFilter) return interviewGroups;
    return interviewGroups.filter((g) => g.company === companyFilter);
  }, [interviewGroups, companyFilter]);

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

  async function handleDelete(id: string) {
    try {
      await api.delete(`/feed/${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      // ignore
    }
  }

  async function triggerImport(type: 'github' | 'rss' | 'xhs' | 'digest') {
    setImporting(type);
    setImportStatus(null);
    try {
      if (type === 'github') {
        const result = await api.post<{ imported: number }>('/feed/import/github', {});
        setImportStatus(`GitHub 导入完成，新增 ${result.imported} 条面经`);
      } else if (type === 'rss') {
        const result = await api.post<{ imported: number }>('/feed/import/rss', {});
        setImportStatus(`牛客 RSS 导入完成，新增 ${result.imported} 条面经`);
      } else if (type === 'xhs') {
        const result = await api.post<{ imported: number; message: string }>('/feed/import/xhs', {});
        setImportStatus(result.message);
      } else {
        await api.post('/feed/digest', {});
        setImportStatus('AI 周刊已生成');
      }
      await loadItems();
    } catch (err) {
      setImportStatus(`操作失败：${err instanceof Error ? err.message : '请重试'}`);
    } finally {
      setImporting(null);
    }
  }

  /* ── Tab content counts ─────────────────────────────────────────────────── */

  function tabCount(key: TabKey): number {
    if (key === 'insights') return MARKET_INSIGHTS.length;
    if (key === 'advantage') return INFO_ADVANTAGE.length;
    return classified[key].length;
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        padding: '40px 32px 48px',
        boxSizing: 'border-box',
        maxWidth: '860px',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '8px',
          flexShrink: 0,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--color-ink)',
              letterSpacing: '-0.4px',
              marginBottom: '4px',
            }}
          >
            月刊·面经
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--color-ink-3)', lineHeight: 1.5 }}>
            面经库 / 社区讨论 / 市场洞察 / 信息差 — 求职路上的内容中枢
          </p>
        </div>
      </div>

      {/* ── Tab Navigation ─────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          marginTop: '20px',
          marginBottom: '4px',
          flexShrink: 0,
          borderBottom: '1px solid var(--color-line)',
          paddingBottom: '0',
        }}
      >
        {TAB_CONFIG.map((tab) => {
          const active = activeTab === tab.key;
          const count = tabCount(tab.key);
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setCompanyFilter(null);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                border: 'none',
                borderBottom: active ? '2px solid var(--color-ink)' : '2px solid transparent',
                background: 'none',
                fontSize: '14px',
                fontWeight: active ? 700 : 500,
                color: active ? 'var(--color-ink)' : 'var(--color-ink-3)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                marginBottom: '-1px',
                flexShrink: 0,
              }}
            >
              {tab.icon}
              {tab.label}
              {count > 0 && (
                <span
                  style={{
                    fontSize: '11px',
                    padding: '1px 6px',
                    borderRadius: '999px',
                    background: active ? 'var(--color-ink)' : 'var(--color-surface)',
                    color: active ? '#fff' : 'var(--color-ink-3)',
                    fontWeight: 600,
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Import Controls (面经 tab only) ────────────────────────────────── */}
      {activeTab === 'interview' && (
        <>
          <div
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              flexWrap: 'wrap',
              marginTop: '16px',
              marginBottom: '4px',
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => void triggerImport('xhs')}
              disabled={importing !== null}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 13px',
                border: '1px solid rgba(255,32,69,0.19)',
                borderRadius: '7px',
                background: importing === 'xhs' ? 'rgba(255,32,69,0.06)' : 'var(--color-bg)',
                color: '#ff2045',
                fontSize: '13px',
                fontWeight: 500,
                cursor: importing !== null ? 'not-allowed' : 'pointer',
                opacity: importing !== null && importing !== 'xhs' ? 0.5 : 1,
              }}
            >
              <Search size={13} />
              {importing === 'xhs' ? '搜索中…' : '从小红书发现'}
            </button>
            <button
              onClick={() => void triggerImport('rss')}
              disabled={importing !== null}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 13px',
                border: '1px solid rgba(92,107,192,0.19)',
                borderRadius: '7px',
                background: importing === 'rss' ? 'rgba(92,107,192,0.06)' : 'var(--color-bg)',
                color: '#5c6bc0',
                fontSize: '13px',
                fontWeight: 500,
                cursor: importing !== null ? 'not-allowed' : 'pointer',
                opacity: importing !== null && importing !== 'rss' ? 0.5 : 1,
              }}
            >
              <Rss size={13} />
              {importing === 'rss' ? '导入中…' : '从牛客导入'}
            </button>
            <button
              onClick={() => void triggerImport('github')}
              disabled={importing !== null}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 13px',
                border: '1px solid rgba(36,41,46,0.19)',
                borderRadius: '7px',
                background: importing === 'github' ? 'rgba(36,41,46,0.06)' : 'var(--color-bg)',
                color: '#24292e',
                fontSize: '13px',
                fontWeight: 500,
                cursor: importing !== null ? 'not-allowed' : 'pointer',
                opacity: importing !== null && importing !== 'github' ? 0.5 : 1,
              }}
            >
              <GitBranch size={13} />
              {importing === 'github' ? '导入中…' : '从GitHub导入'}
            </button>
            <button
              onClick={() => void triggerImport('digest')}
              disabled={importing !== null}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 13px',
                border: '1px solid rgba(10,132,255,0.25)',
                borderRadius: '7px',
                background: importing === 'digest' ? 'rgba(10,132,255,0.06)' : 'var(--color-bg)',
                color: '#0a84ff',
                fontSize: '13px',
                fontWeight: 500,
                cursor: importing !== null ? 'not-allowed' : 'pointer',
                opacity: importing !== null && importing !== 'digest' ? 0.5 : 1,
              }}
            >
              <Sparkles size={13} />
              {importing === 'digest' ? '生成中…' : '生成AI周刊'}
            </button>
            <button
              onClick={() => setShowForm(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 13px',
                background: 'var(--color-brand)',
                color: '#fff',
                border: 'none',
                borderRadius: '7px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Plus size={13} />
              分享面经
            </button>
          </div>

          {importStatus && (
            <p
              style={{
                fontSize: '13px',
                color: importStatus.startsWith('操作失败') ? '#ff3b30' : '#34c759',
                marginTop: '8px',
                marginBottom: '0',
                flexShrink: 0,
              }}
            >
              {importStatus}
            </p>
          )}
        </>
      )}

      {/* ── Form dialog ────────────────────────────────────────────────────── */}
      {showForm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '24px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowForm(false);
          }}
        >
          <form
            onSubmit={(e) => void handleSubmit(e)}
            style={{
              background: 'var(--color-bg)',
              borderRadius: '16px',
              padding: '28px',
              width: '100%',
              maxWidth: '560px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-ink)' }}>
                分享面试经验
              </h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-ink-3)',
                  padding: '4px',
                  display: 'flex',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink-2)' }}>
                标题 *
              </label>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="例：字节跳动 产品经理 一面体验"
                maxLength={200}
                required
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink-2)' }}>
                  公司
                </label>
                <input
                  name="company"
                  value={form.company}
                  onChange={handleChange}
                  placeholder="字节跳动"
                  maxLength={100}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink-2)' }}>
                  岗位
                </label>
                <input
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  placeholder="产品经理"
                  maxLength={100}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink-2)' }}>
                结果
              </label>
              <select name="outcome" value={form.outcome} onChange={handleChange} style={inputStyle}>
                <option value="">不填写</option>
                <option value="pass">通过</option>
                <option value="fail">未通过</option>
                <option value="offer">拿到 Offer</option>
                <option value="pending">等待结果</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink-2)' }}>
                面试经过 *
              </label>
              <textarea
                name="content"
                value={form.content}
                onChange={handleChange}
                placeholder="分享面试题目、考察重点、面试官风格、复盘建议等……"
                maxLength={5000}
                required
                rows={8}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6, minHeight: '120px' }}
              />
              <span style={{ fontSize: '12px', color: 'var(--color-ink-3)', textAlign: 'right' }}>
                {form.content.length} / 5000
              </span>
            </div>

            {error && <p style={{ fontSize: '13px', color: '#ff3b30' }}>{error}</p>}

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
                {submitting ? '提交中…' : '发布'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Tab Content ────────────────────────────────────────────────────── */}
      <div style={{ marginTop: '20px', flex: 1 }}>
        {/* ── 面经 Tab ──────────────────────────────────────────────────────── */}
        {activeTab === 'interview' && (
          <>
            {loading ? (
              <div style={{ color: 'var(--color-ink-3)', fontSize: '14px', padding: '32px 0' }}>
                加载中…
              </div>
            ) : classified.interview.length === 0 ? (
              <EmptyState
                icon={<MessageCircle size={28} color="var(--color-brand)" />}
                title="还没有面经记录"
                description="点击「分享面经」添加经验，或使用上方按钮从小红书 / 牛客 / GitHub 导入"
                action={
                  <button
                    onClick={() => setShowForm(true)}
                    style={{
                      marginTop: '4px',
                      padding: '9px 20px',
                      background: 'var(--color-brand)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Plus size={15} />
                    分享面试经验
                  </button>
                }
              />
            ) : (
              <>
                {/* Company filter tabs */}
                {companies.length > 1 && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '6px',
                      flexWrap: 'wrap',
                      marginBottom: '20px',
                    }}
                  >
                    <button
                      onClick={() => setCompanyFilter(null)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--color-line)',
                        background: companyFilter === null ? 'var(--color-ink)' : 'var(--color-bg)',
                        color: companyFilter === null ? '#fff' : 'var(--color-ink-2)',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      全部
                    </button>
                    {companies.map((c) => (
                      <button
                        key={c}
                        onClick={() => setCompanyFilter(c)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '6px',
                          border: '1px solid var(--color-line)',
                          background: companyFilter === c ? 'var(--color-ink)' : 'var(--color-bg)',
                          color: companyFilter === c ? '#fff' : 'var(--color-ink-2)',
                          fontSize: '12.5px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <Building2 size={12} />
                        {c}
                      </button>
                    ))}
                  </div>
                )}

                {/* Grouped interview items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                  {filteredGroups.map((group) => (
                    <div key={group.company}>
                      {/* Company group header */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '12px',
                        }}
                      >
                        <Building2 size={15} color="var(--color-ink-2)" />
                        <span
                          style={{
                            fontSize: '15px',
                            fontWeight: 700,
                            color: 'var(--color-ink)',
                            letterSpacing: '-0.01em',
                          }}
                        >
                          {group.company}
                        </span>
                        <span
                          style={{
                            fontSize: '12px',
                            color: 'var(--color-ink-3)',
                            fontWeight: 500,
                          }}
                        >
                          {group.items.length} 条面经
                        </span>
                      </div>

                      {/* Cards */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {group.items.map((item) => (
                          <InterviewCard
                            key={item.id}
                            item={item}
                            onDelete={handleDelete}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ── 社区 Tab ──────────────────────────────────────────────────────── */}
        {activeTab === 'community' && (
          <>
            {loading ? (
              <div style={{ color: 'var(--color-ink-3)', fontSize: '14px', padding: '32px 0' }}>
                加载中…
              </div>
            ) : classified.community.length === 0 ? (
              <EmptyState
                icon={<Users size={28} color="var(--color-brand)" />}
                title="暂无社区内容"
                description="从牛客 RSS 或 GitHub 导入技术讨论和面经帖子"
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {classified.community.map((item) => (
                  <CommunityCard key={item.id} item={item} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── 市场洞察 Tab ──────────────────────────────────────────────────── */}
        {activeTab === 'insights' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--color-ink-3)',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Sparkles size={13} />
              编辑推荐 — 精选优质公众号深度分析
            </p>
            {MARKET_INSIGHTS.map((item) => (
              <EditorialCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {/* ── 信息差 Tab ──────────────────────────────────────────────────── */}
        {activeTab === 'advantage' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--color-ink-3)',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Lightbulb size={13} />
              编辑推荐 — 内推技巧 / 薪资谈判 / 行业知识
            </p>
            {INFO_ADVANTAGE.map((item) => (
              <EditorialCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function InterviewCard({
  item,
  onDelete,
}: {
  item: FeedItem;
  onDelete: (id: string) => void;
}) {
  const badge = getSourceBadge(item.source);

  return (
    <div
      style={{
        border: '1px solid var(--color-line)',
        borderRadius: '12px',
        padding: '18px 22px',
        background: 'var(--color-bg)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '8px',
        }}
      >
        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--color-ink)',
              marginBottom: '6px',
              lineHeight: 1.4,
            }}
          >
            {item.title}
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            {/* Source badge */}
            <span
              style={{
                fontSize: '11px',
                padding: '2px 7px',
                borderRadius: '5px',
                background: badge.bg,
                color: badge.color,
                fontWeight: 600,
              }}
            >
              {badge.label}
            </span>
            {item.role && (
              <span
                style={{
                  fontSize: '12px',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: 'var(--color-surface)',
                  color: 'var(--color-ink-2)',
                  border: '1px solid var(--color-line)',
                }}
              >
                {item.role}
              </span>
            )}
            {item.outcome && (
              <span
                style={{
                  fontSize: '12px',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: `${outcomeColor(item.outcome)}18`,
                  color: outcomeColor(item.outcome),
                  fontWeight: 600,
                }}
              >
                {outcomeLabel(item.outcome)}
              </span>
            )}
          </div>
        </div>
        {item.source === 'ugc' && (
          <button
            onClick={() => void onDelete(item.id)}
            title="删除（仅本人可删）"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-ink-3)',
              padding: '4px',
              flexShrink: 0,
              display: 'flex',
              opacity: 0.6,
            }}
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      <p
        style={{
          fontSize: '14px',
          color: 'var(--color-ink-2)',
          lineHeight: 1.7,
          whiteSpace: 'pre-wrap',
          display: '-webkit-box',
          WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {truncateContent(item.content, 200)}
      </p>

      <div
        style={{
          marginTop: '10px',
          fontSize: '12px',
          color: 'var(--color-ink-3)',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        {item.user?.name && (
          <>
            <span>{item.user.name}</span>
            <span>·</span>
          </>
        )}
        <span>
          {new Date(item.created_at).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </span>
        {item.source_url && (
          <>
            <span>·</span>
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--color-brand)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              查看原文
              <ExternalLink size={11} />
            </a>
          </>
        )}
      </div>
    </div>
  );
}

function CommunityCard({
  item,
  onDelete,
}: {
  item: FeedItem;
  onDelete: (id: string) => void;
}) {
  const badge = getSourceBadge(item.source);

  return (
    <div
      style={{
        border: '1px solid var(--color-line)',
        borderRadius: '12px',
        padding: '18px 22px',
        background: 'var(--color-bg)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '6px',
        }}
      >
        <h3
          style={{
            fontSize: '15px',
            fontWeight: 700,
            color: 'var(--color-ink)',
            lineHeight: 1.4,
            flex: 1,
          }}
        >
          {item.title}
        </h3>
        {item.source === 'ugc' && (
          <button
            onClick={() => void onDelete(item.id)}
            title="删除"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-ink-3)',
              padding: '4px',
              flexShrink: 0,
              display: 'flex',
              opacity: 0.6,
            }}
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px' }}>
        <span
          style={{
            fontSize: '11px',
            padding: '2px 7px',
            borderRadius: '5px',
            background: badge.bg,
            color: badge.color,
            fontWeight: 600,
          }}
        >
          {badge.label}
        </span>
        {item.category && item.category !== item.source && (
          <span
            style={{
              fontSize: '11px',
              padding: '2px 7px',
              borderRadius: '5px',
              background: 'var(--color-surface)',
              color: 'var(--color-ink-3)',
            }}
          >
            {item.category}
          </span>
        )}
      </div>

      <p
        style={{
          fontSize: '14px',
          color: 'var(--color-ink-2)',
          lineHeight: 1.7,
          whiteSpace: 'pre-wrap',
          display: '-webkit-box',
          WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {truncateContent(item.content, 200)}
      </p>

      <div
        style={{
          marginTop: '10px',
          fontSize: '12px',
          color: 'var(--color-ink-3)',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        {item.user?.name && (
          <>
            <span>{item.user.name}</span>
            <span>·</span>
          </>
        )}
        <span>
          {new Date(item.created_at).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </span>
        {item.source_url && (
          <>
            <span>·</span>
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--color-brand)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              查看原文
              <ExternalLink size={11} />
            </a>
          </>
        )}
      </div>
    </div>
  );
}

function EditorialCard({ item }: { item: EditorialItem }) {
  const badge = getEditorialSourceBadge(item.source);

  return (
    <div
      style={{
        border: '1px solid var(--color-line)',
        borderRadius: '12px',
        padding: '18px 22px',
        background: 'var(--color-bg)',
        transition: 'box-shadow 0.15s',
      }}
    >
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px' }}>
        <span
          style={{
            fontSize: '11px',
            padding: '2px 7px',
            borderRadius: '5px',
            background: badge.bg,
            color: badge.color,
            fontWeight: 600,
          }}
        >
          {badge.label}
        </span>
        <span
          style={{
            fontSize: '11px',
            padding: '2px 7px',
            borderRadius: '5px',
            background: 'rgba(10,132,255,0.07)',
            color: '#0a84ff',
            fontWeight: 500,
          }}
        >
          编辑推荐
        </span>
      </div>

      <h3
        style={{
          fontSize: '15px',
          fontWeight: 700,
          color: 'var(--color-ink)',
          lineHeight: 1.5,
          marginBottom: '6px',
        }}
      >
        {item.title}
      </h3>

      <p
        style={{
          fontSize: '14px',
          color: 'var(--color-ink-2)',
          lineHeight: 1.7,
        }}
      >
        {item.summary}
      </p>

      {item.url && (
        <div style={{ marginTop: '10px' }}>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '13px',
              color: 'var(--color-brand)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 500,
            }}
          >
            阅读原文
            <ExternalLink size={12} />
          </a>
        </div>
      )}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 32px',
        textAlign: 'center',
        gap: '16px',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '18px',
          background: 'linear-gradient(135deg, #eaf2ff 0%, #f0f4ff 100%)',
          border: '1px solid rgba(10,132,255,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '4px',
        }}
      >
        {icon}
      </div>
      <div>
        <p
          style={{
            fontSize: '16px',
            fontWeight: 700,
            color: 'var(--color-ink)',
            letterSpacing: '-0.015em',
            marginBottom: '6px',
          }}
        >
          {title}
        </p>
        <p
          style={{
            fontSize: '14px',
            color: 'var(--color-ink-3)',
            lineHeight: 1.6,
            maxWidth: '360px',
          }}
        >
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}
