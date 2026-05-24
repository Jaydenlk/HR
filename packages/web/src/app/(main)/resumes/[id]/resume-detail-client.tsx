'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Resume, Diagnosis } from '@/lib/types';
import { ResumePreview } from '@/components/resume/resume-preview';
import { VersionList } from '@/components/resume/version-list';
import {
  ArrowLeft,
  Star,
  Trash2,
  FileText,
  AlignLeft,
  History,
  Stethoscope,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { getScoreColor } from '@/lib/score-utils';

type TabKey = 'preview' | 'raw' | 'versions' | 'diagnoses';

function ScoreBadge({ score }: { score: number }) {
  const { color, bg } = getScoreColor(score);
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

function LoadingState() {
  return (
    <div
      style={{
        maxWidth: '820px',
        margin: '0 auto',
        padding: '48px 32px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {[120, 60, 300, 200].map((h, i) => (
          <div
            key={i}
            style={{
              height: `${h}px`,
              borderRadius: '12px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-line)',
              opacity: 0.7,
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function ResumeDetailClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('preview');
  const [settingPrimary, setSettingPrimary] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api
      .get<Resume>(`/resumes/${id}`)
      .then((data) => {
        setResume(data);
        setLoading(false);
        if (!data.parsed_json) setActiveTab('raw');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '加载失败');
        setLoading(false);
      });
  }, [id]);

  async function handleSetPrimary() {
    if (!resume || resume.is_primary) return;
    setSettingPrimary(true);
    try {
      const updated = await api.patch<Resume>(`/resumes/${id}`, { is_primary: true });
      setResume(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setSettingPrimary(false);
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    setDeleting(true);
    try {
      await api.delete(`/resumes/${id}`);
      router.push('/resumes');
    } catch (err) {
      console.error(err);
      setDeleting(false);
      setDeleteConfirm(false);
    }
  }

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'preview', label: '解析预览', icon: <FileText size={13} /> },
    { key: 'raw', label: '原始文本', icon: <AlignLeft size={13} /> },
    { key: 'versions', label: '版本历史', icon: <History size={13} /> },
    { key: 'diagnoses', label: '诊断记录', icon: <Stethoscope size={13} /> },
  ];

  if (loading) {
    return (
      <>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.7; }
            50% { opacity: 0.4; }
          }
        `}</style>
        <LoadingState />
      </>
    );
  }

  if (error || !resume) {
    return (
      <div
        style={{
          maxWidth: '820px',
          margin: '0 auto',
          padding: '48px 32px',
        }}
      >
        <Link
          href="/resumes"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--color-ink-3)',
            fontSize: '13.5px',
            fontWeight: 500,
            textDecoration: 'none',
            marginBottom: '24px',
          }}
        >
          <ArrowLeft size={15} />
          返回简历库
        </Link>
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            background: 'var(--color-danger-soft)',
            borderRadius: '14px',
            color: 'var(--color-danger)',
            fontSize: '14px',
          }}
        >
          {error ?? '简历不存在'}
        </div>
      </div>
    );
  }

  const date = new Date(resume.created_at).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const versions = resume.versions ?? [];
  const diagnoses = resume.diagnoses ?? [];

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 0.4; }
        }
      `}</style>

      <div
        style={{
          maxWidth: '820px',
          margin: '0 auto',
          padding: '48px 32px',
        }}
      >
        {/* Back link */}
        <Link
          href="/resumes"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--color-ink-3)',
            fontSize: '13.5px',
            fontWeight: 500,
            textDecoration: 'none',
            marginBottom: '24px',
            transition: 'color 0.1s',
          }}
        >
          <ArrowLeft size={15} />
          简历库
        </Link>

        {/* Resume header card */}
        <div
          style={{
            background: 'var(--color-surface)',
            borderRadius: '16px',
            border: '1px solid var(--color-line)',
            padding: '24px 28px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
            {/* Left: title + meta */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <h1
                  style={{
                    fontSize: '22px',
                    fontWeight: 700,
                    color: 'var(--color-ink)',
                    letterSpacing: '-0.4px',
                    margin: 0,
                  }}
                >
                  {resume.title}
                </h1>
                {resume.is_primary && (
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '6px',
                      background: 'var(--color-brand-soft)',
                      color: 'var(--color-brand-ink)',
                      flexShrink: 0,
                    }}
                  >
                    主版本
                  </span>
                )}
                {resume.file_type && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: '5px',
                      background: 'var(--color-surface-3)',
                      color: 'var(--color-ink-3)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      flexShrink: 0,
                    }}
                  >
                    {resume.file_type}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-ink-4)' }}>
                创建于 {date}
                {versions.length > 0 && (
                  <span style={{ marginLeft: '12px' }}>
                    · {versions.length} 个历史版本
                  </span>
                )}
              </div>
            </div>

            {/* Right: actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              {!resume.is_primary && (
                <button
                  onClick={handleSetPrimary}
                  disabled={settingPrimary}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '9px',
                    border: '1.5px solid var(--color-line)',
                    background: 'transparent',
                    color: 'var(--color-ink-2)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: settingPrimary ? 'not-allowed' : 'pointer',
                    transition: 'all 0.12s',
                    opacity: settingPrimary ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!settingPrimary) {
                      e.currentTarget.style.borderColor = 'var(--color-brand)';
                      e.currentTarget.style.color = 'var(--color-brand)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-line)';
                    e.currentTarget.style.color = 'var(--color-ink-2)';
                  }}
                >
                  <Star size={14} />
                  {settingPrimary ? '设置中…' : '设为主版本'}
                </button>
              )}

              {/* Delete button */}
              {deleteConfirm ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12.5px', color: 'var(--color-ink-3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle size={13} color="var(--color-warn)" />
                    确认删除？
                  </span>
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '7px',
                      border: '1.5px solid var(--color-line)',
                      background: 'transparent',
                      color: 'var(--color-ink-3)',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '7px',
                      border: 'none',
                      background: 'var(--color-danger)',
                      color: '#fff',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: deleting ? 'not-allowed' : 'pointer',
                      opacity: deleting ? 0.6 : 1,
                    }}
                  >
                    {deleting ? '删除中…' : '确认删除'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '9px',
                    border: '1.5px solid var(--color-line)',
                    background: 'transparent',
                    color: 'var(--color-ink-3)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.12s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-danger)';
                    e.currentTarget.style.color = 'var(--color-danger)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-line)';
                    e.currentTarget.style.color = 'var(--color-ink-3)';
                  }}
                >
                  <Trash2 size={14} />
                  删除
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '2px',
            background: 'var(--color-surface-2)',
            borderRadius: '12px',
            padding: '4px',
            marginBottom: '20px',
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const isDisabled = tab.key === 'preview' && !resume.parsed_json;
            return (
              <button
                key={tab.key}
                onClick={() => !isDisabled && setActiveTab(tab.key)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '9px',
                  border: 'none',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  background: isActive ? 'var(--color-surface)' : 'transparent',
                  color: isActive
                    ? 'var(--color-ink)'
                    : isDisabled
                      ? 'var(--color-ink-4)'
                      : 'var(--color-ink-3)',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.12s',
                  opacity: isDisabled ? 0.5 : 1,
                }}
              >
                {tab.icon}
                {tab.label}
                {tab.key === 'versions' && versions.length > 0 && (
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      background: 'var(--color-surface-3)',
                      color: 'var(--color-ink-3)',
                      padding: '1px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    {versions.length}
                  </span>
                )}
                {tab.key === 'diagnoses' && diagnoses.length > 0 && (
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      background: 'var(--color-surface-3)',
                      color: 'var(--color-ink-3)',
                      padding: '1px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    {diagnoses.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div
          style={{
            background: 'var(--color-surface)',
            borderRadius: '14px',
            border: '1px solid var(--color-line)',
            padding: '28px',
          }}
        >
          {/* Parsed preview */}
          {activeTab === 'preview' && resume.parsed_json && (
            <ResumePreview parsed={resume.parsed_json} />
          )}

          {/* Raw text */}
          {activeTab === 'raw' && (
            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-ink-4)', fontWeight: 500, marginBottom: '12px' }}>
                {resume.raw_text.length.toLocaleString()} 个字符
              </div>
              <pre
                style={{
                  fontSize: '13px',
                  lineHeight: 1.75,
                  color: 'var(--color-ink-2)',
                  background: 'var(--color-surface-2)',
                  borderRadius: '10px',
                  padding: '20px',
                  border: '1px solid var(--color-line)',
                  overflowY: 'auto',
                  maxHeight: '560px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'var(--font-mono)',
                  margin: 0,
                }}
              >
                {resume.raw_text}
              </pre>
            </div>
          )}

          {/* Version history */}
          {activeTab === 'versions' && (
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '16px' }}>
                版本历史
              </div>
              <VersionList versions={versions} />
            </div>
          )}

          {/* Diagnosis history */}
          {activeTab === 'diagnoses' && (
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '16px' }}>
                诊断记录
              </div>
              {diagnoses.length === 0 ? (
                <div
                  style={{
                    padding: '32px 24px',
                    textAlign: 'center',
                    background: 'var(--color-surface-2)',
                    borderRadius: '10px',
                    border: '1px dashed var(--color-line-2)',
                  }}
                >
                  <Stethoscope size={28} color="var(--color-ink-4)" style={{ margin: '0 auto 12px' }} />
                  <p style={{ fontSize: '13.5px', color: 'var(--color-ink-3)', marginBottom: '12px' }}>
                    还没有诊断记录
                  </p>
                  <Link
                    href="/diagnoses/new"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      background: 'var(--color-brand)',
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    新建诊断
                    <ArrowRight size={13} />
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {diagnoses.map((d: Diagnosis) => {
                    const dDate = new Date(d.created_at).toLocaleDateString('zh-CN', {
                      month: 'short',
                      day: 'numeric',
                    });
                    return (
                      <a
                        key={d.id}
                        href={`/diagnoses/${d.id}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '14px 16px',
                          background: 'var(--color-surface-2)',
                          borderRadius: '10px',
                          border: '1px solid var(--color-line)',
                          textDecoration: 'none',
                          transition: 'box-shadow 0.12s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
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
                            {d.jd_role ?? '职位诊断'}{d.jd_company ? ` · ${d.jd_company}` : ''}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--color-ink-4)', marginTop: '2px' }}>
                            {dDate}
                          </div>
                        </div>
                        <ScoreBadge score={d.score} />
                        <ArrowRight size={14} color="var(--color-ink-4)" />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
