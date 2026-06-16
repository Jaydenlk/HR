'use client';

/**
 * 邀请码管理面板 — 波3 块F
 *
 * 功能:
 * - 自拉 GET /admin/invites 全量数据(独立于 page.tsx 的 reloadAll)
 * - 前端分页(PAGE_SIZE=20,对齐 LogCenterTab)
 * - 筛选:全部 / 可用 / 已停用
 * - 搜索:按 code 子串(前端)
 * - 补列:created_at(relativeTime)、note
 * - 新建表单支持 note 输入
 * - 容器 max-height + overflow-y 防视觉无限延伸
 * - 玻璃风格,复用 _shared.ts
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { AdminInvite } from '@/lib/types';
import { Ticket, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import {
  cardStyle,
  sectionTitleStyle,
  thStyle,
  tdStyle,
  inputStyle,
  smallBtn,
  relativeTime,
} from './_shared';

// 每页展示条数,与 LogCenterTab 对齐
const PAGE_SIZE = 20;

type FilterMode = 'all' | 'active' | 'disabled';

export default function InviteCodePanel() {
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 筛选 / 搜索 / 分页
  const [filter, setFilter] = useState<FilterMode>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0); // 0-indexed

  // 新建表单
  const [newCode, setNewCode] = useState('');
  const [newMaxUses, setNewMaxUses] = useState('1');
  const [newNote, setNewNote] = useState('');
  const [creating, setCreating] = useState(false);

  const loadInvites = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<AdminInvite[]>('/admin/invites');
      setInvites(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载邀请码失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => { await loadInvites(); };
    void run();
  }, [loadInvites]);

  // 筛选 + 搜索后的全集(分页前)
  const filtered = useMemo(() => {
    let list = invites;
    if (filter === 'active') list = list.filter((inv) => !inv.disabled);
    if (filter === 'disabled') list = list.filter((inv) => inv.disabled);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((inv) => inv.code.toLowerCase().includes(q));
    }
    return list;
  }, [invites, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  async function toggleInvite(inv: AdminInvite) {
    setError(null);
    try {
      await api.patch<AdminInvite>(`/admin/invites/${inv.id}`, { disabled: !inv.disabled });
      await loadInvites();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败');
    }
  }

  async function createInvite() {
    const max = Number(newMaxUses);
    if (!Number.isInteger(max) || max < 1) {
      setError('可用次数需为正整数');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await api.post<AdminInvite>('/admin/invites', {
        ...(newCode.trim() ? { code: newCode.trim() } : {}),
        max_uses: max,
        ...(newNote.trim() ? { note: newNote.trim() } : {}),
      });
      setNewCode('');
      setNewMaxUses('1');
      setNewNote('');
      await loadInvites();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setCreating(false);
    }
  }

  const filterBtnStyle = (mode: FilterMode): React.CSSProperties => ({
    ...smallBtn(filter === mode ? 'primary' : 'neutral'),
    padding: '5px 11px',
    fontSize: '12px',
  });

  return (
    <div className="lg" style={cardStyle}>
      {/* 标题 */}
      <div style={sectionTitleStyle}>
        <Ticket size={17} /> 邀请码管理（{invites.length}）
      </div>

      {/* 错误提示 */}
      {error && (
        <div
          role="alert"
          style={{
            background: 'var(--color-danger-soft)',
            color: 'var(--color-danger)',
            borderRadius: '10px',
            padding: '10px 14px',
            fontSize: '13px',
            marginBottom: '16px',
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}

      {/* ── 新建表单 ── */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          marginBottom: '16px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--color-line)',
        }}
      >
        <input
          type="text"
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
          placeholder="自定义码（留空随机 8 位）"
          style={{ ...inputStyle, flex: '1 1 160px' }}
        />
        <input
          type="number"
          min={1}
          value={newMaxUses}
          onChange={(e) => setNewMaxUses(e.target.value)}
          placeholder="可用次数"
          style={{ ...inputStyle, width: '100px' }}
        />
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="批注（可选，如：2026-06 内测批）"
          style={{ ...inputStyle, flex: '2 1 180px' }}
        />
        <button
          type="button"
          onClick={() => void createInvite()}
          disabled={creating}
          style={smallBtn('primary')}
        >
          {creating ? '创建中…' : '新建邀请码'}
        </button>
      </div>

      {/* ── 筛选 + 搜索行 ── */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: '14px',
        }}
      >
        {/* 筛选按钮组 */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button type="button" style={filterBtnStyle('all')} onClick={() => { setFilter('all'); setPage(0); }}>
            全部
          </button>
          <button type="button" style={filterBtnStyle('active')} onClick={() => { setFilter('active'); setPage(0); }}>
            可用
          </button>
          <button type="button" style={filterBtnStyle('disabled')} onClick={() => { setFilter('disabled'); setPage(0); }}>
            已停用
          </button>
        </div>

        {/* 搜索框 */}
        <div style={{ position: 'relative', flex: '1 1 180px', maxWidth: '280px' }}>
          <Search
            size={13}
            style={{
              position: 'absolute',
              left: '9px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-ink-3)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="搜索邀请码…"
            style={{ ...inputStyle, width: '100%', paddingLeft: '28px' }}
          />
        </div>

        {/* 结果计数 */}
        <span style={{ fontSize: '12px', color: 'var(--color-ink-3)', marginLeft: 'auto' }}>
          {filtered.length} 条
          {filtered.length !== invites.length && `（共 ${invites.length}）`}
        </span>
      </div>

      {/* ── 邀请码表（max-height 防无限延伸）── */}
      {loading ? (
        <div
          style={{
            padding: '32px',
            textAlign: 'center',
            fontSize: '13px',
            color: 'var(--color-ink-3)',
          }}
        >
          加载中…
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: '32px',
            textAlign: 'center',
            fontSize: '13px',
            color: 'var(--color-ink-4)',
          }}
        >
          {search || filter !== 'all' ? '无匹配邀请码' : '暂无邀请码'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', maxHeight: '480px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '620px' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--color-surface)' }}>
              <tr>
                <th style={thStyle}>邀请码</th>
                <th style={thStyle}>已用 / 上限</th>
                <th style={thStyle}>状态</th>
                <th style={thStyle}>创建时间</th>
                <th style={thStyle}>批注</th>
                <th style={thStyle}>操作</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((inv) => (
                <tr key={inv.id}>
                  <td
                    style={{
                      ...tdStyle,
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 600,
                      color: 'var(--color-ink)',
                    }}
                  >
                    {inv.code}
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '13px',
                        color:
                          inv.used_count >= inv.max_uses
                            ? 'var(--color-danger)'
                            : 'var(--color-ink)',
                        fontWeight: 600,
                      }}
                    >
                      {inv.used_count} / {inv.max_uses}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 700,
                        color: inv.disabled ? 'var(--color-danger)' : 'var(--color-success)',
                        background: inv.disabled
                          ? 'var(--color-danger-soft)'
                          : 'rgba(34,197,94,.1)',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {inv.disabled ? '已停用' : '可用'}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: 'var(--color-ink-3)' }}>
                    {relativeTime(inv.created_at)}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: inv.note ? 'var(--color-ink-2)' : 'var(--color-ink-4)',
                    }}
                    title={inv.note ?? undefined}
                  >
                    {inv.note ?? '—'}
                  </td>
                  <td style={tdStyle}>
                    <button
                      type="button"
                      onClick={() => void toggleInvite(inv)}
                      style={inv.disabled ? smallBtn('primary') : smallBtn('neutral')}
                    >
                      {inv.disabled ? '启用' : '停用'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 分页控制(仅超出一页时显示)── */}
      {!loading && totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '14px',
            paddingTop: '12px',
            borderTop: '1px solid var(--color-line)',
          }}
        >
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            style={{
              ...smallBtn('neutral'),
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              opacity: safePage === 0 ? 0.4 : 1,
              cursor: safePage === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <ChevronLeft size={14} /> 上一页
          </button>

          <span style={{ fontSize: '12.5px', color: 'var(--color-ink-3)' }}>
            第 {safePage + 1} / {totalPages} 页 · 共 {filtered.length} 条
          </span>

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            style={{
              ...smallBtn('neutral'),
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              opacity: safePage >= totalPages - 1 ? 0.4 : 1,
              cursor: safePage >= totalPages - 1 ? 'not-allowed' : 'pointer',
            }}
          >
            下一页 <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
