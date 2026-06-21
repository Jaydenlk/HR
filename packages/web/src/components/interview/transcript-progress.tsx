'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { TranscribeStatus, TranscribeStatusResponse } from '@/lib/types';
import { useTranscribeStatusPolling } from './use-transcribe-status-polling';
import { Loader2, CheckCircle2, AlertCircle, Clock, FileAudio, Upload, Trash2 } from 'lucide-react';

export interface TranscriptProgressProps {
  interviewId: string;
  // The task to track; null means no active task
  taskId: string | null;
  // Called each time a status response arrives so the parent can react
  onStatusUpdate: (response: TranscribeStatusResponse) => void;
  // Called when polling has stopped (completed / failed)
  onStop?: () => void;
  // Failed-state recovery: after the failed task is cleared, re-open the upload UI for a fresh upload.
  // 音频不落盘,服务端无法重转写——「重新上传」= 清掉失败任务后让用户重新上传一段录音。
  onRetryReupload?: () => void;
  // Failed-state recovery: after the failed task is deleted, reset UI to the pre-upload state.
  onDeleteTask?: () => void;
  // 分析阶段失败专用重试:转写结果仍存于服务端(segments_json),无需重传录音,直接重跑分析(不再重复扣转写费)。
  // 仅当 failedAtStage==='analyzing' 时暴露入口;不删任务、不走 clearTaskThen。
  onRetryAnalysis?: () => void;
}

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
  if (lower.includes('unsupported audio format')) {
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

// 上传元数据回执(从 status 回包提取的文件元数据,非音频内容)。
interface UploadReceipt {
  filename: string;
  sizeBytes: number | null;
  uploadedAt: string | null;
}

// 人类可读文件大小(与 audio-uploader 同口径:B / KB / MB)。
function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// 相对时间(中文,纯前端 Date 计算,不引库)。
function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  if (diffMs < 0) return '刚刚';
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return '刚刚';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  // 超过一天:展示「M月D日 上传」。
  const d = new Date(then);
  return `${d.getMonth() + 1}月${d.getDate()}日 上传`;
}

export function TranscriptProgress({
  interviewId,
  taskId,
  onStatusUpdate,
  onStop,
  onRetryReupload,
  onDeleteTask,
  onRetryAnalysis,
}: TranscriptProgressProps) {
  const [status, setStatus] = useState<TranscribeStatus>('submitted');
  // 后端 failed 时回传的具体原因(格式不支持 / 录音过长 / 服务繁忙…),失败时展示给用户排障。
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // 失败发生在哪个阶段(后端 failedAtStage):'analyzing' → 转写已保存,可免重传重试分析;其余 → 需重新上传。
  const [failedAtStage, setFailedAtStage] = useState<string | null>(null);
  // 上传元数据回执:status 回包带回文件名/字节数/上传时刻(非音频内容);一旦非空即渲染「已收到上传」卡。
  const [receipt, setReceipt] = useState<UploadReceipt | null>(null);
  // 失败态恢复动作(重新上传/删除记录)进行中标记,避免重复点击。
  const [recovering, setRecovering] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 新任务到来时重置展示态。Deferred 到微任务(非同步 effect 体),避免 react-hooks/set-state-in-effect
  // 级联渲染——与全站既有写法一致(cover-letter / mock / diagnoses 等)。
  useEffect(() => {
    if (!taskId) return;
    void Promise.resolve().then(() => {
      if (mountedRef.current) {
        setStatus('submitted');
        setErrorMessage(null);
        setFailedAtStage(null);
        setReceipt(null);
      }
    });
  }, [taskId]);

  // 每次轮询拿到状态:更新展示态 + 元数据回执 + 透传父层;到达终态由钩子停轮询,这里额外触发 onStop。
  const handlePoll = useCallback(
    (data: TranscribeStatusResponse) => {
      setStatus(data.status);
      setErrorMessage(data.errorMessage ?? null);
      setFailedAtStage(data.failedAtStage ?? null);
      // 一旦后端回传上传元数据(收到上传),立即据此渲染「已收到上传」回执卡(非音频内容)。
      if (data.originalFilename) {
        setReceipt({
          filename: data.originalFilename,
          sizeBytes: data.fileSizeBytes ?? null,
          uploadedAt: data.uploadedAt ?? null,
        });
      }
      onStatusUpdate(data);
      if (TERMINAL_STATUSES.includes(data.status)) {
        onStop?.();
      }
    },
    [onStatusUpdate, onStop],
  );

  // 复用页面级同一轮询钩子:有 taskId 即轮询,终态自动停(钩子内),并发由父层 enabled 交接避免重复。
  useTranscribeStatusPolling({
    interviewId,
    enabled: !!taskId,
    onStatus: handlePoll,
  });

  // 清掉当前(失败)任务,再交给父层切 UI。音频不落盘 → 服务端无法重转写,故「重新上传」= 清任务 + 重开上传。
  async function clearTaskThen(after?: () => void) {
    if (!taskId || recovering) return;
    setRecovering(true);
    try {
      await api.delete(`/interviews/${interviewId}/transcribe/${taskId}`);
      after?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败，请稍后重试');
    } finally {
      if (mountedRef.current) setRecovering(false);
    }
  }

  // Render nothing if there is no active task
  if (!taskId) return null;

  const isFailed = status === 'failed';
  const isCompleted = status === 'completed';
  // 分析阶段失败:转写结果仍在服务端,可免重传直接重试分析(不再重复扣转写费),且仅当父层接了 onRetryAnalysis。
  const isAnalysisFailure =
    isFailed && failedAtStage === 'analyzing' && !!onRetryAnalysis;

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
      {/* 「已收到上传」回执卡:收到上传(后端回传文件元数据)即显示——即时视觉确认手机/电脑端上传已落地。
          隐私铁律:这是元数据回执(✓ + 文件名 + 大小 + 相对时间),不是音频播放器(音频不落盘,无音频可播)。 */}
      {receipt && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '11px 14px',
            borderRadius: '10px',
            background: 'var(--color-success-soft, rgba(34,197,94,.08))',
            border: '1px solid var(--color-success)',
          }}
        >
          <CheckCircle2 size={17} color="var(--color-success)" style={{ flexShrink: 0 }} />
          <FileAudio size={15} color="var(--color-ink-3)" style={{ flexShrink: 0 }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-ink)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              已收到上传 · 《{receipt.filename}》
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-ink-4)', marginTop: '2px' }}>
              {receipt.sizeBytes != null ? humanSize(receipt.sizeBytes) : ''}
              {receipt.sizeBytes != null && receipt.uploadedAt ? ' · ' : ''}
              {relativeTime(receipt.uploadedAt)}
            </div>
          </div>
        </div>
      )}

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
            ? isAnalysisFailure
              ? '分析失败，可重试'
              : '转写失败，请重新上传'
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

      {/* 失败态恢复动作。分两路:
          (1) 分析阶段失败(isAnalysisFailure):转写已存服务端,主按钮「重试分析」直接重跑分析(不删任务、不重传、不再扣转写费);删除记录保留。
          (2) 其它失败(转写/打标):音频不落盘无法重转写,「重新上传」= 清失败任务 + 重开上传;删除记录保留。 */}
      {isFailed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {isAnalysisFailure ? (
              <button
                type="button"
                disabled={recovering}
                onClick={() => onRetryAnalysis?.()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '9px',
                  border: 'none',
                  background: recovering
                    ? 'var(--color-line)'
                    : 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: recovering ? 'not-allowed' : 'pointer',
                  opacity: recovering ? 0.6 : 1,
                }}
              >
                <Loader2 size={14} />
                重试分析
              </button>
            ) : (
              <button
                type="button"
                disabled={recovering}
                onClick={() => void clearTaskThen(onRetryReupload)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '9px',
                  border: 'none',
                  background: recovering
                    ? 'var(--color-line)'
                    : 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: recovering ? 'not-allowed' : 'pointer',
                  opacity: recovering ? 0.6 : 1,
                }}
              >
                <Upload size={14} />
                {recovering ? '处理中…' : '重新上传'}
              </button>
            )}
            <button
              type="button"
              disabled={recovering}
              onClick={() => void clearTaskThen(onDeleteTask)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '9px',
                border: '1.5px solid var(--color-line)',
                background: 'transparent',
                color: 'var(--color-ink-3)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: recovering ? 'not-allowed' : 'pointer',
                opacity: recovering ? 0.6 : 1,
              }}
            >
              <Trash2 size={14} />
              删除记录
            </button>
          </div>
          <span style={{ fontSize: '11.5px', color: 'var(--color-ink-4)' }}>
            {isAnalysisFailure
              ? '转写已保存,可直接重试分析(不再重复扣转写费)。'
              : '录音未保存(转写后即销毁),「重新上传」需重新上传一段录音。'}
          </span>
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
