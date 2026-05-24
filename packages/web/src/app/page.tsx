'use client';

// Root home page — wrapped by (main)/layout.tsx shell via route group.
// This file is kept for static export compatibility.
// Route: /
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Diagnosis, User } from '@/lib/types';
import { FileText, Plus, ArrowRight } from 'lucide-react';

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? 'var(--color-success)'
      : score >= 60
        ? 'var(--color-warn)'
        : 'var(--color-danger)';
  const bg =
    score >= 80
      ? 'var(--color-success-soft)'
      : score >= 60
        ? 'var(--color-warn-soft)'
        : 'var(--color-danger-soft)';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 700,
        color,
        background: bg,
      }}
    >
      {score}分
    </span>
  );
}

function DiagnosisCard({ d }: { d: Diagnosis }) {
  const date = new Date(d.created_at).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  });
  return (
    <a
      href={`/diagnoses/${d.id}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 16px',
        background: 'var(--color-surface)',
        borderRadius: '12px',
        border: '1px solid var(--color-line)',
        textDecoration: 'none',
        transition: 'box-shadow 0.12s',
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          background: 'var(--color-brand-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <FileText size={18} color="var(--color-brand)" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '13.5px',
            fontWeight: 600,
            color: 'var(--color-ink)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {d.jd_role ?? '职位诊断'}
          {d.jd_company ? ` · ${d.jd_company}` : ''}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--color-ink-4)', marginTop: '2px' }}>
          {date}
        </div>
      </div>
      <ScoreBadge score={d.score} />
      <ArrowRight size={15} color="var(--color-ink-4)" />
    </a>
  );
}

function QuickCard({
  label,
  desc,
  href,
  icon,
}: {
  label: string;
  desc: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '20px',
        background: 'var(--color-surface)',
        borderRadius: '14px',
        border: '1px solid var(--color-line)',
        textDecoration: 'none',
        flex: 1,
        minWidth: 0,
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: 'var(--color-surface-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)' }}>
          {label}
        </div>
        <div style={{ fontSize: '12.5px', color: 'var(--color-ink-3)', marginTop: '3px' }}>
          {desc}
        </div>
      </div>
    </a>
  );
}

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [loadingDiag, setLoadingDiag] = useState(true);
  const [errorDiag, setErrorDiag] = useState(false);

  useEffect(() => {
    api
      .get<User>('/auth/me')
      .then(setUser)
      .catch(() => {});

    api
      .get<Diagnosis[]>('/diagnoses')
      .then((data) => {
        setDiagnoses(data);
        setLoadingDiag(false);
      })
      .catch(() => {
        setErrorDiag(true);
        setLoadingDiag(false);
      });
  }, []);

  const recentDiagnoses = diagnoses.slice(0, 5);

  return (
    <div
      style={{
        maxWidth: '760px',
        margin: '0 auto',
        padding: '48px 24px',
      }}
    >
      {/* Greeting */}
      <h1
        style={{
          fontSize: '26px',
          fontWeight: 700,
          color: 'var(--color-ink)',
          letterSpacing: '-0.4px',
          marginBottom: '6px',
        }}
      >
        {user ? `欢迎回来，${user.name}` : '欢迎回来'}
      </h1>
      <p style={{ fontSize: '14px', color: 'var(--color-ink-3)', marginBottom: '36px' }}>
        今天想做什么？
      </p>

      {/* Quick actions */}
      <section style={{ marginBottom: '40px' }}>
        <h2
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--color-ink-4)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}
        >
          快速入口
        </h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <QuickCard
            label="上传简历"
            desc="解析 PDF / Word，建立简历档案"
            href="/resumes"
            icon={<FileText size={20} color="var(--color-ink-2)" />}
          />
          <QuickCard
            label="新建诊断"
            desc="粘贴 JD，获取匹配分析"
            href="/diagnoses/new"
            icon={<Plus size={20} color="var(--color-ink-2)" />}
          />
        </div>
      </section>

      {/* Recent diagnoses */}
      <section>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}
        >
          <h2
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--color-ink-4)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            最近诊断
          </h2>
          {diagnoses.length > 0 && (
            <a
              href="/diagnoses"
              style={{
                fontSize: '13px',
                color: 'var(--color-brand)',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              查看全部
            </a>
          )}
        </div>

        {loadingDiag ? (
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              color: 'var(--color-ink-4)',
              fontSize: '14px',
            }}
          >
            加载中…
          </div>
        ) : errorDiag ? (
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              color: 'var(--color-danger)',
              fontSize: '14px',
              background: 'var(--color-danger-soft)',
              borderRadius: '12px',
            }}
          >
            加载失败，请刷新重试
          </div>
        ) : recentDiagnoses.length === 0 ? (
          <div
            style={{
              padding: '40px 24px',
              textAlign: 'center',
              background: 'var(--color-surface)',
              borderRadius: '14px',
              border: '1px dashed var(--color-line-2)',
            }}
          >
            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
              <FileText size={36} color="var(--color-ink-4)" />
            </div>
            <p
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--color-ink-2)',
                marginBottom: '6px',
              }}
            >
              还没有诊断记录
            </p>
            <p
              style={{ fontSize: '13px', color: 'var(--color-ink-4)', marginBottom: '20px' }}
            >
              上传简历开始第一次诊断
            </p>
            <a
              href="/resumes"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 18px',
                background: 'var(--color-brand)',
                color: '#fff',
                borderRadius: '8px',
                fontSize: '13.5px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              上传简历
              <ArrowRight size={14} />
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentDiagnoses.map((d) => (
              <DiagnosisCard key={d.id} d={d} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
