'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type {
  AdminAiProvider,
  AdminAiProviderProtocol,
  AdminAiProviderRole,
  AdminAiProviderTestResult,
  CreateAiProviderPayload,
  UpdateAiProviderPayload,
} from '@/lib/types';
import {
  Loader2,
  Cpu,
  KeyRound,
  Star,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Plug,
} from 'lucide-react';
import { cardStyle, sectionTitleStyle, smallBtn, inputStyle } from './_shared';

// ─── 角色展示 ─────────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<AdminAiProviderRole, string> = {
  primary: '主力',
  backup: '备用',
  disabled: '停用',
};

function RoleBadge({ role }: { role: AdminAiProviderRole }) {
  const cfg: Record<AdminAiProviderRole, { color: string; bg: string; border: string }> = {
    primary: { color: 'var(--color-brand)', bg: 'rgba(47,143,255,.10)', border: 'rgba(47,143,255,.28)' },
    backup: { color: 'var(--color-ink-3)', bg: 'rgba(120,120,120,.08)', border: 'var(--hair)' },
    disabled: { color: 'var(--color-ink-4)', bg: 'rgba(120,120,120,.06)', border: 'var(--hair)' },
  };
  const c = cfg[role];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '11.5px',
        fontWeight: 700,
        color: c.color,
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: '999px',
        padding: '3px 10px',
        whiteSpace: 'nowrap',
      }}
    >
      {role === 'primary' && <Star size={11} />}
      {ROLE_LABEL[role]}
    </span>
  );
}

// ─── 表单状态 ─────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  protocol: AdminAiProviderProtocol;
  baseURL: string;
  apiKey: string; // 编辑态留空 = 不改密钥
  modelPro: string;
  modelFlash: string;
  role: AdminAiProviderRole;
  sortOrder: string;
  timeoutMs: string;
  maxRetries: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  protocol: 'anthropic-compat',
  baseURL: '',
  apiKey: '',
  modelPro: '',
  modelFlash: '',
  role: 'backup',
  sortOrder: '0',
  timeoutMs: '120000',
  maxRetries: '2',
};

function toCreatePayload(f: FormState): CreateAiProviderPayload {
  return {
    name: f.name.trim(),
    protocol: f.protocol,
    baseURL: f.baseURL.trim(),
    apiKey: f.apiKey,
    modelPro: f.modelPro.trim(),
    modelFlash: f.modelFlash.trim(),
    role: f.role,
    sortOrder: Number(f.sortOrder) || 0,
    timeoutMs: Number(f.timeoutMs) || 120000,
    maxRetries: Number(f.maxRetries) || 0,
  };
}

// 编辑提交:apiKey 留空则不传(write-only,保留原密钥)。
function toUpdatePayload(f: FormState): UpdateAiProviderPayload {
  const p: UpdateAiProviderPayload = {
    name: f.name.trim(),
    protocol: f.protocol,
    baseURL: f.baseURL.trim(),
    modelPro: f.modelPro.trim(),
    modelFlash: f.modelFlash.trim(),
    role: f.role,
    sortOrder: Number(f.sortOrder) || 0,
    timeoutMs: Number(f.timeoutMs) || 120000,
    maxRetries: Number(f.maxRetries) || 0,
  };
  if (f.apiKey.trim().length > 0) p.apiKey = f.apiKey;
  return p;
}

// ─── 组件入口 ─────────────────────────────────────────────────────────────────

export default function ApiManagementPanel() {
  const [data, setData] = useState<AdminAiProvider[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // 表单:editing=null 且 showForm=true 为新建;editing=id 为编辑该行。
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // 测试结果(按通道 id 记;'draft' 为表单草稿测试)。
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, AdminAiProviderTestResult>>({});

  // 删除确认中的通道 id。
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchList() {
      setError(null);
      try {
        const res = await api.get<AdminAiProvider[]>('/admin/ai-providers');
        if (cancelled) return;
        setData(res);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void fetchList();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(p: AdminAiProvider) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      protocol: p.protocol,
      baseURL: p.baseURL,
      apiKey: '', // 留空 = 不改;占位提示已配置
      modelPro: p.modelPro,
      modelFlash: p.modelFlash,
      role: p.role,
      sortOrder: String(p.sortOrder),
      timeoutMs: String(p.timeoutMs),
      maxRetries: String(p.maxRetries),
    });
    setFormError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  async function submitForm() {
    setSaving(true);
    setFormError(null);
    try {
      if (editingId) {
        await api.patch<AdminAiProvider>(`/admin/ai-providers/${editingId}`, toUpdatePayload(form));
      } else {
        await api.post<AdminAiProvider>('/admin/ai-providers', toCreatePayload(form));
      }
      closeForm();
      refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function testSaved(id: string) {
    setTesting(id);
    try {
      const res = await api.post<AdminAiProviderTestResult>(`/admin/ai-providers/${id}/test`, {});
      setTestResults((prev) => ({ ...prev, [id]: res }));
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [id]: { ok: false, latencyMs: 0, error: err instanceof Error ? err.message : '测试失败' },
      }));
    } finally {
      setTesting(null);
    }
  }

  async function testDraft() {
    if (!form.baseURL.trim() || !form.apiKey.trim() || !form.modelFlash.trim()) {
      setFormError('草稿测试需填写 baseURL、apiKey、modelFlash');
      return;
    }
    setTesting('draft');
    try {
      const res = await api.post<AdminAiProviderTestResult>('/admin/ai-providers/test', {
        protocol: form.protocol,
        baseURL: form.baseURL.trim(),
        apiKey: form.apiKey,
        modelFlash: form.modelFlash.trim(),
        timeoutMs: Number(form.timeoutMs) || 30000,
      });
      setTestResults((prev) => ({ ...prev, draft: res }));
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        draft: { ok: false, latencyMs: 0, error: err instanceof Error ? err.message : '测试失败' },
      }));
    } finally {
      setTesting(null);
    }
  }

  async function confirmDelete(id: string) {
    setDeletingId(id);
    try {
      await api.delete(`/admin/ai-providers/${id}`);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setDeletingId(null);
    }
  }

  // ── 加载中 ──
  if (loading) {
    return (
      <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-ink-3)' }} />
      </div>
    );
  }

  // ── 加载失败 ──
  if (error && !data) {
    return (
      <div
        role="alert"
        style={{
          background: 'var(--color-danger-soft)',
          color: 'var(--color-danger)',
          borderRadius: '10px',
          padding: '14px 16px',
          fontSize: '13.5px',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <XCircle size={16} />
        {error}
        <button type="button" onClick={refresh} style={{ ...smallBtn('neutral'), marginLeft: 'auto' }}>
          重试
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ── 安全说明条 ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          background: 'rgba(47,143,255,.06)',
          border: '1px solid var(--hair)',
          borderRadius: '10px',
          padding: '12px 14px',
          fontSize: '13px',
          color: 'var(--color-ink-2)',
          lineHeight: 1.6,
        }}
      >
        <KeyRound size={16} style={{ color: 'var(--color-brand)', flexShrink: 0, marginTop: '2px' }} />
        <span>
          密钥以 AES-256-GCM 加密存库，本面板<strong style={{ color: 'var(--color-ink)' }}>只显示末 4 位打码</strong>，
          编辑时密钥框留空即<strong style={{ color: 'var(--color-ink)' }}>不改密钥</strong>。改动即时生效，无需重启。
        </span>
      </div>

      {/* ── 行内错误 ── */}
      {error && (
        <div
          role="alert"
          style={{
            background: 'var(--color-danger-soft)',
            color: 'var(--color-danger)',
            borderRadius: '10px',
            padding: '12px 14px',
            fontSize: '13.5px',
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}

      {/* ── 列表卡片 ── */}
      <div className="lg" style={cardStyle}>
        <div style={{ ...sectionTitleStyle, justifyContent: 'space-between', marginBottom: '16px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={17} /> AI 通道（{data.length}）
          </span>
          <span style={{ display: 'inline-flex', gap: '8px' }}>
            <button type="button" onClick={refresh} style={smallBtn('neutral')}>
              <RefreshCw size={13} style={{ marginRight: '5px', verticalAlign: '-2px' }} />
              刷新
            </button>
            <button type="button" onClick={openCreate} style={smallBtn('primary')}>
              <Plus size={13} style={{ marginRight: '5px', verticalAlign: '-2px' }} />
              新增通道
            </button>
          </span>
        </div>

        {data.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'var(--color-ink-4)', padding: '12px 0' }}>
            暂无通道。点「新增通道」配置第一个 AI provider。
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.map((p) => {
              const tr = testResults[p.id];
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    flexWrap: 'wrap',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: `1px solid ${p.role === 'primary' ? 'rgba(47,143,255,.28)' : 'var(--color-line)'}`,
                    background: p.role === 'primary' ? 'rgba(47,143,255,.05)' : 'transparent',
                    opacity: p.role === 'disabled' ? 0.65 : 1,
                  }}
                >
                  {/* 名称 + 角色 + 端点 */}
                  <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '15px',
                        fontWeight: 700,
                        color: 'var(--color-ink)',
                        fontFamily: 'var(--serif)',
                        marginBottom: '3px',
                      }}
                    >
                      {p.name}
                      <RoleBadge role={p.role} />
                    </div>
                    <div
                      style={{
                        fontSize: '11.5px',
                        color: 'var(--color-ink-3)',
                        fontFamily: 'var(--font-mono)',
                        wordBreak: 'break-all',
                      }}
                    >
                      {p.protocol} · {p.baseURL}
                    </div>
                  </div>

                  {/* 型号 + 密钥打码 */}
                  <div style={{ flex: '0 0 auto', minWidth: '150px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-ink-2)', lineHeight: 1.5 }}>
                      <div>{p.modelPro}</div>
                      {p.modelFlash !== p.modelPro && <div>{p.modelFlash}</div>}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--color-ink-4)', marginTop: '3px' }}>
                      <KeyRound size={11} style={{ verticalAlign: '-1px', marginRight: '4px' }} />
                      {p.apiKeyMasked || '(无密钥)'}
                    </div>
                  </div>

                  {/* 测试结果 */}
                  <div style={{ flex: '0 0 auto', minWidth: '110px' }}>
                    {tr ? (
                      tr.ok ? (
                        <span style={{ color: 'var(--color-success)', fontSize: '12px', fontWeight: 700 }}>
                          <CheckCircle2 size={13} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
                          连通 {tr.latencyMs}ms
                        </span>
                      ) : (
                        <span
                          title={tr.error}
                          style={{ color: 'var(--color-danger)', fontSize: '12px', fontWeight: 700 }}
                        >
                          <XCircle size={13} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
                          失败
                        </span>
                      )
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--color-ink-4)' }}>—</span>
                    )}
                  </div>

                  {/* 操作 */}
                  <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => void testSaved(p.id)}
                      disabled={testing === p.id}
                      style={smallBtn('neutral')}
                    >
                      {testing === p.id ? (
                        <Loader2 size={12} className="animate-spin" style={{ verticalAlign: '-2px' }} />
                      ) : (
                        <>
                          <Plug size={12} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
                          测试
                        </>
                      )}
                    </button>
                    <button type="button" onClick={() => openEdit(p)} style={smallBtn('neutral')}>
                      <Pencil size={12} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
                      编辑
                    </button>
                    {deletingId === p.id ? (
                      <span style={{ display: 'inline-flex', gap: '6px' }}>
                        <button type="button" onClick={() => void confirmDelete(p.id)} style={smallBtn('danger')}>
                          确认删除
                        </button>
                        <button type="button" onClick={() => setDeletingId(null)} style={smallBtn('neutral')}>
                          取消
                        </button>
                      </span>
                    ) : (
                      <button type="button" onClick={() => setDeletingId(p.id)} style={smallBtn('danger')}>
                        <Trash2 size={12} style={{ verticalAlign: '-2px' }} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 表单卡片(新增 / 编辑)── */}
      {showForm && (
        <div className="lg" style={cardStyle}>
          <div style={sectionTitleStyle}>
            {editingId ? <Pencil size={16} /> : <Plus size={16} />}
            {editingId ? '编辑通道' : '新增通道'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <Field label="名称 name">
              <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="deepseek" />
            </Field>
            <Field label="协议 protocol">
              <select
                style={inputStyle}
                value={form.protocol}
                onChange={(e) => setForm({ ...form, protocol: e.target.value as AdminAiProviderProtocol })}
              >
                <option value="anthropic-compat">anthropic-compat</option>
                <option value="openai-compat">openai-compat</option>
              </select>
            </Field>
            <Field label="角色 role">
              <select
                style={inputStyle}
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as AdminAiProviderRole })}
              >
                <option value="primary">主力 primary</option>
                <option value="backup">备用 backup</option>
                <option value="disabled">停用 disabled</option>
              </select>
            </Field>
            <Field label="baseURL" full>
              <input style={inputStyle} value={form.baseURL} onChange={(e) => setForm({ ...form, baseURL: e.target.value })} placeholder="https://api.deepseek.com/anthropic" />
            </Field>
            <Field label={editingId ? 'apiKey（留空不改）' : 'apiKey'} full>
              <input
                style={inputStyle}
                type="password"
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                placeholder={editingId ? '••••••（留空则保留原密钥）' : 'sk-...'}
                autoComplete="new-password"
              />
            </Field>
            <Field label="modelPro">
              <input style={inputStyle} value={form.modelPro} onChange={(e) => setForm({ ...form, modelPro: e.target.value })} placeholder="deepseek-v4-pro" />
            </Field>
            <Field label="modelFlash">
              <input style={inputStyle} value={form.modelFlash} onChange={(e) => setForm({ ...form, modelFlash: e.target.value })} placeholder="deepseek-v4-flash" />
            </Field>
            <Field label="sortOrder">
              <input style={inputStyle} type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
            </Field>
            <Field label="timeoutMs">
              <input style={inputStyle} type="number" value={form.timeoutMs} onChange={(e) => setForm({ ...form, timeoutMs: e.target.value })} />
            </Field>
            <Field label="maxRetries">
              <input style={inputStyle} type="number" value={form.maxRetries} onChange={(e) => setForm({ ...form, maxRetries: e.target.value })} />
            </Field>
          </div>

          {/* 草稿测试结果 */}
          {testResults.draft && (
            <div style={{ marginTop: '12px', fontSize: '12.5px', fontWeight: 700 }}>
              {testResults.draft.ok ? (
                <span style={{ color: 'var(--color-success)' }}>
                  <CheckCircle2 size={13} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
                  草稿连通 {testResults.draft.latencyMs}ms
                </span>
              ) : (
                <span style={{ color: 'var(--color-danger)' }}>
                  <XCircle size={13} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
                  草稿测试失败：{testResults.draft.error}
                </span>
              )}
            </div>
          )}

          {formError && (
            <div style={{ marginTop: '12px', color: 'var(--color-danger)', fontSize: '13px', fontWeight: 500 }}>
              {formError}
            </div>
          )}

          <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
            <button type="button" onClick={() => void submitForm()} disabled={saving} style={smallBtn('primary')}>
              {saving ? (
                <>
                  <Loader2 size={12} className="animate-spin" style={{ verticalAlign: '-2px', marginRight: '5px' }} />
                  保存中…
                </>
              ) : (
                '保存'
              )}
            </button>
            <button type="button" onClick={() => void testDraft()} disabled={testing === 'draft'} style={smallBtn('neutral')}>
              {testing === 'draft' ? (
                <>
                  <Loader2 size={12} className="animate-spin" style={{ verticalAlign: '-2px', marginRight: '5px' }} />
                  测试中…
                </>
              ) : (
                <>
                  <Plug size={12} style={{ verticalAlign: '-2px', marginRight: '5px' }} />
                  测试连通
                </>
              )}
            </button>
            <button type="button" onClick={closeForm} style={smallBtn('neutral')}>
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 表单字段包装(label + 控件)。
function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', gridColumn: full ? '1 / -1' : 'auto' }}>
      <span
        style={{
          fontSize: '10.5px',
          fontWeight: 700,
          color: 'var(--color-ink-4)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
