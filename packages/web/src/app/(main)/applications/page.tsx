'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Application } from '@/lib/types';
import { TrackerStats } from '@/components/tracker/tracker-stats';
import { KanbanBoard } from '@/components/tracker/kanban-board';
import { ApplicationForm } from '@/components/tracker/application-form';
import { Plus, Briefcase } from 'lucide-react';

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [defaultStage, setDefaultStage] = useState<string>('wishlist');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [apps, statsData] = await Promise.all([
        api.get<Application[]>('/applications'),
        api.get<Record<string, number>>('/applications/stats'),
      ]);
      setApplications(apps);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [apps, statsData] = await Promise.all([
          api.get<Application[]>('/applications'),
          api.get<Record<string, number>>('/applications/stats'),
        ]);
        setApplications(apps);
        setStats(statsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleCreate(data: Record<string, string>) {
    try {
      await api.post('/applications', data);
      setFormOpen(false);
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : '创建失败');
    }
  }

  async function handleStageChange(id: string, stage: string) {
    try {
      await api.patch(`/applications/${id}`, { stage });
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : '更新失败');
    }
  }

  function handleAddFromColumn(stage: string) {
    setDefaultStage(stage);
    setFormOpen(true);
  }

  function handleAddNew() {
    setDefaultStage('wishlist');
    setFormOpen(true);
  }

  return (
    <>
      {formOpen && (
        <ApplicationForm
          defaultStage={defaultStage}
          onSubmit={handleCreate}
          onCancel={() => setFormOpen(false)}
        />
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          padding: '40px 32px 24px',
          gap: '0',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
            flexShrink: 0,
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
              投递追踪
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--color-ink-3)' }}>
              管理你的所有求职投递
            </p>
          </div>
          <button
            onClick={handleAddNew}
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
            新增公司
          </button>
        </div>

        {/* Stats */}
        <div style={{ flexShrink: 0 }}>
          <TrackerStats stats={stats} />
        </div>

        {/* Content */}
        {loading ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-ink-3)',
              fontSize: '14px',
            }}
          >
            加载中…
          </div>
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
                onClick={fetchData}
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
        ) : applications.length === 0 ? (
          /* Empty state */
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
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
              <Briefcase size={26} color="var(--color-ink-4)" />
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
              还没有投递记录
            </p>
            <p
              style={{
                fontSize: '13.5px',
                color: 'var(--color-ink-4)',
                marginBottom: '24px',
              }}
            >
              添加你的第一家目标公司
            </p>
            <button
              onClick={handleAddNew}
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
              新增公司
            </button>
          </div>
        ) : (
          /* Kanban board */
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <KanbanBoard
              applications={applications}
              onStageChange={handleStageChange}
              onAdd={handleAddFromColumn}
            />
          </div>
        )}
      </div>
    </>
  );
}
