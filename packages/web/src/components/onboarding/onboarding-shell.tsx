'use client';

// onboarding-shell.tsx — 引导画布内的「真实壳复刻」:侧栏 + 主工作区。
// 视觉对齐线上 (main)/layout 侧栏(玻璃、品牌渐变、导航分组、账户区),但用静态演示数据
// (persona 陈思宁 / 50 点),不接真实状态——它只是聚光灯之下的舞台背景。
// 颜色全走主题令牌,双主题跟随。

import type { ReactNode } from 'react';
import { Ico } from './onboarding-icons';
import { DEMO_PERSONA } from './onboarding-data';

const NAV_MAIN = [
  { k: 'today', ic: 'today', label: '今天' },
  { k: 'overview', ic: 'overview', label: '总览' },
  { k: 'monthly', ic: 'monthly', label: '求职月刊' },
  { k: 'debrief', ic: 'debrief', label: '面试复盘' },
] as const;

const NAV_TOOLS = [
  { k: 'resumes', ic: 'resumes', label: '简历馆' },
  { k: 'campus', ic: 'campus', label: '校招诊断', star: true },
  { k: 'mock', ic: 'mock', label: '模拟面试' },
  { k: 'opportunities', ic: 'opportunities', label: '机会中心' },
  { k: 'tracker', ic: 'tracker', label: '投递追踪' },
  { k: 'coverLetter', ic: 'coverLetter', label: '求职信' },
] as const;

function DemoSidebar({ activeKey }: { activeKey: string }) {
  return (
    <aside
      style={{
        width: 'var(--sidebar-w)',
        flexShrink: 0,
        height: '100%',
        borderRight: '1px solid var(--hair)',
        background: 'var(--color-surface-2)',
        display: 'flex',
        flexDirection: 'column',
        padding: '18px 14px 14px',
        position: 'relative',
        zIndex: 2,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 8px 16px' }}>
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            background: 'linear-gradient(135deg,var(--color-brand),var(--color-brand-deep))',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--serif)',
            fontWeight: 700,
            fontSize: 16,
            boxShadow: '0 6px 16px -5px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
          }}
        >
          C
        </span>
        <span style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 18, color: 'var(--color-ink)', letterSpacing: '-.01em' }}>Coach</span>
      </div>

      <div
        data-guide="chat"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          width: '100%',
          padding: '10px 12px',
          borderRadius: 11,
          marginBottom: 6,
          background: 'linear-gradient(135deg,var(--color-brand),var(--color-brand-deep))',
          color: '#fff',
          fontFamily: 'inherit',
          fontSize: 13.5,
          fontWeight: 600,
          letterSpacing: '-.01em',
          whiteSpace: 'nowrap',
          boxShadow: '0 10px 30px -12px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
        }}
      >
        <span style={{ display: 'flex' }}>
          <Ico name="chat" size={16} />
        </span>
        问 Coach
      </div>

      <div className="g-scroll" style={{ flex: 1, minHeight: 0, margin: '6px -4px 0', padding: '0 4px' }}>
        {NAV_MAIN.map((n) => (
          <div key={n.k} data-guide={n.k} className={'nav-item' + (activeKey === n.k ? ' active' : '')}>
            <Ico name={n.ic} size={18} />
            {n.label}
          </div>
        ))}
        <div className="nav-sect">工具</div>
        {NAV_TOOLS.map((n) => (
          <div key={n.k} data-guide={n.k} className={'nav-item' + (activeKey === n.k ? ' active' : '')}>
            <Ico name={n.ic} size={18} />
            <span style={{ flex: 1 }}>{n.label}</span>
            {'star' in n && n.star && (
              <span style={{ fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '.04em', color: 'var(--color-brand)', background: 'var(--color-brand-soft)', padding: '2px 6px', borderRadius: 5 }}>重点</span>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10, paddingTop: 12, borderTop: '1px solid var(--hair)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--color-surface-3)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--color-ink-3)' }}>{DEMO_PERSONA.initial}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-ink)' }}>{DEMO_PERSONA.name}</div>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--color-ink-3)', fontFamily: 'var(--font-mono)' }}>剩余 50 点</div>
        </div>
      </div>
    </aside>
  );
}

/** 引导舞台外壳:侧栏 + 主区。children 是当前演示 surface。 */
export function OnboardingShell({ activeKey, children }: { activeKey: string; children: ReactNode }) {
  return (
    <div style={{ position: 'relative', zIndex: 1, display: 'flex', width: '100%', height: '100%' }}>
      <DemoSidebar activeKey={activeKey} />
      <main className="g-scroll" style={{ flex: 1, minWidth: 0, height: '100%', position: 'relative' }}>
        {children}
      </main>
    </div>
  );
}
