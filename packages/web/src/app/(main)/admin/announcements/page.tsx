'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type {
  User,
  Announcement,
  AnnouncementKind,
  AnnouncementDisplayType,
} from '@/lib/types';
import { FEATURE_UPDATES } from '@/lib/feature-updates';
import { RESTART_TOUR_SENTINEL } from '@/lib/feature-tour';
import {
  Loader2,
  Shield,
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  X,
  Sparkles,
  Wrench,
  AlertTriangle,
  AlignJustify,
  MonitorPlay,
  RefreshCw,
  Send,
} from 'lucide-react';

// ─── 公告种类元信息(图标 + 中文标签 + 主题色),与后端 AnnouncementKind 一致 ───
const KIND_META: Record<
  AnnouncementKind,
  { label: string; icon: typeof Sparkles; color: string }
> = {
  feature: { label: '功能上新', icon: Sparkles, color: 'var(--color-brand)' },
  fix: { label: '问题修复', icon: Wrench, color: 'var(--color-success)' },
  maintenance: { label: '维护通知', icon: AlertTriangle, color: 'var(--color-warn)' },
};

const KINDS: AnnouncementKind[] = ['feature', 'fix', 'maintenance'];

// ─── 展示形态元信息 ───────────────────────────────────────────────────────────
const DISPLAY_TYPE_META: Record<
  AnnouncementDisplayType,
  { label: string; icon: typeof AlignJustify; desc: string }
> = {
  banner: { label: '横条', icon: AlignJustify, desc: '主区顶部内联横幅,可关闭' },
  modal: { label: '登录大公告', icon: MonitorPlay, desc: '用户登录后首次弹出' },
};
const DISPLAY_TYPES: AnnouncementDisplayType[] = ['banner', 'modal'];

// 3 天可见窗口(毫秒),与后端 VISIBLE_WINDOW_MS 保持一致。
const VISIBLE_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

function isWithinWindow(published_at: string | null): boolean {
  if (!published_at) return false;
  return Date.now() - new Date(published_at).getTime() <= VISIBLE_WINDOW_MS;
}

// 顶部 tab:全部 / 草稿 / 已发布。前端按 item.status 过滤。
type TabKey = 'all' | 'draft' | 'published';
const TAB_LABELS: Record<TabKey, string> = {
  all: '全部',
  draft: '草稿',
  published: '已发布',
};
const TABS: TabKey[] = ['all', 'draft', 'published'];

// CTA 跳转路径前端校验:站内相对路径(单个 / 开头,排除 // 协议相对),与后端 DTO 同口径。
function isInternalPath(href: string): boolean {
  return /^\/(?!\/)/.test(href);
}

// ─── 共享样式(沿用 admin/page.tsx 既有约定:玻璃卡用 .lg,样式只留内边距/排版)───
const cardStyle: React.CSSProperties = { padding: '20px 22px' };

const sectionTitleStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontFamily: 'var(--serif)',
  fontSize: '15px',
  fontWeight: 700,
  color: 'var(--color-ink)',
  letterSpacing: '-0.01em',
  marginBottom: '16px',
};

const inputStyle: React.CSSProperties = {
  padding: '8px 11px',
  background: 'var(--color-surface)',
  border: '1px solid var(--color-line)',
  borderRadius: '8px',
  fontFamily: 'inherit',
  fontSize: '13.5px',
  color: 'var(--color-ink)',
  fontWeight: 500,
  outline: 'none',
  boxSizing: 'border-box',
  width: '100%',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 700,
  color: 'var(--color-ink-3)',
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

function smallBtn(variant: 'primary' | 'danger' | 'neutral'): React.CSSProperties {
  const bg =
    variant === 'primary'
      ? 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))'
      : variant === 'danger'
        ? 'var(--color-danger)'
        : 'rgba(47,143,255,.05)';
  const color = variant === 'neutral' ? 'var(--color-ink)' : '#fff';
  return {
    padding: '6px 12px',
    borderRadius: 'var(--radius-default)',
    border: variant === 'neutral' ? '1px solid var(--hair)' : 'none',
    background: bg,
    color,
    fontSize: '12.5px',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    ...(variant === 'primary'
      ? {
          boxShadow:
            '0 8px 22px -12px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
        }
      : {}),
  };
}

// 相对/绝对时间:近 30 天用相对,超出回退本地日期(沿用各页 helper 约定)。
function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return new Date(iso).toLocaleDateString('zh-CN');
}

// 编辑态草稿:create 时 id 为 null,edit 时为目标 id。含 CTA 字段(空串=未设)。
interface Draft {
  id: string | null;
  title: string;
  body: string;
  kind: AnnouncementKind;
  display_type: AnnouncementDisplayType;
  active: boolean;
  cta_label: string;
  cta_href: string;
  cta_tour_id: string;
  feature_key: string;
}

const EMPTY_DRAFT: Draft = {
  id: null,
  title: '',
  body: '',
  kind: 'feature',
  display_type: 'banner',
  active: true,
  cta_label: '',
  cta_href: '',
  cta_tour_id: '',
  feature_key: '',
};

// 「新手引导按钮」的默认文案/落点(copy 附 C 定稿):勾选时若 label/href 为空则填这两个默认值,
// 已有值则尊重管理员手填不覆盖。cta_tour_id 固定为哨兵,前端 CTA 点击识别后派 coach:restart-tour。
const RESTART_TOUR_DEFAULT_LABEL = '看看怎么用';
const RESTART_TOUR_DEFAULT_HREF = '/today';

// 把后端公告映射成编辑态草稿(编辑/重新生成共用)。
function toDraft(item: Announcement): Draft {
  return {
    id: item.id,
    title: item.title,
    body: item.body,
    kind: item.kind,
    display_type: item.display_type,
    active: item.active,
    cta_label: item.cta_label ?? '',
    cta_href: item.cta_href ?? '',
    cta_tour_id: item.cta_tour_id ?? '',
    feature_key: item.feature_key ?? '',
  };
}

// 把编辑态草稿的 CTA 字段整理成请求体片段:空串 → null(清空);非空 → 原值。
function ctaPayload(draft: Draft): {
  cta_label: string | null;
  cta_href: string | null;
  cta_tour_id: string | null;
  feature_key: string | null;
} {
  const t = (s: string) => (s.trim() ? s.trim() : null);
  return {
    cta_label: t(draft.cta_label),
    cta_href: t(draft.cta_href),
    cta_tour_id: t(draft.cta_tour_id),
    feature_key: t(draft.feature_key),
  };
}

export default function AnnouncementsAdminPage() {
  const [me, setMe] = useState<User | null>(null);
  const [meLoaded, setMeLoaded] = useState(false);

  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 顶部 tab:全部/草稿/已发布。
  const [tab, setTab] = useState<TabKey>('all');

  // 新建/编辑弹窗:null 收起;否则承载草稿。
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // AI 生成弹窗:null 收起;否则承载已粘贴要点 + 展示形态倾向。
  const [genState, setGenState] = useState<{
    source: string;
    preferred: AnnouncementDisplayType;
  } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // 「从最近更新生成」:直读 CHANGELOG 起草,无需粘贴。独立 loading,禁用按钮防重复点。
  const [genFromChangelog, setGenFromChangelog] = useState(false);

  // 行级操作中(发布/下架/删除/重新生成)的 id,用于禁用按钮。
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<User>('/auth/me')
      .then((u) => setMe(u))
      .catch(() => setMe(null))
      .finally(() => setMeLoaded(true));
  }, []);

  useEffect(() => {
    if (!me || me.role !== 'admin') return;
    void reload();
  }, [me]);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const list = await api.get<Announcement[]>('/admin/announcements');
      setItems(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  // 表单校验:标题/正文必填;CTA 填了文案就必须填站内路径,反之亦然(成对)。
  function validateDraft(d: Draft): string | null {
    if (!d.title.trim()) return '标题不能为空';
    if (!d.body.trim()) return '正文不能为空';
    const label = d.cta_label.trim();
    const href = d.cta_href.trim();
    if (href && !isInternalPath(href)) return '跳转路径必须是站内路径(以 / 开头)';
    if (label && !href) return '填了引导按钮文案,就要填跳转路径';
    if (href && !label) return '填了跳转路径,就要填引导按钮文案';
    return null;
  }

  async function submitDraft() {
    if (!draft) return;
    const validationError = validateDraft(draft);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const body = {
        title: draft.title.trim(),
        body: draft.body.trim(),
        kind: draft.kind,
        display_type: draft.display_type,
        active: draft.active,
        ...ctaPayload(draft),
      };
      if (draft.id === null) {
        await api.post<Announcement>('/admin/announcements', body);
      } else {
        await api.patch<Announcement>(`/admin/announcements/${draft.id}`, body);
      }
      setDraft(null);
      await reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  // AI 生成草稿:POST /generate,成功后刷新列表并跳到「草稿」tab(新草稿在那)。
  async function runGenerate() {
    if (!genState) return;
    const source = genState.source.trim();
    if (!source) {
      setGenError('请粘贴本次更新要点');
      return;
    }
    setGenerating(true);
    setGenError(null);
    try {
      await api.post<Announcement>('/admin/announcements/generate', {
        source_content: source,
        preferred_display_type: genState.preferred,
      });
      setGenState(null);
      setTab('draft');
      await reload();
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'AI 生成失败,请稍后重试');
    } finally {
      setGenerating(false);
    }
  }

  // 从最近更新生成:无需粘贴,后端读 CHANGELOG 最新一节交 AI 起草草稿。成功后跳「草稿」tab 待审核。
  // 无可用更新日志(后端 400)等错误经页面顶部 error 横幅透出。
  async function runGenerateFromChangelog() {
    setGenFromChangelog(true);
    setError(null);
    try {
      await api.post<Announcement>('/admin/announcements/generate-from-changelog', {});
      setTab('draft');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败,请稍后重试');
    } finally {
      setGenFromChangelog(false);
    }
  }

  // 草稿发布:PATCH status=published(后端同步设 published_at + active=true)。
  async function publish(item: Announcement) {
    setBusyId(item.id);
    setError(null);
    try {
      await api.patch<Announcement>(`/admin/announcements/${item.id}`, {
        status: 'published',
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '发布失败');
    } finally {
      setBusyId(null);
    }
  }

  // 已发布下架:PATCH active=false(status 保持 published,公开端因 active=false 不再返回)。
  async function unpublish(item: Announcement) {
    setBusyId(item.id);
    setError(null);
    try {
      await api.patch<Announcement>(`/admin/announcements/${item.id}`, {
        active: false,
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '下架失败');
    } finally {
      setBusyId(null);
    }
  }

  // 重新生成:无原始要点可复用(AI 只存产物不存来源),故重开 AI 弹窗让管理员重填要点 —— 更可控、不静默乱出。
  function regenerate(item: Announcement) {
    setGenError(null);
    setGenState({ source: '', preferred: item.display_type });
  }

  // 硬删除,带二次确认(浏览器原生确认即可,删除不可逆)。
  async function removeItem(item: Announcement) {
    if (!window.confirm(`确认删除公告「${item.title}」？此操作不可恢复。`)) return;
    setBusyId(item.id);
    setError(null);
    try {
      await api.delete(`/admin/announcements/${item.id}`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setBusyId(null);
    }
  }

  // ── me 未加载:占位 ──
  if (!meLoaded) {
    return (
      <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-ink-3)' }} />
      </div>
    );
  }

  // ── 非 admin:无权限空态(与 admin/page.tsx 一致)──
  if (!me || me.role !== 'admin') {
    return (
      <div
        style={{
          padding: '80px 40px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <Shield size={40} style={{ color: 'var(--color-ink-4)' }} />
        <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-ink)' }}>无权限</div>
        <div style={{ fontSize: '13.5px', color: 'var(--color-ink-3)' }}>
          该页面仅限管理员访问
        </div>
      </div>
    );
  }

  // tab 过滤后的列表。
  const visibleItems = items.filter((it) => tab === 'all' || it.status === tab);
  const draftCount = items.filter((it) => it.status === 'draft').length;
  const publishedCount = items.filter((it) => it.status === 'published').length;
  const tabCount = (k: TabKey): number =>
    k === 'all' ? items.length : k === 'draft' ? draftCount : publishedCount;

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', padding: '32px 28px 60px' }}>
      <h1
        style={{
          fontFamily: 'var(--serif)',
          fontSize: '24px',
          fontWeight: 800,
          color: 'var(--color-ink)',
          letterSpacing: '-0.02em',
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <Megaphone size={22} /> 公告管理
      </h1>
      <p style={{ fontSize: '13.5px', color: 'var(--color-ink-3)', marginBottom: '20px' }}>
        AI 起草「最近更新」→ 审核编辑 → 发布 · 草稿对用户不可见 · 下架即隐藏(保留记录)
      </p>

      {error && (
        <div
          role="alert"
          style={{
            background: 'var(--color-danger-soft)',
            color: 'var(--color-danger)',
            borderRadius: '10px',
            padding: '12px 14px',
            fontSize: '13.5px',
            marginBottom: '20px',
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}

      <div className="lg" style={cardStyle}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ ...sectionTitleStyle, marginBottom: 0 }}>
            <Megaphone size={17} /> 公告列表（{items.length}）
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => void runGenerateFromChangelog()}
              disabled={genFromChangelog}
              style={smallBtn('primary')}
            >
              {genFromChangelog ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> 生成中…
                </>
              ) : (
                <>
                  <Sparkles size={13} /> 从最近更新生成
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setGenError(null);
                setGenState({ source: '', preferred: 'banner' });
              }}
              style={smallBtn('neutral')}
            >
              <Sparkles size={13} /> AI 生成最近更新
            </button>
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setDraft({ ...EMPTY_DRAFT });
              }}
              style={smallBtn('neutral')}
            >
              <Plus size={13} /> 新建公告
            </button>
          </div>
        </div>

        {/* Tab 切换:全部/草稿/已发布 */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {TABS.map((k) => {
            const selected = tab === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-pill)',
                  border: selected ? '1px solid var(--color-brand)' : '1px solid var(--color-line)',
                  background: selected ? 'var(--color-brand-soft)' : 'transparent',
                  color: selected ? 'var(--color-brand)' : 'var(--color-ink-3)',
                  fontSize: '12.5px',
                  fontWeight: selected ? 700 : 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {TAB_LABELS[k]}
                <span style={{ marginLeft: '5px', opacity: 0.7 }}>{tabCount(k)}</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-ink-3)' }} />
          </div>
        ) : visibleItems.length === 0 ? (
          <div
            style={{
              padding: '48px 20px',
              textAlign: 'center',
              color: 'var(--color-ink-4)',
              fontSize: '13.5px',
            }}
          >
            {tab === 'all'
              ? '还没有公告。点「AI 生成最近更新」让 AI 起草一条,或「新建公告」手动写。'
              : tab === 'draft'
                ? '没有草稿。'
                : '还没有已发布的公告。'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {visibleItems.map((item) => {
              const meta = KIND_META[item.kind];
              const Icon = meta.icon;
              const busy = busyId === item.id;
              const isDraft = item.status === 'draft';
              return (
                <div
                  key={item.id}
                  style={{
                    border: '1px solid var(--color-line)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    background: 'var(--color-surface)',
                    opacity: item.active || isDraft ? 1 : 0.62,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      {/* 标题行:种类标签 + 状态(草稿/已上架/已下架) + 展示类型 + 窗口 */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          flexWrap: 'wrap',
                          marginBottom: '6px',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            color: meta.color,
                          }}
                        >
                          <Icon size={13} /> {meta.label}
                        </span>
                        {/* 状态徽章:草稿 / 已上架 / 已下架 */}
                        {isDraft ? (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '1px 7px',
                              borderRadius: '999px',
                              color: 'var(--color-warn)',
                              background: 'var(--color-warn-soft)',
                            }}
                          >
                            草稿
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '1px 7px',
                              borderRadius: '999px',
                              color: item.active
                                ? 'var(--color-success)'
                                : 'var(--color-ink-4)',
                              background: item.active
                                ? 'var(--color-success-soft)'
                                : 'var(--color-line)',
                            }}
                          >
                            {item.active ? '已上架' : '已下架'}
                          </span>
                        )}
                        {/* 展示类型徽章 */}
                        {(() => {
                          const dtMeta = DISPLAY_TYPE_META[item.display_type];
                          const DtIcon = dtMeta.icon;
                          return (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '1px 7px',
                                borderRadius: '999px',
                                color: 'var(--color-brand)',
                                background: 'var(--color-brand-soft)',
                              }}
                            >
                              <DtIcon size={11} />
                              {dtMeta.label}
                            </span>
                          );
                        })()}
                        {/* 3 天窗口状态:仅已发布且上架公告显示 */}
                        {!isDraft && item.active && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '1px 7px',
                              borderRadius: '999px',
                              color: isWithinWindow(item.published_at)
                                ? 'var(--color-warn)'
                                : 'var(--color-ink-4)',
                              background: isWithinWindow(item.published_at)
                                ? 'var(--color-warn-soft)'
                                : 'var(--color-line)',
                            }}
                          >
                            {isWithinWindow(item.published_at) ? '窗口内可见' : '窗口已过期'}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: '15px',
                          fontWeight: 700,
                          color: 'var(--color-ink)',
                          marginBottom: '4px',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {item.title}
                      </div>
                      <div
                        style={{
                          fontSize: '13px',
                          color: 'var(--color-ink-2)',
                          lineHeight: 1.55,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          marginBottom: '8px',
                        }}
                      >
                        {item.body}
                      </div>
                      {/* CTA 摘要:有引导按钮则显示文案 → 路径 */}
                      {item.cta_label && item.cta_href && (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            color: 'var(--color-brand)',
                            background: 'var(--color-brand-soft)',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            marginBottom: '8px',
                          }}
                        >
                          <Send size={11} />
                          {item.cta_label} → {item.cta_href}
                        </div>
                      )}
                      <div style={{ fontSize: '11.5px', color: 'var(--color-ink-4)' }}>
                        创建于 {relativeTime(item.created_at)}
                        {item.published_at &&
                          ` · 发布于 ${relativeTime(item.published_at)}`}
                      </div>
                    </div>

                    {/* 操作列:草稿 = 发布 + 编辑 + 重新生成 + 删除;已发布 = 编辑 + 上/下架 + 删除 */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        flexShrink: 0,
                      }}
                    >
                      {isDraft && (
                        <button
                          type="button"
                          onClick={() => void publish(item)}
                          disabled={busy}
                          style={smallBtn('primary')}
                        >
                          <Send size={12} /> {busy ? '…' : '发布'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setFormError(null);
                          setDraft(toDraft(item));
                        }}
                        disabled={busy}
                        style={smallBtn('neutral')}
                      >
                        <Pencil size={12} /> 编辑
                      </button>
                      {isDraft && (
                        <button
                          type="button"
                          onClick={() => regenerate(item)}
                          disabled={busy}
                          style={smallBtn('neutral')}
                        >
                          <RefreshCw size={12} /> 重新生成
                        </button>
                      )}
                      {!isDraft && (
                        <button
                          type="button"
                          onClick={() =>
                            item.active ? void unpublish(item) : void publish(item)
                          }
                          disabled={busy}
                          style={item.active ? smallBtn('neutral') : smallBtn('primary')}
                        >
                          {busy ? '…' : item.active ? '下架' : '上架'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void removeItem(item)}
                        disabled={busy}
                        style={smallBtn('danger')}
                      >
                        <Trash2 size={12} /> 删除
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── AI 生成弹窗 ── */}
      {genState && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !generating) setGenState(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            className="lg"
            style={{
              padding: '28px 28px 24px',
              width: '100%',
              maxWidth: '520px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <h3
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: '17px',
                  fontWeight: 700,
                  color: 'var(--color-ink)',
                  letterSpacing: '-0.02em',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Sparkles size={17} style={{ color: 'var(--color-brand)' }} />
                AI 生成「最近更新」
              </h3>
              <button
                type="button"
                onClick={() => !generating && setGenState(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: generating ? 'not-allowed' : 'pointer',
                  color: 'var(--color-ink-3)',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>
            <p
              style={{
                fontSize: '12.5px',
                color: 'var(--color-ink-3)',
                lineHeight: 1.6,
                marginTop: 0,
                marginBottom: '16px',
              }}
            >
              粘贴本次更新要点(每行一条)。AI 只会把要点改写成友好的公告,不会编造要点之外的功能。生成的是草稿,审核后再发布。
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>更新要点</label>
                <textarea
                  value={genState.source}
                  onChange={(e) => setGenState({ ...genState, source: e.target.value })}
                  placeholder={'粘贴本次更新要点，每行一条\n例如：\n- 面试录音可一键上传转写\n- 逐题复盘给出改进建议'}
                  rows={7}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }}
                  autoFocus
                />
              </div>
              <div>
                <label style={labelStyle}>展示形态倾向</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {DISPLAY_TYPES.map((dt) => {
                    const dtMeta = DISPLAY_TYPE_META[dt];
                    const DtIcon = dtMeta.icon;
                    const selected = genState.preferred === dt;
                    return (
                      <button
                        key={dt}
                        type="button"
                        onClick={() => setGenState({ ...genState, preferred: dt })}
                        title={dtMeta.desc}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '7px 12px',
                          borderRadius: '999px',
                          border: selected
                            ? '1px solid var(--color-brand)'
                            : '1px solid var(--color-line)',
                          background: selected ? 'var(--color-brand-soft)' : 'transparent',
                          color: selected ? 'var(--color-brand)' : 'var(--color-ink-3)',
                          fontSize: '12.5px',
                          fontWeight: selected ? 700 : 600,
                          cursor: 'pointer',
                        }}
                      >
                        <DtIcon size={13} /> {dtMeta.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {genError && (
              <div
                role="alert"
                style={{
                  background: 'var(--color-danger-soft)',
                  color: 'var(--color-danger)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '13px',
                  marginTop: '14px',
                  fontWeight: 500,
                }}
              >
                {genError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => !generating && setGenState(null)}
                style={smallBtn('neutral')}
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void runGenerate()}
                disabled={generating}
                style={smallBtn('primary')}
              >
                {generating ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> 生成中…
                  </>
                ) : (
                  <>
                    <Sparkles size={13} /> 生成草稿
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 新建/编辑弹窗 ── */}
      {draft && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setDraft(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            className="lg"
            style={{
              padding: '28px 28px 24px',
              width: '100%',
              maxWidth: '520px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px',
              }}
            >
              <h3
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: '17px',
                  fontWeight: 700,
                  color: 'var(--color-ink)',
                  letterSpacing: '-0.02em',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Megaphone size={17} style={{ color: 'var(--color-brand)' }} />
                {draft.id === null ? '新建公告' : '编辑公告'}
              </h3>
              <button
                type="button"
                onClick={() => setDraft(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-ink-3)',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>标题</label>
                <input
                  type="text"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="例如：录音转写复盘功能上线"
                  style={inputStyle}
                  autoFocus
                />
              </div>

              <div>
                <label style={labelStyle}>正文</label>
                <textarea
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                  placeholder="公告正文，支持换行。"
                  rows={5}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }}
                />
              </div>

              <div>
                <label style={labelStyle}>种类</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {KINDS.map((k) => {
                    const meta = KIND_META[k];
                    const Icon = meta.icon;
                    const selected = draft.kind === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setDraft({ ...draft, kind: k })}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '7px 12px',
                          borderRadius: '999px',
                          border: selected
                            ? `1px solid ${meta.color}`
                            : '1px solid var(--color-line)',
                          background: selected
                            ? 'var(--color-surface)'
                            : 'transparent',
                          color: selected ? meta.color : 'var(--color-ink-3)',
                          fontSize: '12.5px',
                          fontWeight: selected ? 700 : 600,
                          cursor: 'pointer',
                        }}
                      >
                        <Icon size={13} /> {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={labelStyle}>展示类型</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {DISPLAY_TYPES.map((dt) => {
                    const dtMeta = DISPLAY_TYPE_META[dt];
                    const DtIcon = dtMeta.icon;
                    const selected = draft.display_type === dt;
                    return (
                      <button
                        key={dt}
                        type="button"
                        onClick={() => setDraft({ ...draft, display_type: dt })}
                        title={dtMeta.desc}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '7px 12px',
                          borderRadius: '999px',
                          border: selected
                            ? '1px solid var(--color-brand)'
                            : '1px solid var(--color-line)',
                          background: selected ? 'var(--color-brand-soft)' : 'transparent',
                          color: selected ? 'var(--color-brand)' : 'var(--color-ink-3)',
                          fontSize: '12.5px',
                          fontWeight: selected ? 700 : 600,
                          cursor: 'pointer',
                        }}
                      >
                        <DtIcon size={13} /> {dtMeta.label}
                      </button>
                    );
                  })}
                </div>
                <div
                  style={{
                    fontSize: '11.5px',
                    color: 'var(--color-ink-4)',
                    marginTop: '6px',
                  }}
                >
                  {DISPLAY_TYPE_META[draft.display_type].desc}
                </div>
              </div>

              {/* ── 引导按钮(CTA),全部可选 ── */}
              <div
                style={{
                  borderTop: '1px dashed var(--color-line)',
                  paddingTop: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-ink-2)' }}>
                  引导按钮(可选)
                </div>

                {/* 新手引导按钮(无迁移哨兵):勾选即把 cta_tour_id 设为哨兵,用户点击后重看完整引导。
                    勾选时自动补默认文案/落点(已填则不覆盖),并锁定下方「引导教程 ID」为哨兵。 */}
                <label
                  title="新功能上了,带你走一遍"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    fontSize: '13px',
                    color: 'var(--color-ink-2)',
                    cursor: 'pointer',
                    lineHeight: 1.5,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={draft.cta_tour_id === RESTART_TOUR_SENTINEL}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setDraft({
                          ...draft,
                          cta_tour_id: RESTART_TOUR_SENTINEL,
                          cta_label: draft.cta_label.trim() || RESTART_TOUR_DEFAULT_LABEL,
                          cta_href: draft.cta_href.trim() || RESTART_TOUR_DEFAULT_HREF,
                        });
                      } else {
                        // 仅清掉哨兵值,保留管理员已填的 label/href(可能想改成普通 CTA)。
                        setDraft({ ...draft, cta_tour_id: '' });
                      }
                    }}
                    style={{ width: '16px', height: '16px', marginTop: '1px', cursor: 'pointer' }}
                  />
                  这是新手引导按钮(用户点击后重看引导)
                </label>

                <div>
                  <label style={labelStyle}>引导按钮文案</label>
                  <input
                    type="text"
                    value={draft.cta_label}
                    onChange={(e) => setDraft({ ...draft, cta_label: e.target.value })}
                    placeholder="例如：去试试"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>跳转路径(站内,以 / 开头)</label>
                  <input
                    type="text"
                    value={draft.cta_href}
                    onChange={(e) => setDraft({ ...draft, cta_href: e.target.value })}
                    placeholder="例如：/debrief"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>引导教程 ID(可选)</label>
                  <input
                    type="text"
                    value={draft.cta_tour_id}
                    onChange={(e) => setDraft({ ...draft, cta_tour_id: e.target.value })}
                    disabled={draft.cta_tour_id === RESTART_TOUR_SENTINEL}
                    placeholder="例如：asr-recording(点击后在目标页启动该导览)"
                    style={{
                      ...inputStyle,
                      ...(draft.cta_tour_id === RESTART_TOUR_SENTINEL
                        ? { opacity: 0.6, cursor: 'not-allowed' }
                        : null),
                    }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>关联功能(可选)</label>
                  <select
                    value={draft.feature_key}
                    onChange={(e) => setDraft({ ...draft, feature_key: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="">— 不关联 —</option>
                    {FEATURE_UPDATES.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>上架状态</label>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13.5px',
                    color: 'var(--color-ink-2)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={draft.active}
                    onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  {draft.active ? '上架(对全站用户可见)' : '暂存草稿(不对用户可见)'}
                </label>
              </div>
            </div>

            {formError && (
              <div
                role="alert"
                style={{
                  background: 'var(--color-danger-soft)',
                  color: 'var(--color-danger)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '13px',
                  marginTop: '14px',
                  fontWeight: 500,
                }}
              >
                {formError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button type="button" onClick={() => setDraft(null)} style={smallBtn('neutral')}>
                取消
              </button>
              <button
                type="button"
                onClick={() => void submitDraft()}
                disabled={saving}
                style={smallBtn('primary')}
              >
                {saving ? '保存中…' : draft.id === null ? '发布' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
