'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { ApplicationEvent } from '@/lib/types';

interface ApplicationTimelineProps {
  applicationId: string;
}

const STAGE_LABELS: Record<string, string> = {
  wishlist: '想投',
  applied: '已投递',
  interview: '面试中',
  final: '终面',
  offer: 'Offer',
  rejected: '已拒',
};

function stageLabel(stage: string | null): string {
  if (!stage) return '创建';
  return STAGE_LABELS[stage] ?? stage;
}

// 相对时间(刚刚/N 分钟前/N 小时前/N 天前),超过 30 天回退绝对日期。
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  if (Number.isNaN(then)) return '';
  if (diff < 60 * 1000) return '刚刚';
  const minutes = Math.floor(diff / (60 * 1000));
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(diff / (60 * 60 * 1000));
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days < 30) return `${days} 天前`;
  return absoluteTime(iso);
}

function absoluteTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ApplicationTimeline({ applicationId }: ApplicationTimelineProps) {
  const [events, setEvents] = useState<ApplicationEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 组件随弹窗按 applicationId 重新挂载(父级 ApplicationForm 带 key),初始 state 即为加载态,
  // 无需在 effect 内同步重置,避免级联渲染。
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const data = await api.get<ApplicationEvent[]>(
          `/applications/${applicationId}/events`,
          { signal: controller.signal },
        );
        setEvents(data);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : '加载时间线失败');
      }
    })();
    return () => controller.abort();
  }, [applicationId]);

  const titleStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--color-ink-2)',
    letterSpacing: '0.02em',
    marginBottom: '12px',
  };

  return (
    <div
      style={{
        marginTop: '20px',
        paddingTop: '20px',
        borderTop: '1px solid var(--color-line)',
      }}
    >
      <div style={titleStyle}>阶段时间线</div>

      {error ? (
        <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--color-danger)', lineHeight: 1.5 }}>
          {error}
        </p>
      ) : events === null ? (
        <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--color-ink-3)' }}>加载中…</p>
      ) : events.length === 0 ? (
        <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--color-ink-4)', lineHeight: 1.5 }}>
          暂无阶段流转记录，改变阶段后会在这里留下足迹。
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {events.map((ev, i) => (
            <div
              key={ev.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '14px 1fr',
                gap: '10px',
                alignItems: 'stretch',
              }}
            >
              {/* Rail: dot + connector */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'var(--color-brand)',
                    marginTop: '5px',
                    flexShrink: 0,
                  }}
                />
                {i < events.length - 1 && (
                  <span
                    style={{
                      width: '1.5px',
                      flex: 1,
                      minHeight: '14px',
                      background: 'var(--color-line-2)',
                      marginTop: '2px',
                    }}
                  />
                )}
              </div>

              {/* Content */}
              <div style={{ paddingBottom: '12px' }}>
                <div style={{ fontSize: '13px', color: 'var(--color-ink)', fontWeight: 600, lineHeight: 1.4 }}>
                  {ev.from_stage
                    ? `${stageLabel(ev.from_stage)} → ${stageLabel(ev.to_stage)}`
                    : `创建投递 · ${stageLabel(ev.to_stage)}`}
                </div>
                {ev.note && (
                  <div style={{ fontSize: '12px', color: 'var(--color-ink-3)', marginTop: '2px', lineHeight: 1.4 }}>
                    {ev.note}
                  </div>
                )}
                <div
                  style={{ fontSize: '11px', color: 'var(--color-ink-4)', marginTop: '3px' }}
                  title={absoluteTime(ev.created_at)}
                >
                  {relativeTime(ev.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
