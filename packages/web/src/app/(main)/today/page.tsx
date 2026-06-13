'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { DailyTask } from '@/lib/types';
import {
  CalendarDays,
  RefreshCw,
  CheckCircle2,
  Circle,
  Clock,
  Zap,
  BookOpen,
  Briefcase,
  FileText,
  Brain,
  Loader2,
} from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return '夜深了，注意休息';
  if (h < 12) return '早上好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

type TaskTypeKey = 'practice' | 'apply' | 'review' | 'learn' | 'resume';

const TASK_TYPE_META: Record<
  TaskTypeKey,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  practice: {
    label: '练习',
    color: '#1570ef',
    bg: '#eff8ff',
    icon: <Zap size={11} />,
  },
  apply: {
    label: '投递',
    color: '#027a48',
    bg: '#ecfdf3',
    icon: <Briefcase size={11} />,
  },
  review: {
    label: '复盘',
    color: '#b54708',
    bg: '#fffaeb',
    icon: <Brain size={11} />,
  },
  learn: {
    label: '学习',
    color: '#5925dc',
    bg: '#f4f3ff',
    icon: <BookOpen size={11} />,
  },
  resume: {
    label: '简历',
    color: '#c11574',
    bg: '#fdf4ff',
    icon: <FileText size={11} />,
  },
};

function getTypeMeta(type: string) {
  return (
    TASK_TYPE_META[type as TaskTypeKey] ?? {
      label: type,
      color: 'var(--color-ink-3)',
      bg: 'var(--color-surface-3)',
      icon: <Clock size={11} />,
    }
  );
}

// ── sub-components ────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  const meta = getTypeMeta(type);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 600,
        color: meta.color,
        background: meta.bg,
        letterSpacing: '-0.003em',
        flexShrink: 0,
      }}
    >
      {meta.icon}
      {meta.label}
    </span>
  );
}

interface TaskCardProps {
  task: DailyTask;
  onToggle: (id: string, current: 'todo' | 'done') => void;
  toggling: boolean;
}

function TaskCard({ task, onToggle, toggling }: TaskCardProps) {
  const done = task.status === 'done';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        gap: '14px',
        alignItems: 'flex-start',
        padding: '16px 18px',
        background: done ? 'var(--color-surface-2)' : 'var(--color-surface)',
        border: `1px solid ${done ? 'transparent' : 'var(--color-line)'}`,
        borderRadius: '14px',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      {/* checkbox */}
      <button
        onClick={() => !toggling && onToggle(task.id, task.status)}
        disabled={toggling}
        aria-label={done ? '标记未完成' : '标记完成'}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: toggling ? 'not-allowed' : 'pointer',
          color: done ? 'var(--color-success)' : 'var(--color-line-2)',
          display: 'flex',
          alignItems: 'center',
          marginTop: '1px',
          flexShrink: 0,
          opacity: toggling ? 0.5 : 1,
          transition: 'opacity 0.1s',
        }}
      >
        {done ? <CheckCircle2 size={22} /> : <Circle size={22} />}
      </button>

      {/* body */}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: '14.5px',
            fontWeight: 600,
            color: done ? 'var(--color-ink-3)' : 'var(--color-ink)',
            letterSpacing: '-0.005em',
            textDecoration: done ? 'line-through' : 'none',
            lineHeight: 1.35,
          }}
        >
          {task.title}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '6px',
            flexWrap: 'wrap',
          }}
        >
          <TypeBadge type={task.task_type} />
          {task.reason && (
            <span
              style={{
                fontSize: '12px',
                color: 'var(--color-ink-3)',
                fontWeight: 500,
              }}
            >
              {task.reason}
            </span>
          )}
        </div>
      </div>

      {/* duration */}
      {task.duration_min != null && (
        <span
          style={{
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '12px',
            color: 'var(--color-ink-3)',
            fontWeight: 600,
            flexShrink: 0,
            marginTop: '2px',
          }}
        >
          {task.duration_min}m
        </span>
      )}
    </div>
  );
}

function ProgressRing({
  done,
  total,
}: {
  done: number;
  total: number;
}) {
  const R = 42;
  const C = 2 * Math.PI * R;
  const pct = total > 0 ? done / total : 0;

  return (
    <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0 }}>
      <svg
        width="100"
        height="100"
        viewBox="0 0 100 100"
        style={{ transform: 'rotate(-90deg)' }}
      >
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="6"
        />
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.35s ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <b
          style={{
            fontSize: '28px',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1,
            color: '#fff',
          }}
        >
          {done}/{total}
        </b>
        <span
          style={{
            fontSize: '10px',
            color: 'rgba(255,255,255,0.6)',
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginTop: '3px',
          }}
        >
          已完成
        </span>
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function TodayPage() {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<DailyTask[]>('/tasks/today');
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.get<DailyTask[]>('/tasks/today');
        setTasks(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateError(null);
    try {
      await api.post('/tasks/generate', {});
      window.dispatchEvent(new Event('coach:credit-refresh'));
      await fetchTasks();
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : '生成失败，可稍后重试');
    } finally {
      setGenerating(false);
    }
  };

  const handleToggle = async (id: string, current: 'todo' | 'done') => {
    const nextStatus = current === 'done' ? 'todo' : 'done';
    setTogglingId(id);
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: nextStatus } : t))
    );
    try {
      await api.patch<DailyTask>(`/tasks/${id}`, { status: nextStatus });
    } catch {
      // Revert on failure
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: current } : t))
      );
    } finally {
      setTogglingId(null);
    }
  };

  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const totalMin = tasks.reduce((s, t) => s + (t.duration_min ?? 0), 0);
  const remainMin = tasks
    .filter((t) => t.status === 'todo')
    .reduce((s, t) => s + (t.duration_min ?? 0), 0);

  const today = new Date();

  return (
    <div
      style={{
        maxWidth: '760px',
        margin: '0 auto',
        padding: '32px 24px 64px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* ── Hero header card ─────────────────────────────────────────── */}
      <div
        style={{
          background: 'var(--color-ink)',
          color: '#fff',
          borderRadius: '24px',
          padding: '28px 30px',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px',
        }}
      >
        {/* blue gradient glow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(700px 360px at 80% -10%, rgba(10,132,255,0.28), transparent 60%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 2, flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '6px',
            }}
          >
            <CalendarDays size={16} style={{ color: 'rgba(255,255,255,0.6)' }} />
            <span
              style={{
                fontSize: '13px',
                color: 'rgba(255,255,255,0.6)',
                fontWeight: 500,
              }}
            >
              {formatDate(today)}
            </span>
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: '26px',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              color: '#fff',
            }}
          >
            {getGreeting()}，今天
          </h1>
          {tasks.length > 0 && (
            <p
              style={{
                margin: '8px 0 0',
                fontSize: '13px',
                color: 'rgba(255,255,255,0.65)',
                fontWeight: 500,
              }}
            >
              已完成 {doneCount}/{tasks.length} 项
              {remainMin > 0 && ` · 剩余约 ${remainMin} 分钟`}
            </p>
          )}
        </div>

        {tasks.length > 0 && (
          <div style={{ position: 'relative', zIndex: 2 }}>
            <ProgressRing done={doneCount} total={tasks.length} />
          </div>
        )}
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2px',
        }}
      >
        <div>
          <span
            style={{
              fontSize: '17px',
              fontWeight: 700,
              color: 'var(--color-ink)',
              letterSpacing: '-0.015em',
            }}
          >
            今日任务
          </span>
          {tasks.length > 0 && (
            <span
              style={{
                marginLeft: '10px',
                fontSize: '12.5px',
                color: 'var(--color-ink-3)',
                fontWeight: 500,
              }}
            >
              {totalMin > 0 ? `共 ~${totalMin} 分钟` : ''}
            </span>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating || loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--color-ink)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-line)',
            borderRadius: '10px',
            cursor: generating || loading ? 'not-allowed' : 'pointer',
            opacity: generating || loading ? 0.6 : 1,
            transition: 'opacity 0.1s',
          }}
        >
          {generating ? (
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <RefreshCw size={14} />
          )}
          重新生成
        </button>
      </div>

      {/* ── Error banners ────────────────────────────────────────────── */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            background: '#fff5f5',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            fontSize: '13px',
            color: '#dc2626',
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}
      {generateError && (
        <div
          style={{
            padding: '12px 16px',
            background: '#fff5f5',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            fontSize: '13px',
            color: '#dc2626',
            fontWeight: 500,
          }}
        >
          {generateError}
        </div>
      )}

      {/* ── Loading skeleton ──────────────────────────────────────────── */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                height: '80px',
                borderRadius: '14px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-line)',
                opacity: 0.5 + i * 0.07,
              }}
            />
          ))}
        </div>
      )}

      {/* ── Task list ────────────────────────────────────────────────── */}
      {!loading && tasks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={handleToggle}
              toggling={togglingId === task.id}
            />
          ))}

          {/* All done celebration */}
          {doneCount === tasks.length && tasks.length > 0 && (
            <div
              style={{
                padding: '16px 20px',
                background: '#ecfdf3',
                border: '1px solid #a7f3d0',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '14px',
                color: '#065f46',
                fontWeight: 600,
                letterSpacing: '-0.003em',
              }}
            >
              <span style={{ fontSize: '20px' }}>🌿</span>
              <span>
                全部完成！今天做得很好。
                <span style={{ color: '#059669', fontWeight: 700 }}>
                  {' '}
                  去过别的生活吧。
                </span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────── */}
      {!loading && tasks.length === 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '64px 24px',
            gap: '16px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-ink-3)',
            }}
          >
            <CalendarDays size={28} />
          </div>
          <div>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: 'var(--color-ink)',
                letterSpacing: '-0.01em',
              }}
            >
              还没有今日任务
            </div>
            <div
              style={{
                marginTop: '6px',
                fontSize: '13px',
                color: 'var(--color-ink-3)',
                fontWeight: 500,
                maxWidth: '320px',
                lineHeight: 1.5,
              }}
            >
              点击下方按钮让 AI 根据你的求职进度生成个性化任务。
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#fff',
                background: 'var(--color-ink)',
                border: 'none',
                borderRadius: '12px',
                cursor: generating ? 'not-allowed' : 'pointer',
                opacity: generating ? 0.7 : 1,
                transition: 'opacity 0.1s',
              }}
            >
              {generating ? (
                <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Zap size={15} />
              )}
              生成今日任务
            </button>
            <span style={{ fontSize: '11px', color: 'var(--color-ink-4)', fontWeight: 500 }}>消耗 1 点</span>
          </div>
        </div>
      )}

      {/* spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
