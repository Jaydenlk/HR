'use client';

/**
 * useHandoffReception — 四模块接待 hook。
 *
 * 载入时检测 ?handoff= → GET 拉 payload → 弹确认框:
 *   - 确认:预填表单 + PATCH accepted
 *   - 取消:PATCH dismissed
 * 已 accepted/dismissed 的 handoff 再次访问按其状态处理,不重复弹。
 */

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export interface HandoffPayload {
  company?: string;
  role?: string;
  jd_text?: string;
  jd_company?: string;
  jd_role?: string;
  note?: string;
  resume_version_note?: string;
  tone?: string;
  [key: string]: unknown;
}

interface HandoffData {
  id: string;
  target: string;
  payload: HandoffPayload;
  status: 'proposed' | 'accepted' | 'dismissed' | 'completed';
  conversation_id: string;
}

export type HandoffState = 'idle' | 'loading' | 'confirming' | 'accepted' | 'dismissed' | 'error';

interface UseHandoffReceptionResult {
  handoffState: HandoffState;
  handoffData: HandoffData | null;
  onAccept: () => Promise<void>;
  onDismiss: () => Promise<void>;
}

export function useHandoffReception(handoffId: string | null): UseHandoffReceptionResult {
  const [handoffState, setHandoffState] = useState<HandoffState>('idle');
  const [handoffData, setHandoffData] = useState<HandoffData | null>(null);

  useEffect(() => {
    if (!handoffId) return;
    // Defer initial setState to avoid synchronous-setState-in-effect lint issue
    const controller = { cancelled: false };
    setTimeout(() => {
      if (controller.cancelled) return;
      setHandoffState('loading');
      api
        .get<HandoffData>(`/coach-handoffs/${handoffId}`)
        .then((data) => {
          if (controller.cancelled) return;
          setHandoffData(data);
          if (data.status === 'proposed') {
            setHandoffState('confirming');
          } else if (data.status === 'accepted') {
            setHandoffState('accepted');
          } else {
            setHandoffState('dismissed');
          }
        })
        .catch(() => {
          if (!controller.cancelled) setHandoffState('error');
        });
    }, 0);
    return () => { controller.cancelled = true; };
  }, [handoffId]);

  async function onAccept() {
    if (!handoffData) return;
    try {
      await api.patch(`/coach-handoffs/${handoffData.id}/status`, { status: 'accepted' });
    } catch {
      toast.error('网络异常，请重试');
      return; // 保持确认框可重试,不推进状态
    }
    setHandoffState('accepted');
  }

  async function onDismiss() {
    if (!handoffData) return;
    try {
      await api.patch(`/coach-handoffs/${handoffData.id}/status`, { status: 'dismissed' });
    } catch {
      // 静默失败
    }
    setHandoffState('dismissed');
    setHandoffData(null);
  }

  return { handoffState, handoffData, onAccept, onDismiss };
}

// ─── 共用确认框组件 ──────────────────────────────────────────────────────────

const TARGET_LABELS: Record<string, string> = {
  mock: '模拟面试',
  diagnosis: '简历诊断',
  cover_letter: '求职信',
  resume_rewrite: '简历改写',
};

function payloadSummary(target: string, payload: HandoffPayload): string {
  const parts: string[] = [];
  if (payload.company) parts.push(String(payload.company));
  if (payload.role) parts.push(String(payload.role));
  if (payload.jd_company) parts.push(String(payload.jd_company));
  if (payload.jd_role) parts.push(String(payload.jd_role));
  if (payload.note) parts.push(String(payload.note));
  return parts.length > 0 ? parts.join(' · ') : TARGET_LABELS[target] ?? target;
}

interface HandoffConfirmDialogProps {
  target: string;
  payload: HandoffPayload;
  onAccept: () => void;
  onDismiss: () => void;
}

export function HandoffConfirmDialog({
  target,
  payload,
  onAccept,
  onDismiss,
}: HandoffConfirmDialogProps) {
  const label = TARGET_LABELS[target] ?? target;
  const summary = payloadSummary(target, payload);

  return (
    <div className="modal-overlay">
      <div className="modal-scrim" />
      <div
        className="lg"
        style={{
          position: 'relative', zIndex: 1,
          padding: '28px 32px',
          width: '100%', maxWidth: '440px',
        }}
      >
        <div
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '3px 10px', borderRadius: '6px',
            background: 'var(--color-brand-soft)',
            color: 'var(--color-brand)',
            fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em',
            textTransform: 'uppercase', marginBottom: '14px',
          }}
        >
          Coach 为你准备了
        </div>
        <h2
          style={{
            fontFamily: 'var(--serif)',
            fontSize: '18px', fontWeight: 700,
            color: 'var(--color-ink)', letterSpacing: '-0.02em',
            marginBottom: '6px',
          }}
        >
          {label}
        </h2>
        <p
          style={{
            fontSize: '14px', color: 'var(--color-ink-3)',
            lineHeight: 1.6, marginBottom: '24px',
          }}
        >
          {summary}
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onAccept}
            style={{
              flex: 1, padding: '11px 0',
              borderRadius: '11px', border: 'none',
              background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
              color: '#fff',
              boxShadow: '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              transition: 'opacity 0.12s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            是,开始
          </button>
          <button
            onClick={onDismiss}
            style={{
              flex: 1, padding: '11px 0',
              borderRadius: '11px', border: '1px solid var(--hair)',
              background: 'rgba(47,143,255,.05)', color: 'var(--color-ink-3)',
              fontSize: '14px', fontWeight: 500, cursor: 'pointer',
            }}
          >
            暂不
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 完成回流提示组件 ──────────────────────────────────────────────────────────

interface ReturnToCoachBannerProps {
  conversationId: string;
  handoffId: string;
  onClose: () => void;
}

export function ReturnToCoachBanner({
  conversationId,
  handoffId,
  onClose,
}: ReturnToCoachBannerProps) {
  async function handleReturn() {
    try {
      await api.patch(`/coach-handoffs/${handoffId}/status`, { status: 'completed' });
    } catch {
      // 静默失败
    }
    window.location.href = `/chat/${conversationId}`;
  }

  async function handleClose() {
    try {
      await api.patch(`/coach-handoffs/${handoffId}/status`, { status: 'completed' });
    } catch {
      // 静默失败
    }
    onClose();
  }

  return (
    <div
      className="lg"
      style={{
        position: 'fixed', bottom: '24px', left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 400,
        borderRadius: '14px',
        padding: '14px 20px',
        display: 'flex', alignItems: 'center', gap: '14px',
        minWidth: '300px', maxWidth: '480px',
      }}
    >
      <span style={{ fontSize: '13.5px', color: 'var(--color-ink)', fontWeight: 500, flex: 1 }}>
        返回 Coach 继续聊?
      </span>
      <button
        onClick={() => void handleReturn()}
        style={{
          padding: '6px 16px', borderRadius: '8px', border: 'none',
          background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
          color: '#fff',
          boxShadow: '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
          fontSize: '13px', fontWeight: 600, cursor: 'pointer',
        }}
      >
        返回
      </button>
      <button
        onClick={() => void handleClose()}
        style={{
          padding: '6px 12px', borderRadius: '8px',
          border: '1px solid var(--hair)', background: 'rgba(47,143,255,.05)',
          color: 'var(--color-ink-3)', fontSize: '13px', cursor: 'pointer',
        }}
      >
        不了
      </button>
    </div>
  );
}
