'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Resume } from '@/lib/types';
import { ResumeCard } from '@/components/resume/resume-card';
import { ResumeUploader } from '@/components/resume/resume-uploader';
import { Plus, FileText } from 'lucide-react';

function LoadingSkeleton() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '14px',
      }}
    >
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            height: '140px',
            borderRadius: '14px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-line)',
            animation: 'pulse 1.5s ease-in-out infinite',
            opacity: 0.7,
          }}
        />
      ))}
    </div>
  );
}

export default function ResumesPage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploaderOpen, setUploaderOpen] = useState(false);

  useEffect(() => {
    api
      .get<Resume[]>('/resumes')
      .then((data) => {
        setResumes(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '加载失败');
        setLoading(false);
      });
  }, []);

  function handleUploadSuccess(resume: Resume) {
    // 保持与后端排序一致:主版本优先,其余按更新时间倒序
    setResumes((prev) => {
      const updated = [resume, ...prev];
      return updated.sort((a, b) => {
        if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
    });
    setUploaderOpen(false);
  }

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 0.4; }
        }
      `}</style>

      <ResumeUploader
        open={uploaderOpen}
        onClose={() => setUploaderOpen(false)}
        onSuccess={handleUploadSuccess}
      />

      <div
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: '48px 32px',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '32px',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: 'var(--color-ink)',
                letterSpacing: '-0.4px',
                marginBottom: '4px',
              }}
            >
              简历馆
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--color-ink-3)' }}>
              管理你的所有简历版本
            </p>
          </div>
          <button
            onClick={() => setUploaderOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '10px 18px',
              borderRadius: '10px',
              border: 'none',
              background: 'var(--color-brand)',
              color: '#fff',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.12s',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-brand-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--color-brand)';
            }}
          >
            <Plus size={16} />
            新建简历
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div
            style={{
              padding: '40px 24px',
              textAlign: 'center',
              background: 'var(--color-danger-soft)',
              borderRadius: '14px',
              color: 'var(--color-danger)',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            {error}
            <div style={{ marginTop: '12px' }}>
              <button
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  api
                    .get<Resume[]>('/resumes')
                    .then((data) => {
                      setResumes(data);
                      setLoading(false);
                    })
                    .catch((err) => {
                      setError(err instanceof Error ? err.message : '加载失败');
                      setLoading(false);
                    });
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--color-danger)',
                  background: 'transparent',
                  color: 'var(--color-danger)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                重新加载
              </button>
            </div>
          </div>
        ) : resumes.length === 0 ? (
          /* Empty state */
          <div
            style={{
              padding: '64px 32px',
              textAlign: 'center',
              background: 'var(--color-surface)',
              borderRadius: '16px',
              border: '1.5px dashed var(--color-line-2)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: 'var(--color-surface-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <FileText size={26} color="var(--color-ink-4)" />
            </div>
            <p
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--color-ink-2)',
                marginBottom: '8px',
                letterSpacing: '-0.01em',
              }}
            >
              还没有简历
            </p>
            <p
              style={{
                fontSize: '13.5px',
                color: 'var(--color-ink-4)',
                marginBottom: '24px',
              }}
            >
              上传你的第一份简历，开始 AI 诊断之旅
            </p>
            <button
              onClick={() => setUploaderOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '10px 22px',
                borderRadius: '10px',
                border: 'none',
                background: 'var(--color-brand)',
                color: '#fff',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Plus size={15} />
              上传第一份简历
            </button>
          </div>
        ) : (
          /* Resume grid */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '14px',
            }}
          >
            {resumes.map((resume) => (
              <ResumeCard
                key={resume.id}
                resume={resume}
                onClick={() => router.push(`/resumes/${resume.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
