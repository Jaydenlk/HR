'use client';

import type { Application } from '@/lib/types';
import { KanbanColumn } from './kanban-column';

interface KanbanBoardProps {
  applications: Application[];
  onStageChange: (id: string, stage: string) => void;
  onAdd: (stage: string) => void;
}

const STAGES = [
  { id: 'wishlist',  label: '想投',   dotColor: 'var(--color-ink-4)' },
  { id: 'applied',   label: '已投递', dotColor: 'var(--color-brand)' },
  { id: 'interview', label: '面试中', dotColor: 'var(--color-warn)' },
  { id: 'final',     label: '终面',   dotColor: '#a855f7' },
  { id: 'offer',     label: 'Offer',  dotColor: 'var(--color-success)' },
];

export function KanbanBoard({ applications, onStageChange, onAdd }: KanbanBoardProps) {
  const byStage = STAGES.reduce<Record<string, Application[]>>((acc, s) => {
    acc[s.id] = applications.filter((a) => a.stage === s.id);
    return acc;
  }, {});

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '12px',
        overflow: 'hidden',
        flex: 1,
        minHeight: 0,
      }}
    >
      {STAGES.map((stage) => (
        <KanbanColumn
          key={stage.id}
          stage={stage.id}
          label={stage.label}
          dotColor={stage.dotColor}
          applications={byStage[stage.id] ?? []}
          onStageChange={onStageChange}
          onAdd={() => onAdd(stage.id)}
        />
      ))}
    </div>
  );
}
