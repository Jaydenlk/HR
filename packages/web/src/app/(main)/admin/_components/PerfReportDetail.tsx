'use client';

/**
 * PerfReportDetail — 性能测试报告·详情(风琴包,第二层,只读)
 *
 * 面包屑(返回报告库) + 报告头(衬线大标题 + 状态 pill + 定位定义 + meta 行) +
 * 全局「全部展开 / 全部折叠」操作条 + 7 个风琴分区。
 * 默认只展开 defaultOpen 的分区(仅①结论速览),允许多开(非互斥)。
 */

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { smallBtn } from './_shared';
import { PerfAccordionSection } from './PerfAccordionSection';
import type { PerfReport } from './perfTypes';

function MetaBadge({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <span
      style={{
        fontSize: '11.5px',
        fontWeight: 600,
        color: 'var(--color-ink-2)',
        background: 'rgba(255,255,255,.04)',
        border: '1px solid var(--hair)',
        borderRadius: '8px',
        padding: '4px 9px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
      }}
    >
      {children}
    </span>
  );
}

export function PerfReportDetail({
  report,
  onBack,
}: {
  report: PerfReport;
  onBack: () => void;
}): React.ReactElement {
  const [openSet, setOpenSet] = useState<Set<string>>(
    () => new Set(report.sections.filter((s) => s.defaultOpen).map((s) => s.key)),
  );

  const toggle = (key: string) => {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const setAll = (open: boolean) => {
    setOpenSet(open ? new Set(report.sections.map((s) => s.key)) : new Set());
  };

  return (
    <div>
      {/* 面包屑 */}
      <div style={{ fontSize: '13px', color: 'var(--color-ink-3)', marginBottom: '16px' }}>
        <span
          role="button"
          tabIndex={0}
          onClick={onBack}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onBack();
            }
          }}
          style={{ color: 'var(--color-brand)', cursor: 'pointer', fontWeight: 600 }}
        >
          性能测试
        </span>
        <span style={{ margin: '0 8px' }}>/</span>
        Round-1 报告
      </div>

      {/* 报告头 */}
      <div className="lg" style={{ padding: '24px 26px', marginBottom: '18px' }}>
        <div
          style={{
            fontFamily: 'var(--serif)',
            fontSize: '21px',
            fontWeight: 800,
            color: 'var(--color-ink)',
            letterSpacing: '-0.01em',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          {report.title}
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '4px 9px',
              borderRadius: '999px',
              whiteSpace: 'nowrap',
              color: '#F5B945',
              background: 'rgba(245,185,69,.12)',
              border: '1px solid rgba(245,185,69,.28)',
            }}
          >
            {report.statusLabel}
          </span>
        </div>
        <div
          style={{
            fontSize: '13.5px',
            color: 'var(--color-ink-2)',
            marginTop: '10px',
            lineHeight: 1.6,
          }}
        >
          {report.definition}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px' }}>
          <MetaBadge>
            <Calendar size={12} /> <b style={{ color: 'var(--color-ink)' }}>{report.date}</b>
          </MetaBadge>
          <MetaBadge>
            <b style={{ color: 'var(--color-ink)' }}>{report.modelCount}</b> 模型
          </MetaBadge>
          <MetaBadge>{report.sampleSummary}</MetaBadge>
          <MetaBadge>
            <b style={{ color: 'var(--color-ink)' }}>{report.judgeCount}</b> 第三方裁判
          </MetaBadge>
          <MetaBadge>
            总花费 <b style={{ color: 'var(--color-ink)' }}>{report.costSummary}</b>
          </MetaBadge>
        </div>
      </div>

      {/* 全局操作条 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
          marginBottom: '14px',
        }}
      >
        <button type="button" style={smallBtn('neutral')} onClick={() => setAll(true)}>
          全部展开
        </button>
        <button type="button" style={smallBtn('neutral')} onClick={() => setAll(false)}>
          全部折叠
        </button>
      </div>

      {/* 风琴分区 */}
      {report.sections.map((s) => (
        <PerfAccordionSection
          key={s.key}
          section={s}
          open={openSet.has(s.key)}
          onToggle={() => toggle(s.key)}
        />
      ))}
    </div>
  );
}

export default PerfReportDetail;
