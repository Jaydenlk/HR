'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import type { SpeakerRole, LabeledSegment } from '@/lib/types';
import { Users, User, RefreshCw, CheckCircle2 } from 'lucide-react';

// Payload shape for PATCH /interviews/:id/transcribe/:taskId/confirm
interface ConfirmPayload {
  segments: Array<{ idx: number; speaker: SpeakerRole }>;
}

export interface SpeakerLabelSectionProps {
  interviewId: string;
  taskId: string;
  // Initial segments from polling response; component manages local edits
  segments: LabeledSegment[];
  // Called after successful confirm so the parent can refresh the interview
  onConfirmed: () => void;
}

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const ROLE_LABELS: Record<SpeakerRole, string> = {
  interviewer: '面试官',
  candidate: '用户',
};

const ROLE_COLORS: Record<SpeakerRole, { bg: string; text: string; border: string }> = {
  interviewer: {
    bg: 'var(--color-brand-soft)',
    text: 'var(--color-brand-ink)',
    border: 'var(--color-brand)',
  },
  candidate: {
    bg: 'var(--color-success-soft)',
    text: 'var(--color-success)',
    border: 'var(--color-success)',
  },
};

export function SpeakerLabelSection({
  interviewId,
  taskId,
  segments: initialSegments,
  onConfirmed,
}: SpeakerLabelSectionProps) {
  // Local editable copy — keyed by idx for O(1) toggle
  const [localSegments, setLocalSegments] = useState<LabeledSegment[]>(
    () => initialSegments.map((s) => ({ ...s })),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleRole(idx: number) {
    setLocalSegments((prev) =>
      prev.map((s) =>
        s.idx === idx
          ? { ...s, speaker: s.speaker === 'interviewer' ? 'candidate' : 'interviewer' }
          : s,
      ),
    );
  }

  function bulkInvert() {
    setLocalSegments((prev) =>
      prev.map((s) => ({
        ...s,
        speaker: s.speaker === 'interviewer' ? 'candidate' : 'interviewer',
      })),
    );
  }

  async function handleConfirm() {
    setLoading(true);
    setError(null);

    const payload: ConfirmPayload = {
      segments: localSegments.map((s) => ({ idx: s.idx, speaker: s.speaker })),
    };

    try {
      await api.patch(
        `/interviews/${interviewId}/transcribe/${taskId}/confirm`,
        payload,
      );
      onConfirmed();
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  if (localSegments.length === 0) {
    return (
      <div
        className="lg"
        style={{
          padding: '24px',
          textAlign: 'center',
          color: 'var(--color-ink-3)',
          fontSize: '13.5px',
        }}
      >
        转写内容为空，请重新上传录音
      </div>
    );
  }

  const interviewerCount = localSegments.filter((s) => s.speaker === 'interviewer').length;
  const candidateCount = localSegments.filter((s) => s.speaker === 'candidate').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={17} color="var(--color-brand)" />
          <span
            style={{
              fontFamily: 'var(--serif)',
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--color-ink)',
            }}
          >
            转写内容确认
          </span>
          <span
            style={{
              fontSize: '12px',
              color: 'var(--color-ink-3)',
              background: 'rgba(47,143,255,.06)',
              border: '1px solid var(--hair)',
              padding: '2px 8px',
              borderRadius: '999px',
            }}
          >
            {localSegments.length} 句 · 面试官 {interviewerCount} / 用户 {candidateCount}
          </span>
        </div>

        {/* Bulk invert button */}
        <button
          type="button"
          onClick={bulkInvert}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '9px',
            border: '1.5px solid var(--color-line)',
            background: 'transparent',
            color: 'var(--color-ink-2)',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.55 : 1,
            transition: 'border-color 0.12s',
          }}
          onMouseEnter={(e) => { if (!loading) e.currentTarget.style.borderColor = 'var(--color-brand)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-line)'; }}
        >
          <RefreshCw size={13} />
          全部反转角色
        </button>
      </div>

      {/* Hint */}
      <div
        style={{
          fontSize: '12px',
          color: 'var(--color-ink-4)',
          padding: '8px 12px',
          borderRadius: '8px',
          background: 'rgba(47,143,255,.04)',
          border: '1px solid var(--hair)',
        }}
      >
        点击角色标签可切换「面试官 / 用户」；批量反转适用于整体错位场景。确认无误后点击「确认并生成分析」。
      </div>

      {/* Utterance list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {localSegments.map((seg) => {
          const colors = ROLE_COLORS[seg.speaker];
          return (
            <div
              key={seg.idx}
              className="lg"
              style={{
                padding: '14px 16px',
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                gap: '12px',
                alignItems: 'flex-start',
              }}
            >
              {/* Timestamp */}
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--color-ink-4)',
                  paddingTop: '2px',
                  whiteSpace: 'nowrap',
                }}
              >
                {formatMs(seg.startMs)}
              </div>

              {/* Text */}
              <p
                style={{
                  margin: 0,
                  fontSize: '13.5px',
                  color: 'var(--color-ink)',
                  lineHeight: 1.65,
                }}
              >
                {seg.text}
              </p>

              {/* Role tag — clickable toggle */}
              <button
                type="button"
                onClick={() => toggleRole(seg.idx)}
                disabled={loading}
                title="点击切换角色"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  border: `1.5px solid ${colors.border}`,
                  background: colors.bg,
                  color: colors.text,
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  flexShrink: 0,
                  transition: 'opacity 0.1s',
                  opacity: loading ? 0.55 : 1,
                }}
              >
                {seg.speaker === 'interviewer' ? (
                  <Users size={11} />
                ) : (
                  <User size={11} />
                )}
                {ROLE_LABELS[seg.speaker]}
              </button>
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '9px',
            background: 'var(--color-danger-soft)',
            color: 'var(--color-danger)',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}

      {/* Confirm action */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '6px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '10px 24px',
              borderRadius: '10px',
              border: 'none',
              background: loading
                ? 'var(--color-line)'
                : 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading
                ? 'none'
                : '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
              transition: 'opacity 0.12s',
              opacity: loading ? 0.6 : 1,
            }}
          >
            <CheckCircle2 size={16} />
            {loading ? '提交中…' : '确认并生成分析'}
          </button>
          <span style={{ fontSize: '11px', color: 'var(--color-ink-4)', fontWeight: 500 }}>
            消耗 1 点 · 提交后将触发 AI 面试复盘分析
          </span>
        </div>
      </div>
    </div>
  );
}
