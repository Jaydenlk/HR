'use client';

import type { Application } from '@/lib/types';
import { STAGE_META } from '@/lib/tracker-stages';
import { KanbanColumn } from './kanban-column';

interface KanbanBoardProps {
  applications: Application[];
  onStageChange: (id: string, stage: string) => void;
  onAdd: (stage: string) => void;
}

export function KanbanBoard({ applications, onStageChange, onAdd }: KanbanBoardProps) {
  const byStage = STAGE_META.reduce<Record<string, Application[]>>((acc, s) => {
    acc[s.id] = applications.filter((a) => a.stage === s.id);
    return acc;
  }, {});

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: '12px',
        overflow: 'hidden',
        flex: 1,
        minHeight: 0,
      }}
    >
      {STAGE_META.map((stage) => (
        <KanbanColumn
          key={stage.id}
          stage={stage.id}
          label={stage.label}
          dotColor={stage.color}
          applications={byStage[stage.id] ?? []}
          onStageChange={onStageChange}
          onAdd={() => onAdd(stage.id)}
        />
      ))}
    </div>
  );
}
