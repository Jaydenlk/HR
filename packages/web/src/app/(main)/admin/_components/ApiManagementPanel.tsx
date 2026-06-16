'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { AdminAiProvider, AdminAiProviderKind } from '@/lib/types';
import {
  Loader2,
  Cpu,
  KeyRound,
  Star,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ListOrdered,
} from 'lucide-react';
import { cardStyle, sectionTitleStyle, smallBtn } from './_shared';

// ─── 通道展示名(中文)───────────────────────────────────────────────────────
// 仅展示用;切换/校验全部以后端 AdminAiProviderKind 为准。

const PROVIDER_LABEL: Record<AdminAiProviderKind, string> = {
  deepseek: 'DeepSeek',
  relay: 'CloudDreamAI 中转',
  glm: '智谱 GLM',
};

const PROVIDER_DESC: Record<AdminAiProviderKind, string> = {
  deepseek: 'DeepSeek 官方 / 兼容端点',
  relay: 'CloudDreamAI 多模型中转(pro/flash 共用别名)',
  glm: '智谱 GLM（Anthropic 兼容端点）',
};

// ─── 角色徽章配色 ─────────────────────────────────────────────────────────────
// 主力(蓝)/ 备用(中性)/ 未配置(灰,不可设主力)。

type Role = 'primary' | 'backup' | 'unconfigured';

function roleOf(
  name: AdminAiProviderKind,
  configured: boolean,
  primary: AdminAiProviderKind,
): Role {
  if (!configured) return 'unconfigured';
  return name === primary ? 'primary' : 'backup';
}

function RoleBadge({ role }: { role: Role }) {
  const cfg: Record<Role, { label: string; color: string; bg: string; border: string }> = {
    primary: {
      label: '主力',
      color: 'var(--color-brand)',
      bg: 'rgba(47,143,255,.10)',
      border: 'rgba(47,143,255,.28)',
    },
    backup: {
      label: '备用',
      color: 'var(--color-ink-3)',
      bg: 'rgba(120,120,120,.08)',
      border: 'var(--hair)',
    },
    unconfigured: {
      label: '未配置密钥',
      color: 'var(--color-ink-4)',
      bg: 'rgba(120,120,120,.06)',
      border: 'var(--hair)',
    },
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
      {c.label}
    </span>
  );
}

// ─── 组件入口 ─────────────────────────────────────────────────────────────────

export default function ApiManagementPanel() {
  const [data, setData] = useState<AdminAiProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 正在切主力的通道名(按钮 loading + 防重复点击);null 表示无进行中切换。
  const [switching, setSwitching] = useState<AdminAiProviderKind | null>(null);
  // 触发刷新的信号:递增即重拉。
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function fetchStatus() {
      setError(null);
      try {
        const res = await api.get<AdminAiProvider>('/admin/ai-provider');
        if (cancelled) return;
        setData(res);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void fetchStatus();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  // 设为主力:PATCH /admin/ai-provider,后端返回最新状态即时反映(免重启)。
  async function setPrimary(name: AdminAiProviderKind) {
    if (!data || name === data.primary || switching) return;
    setSwitching(name);
    setError(null);
    try {
      const res = await api.patch<AdminAiProvider>('/admin/ai-provider', { primary: name });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : '切换失败');
    } finally {
      setSwitching(null);
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
        <button
          type="button"
          onClick={() => setTick((t) => t + 1)}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: '1px solid var(--color-danger)',
            borderRadius: '6px',
            color: 'var(--color-danger)',
            fontSize: '12px',
            padding: '4px 10px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          重试
        </button>
      </div>
    );
  }

  if (!data) return null;

  // 降级顺序:把通道名映射成展示名,过滤掉未配置的(运行时实际只在已配置通道间降级)。
  const configuredNames = new Set(
    data.providers.filter((p) => p.configured).map((p) => p.name),
  );
  const orderLabels = data.order
    .filter((n) => configuredNames.has(n))
    .map((n) => PROVIDER_LABEL[n]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ── 安全说明条:密钥永远走 env,面板只切主备 ── */}
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
          密钥与端点由运维在服务器 <code style={{ fontFamily: 'var(--font-mono)' }}>.env</code> 配置，
          本面板仅切换主力 / 备用顺序，<strong style={{ color: 'var(--color-ink)' }}>不显示也不输入任何密钥</strong>。
          切换即时生效，无需重启。
        </span>
      </div>

      {/* ── 行内错误(已有数据时切换失败)── */}
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

      {/* ── provider 列表 ── */}
      <div className="lg" style={cardStyle}>
        <div style={{ ...sectionTitleStyle, justifyContent: 'space-between', marginBottom: '16px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={17} /> AI 通道（{data.providers.length}）
          </span>
          <button
            type="button"
            onClick={() => setTick((t) => t + 1)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'rgba(47,143,255,.06)',
              border: '1px solid var(--hair)',
              borderRadius: 'var(--radius-default)',
              color: 'var(--color-ink)',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} /> 刷新
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {data.providers.map((p) => {
            const role = roleOf(p.name, p.configured, data.primary);
            const isPrimary = role === 'primary';
            const isSwitching = switching === p.name;
            return (
              <div
                key={p.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  flexWrap: 'wrap',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: `1px solid ${isPrimary ? 'rgba(47,143,255,.28)' : 'var(--color-line)'}`,
                  background: isPrimary
                    ? 'rgba(47,143,255,.05)'
                    : !p.configured
                      ? 'rgba(120,120,120,.03)'
                      : 'transparent',
                  opacity: p.configured ? 1 : 0.7,
                }}
              >
                {/* 名称 + 描述 */}
                <div style={{ flex: '1 1 220px', minWidth: 0 }}>
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
                    {PROVIDER_LABEL[p.name]}
                    <RoleBadge role={role} />
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-ink-3)' }}>
                    {PROVIDER_DESC[p.name]}
                  </div>
                </div>

                {/* 型号(只读)*/}
                <div style={{ flex: '0 0 auto', minWidth: '140px' }}>
                  <div
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      color: 'var(--color-ink-4)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: '3px',
                    }}
                  >
                    型号 (pro / flash)
                  </div>
                  {p.configured ? (
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        color: 'var(--color-ink-2)',
                        lineHeight: 1.5,
                      }}
                    >
                      <div>{p.modelPro}</div>
                      {p.modelFlash !== p.modelPro && <div>{p.modelFlash}</div>}
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--color-ink-4)' }}>—</div>
                  )}
                </div>

                {/* 操作 */}
                <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center' }}>
                  {!p.configured ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '12px',
                        color: 'var(--color-ink-4)',
                        fontWeight: 600,
                      }}
                      title="该通道未在 .env 配置密钥，需运维写入后方可设为主力"
                    >
                      <KeyRound size={12} /> 需运维配 .env
                    </span>
                  ) : isPrimary ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '12.5px',
                        color: 'var(--color-success)',
                        fontWeight: 700,
                      }}
                    >
                      <CheckCircle2 size={14} /> 当前主力
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void setPrimary(p.name)}
                      disabled={switching !== null}
                      style={{
                        ...smallBtn('primary'),
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        ...(switching !== null ? { opacity: 0.55, cursor: 'not-allowed' } : {}),
                      }}
                    >
                      {isSwitching ? (
                        <>
                          <Loader2 size={12} className="animate-spin" /> 切换中…
                        </>
                      ) : (
                        <>
                          <Star size={12} /> 设为主力
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 当前降级顺序 ── */}
      <div className="lg" style={cardStyle}>
        <div style={sectionTitleStyle}>
          <ListOrdered size={17} /> 当前降级顺序
        </div>
        <div style={{ fontSize: '12.5px', color: 'var(--color-ink-3)', marginBottom: '12px', lineHeight: 1.6 }}>
          主力通道不可用时，按下列顺序自动降级到下一个已配置通道（保命链路）。
        </div>
        {orderLabels.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'var(--color-ink-4)' }}>
            暂无可用通道（所有通道均未配置密钥）。
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            {orderLabels.map((label, i) => (
              <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '999px',
                    border: `1px solid ${i === 0 ? 'rgba(47,143,255,.28)' : 'var(--color-line)'}`,
                    background: i === 0 ? 'rgba(47,143,255,.06)' : 'transparent',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: i === 0 ? 'var(--color-brand)' : 'var(--color-ink-2)',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: 'var(--color-ink-4)',
                    }}
                  >
                    {i + 1}
                  </span>
                  {label}
                </span>
                {i < orderLabels.length - 1 && (
                  <span style={{ color: 'var(--color-ink-4)', fontSize: '13px' }}>→</span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
