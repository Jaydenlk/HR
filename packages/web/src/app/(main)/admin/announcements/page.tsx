'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { User, Announcement, AnnouncementKind, AnnouncementDisplayType } from '@/lib/types';
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

// 编辑态草稿:create 时 id 为 null,edit 时为目标 id。
interface Draft {
  id: string | null;
  title: string;
  body: string;
  kind: AnnouncementKind;
  display_type: AnnouncementDisplayType;
  active: boolean;
}

const EMPTY_DRAFT: Draft = {
  id: null,
  title: '',
  body: '',
  kind: 'feature',
  display_type: 'banner',
  active: true,
};

export default function AnnouncementsAdminPage() {
  const [me, setMe] = useState<User | null>(null);
  const [meLoaded, setMeLoaded] = useState(false);

  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 新建/编辑弹窗:null 收起;否则承载草稿。
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // 行级操作中(下架/上架/删除)的 id,用于禁用按钮。
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

  async function submitDraft() {
    if (!draft) return;
    const title = draft.title.trim();
    const body = draft.body.trim();
    if (!title) {
      setFormError('标题不能为空');
      return;
    }
    if (!body) {
      setFormError('正文不能为空');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (draft.id === null) {
        await api.post<Announcement>('/admin/announcements', {
          title,
          body,
          kind: draft.kind,
          display_type: draft.display_type,
          active: draft.active,
        });
      } else {
        await api.patch<Announcement>(`/admin/announcements/${draft.id}`, {
          title,
          body,
          kind: draft.kind,
          display_type: draft.display_type,
          active: draft.active,
        });
      }
      setDraft(null);
      await reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  // 切换上/下架(PATCH active)。
  async function toggleActive(item: Announcement) {
    setBusyId(item.id);
    setError(null);
    try {
      await api.patch<Announcement>(`/admin/announcements/${item.id}`, {
        active: !item.active,
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败');
    } finally {
      setBusyId(null);
    }
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
        发布站内公告 · 上架后对全站用户可见 · 下架即隐藏(保留记录)
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
          }}
        >
          <div style={{ ...sectionTitleStyle, marginBottom: 0 }}>
            <Megaphone size={17} /> 公告列表（{items.length}）
          </div>
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setDraft({ ...EMPTY_DRAFT });
            }}
            style={smallBtn('primary')}
          >
            <Plus size={13} /> 新建公告
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-ink-3)' }} />
          </div>
        ) : items.length === 0 ? (
          <div
            style={{
              padding: '48px 20px',
              textAlign: 'center',
              color: 'var(--color-ink-4)',
              fontSize: '13.5px',
            }}
          >
            还没有公告，点击右上角「新建公告」发布第一条。
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {items.map((item) => {
              const meta = KIND_META[item.kind];
              const Icon = meta.icon;
              const busy = busyId === item.id;
              return (
                <div
                  key={item.id}
                  style={{
                    border: '1px solid var(--color-line)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    background: 'var(--color-surface)',
                    opacity: item.active ? 1 : 0.62,
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
                      {/* 标题行:种类标签 + 上/下架状态 + 标题 */}
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
                        {/* 3 天窗口状态:仅上架公告显示 */}
                        {item.active && (
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
                      <div style={{ fontSize: '11.5px', color: 'var(--color-ink-4)' }}>
                        创建于 {relativeTime(item.created_at)}
                        {item.published_at &&
                          ` · 发布于 ${relativeTime(item.published_at)}`}
                      </div>
                    </div>

                    {/* 操作列 */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        flexShrink: 0,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setFormError(null);
                          setDraft({
                            id: item.id,
                            title: item.title,
                            body: item.body,
                            kind: item.kind,
                            display_type: item.display_type,
                            active: item.active,
                          });
                        }}
                        disabled={busy}
                        style={smallBtn('neutral')}
                      >
                        <Pencil size={12} /> 编辑
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleActive(item)}
                        disabled={busy}
                        style={item.active ? smallBtn('neutral') : smallBtn('primary')}
                      >
                        {busy ? '…' : item.active ? '下架' : '上架'}
                      </button>
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
