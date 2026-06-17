'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { TranscribeStatus, TranscribeStatusResponse } from '@/lib/types';
import { Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export interface TranscriptProgressProps {
  interviewId: string;
  // The task to track; null means no active task
  taskId: string | null;
  // Called each time a status response arrives so the parent can react
  onStatusUpdate: (response: TranscribeStatusResponse) => void;
  // Called when polling has stopped (completed / failed)
  onStop?: () => void;
}

const POLL_INTERVAL_MS = 3000;

const STEPS: Array<{ status: TranscribeStatus; label: string }> = [
  { status: 'submitted', label: '排队中' },
  { status: 'transcribing', label: 'ASR 转写' },
  { status: 'labeling', label: '角色打标' },
  { status: 'awaiting_confirm', label: '等待确认' },
  { status: 'analyzing', label: '生成分析' },
  { status: 'completed', label: '完成' },
];

// Numerical order for comparison; 'failed' is not in this list on purpose.
const STATUS_ORDER: Record<string, number> = {
  submitted: 0,
  transcribing: 1,
  labeling: 2,
  awaiting_confirm: 3,
  analyzing: 4,
  completed: 5,
};

type StepState = 'done' | 'active' | 'pending';

function stepState(stepStatus: TranscribeStatus, current: TranscribeStatus): StepState {
  if (current === 'failed') return 'pending';
  const stepOrder = STATUS_ORDER[stepStatus] ?? 99;
  const currentOrder = STATUS_ORDER[current] ?? 0;
  if (stepOrder < currentOrder) return 'done';
  if (stepOrder === currentOrder) return 'active';
  return 'pending';
}

const TERMINAL_STATUSES: TranscribeStatus[] = ['completed', 'failed'];

// 把后端 error_message 收敛成对用户友好的一句话。后端多数原因本就可读(录音过长 / ffmpeg 未装等),
// 直接透出;少数带上游技术字样(unsupported format / internal error / 429)的,映射成人话提示。
function friendlyError(raw: string | null): string {
  const msg = (raw ?? '').trim();
  if (!msg) return '转写失败，请重新上传或稍后重试。';
  const lower = msg.toLowerCase();
  if (lower.includes('unsupported audio format') || lower.includes('format')) {
    return '录音格式暂不支持，请换用常见录音格式（如手机自带录音的 m4a）后重试。';
  }
  if (msg.includes('录音过长') || lower.includes('maximum allowed size') || lower.includes('exceeds')) {
    return '录音过长，请控制在约 40 分钟以内（更长时段的分段转写正在开发中）。';
  }
  if (lower.includes('internal error') || lower.includes('429') || lower.includes('繁忙')) {
    return '语音服务暂时繁忙，请稍后重试。';
  }
  // 其余后端消息本就是中文可读原因,直接展示。
  return msg;
}

export function TranscriptProgress({
  interviewId,
  taskId,
  onStatusUpdate,
  onStop,
}: TranscriptProgressProps) {
  const [status, setStatus] = useState<TranscribeStatus>('submitted');
  // 后端 failed 时回传的具体原因(格式不支持 / 录音过长 / 服务繁忙…),失败时展示给用户排障。
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (!taskId) return;

    if (pollRef.current) clearTimeout(pollRef.current);

    // Reset display state on new task. Deferred to a microtask (not the synchronous effect
    // body) to avoid react-hooks/set-state-in-effect cascading renders — same convention as
    // the rest of the app (see cover-letter / mock / diagnoses pages).
    void Promise.resolve().then(() => {
      if (mountedRef.current) {
        setStatus('submitted');
        setErrorMessage(null);
      }
    });

    async function fetchStatus() {
      try {
        const data = await api.get<TranscribeStatusResponse>(
          `/interviews/${interviewId}/transcribe/status`,
        );
        if (!mountedRef.current) return;

        setStatus(data.status);
        setErrorMessage(data.errorMessage ?? null);
        onStatusUpdate(data);

        if (TERMINAL_STATUSES.includes(data.status)) {
          onStop?.();
          return;
        }

        // Schedule next poll
        pollRef.current = setTimeout(() => {
          if (mountedRef.current) void fetchStatus();
        }, POLL_INTERVAL_MS);
      } catch {
        if (!mountedRef.current) return;
        // Network error: retry after interval, don't surface transient errors
        pollRef.current = setTimeout(() => {
          if (mountedRef.current) void fetchStatus();
        }, POLL_INTERVAL_MS);
      }
    }

    void fetchStatus();

    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, interviewId]);

  // Render nothing if there is no active task
  if (!taskId) return null;

  const isFailed = status === 'failed';
  const isCompleted = status === 'completed';

  return (
    <div
      className="lg"
      style={{
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {isFailed ? (
          <AlertCircle size={18} color="var(--color-danger)" />
        ) : isCompleted ? (
          <CheckCircle2 size={18} color="var(--color-success)" />
        ) : (
          <Loader2
            size={18}
            color="var(--color-brand)"
            style={{ animation: 'tp-spin 0.8s linear infinite' }}
          />
        )}
        <span
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: isFailed ? 'var(--color-danger)' : 'var(--color-ink)',
          }}
        >
          {isFailed
            ? '转写失败，请重新上传'
            : isCompleted
            ? '转写完成'
            : status === 'submitted'
            ? '排队中，请稍候…'
            : status === 'transcribing'
            ? '转写中，请稍候（约 30–120 秒）…'
            : status === 'labeling'
            ? '角色识别中…'
            : '正在处理录音…'}
        </span>
      </div>

      {/* Failure detail: surface the backend reason (格式不支持 / 录音过长 / 服务繁忙) so用户知道为何失败。 */}
      {isFailed && (
        <div
          style={{
            fontSize: '13px',
            lineHeight: 1.6,
            color: 'var(--color-ink-3)',
            background: 'var(--color-danger-soft)',
            border: '1px solid var(--color-danger)',
            borderRadius: '8px',
            padding: '10px 12px',
          }}
        >
          {friendlyError(errorMessage)}
        </div>
      )}

      {/* Step strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          overflowX: 'auto',
        }}
      >
        {STEPS.map((step, i) => {
          const state = stepState(step.status, status);
          const isLast = i === STEPS.length - 1;

          const dotBorderColor =
            state === 'done'
              ? 'var(--color-success)'
              : state === 'active'
              ? 'var(--color-brand)'
              : 'var(--color-line)';

          const dotBgColor =
            state === 'done'
              ? 'var(--color-success)'
              : state === 'active'
              ? 'var(--color-brand)'
              : 'var(--color-surface)';

          const labelColor =
            state === 'done'
              ? 'var(--color-success)'
              : state === 'active'
              ? 'var(--color-brand)'
              : 'var(--color-ink-4)';

          const connectorColor =
            (STATUS_ORDER[step.status] ?? 99) < (STATUS_ORDER[status] ?? 0)
              ? 'var(--color-success)'
              : 'var(--color-line)';

          return (
            <div
              key={step.status}
              style={{
                display: 'flex',
                alignItems: 'center',
                flex: isLast ? 'none' : 1,
                minWidth: 0,
              }}
            >
              {/* Step node */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '5px',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: dotBgColor,
                    border: `2px solid ${dotBorderColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                >
                  {state === 'active' && (
                    <div
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#fff',
                        animation: 'tp-pulse 1.2s ease-in-out infinite',
                      }}
                    />
                  )}
                  {state === 'done' && (
                    <CheckCircle2
                      size={12}
                      color="#fff"
                      style={{ flexShrink: 0 }}
                    />
                  )}
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: state === 'active' ? 700 : 500,
                    color: labelColor,
                    whiteSpace: 'nowrap',
                    transition: 'color 0.2s',
                  }}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line between steps */}
              {!isLast && (
                <div
                  style={{
                    flex: 1,
                    height: '2px',
                    marginBottom: '16px',
                    background: connectorColor,
                    transition: 'background 0.2s',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Hint text */}
      {!isFailed && !isCompleted && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: 'var(--color-ink-4)',
          }}
        >
          <Clock size={13} />
          <span>后台转写中，可离开本页面稍后回来查看进度</span>
        </div>
      )}

      <style>{`
        @keyframes tp-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes tp-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
