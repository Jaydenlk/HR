'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { DailyTask, Resume, Diagnosis, Conversation, DashboardData } from '@/lib/types';
import StarterChecklist from '@/components/onboarding/starter-checklist';
import DiscoverCards from '@/components/onboarding/discover-cards';
import { hasCompletedDiagnosis } from '@/components/onboarding/starter-items';
import { FunnelChart } from '@/components/overview/funnel-chart';
import { StatCard } from '@/components/overview/stat-card';
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
  Mic,
  Stethoscope,
  MessageSquare,
  ArrowRight,
  TrendingUp,
  LayoutDashboard,
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

// 类目色:用 --color-* 语义/品牌 token,暗/亮两套自动切换。背景由前景色 color-mix
// 派生出克制的同色调浅底(在暗底为低亮半透明、在亮底为淡彩),不写死 hex 浅底块。
const TASK_TYPE_META: Record<
  TaskTypeKey,
  { label: string; color: string; icon: React.ReactNode }
> = {
  practice: {
    label: '练习',
    color: 'var(--color-brand)',
    icon: <Zap size={11} />,
  },
  apply: {
    label: '投递',
    color: 'var(--color-success)',
    icon: <Briefcase size={11} />,
  },
  review: {
    label: '复盘',
    color: 'var(--color-warn)',
    icon: <Brain size={11} />,
  },
  learn: {
    label: '学习',
    color: 'var(--color-brand-hover)',
    icon: <BookOpen size={11} />,
  },
  resume: {
    label: '简历',
    color: 'var(--color-danger)',
    icon: <FileText size={11} />,
  },
};

function getTypeMeta(type: string) {
  return (
    TASK_TYPE_META[type as TaskTypeKey] ?? {
      label: type,
      color: 'var(--color-ink-3)',
      icon: <Clock size={11} />,
    }
  );
}

// ── 求职全局(原 /overview 并入)helpers ────────────────────────────────────────

// 面试评级日期短格式(仅月/日)。与上方 formatDate(接收 Date)区分:此处接收后端返回的日期字符串。
function formatGradeDate(d: string): string {
  return new Date(d).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

function gradeColor(grade: string): string {
  const g = grade.toUpperCase();
  if (g === 'A+' || g === 'S') return 'var(--color-success)';
  if (g.startsWith('A')) return 'var(--color-success)';
  if (g.startsWith('B')) return 'var(--color-warn)';
  if (g.startsWith('C')) return 'var(--color-danger)';
  return 'var(--color-danger)';
}

// 求职全局分区卡:标题 + 右上可选跳转链接 + 内容(原 /overview 页 SectionCard 原样并入)。
function SectionCard({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: { label: string; href: string };
}) {
  return (
    <div
      className="lg"
      style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: '16px' }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <h3
          style={{
            margin: 0,
            fontFamily: 'var(--serif)',
            fontSize: '16px',
            fontWeight: 700,
            letterSpacing: '-0.012em',
            color: 'var(--color-ink)',
          }}
        >
          {title}
        </h3>
        {action && (
          <Link
            href={action.href}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--color-brand)',
              textDecoration: 'none',
            }}
          >
            {action.label}
            <ArrowRight size={12} />
          </Link>
        )}
      </div>
      {children}
    </div>
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
        borderRadius: 'var(--radius-pill)',
        fontSize: '11px',
        fontWeight: 600,
        color: meta.color,
        background: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
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
        background: done ? 'transparent' : 'rgba(47,143,255,.05)',
        border: `1px solid ${done ? 'transparent' : 'var(--hair)'}`,
        borderRadius: 'var(--radius-default)',
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
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="6"
        />
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke="#fff"
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
            color: 'rgba(255,255,255,0.7)',
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

  // 启动清单进度:供 DiscoverCards 判断默认展开/折叠,与 StarterChecklist 共用同一批 GET。
  const [starterAllDone, setStarterAllDone] = useState(false);

  // 求职全局(原 /overview 并入):鸟瞰数据,失败/空则不渲染该分区(新用户由上方启动清单引导)。
  const [overview, setOverview] = useState<DashboardData | null>(null);

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

    // 启动清单进度(轻量并发 GET,失败静默):
    // - 方向步(direction)视为恒完成;只需核实其余三步。
    // - 全部完成 → DiscoverCards 默认折叠;否则默认展开,让新手看到能力。
    // - 与 StarterChecklist 共用端点但独立发请求,避免跨组件传状态链路过长。
    Promise.all([
      api.get<Resume[]>('/resumes').catch(() => [] as Resume[]),
      api.get<Diagnosis[]>('/diagnoses').catch(() => [] as Diagnosis[]),
      api.get<Conversation[]>('/conversations').catch(() => [] as Conversation[]),
    ]).then(([resumes, diagnoses, conversations]) => {
      const done =
        resumes.length > 0 &&
        hasCompletedDiagnosis(diagnoses) &&
        conversations.length > 0;
      setStarterAllDone(done);
    });

    // 求职全局数据(原 /overview 页数据源,端点保留):作页面下半区展示,失败静默不影响今日任务。
    api
      .get<DashboardData>('/overview')
      .then((d) => setOverview(d))
      .catch(() => {});
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

  // 求职全局是否全为空:全空则不渲染分区(避免与启动清单/发现区重复引导新用户)。
  const overviewEmpty =
    overview != null &&
    Object.values(overview.funnel).every((v) => v === 0) &&
    overview.interviews.total === 0 &&
    overview.resumes.total === 0 &&
    overview.activity.totalDiagnoses === 0 &&
    overview.activity.totalConversations === 0;

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
      {/* ── 校招启动清单(引导脊柱:常驻、真实进度、可收起,全部完成自动隐藏) ── */}
      <StarterChecklist />

      {/* ── Hero header card ─────────────────────────────────────────── */}
      {/* 品牌渐变玻璃 hero:不再用 var(--color-ink) 实底+白字(暗色下会撞色)。
          渐变在两套主题下都够深,白字始终可读;极光由外壳 atmos 透出。 */}
      <div
        style={{
          background:
            'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
          color: '#fff',
          borderRadius: 'var(--radius-xl)',
          padding: '28px 30px',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px',
          boxShadow:
            '0 18px 44px -20px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.28)',
        }}
      >
        {/* highlight glow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(700px 360px at 80% -10%, rgba(255,255,255,0.22), transparent 60%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 2, flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
            }}
          >
            <CalendarDays size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />
            <span
              style={{
                fontSize: '13px',
                color: 'rgba(255,255,255,0.7)',
                fontWeight: 500,
              }}
            >
              {formatDate(today)}
            </span>
          </div>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--serif)',
              fontSize: '28px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.12,
              color: '#fff',
            }}
          >
            {getGreeting()}，今天
          </h1>
          {tasks.length > 0 && (
            <p
              style={{
                margin: '10px 0 0',
                fontSize: '13px',
                color: 'rgba(255,255,255,0.78)',
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

      {/* ── 功能发现区(探索 Coach 能帮你做什么) ──────────────────── */}
      {/* 新手(清单未全完成)默认展开;老用户默认折叠为一行可展开。 */}
      <DiscoverCards starterAllDone={starterAllDone} />

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
              fontFamily: 'var(--serif)',
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--color-ink)',
              letterSpacing: '-0.01em',
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
          className="lg-sm"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--color-ink)',
            background: 'var(--glass-bg)',
            borderRadius: 'var(--radius-default)',
            cursor: generating || loading ? 'not-allowed' : 'pointer',
            opacity: generating || loading ? 0.6 : 1,
            transition: 'opacity 0.1s',
          }}
        >
          {generating ? (
            <Loader2 size={14} className="spin" />
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
            background: 'var(--color-danger-soft)',
            border: '1px solid var(--color-danger)',
            borderRadius: 'var(--radius-default)',
            fontSize: '13px',
            color: 'var(--color-danger)',
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
            background: 'var(--color-danger-soft)',
            border: '1px solid var(--color-danger)',
            borderRadius: 'var(--radius-default)',
            fontSize: '13px',
            color: 'var(--color-danger)',
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
                borderRadius: 'var(--radius-default)',
                background: 'rgba(47,143,255,.05)',
                border: '1px solid var(--hair)',
                opacity: 0.5 + i * 0.07,
              }}
            />
          ))}
        </div>
      )}

      {/* ── Task list ────────────────────────────────────────────────── */}
      {/* 单层玻璃面板包住列表(克制:不嵌套玻璃),内部行用 .tint 微染+发丝边,透出极光且可读。 */}
      {!loading && tasks.length > 0 && (
        <div
          className="lg"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            padding: '12px',
          }}
        >
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
                background: 'var(--color-success-soft)',
                border: '1px solid var(--color-success)',
                borderRadius: 'var(--radius-default)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '14px',
                color: 'var(--color-success)',
                fontWeight: 600,
                letterSpacing: '-0.003em',
              }}
            >
              <span style={{ fontSize: '20px' }}>🌿</span>
              <span style={{ color: 'var(--color-ink)' }}>
                全部完成！今天做得很好。
                <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>
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
          className="lg"
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
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-ink-3)',
              background: 'rgba(47,143,255,.05)',
              border: '1px solid var(--hair)',
            }}
          >
            <CalendarDays size={28} />
          </div>
          <div>
            <div
              style={{
                fontFamily: 'var(--serif)',
                fontSize: '17px',
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
                background:
                  'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
                border: 'none',
                borderRadius: 'var(--radius-default)',
                cursor: generating ? 'not-allowed' : 'pointer',
                opacity: generating ? 0.7 : 1,
                boxShadow:
                  '0 8px 22px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.35)',
                transition: 'opacity 0.1s',
              }}
            >
              {generating ? (
                <Loader2 size={15} className="spin" />
              ) : (
                <Zap size={15} />
              )}
              生成今日任务
            </button>
            <span style={{ fontSize: '11px', color: 'var(--color-ink-4)', fontWeight: 500 }}>消耗 1 点</span>
          </div>
        </div>
      )}

      {/* ── 求职全局(原 /overview 并入):求职鸟瞰,数据充足时展示于今日任务之下;
          全空时不渲染(新用户由上方启动清单/发现区引导,不重复空态 CTA)。 ── */}
      {overview && !overviewEmpty && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 2px' }}>
            <LayoutDashboard size={17} style={{ color: 'var(--color-ink-3)' }} />
            <span
              style={{
                fontFamily: 'var(--serif)',
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--color-ink)',
                letterSpacing: '-0.01em',
              }}
            >
              求职全局
            </span>
          </div>

          {/* Row 1: 求职漏斗 + 面试表现 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <SectionCard title="求职漏斗" action={{ label: '投递追踪', href: '/applications' }}>
              <FunnelChart funnel={overview.funnel} />
            </SectionCard>

            <SectionCard title="面试表现" action={{ label: '查看复盘', href: '/debrief' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <StatCard label="面试总场次" value={overview.interviews.total} icon={<Mic size={11} />} />
                <StatCard
                  label="平均评级"
                  value={overview.interviews.avgGrade ?? '—'}
                  icon={<TrendingUp size={11} />}
                />
              </div>

              {overview.interviews.recentGrades.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--color-ink-3)',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    最近面试
                  </div>
                  {overview.interviews.recentGrades.slice(0, 4).map((g, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: 'rgba(47,143,255,.05)',
                        border: '1px solid var(--hair)',
                        borderRadius: '10px',
                        fontSize: '13px',
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>{g.company}</span>
                        <span style={{ marginLeft: '8px', fontSize: '11.5px', color: 'var(--color-ink-3)' }}>
                          {formatGradeDate(g.date)}
                        </span>
                      </div>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: '13px',
                          fontWeight: 800,
                          color: gradeColor(g.grade),
                        }}
                      >
                        {g.grade}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          {/* Row 2: 简历状态 + 使用记录 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <SectionCard title="简历状态" action={{ label: '简历馆', href: '/resumes' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <StatCard label="简历数量" value={overview.resumes.total} icon={<FileText size={11} />} />
                <StatCard
                  label="最新诊断分"
                  value={
                    overview.resumes.latestDiagnosisScore != null
                      ? `${overview.resumes.latestDiagnosisScore}分`
                      : '暂无'
                  }
                  icon={<Stethoscope size={11} />}
                />
              </div>
              {overview.resumes.primaryTitle && (
                <div
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(47,143,255,.05)',
                    border: '1px solid var(--hair)',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--color-ink-2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <FileText size={13} style={{ color: 'var(--color-ink-3)', flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    主简历：{overview.resumes.primaryTitle}
                  </span>
                </div>
              )}
            </SectionCard>

            <SectionCard title="使用记录">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <StatCard
                  label="诊断次数"
                  value={overview.activity.totalDiagnoses}
                  icon={<Stethoscope size={11} />}
                />
                <StatCard
                  label="对话次数"
                  value={overview.activity.totalConversations}
                  icon={<MessageSquare size={11} />}
                />
              </div>
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  );
}
