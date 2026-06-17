/**
 * 管理后台共享样式与辅助函数
 *
 * 设计语言:全站「液态玻璃」体系。
 * - 外层容器用 className="lg"(单层玻璃),内部背景/边由 .lg 提供。
 * - CSS 变量:--color-ink/-2/-3/-4、--color-brand、--color-brand-deep、
 *   --color-line、--hair、--serif、--font-mono、--radius-default、
 *   --color-surface、--color-danger、--color-danger-soft、--color-success。
 *
 * 使用方式:在各管理后台面板中 import { cardStyle, smallBtn, ... } from './_shared';
 *
 * 本文件只含样式对象与纯函数——零副作用、零 React 导入、可安全用于所有子组件。
 */

import type { AdminUserRow } from '@/lib/types';

// ─── 卡片/面板内边距 ──────────────────────────────────────────────────────────

export const cardStyle: React.CSSProperties = {
  padding: '20px 22px',
};

// ─── 卡片/面板标题行 ──────────────────────────────────────────────────────────

export const sectionTitleStyle: React.CSSProperties = {
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

// ─── 表格表头单元格 ───────────────────────────────────────────────────────────

export const thStyle: React.CSSProperties = {
  textAlign: 'left',
  fontSize: '11.5px',
  fontWeight: 700,
  color: 'var(--color-ink-3)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  padding: '8px 10px',
  borderBottom: '1px solid var(--color-line)',
  whiteSpace: 'nowrap',
};

// ─── 表格数据单元格 ───────────────────────────────────────────────────────────

export const tdStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--color-ink-2)',
  padding: '10px',
  borderBottom: '1px solid var(--color-line)',
  verticalAlign: 'middle',
};

// ─── 表单输入框 ───────────────────────────────────────────────────────────────

export const inputStyle: React.CSSProperties = {
  padding: '7px 10px',
  background: 'var(--color-surface)',
  border: '1px solid var(--color-line)',
  borderRadius: '8px',
  fontFamily: 'inherit',
  fontSize: '13px',
  color: 'var(--color-ink)',
  fontWeight: 500,
  outline: 'none',
  boxSizing: 'border-box',
};

// ─── 小操作按钮样式生成器 ─────────────────────────────────────────────────────
//
// primary : 品牌渐变主操作钮(蓝光柔阴影 + 内高光)
// danger  : 语义危险色(红底白字)
// neutral : 微染玻璃感按钮(发丝边,暗色不再黑卡)

export function smallBtn(
  variant: 'primary' | 'danger' | 'neutral',
): React.CSSProperties {
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
    ...(variant === 'primary'
      ? {
          boxShadow:
            '0 8px 22px -12px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
        }
      : {}),
  };
}

// ─── 相对时间格式化 ───────────────────────────────────────────────────────────
//
// 刚刚 / N 分钟前 / N 小时前 / N 天前;超 30 天回退本地绝对日期。
// 沿用全站各页局部 helper 的既有约定。

export function relativeTime(iso: string): string {
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

// ─── 用户登录归属展示 ─────────────────────────────────────────────────────────
//
// 内网登录后端记 province='内网';归属缺失时显示「—」。

export function loginRegion(u: AdminUserRow): string {
  if (u.last_login_province === '内网') return '内网';
  if (u.last_login_province && u.last_login_city)
    return `${u.last_login_province}·${u.last_login_city}`;
  return u.last_login_province ?? u.last_login_city ?? '—';
}
