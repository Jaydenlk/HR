'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { Resume } from '@/lib/types';
import { ResumeCard } from '@/components/resume/resume-card';
import { ResumeUploader } from '@/components/resume/resume-uploader';
import {
  useHandoffReception,
  HandoffConfirmDialog,
  ReturnToCoachBanner,
} from '@/components/chat/handoff-reception';
import { Plus, FileText } from 'lucide-react';
import { ResumeHandoffHint } from '@/components/onboarding/resume-handoff-hint';

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
            background: 'rgba(47,143,255,.05)',
            border: '1px solid var(--hair)',
            animation: 'pulse 1.5s ease-in-out infinite',
            opacity: 0.7,
          }}
        />
      ))}
    </div>
  );
}

export default function ResumesPage() {
  return (
    <Suspense fallback={null}>
      <ResumesPageInner />
    </Suspense>
  );
}

function ResumesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handoffId = searchParams.get('handoff');
  const { handoffState, handoffData, onAccept, onDismiss } = useHandoffReception(handoffId);
  // resume_rewrite handoff:accepted 后高亮提示用户选一份简历进行改写
  const [showHandoffHint, setShowHandoffHint] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const activeHandoffId = handoffId;
  const activeConvId = handoffData?.conversation_id ?? null;
  const handoffApplied = useRef(false);
  useEffect(() => {
    if (handoffState === 'accepted' && !handoffApplied.current) {
      handoffApplied.current = true;
      setTimeout(() => setShowHandoffHint(true), 0);
    }
  }, [handoffState]);

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
      {/* 首登导览收尾接力:高亮真实上传锚点 + 指向气泡(治 finish 撒手) */}
      <ResumeHandoffHint />
      {handoffState === 'confirming' && handoffData && (
        <HandoffConfirmDialog
          target={handoffData.target}
          payload={handoffData.payload}
          onAccept={() => void onAccept()}
          onDismiss={() => void onDismiss()}
        />
      )}
      {showReturn && activeHandoffId && activeConvId && (
        <ReturnToCoachBanner
          conversationId={activeConvId}
          handoffId={activeHandoffId}
          onClose={() => setShowReturn(false)}
        />
      )}
      {showHandoffHint && (
        <div style={{
          padding: '11px 24px',
          background: 'var(--color-brand-soft)',
          borderBottom: '1px solid var(--color-brand)',
          fontSize: '13.5px',
          color: 'var(--color-brand-ink)',
          fontWeight: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>Coach 建议:点击下方简历进行改写优化</span>
          <button
            onClick={() => setShowHandoffHint(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-brand-ink)', fontSize: '16px', fontWeight: 700, lineHeight: 1 }}
          >×</button>
        </div>
      )}

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
                fontFamily: 'var(--serif)',
                fontSize: '28px',
                fontWeight: 600,
                color: 'var(--color-ink)',
                letterSpacing: '-0.4px',
                marginBottom: '5px',
              }}
            >
              简历馆
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--color-ink-3)' }}>
              管理你的所有简历版本
            </p>
          </div>
          <button
            data-tour="resume-upload"
            onClick={() => setUploaderOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '10px 18px',
              borderRadius: 'var(--radius-default)',
              border: 'none',
              background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
              color: '#fff',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'opacity 0.12s, transform 0.12s',
              letterSpacing: '-0.01em',
              boxShadow: '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.92';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
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
            className="lg"
            style={{
              padding: '64px 32px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: 'var(--radius-default)',
                background: 'var(--color-brand-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <FileText size={26} color="var(--color-brand)" />
            </div>
            <p
              style={{
                fontFamily: 'var(--serif)',
                fontSize: '19px',
                fontWeight: 600,
                color: 'var(--color-ink)',
                marginBottom: '10px',
                letterSpacing: '-0.01em',
              }}
            >
              把简历传进来,看它说真话
            </p>
            <p
              style={{
                fontSize: '13.5px',
                color: 'var(--color-ink-3)',
                marginBottom: '24px',
                maxWidth: '360px',
                marginLeft: 'auto',
                marginRight: 'auto',
                lineHeight: 1.6,
              }}
            >
              传进来就能看到你的第一份诚实诊断 —— 按校招标准逐条体检,改了几版都能找回。
            </p>
            <button
              onClick={() => setUploaderOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '12px 24px',
                borderRadius: 'var(--radius-default)',
                border: 'none',
                background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-deep))',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 10px 30px -10px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
                transition: 'opacity 0.12s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.92'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              <Plus size={15} />
              上传简历
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
                onClick={() => {
                  // 完成回流:若本次源于 handoff,点选简历后弹提示再跳转
                  if (activeHandoffId && activeConvId && handoffState === 'accepted') {
                    setShowReturn(true);
                  }
                  router.push(`/resumes/${resume.id}`);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
