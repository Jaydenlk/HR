'use client';

/**
 * PerfAccordionSection — 性能测试报告·单个风琴分区(只读)
 *
 * 头部行整行可点(键盘 Enter/Space 也触发),左色条 + lucide 图标方块 + 衬线标题
 * + 折叠态也显示的一句话摘要 + 右侧 chevron(展开时旋转 90°)。
 * 展开区用复用的 MarkdownView 渲染 section.markdown(支持表格)。
 *
 * 配色(accent / tintBg / tintBorder)由 round-1.json 逐分区提供,inline style 注入,
 * 不改 globals.css(范围最小)。
 */

import { useId } from 'react';
import {
  Flag,
  Beaker,
  BookOpen,
  Trophy,
  Gauge,
  AlertTriangle,
  ListChecks,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { MarkdownView } from './MarkdownView';
import type { PerfSection } from './perfTypes';

const ICONS: Record<string, LucideIcon> = {
  Flag,
  Beaker,
  BookOpen,
  Trophy,
  Gauge,
  AlertTriangle,
  ListChecks,
};

export function PerfAccordionSection({
  section,
  open,
  onToggle,
}: {
  section: PerfSection;
  open: boolean;
  onToggle: () => void;
}): React.ReactElement {
  const Icon = ICONS[section.icon] ?? Flag;
  const bodyId = useId();

  return (
    <div
      className="lg"
      style={{
        marginBottom: '12px',
        overflow: 'hidden',
        borderLeft: `3px solid ${section.accent}`,
      }}
    >
      {/* 头部行:整行可点 */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '13px',
          padding: '16px 18px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '9px',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            background: section.tintBg,
            color: section.accent,
          }}
        >
          <Icon size={17} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--serif)',
              fontSize: '15.5px',
              fontWeight: 700,
              color: section.accent,
              letterSpacing: '-0.01em',
            }}
          >
            {section.title}
          </div>
          <div
            style={{
              fontSize: '12.5px',
              color: 'var(--color-ink-3)',
              marginTop: '3px',
              lineHeight: 1.5,
            }}
          >
            {section.summary}
          </div>
        </div>
        <ChevronRight
          size={16}
          style={{
            color: 'var(--color-ink-3)',
            flexShrink: 0,
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform .22s ease',
          }}
        />
      </div>

      {/* 内容区:grid 0fr→1fr 折叠/展开(高度可平滑插值且自适应内容,不裁切最长分区) */}
      <div
        id={bodyId}
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          opacity: open ? 1 : 0,
          overflow: 'hidden',
          transition: 'grid-template-rows .26s ease, opacity .26s ease',
        }}
      >
        <div style={{ minHeight: 0, overflow: 'hidden' }}>
          <div
            style={{
              borderTop: '1px solid var(--color-line)',
              margin: '4px 18px 20px',
              paddingTop: '16px',
            }}
          >
            <MarkdownView markdown={section.markdown} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default PerfAccordionSection;
