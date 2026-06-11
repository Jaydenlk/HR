'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { DashboardData } from '@/lib/types';
import { FunnelChart } from '@/components/overview/funnel-chart';
import { StatCard } from '@/components/overview/stat-card';
import {
  LayoutDashboard,
  Mic,
  FileText,
  Stethoscope,
  MessageSquare,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
  });
}

function gradeColor(grade: string): string {
  const g = grade.toUpperCase();
  if (g === 'A+' || g === 'S') return 'var(--color-success)';
  if (g.startsWith('A')) return 'var(--color-success)';
  if (g.startsWith('B')) return 'var(--color-warn)';
  if (g.startsWith('C')) return 'var(--color-danger)';
  return 'var(--color-danger)';
}

// ── section cards ─────────────────────────────────────────────────────────────

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
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-line)',
        borderRadius: '22px',
        padding: '22px 26px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}
      >
        <h3
          style={{
            margin: 0,
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

// ── loading skeleton ──────────────────────────────────────────────────────────

function Skeleton({ h = 120 }: { h?: number }) {
  return (
    <div
      style={{
        height: `${h}px`,
        borderRadius: '22px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-line)',
        opacity: 0.6,
      }}
    />
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<DashboardData>('/overview')
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '加载失败');
        setLoading(false);
      });
  }, []);

  // Determine if all zeros
  const isEmpty =
    data &&
    Object.values(data.funnel).every((v) => v === 0) &&
    data.interviews.total === 0 &&
    data.resumes.total === 0 &&
    data.activity.totalDiagnoses === 0 &&
    data.activity.totalConversations === 0;

  return (
    <div
      style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '32px 24px 64px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      {/* ── Page header ──────────────────────────────────────────────── */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '4px',
          }}
        >
          <LayoutDashboard size={18} style={{ color: 'var(--color-ink-3)' }} />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--color-ink-3)',
            }}
          >
            求职总览
          </span>
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: '28px',
            fontWeight: 800,
            letterSpacing: '-0.025em',
            color: 'var(--color-ink)',
          }}
        >
          你的求职全局
        </h1>
        <p
          style={{
            margin: '6px 0 0',
            fontSize: '13.5px',
            color: 'var(--color-ink-3)',
            fontWeight: 500,
          }}
        >
          整个求职过程的鸟瞰视角 · 定期来看一看
        </p>
      </div>

      {/* ── Error ─────────────────────────────────────────────────────── */}
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

      {/* ── Loading ───────────────────────────────────────────────────── */}
      {loading && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '14px',
            }}
          >
            <Skeleton h={180} />
            <Skeleton h={180} />
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '14px',
            }}
          >
            <Skeleton h={140} />
            <Skeleton h={140} />
          </div>
        </>
      )}

      {/* ── Empty state ───────────────────────────────────────────────── */}
      {!loading && !error && isEmpty && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '64px 24px',
            gap: '20px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '22px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-ink-3)',
            }}
          >
            <TrendingUp size={32} />
          </div>
          <div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--color-ink)',
                letterSpacing: '-0.01em',
              }}
            >
              开始你的求职之旅
            </div>
            <div
              style={{
                marginTop: '8px',
                fontSize: '13.5px',
                color: 'var(--color-ink-3)',
                fontWeight: 500,
                lineHeight: 1.6,
              }}
            >
              上传简历、开始投递，你的数据会在这里汇总
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link
              href="/resumes"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '10px 18px',
                fontSize: '13.5px',
                fontWeight: 600,
                color: '#fff',
                background: 'var(--color-ink)',
                borderRadius: '12px',
                textDecoration: 'none',
              }}
            >
              <FileText size={15} />
              上传简历
            </Link>
            <Link
              href="/applications"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '10px 18px',
                fontSize: '13.5px',
                fontWeight: 600,
                color: 'var(--color-ink)',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-line)',
                borderRadius: '12px',
                textDecoration: 'none',
              }}
            >
              <ArrowRight size={15} />
              开始投递
            </Link>
          </div>
        </div>
      )}

      {/* ── Dashboard content ─────────────────────────────────────────── */}
      {!loading && !error && data && !isEmpty && (
        <>
          {/* Row 1: Funnel + Interview stats */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '14px',
            }}
          >
            {/* Funnel */}
            <SectionCard
              title="求职漏斗"
              action={{ label: '投递追踪', href: '/applications' }}
            >
              <FunnelChart funnel={data.funnel} />
            </SectionCard>

            {/* Interview stats */}
            <SectionCard
              title="面试表现"
              action={{ label: '查看复盘', href: '/debrief' }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                }}
              >
                <StatCard
                  label="面试总场次"
                  value={data.interviews.total}
                  icon={<Mic size={11} />}
                />
                <StatCard
                  label="平均评级"
                  value={data.interviews.avgGrade ?? '—'}
                  icon={<TrendingUp size={11} />}
                />
              </div>

              {/* Recent grades */}
              {data.interviews.recentGrades.length > 0 && (
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
                  {data.interviews.recentGrades.slice(0, 4).map((g, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: 'var(--color-surface-2)',
                        borderRadius: '10px',
                        fontSize: '13px',
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontWeight: 600,
                            color: 'var(--color-ink)',
                          }}
                        >
                          {g.company}
                        </span>
                        <span
                          style={{
                            marginLeft: '8px',
                            fontSize: '11.5px',
                            color: 'var(--color-ink-3)',
                          }}
                        >
                          {formatDate(g.date)}
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

          {/* Row 2: Resume stats + Activity */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '14px',
            }}
          >
            {/* Resume stats */}
            <SectionCard
              title="简历状态"
              action={{ label: '简历馆', href: '/resumes' }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                }}
              >
                <StatCard
                  label="简历数量"
                  value={data.resumes.total}
                  icon={<FileText size={11} />}
                />
                <StatCard
                  label="最新诊断分"
                  value={
                    data.resumes.latestDiagnosisScore != null
                      ? `${data.resumes.latestDiagnosisScore}分`
                      : '暂无'
                  }
                  icon={<Stethoscope size={11} />}
                />
              </div>
              {data.resumes.primaryTitle && (
                <div
                  style={{
                    padding: '10px 14px',
                    background: 'var(--color-surface-2)',
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
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    主简历：{data.resumes.primaryTitle}
                  </span>
                </div>
              )}
            </SectionCard>

            {/* Activity */}
            <SectionCard title="使用记录">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                }}
              >
                <StatCard
                  label="诊断次数"
                  value={data.activity.totalDiagnoses}
                  icon={<Stethoscope size={11} />}
                />
                <StatCard
                  label="对话次数"
                  value={data.activity.totalConversations}
                  icon={<MessageSquare size={11} />}
                />
              </div>
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}
