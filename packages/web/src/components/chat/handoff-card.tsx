'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ArrowRight, X } from 'lucide-react';

// target → 中文模块名 + 跳转路径
const TARGET_META: Record<string, { label: string; path: string }> = {
  mock: { label: '模拟面试', path: '/mock' },
  diagnosis: { label: '简历诊断', path: '/diagnoses/new' },
  cover_letter: { label: '求职信', path: '/cover-letter' },
  resume_rewrite: { label: '简历改写', path: '/resumes' },
};

function payloadSummary(target: string, payload: Record<string, unknown>): string {
  const parts: string[] = [];
  if (payload.company) parts.push(String(payload.company));
  if (payload.role) parts.push(String(payload.role));
  if (payload.jd_company) parts.push(String(payload.jd_company));
  if (payload.jd_role) parts.push(String(payload.jd_role));
  if (payload.note) parts.push(String(payload.note));
  if (parts.length === 0) return TARGET_META[target]?.label ?? target;
  return parts.join(' · ');
}

interface HandoffCardProps {
  handoffId: string;
  target: string;
  payload: Record<string, unknown>;
  /** 初始状态:来自消息的 rich_card(已 dismissed 时显示灰态) */
  initialStatus?: 'proposed' | 'accepted' | 'dismissed' | 'completed';
}

export function HandoffCard({
  handoffId,
  target,
  payload,
  initialStatus = 'proposed',
}: HandoffCardProps) {
  const router = useRouter();
  const meta = TARGET_META[target] ?? { label: target, path: '/' };
  const [status, setStatus] = useState<'proposed' | 'accepted' | 'dismissed' | 'completed'>(
    initialStatus,
  );
  const [dismissing, setDismissing] = useState(false);

  const summary = payloadSummary(target, payload);
  const isDismissed = status === 'dismissed';

  async function handleStart() {
    // 跳转时带 handoff id,目标页面接待
    router.push(`${meta.path}?handoff=${handoffId}`);
  }

  async function handleDismiss() {
    setDismissing(true);
    try {
      await api.patch(`/coach-handoffs/${handoffId}/status`, { status: 'dismissed' });
      setStatus('dismissed');
    } catch {
      // 静默失败:置灰操作不阻断 UI
      setStatus('dismissed');
    } finally {
      setDismissing(false);
    }
  }

  return (
    <div
      style={{
        marginTop: '10px',
        padding: '14px 16px',
        borderRadius: '14px',
        border: `1.5px solid ${isDismissed ? 'var(--color-line)' : 'var(--color-brand)'}`,
        background: isDismissed ? 'var(--color-surface-2)' : 'var(--color-brand-soft)',
        opacity: isDismissed ? 0.6 : 1,
        transition: 'opacity 0.15s, border-color 0.15s',
      }}
    >
      <div
        style={{
          fontSize: '12px',
          fontWeight: 600,
          color: isDismissed ? 'var(--color-ink-4)' : 'var(--color-brand)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          marginBottom: '4px',
        }}
      >
        Coach 为你准备了 · {meta.label}
      </div>
      <div
        style={{
          fontSize: '14px',
          fontWeight: 500,
          color: isDismissed ? 'var(--color-ink-3)' : 'var(--color-ink)',
          marginBottom: isDismissed ? 0 : '12px',
        }}
      >
        {summary}
      </div>

      {!isDismissed && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => void handleStart()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '7px 16px',
              borderRadius: '9px',
              border: 'none',
              background: 'var(--color-brand)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'opacity 0.12s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            一键开始
            <ArrowRight size={14} />
          </button>
          <button
            onClick={() => void handleDismiss()}
            disabled={dismissing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '7px 12px',
              borderRadius: '9px',
              border: '1px solid var(--color-line)',
              background: 'transparent',
              color: 'var(--color-ink-3)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: dismissing ? 'not-allowed' : 'pointer',
              opacity: dismissing ? 0.6 : 1,
            }}
          >
            <X size={13} />
            暂不
          </button>
        </div>
      )}

      {isDismissed && (
        <div style={{ fontSize: '12px', color: 'var(--color-ink-4)', marginTop: '4px' }}>
          已跳过
        </div>
      )}
    </div>
  );
}
