'use client';

// onboarding-surfaces.tsx — 引导演示的「假应用页面」(渲染在聚光灯之下,真实壳之内)。
// 每个 surface 对应一个主/次功能;由 demo 编号驱动多拍演示。颜色走主题令牌,双主题跟随。
//
// 与 ver3.1 原型的差异:
//  - window 全局 → 真 TSX 组件 + props。
//  - 硬编码颜色(#fbfcfe / rgba(20,40,90,..) / #0a0a0c)→ var(--color-*),亮主题自动正确。
//  - 内联 lucide 图标 → onboarding-icons 的 lucide-react。

import type { CSSProperties, ReactNode } from 'react';
import { Ico } from './onboarding-icons';
import { AITag, CoachMark, ScoreRing, Reveal } from './onboarding-atoms';
import {
  DEMO_PERSONA,
  DEMO_SCORE,
  DEMO_CHECKS,
  DEMO_PEEK,
  DEMO_REWRITE,
  DEMO_CHAT,
  DEMO_ACTCARDS,
  DEMO_MOCK,
  DEMO_DEBRIEF,
  DEMO_AUX,
  type DemoCheck,
} from './onboarding-data';

const brandBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  background: 'linear-gradient(135deg,var(--color-brand),var(--color-brand-deep))',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  fontSize: 13.5,
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
  boxShadow: '0 10px 30px -12px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
};

const sectionCard: CSSProperties = { padding: 22, marginBottom: 16 };

function Section({ title, count, guide, children, style }: { title: string; count?: number; guide?: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="lg" data-guide={guide} style={{ ...sectionCard, ...style }}>
      <h2 style={{ fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 600, color: 'var(--color-ink)', margin: '0 0 14px' }}>
        {title}
        {count != null && <span style={{ color: 'var(--color-ink-4)', fontWeight: 500 }}>（{count}）</span>}
      </h2>
      {children}
    </div>
  );
}

function FeatureHead({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--color-brand-soft)', color: 'var(--color-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Ico name={icon} size={18} />
        </span>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 21, fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-.4px', margin: 0 }}>{title}</h1>
      </div>
      {sub && <p style={{ fontSize: 13, color: 'var(--color-ink-3)', margin: '8px 0 0' }}>{sub}</p>}
    </div>
  );
}

/* ── 校招诊断 result ──────────────────────────────────────────────────
   demo: 1 score82(+burst) · 2 压分64(shake+stamp+peek+strike) · 3 checks(逐条 reveal) */
function CheckRow({ c, show, delay }: { c: DemoCheck; show: boolean; delay: number }) {
  const cfg =
    c.kind === 'ok'
      ? { icon: 'check', col: 'var(--color-success)', bg: 'var(--color-success-soft)' }
      : c.kind === 'warn'
        ? { icon: 'alert', col: 'var(--color-warn)', bg: 'var(--color-warn-soft)' }
        : { icon: 'x', col: 'var(--color-danger)', bg: 'var(--color-danger-soft)' };
  return (
    <Reveal
      show={show}
      delay={delay}
      dir="up"
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        padding: '13px 15px',
        borderRadius: 12,
        background: c.kind === 'cut' ? 'var(--color-danger-soft)' : 'var(--color-surface-3)',
        border: `1px solid ${c.kind === 'cut' ? 'var(--color-danger)' : 'var(--hair)'}`,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 7, background: cfg.bg, color: cfg.col, flexShrink: 0, marginTop: 1 }}>
        <Ico name={cfg.icon} size={15} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'inline-flex', fontSize: 10.5, fontWeight: 700, color: cfg.col, background: cfg.bg, borderRadius: 6, padding: '2px 8px', whiteSpace: 'nowrap', marginBottom: 8 }}>{c.label}</span>
        <div style={{ fontSize: 13.5, color: 'var(--color-ink)', lineHeight: 1.55 }}>{c.line}</div>
        <div style={{ fontSize: 12.5, color: 'var(--color-ink-2)', lineHeight: 1.55, marginTop: 5 }}>{c.note}</div>
        <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--color-ink-3)', marginTop: 8, background: 'var(--color-surface-3)', borderRadius: 6, padding: '3px 8px', fontFamily: 'var(--font-mono)' }}>
          <Ico name="search" size={12} />
          {c.src}
        </span>
      </div>
    </Reveal>
  );
}

export function ResultSurface({ demo = 3 }: { demo?: number }) {
  const target = demo >= 2 ? DEMO_SCORE.after : DEMO_SCORE.base;
  return (
    <div className="g-scroll" style={{ maxWidth: 780, margin: '0 auto', padding: '34px 32px 120px', height: '100%' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 0', color: 'var(--color-ink-3)', fontSize: 13.5, marginBottom: 16 }}>
        <Ico name="arrowL" size={15} />
        返回简历
      </span>

      {/* 概览 + 分数环 */}
      <div className="lg" data-guide="scorering" style={{ padding: 26, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 26, flexWrap: 'wrap', position: 'relative' }}>
        <div className={demo === 2 ? 'ob-ring-shake' : ''} style={{ position: 'relative' }}>
          {demo === 1 && <div className="ob-score-burst" />}
          <ScoreRing target={target} show={demo >= 1} />
          {demo >= 2 && (
            <div
              className="ob-gr-stamp"
              style={{ position: 'absolute', top: -8, right: -16, fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: '#fff', background: 'var(--color-danger)', padding: '4px 8px', borderRadius: 7, letterSpacing: '.03em', boxShadow: '0 8px 20px -6px var(--color-danger)' }}
            >
              压分 −{DEMO_SCORE.cut}
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--color-brand)', display: 'flex' }}>
              <Ico name="campus" size={18} />
            </span>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 600, color: 'var(--color-ink)', letterSpacing: '-.3px', margin: 0, whiteSpace: 'nowrap' }}>{DEMO_PERSONA.job}</h1>
          </div>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--color-ink-3)' }}>
            <Ico name="calendar" size={13} />
            {DEMO_PERSONA.target} · {DEMO_PERSONA.name}
          </span>
          <div style={{ marginTop: 10 }}>
            <AITag />
          </div>
        </div>

        {/* 原文 peek — 压分依据从哪来(拍2) */}
        {demo === 2 && (
          <div className="ob-peek lg" style={{ right: 18, bottom: -58 }}>
            <div className="ob-peek-lab">
              <Ico name="search" size={11} /> {DEMO_PEEK.src}
            </div>
            <div className="ob-peek-line">
              {DEMO_PEEK.prefix}
              <span className="ob-strike" style={{ color: 'var(--color-danger)', fontWeight: 600 }}>{DEMO_PEEK.cut}</span>
            </div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--color-danger)', marginTop: 8, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{DEMO_PEEK.note}</div>
          </div>
        )}
      </div>

      {/* 逐条核查 */}
      <Section title="逐条核查 · 每条都给依据" count={DEMO_CHECKS.length} guide="checks">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <CheckRow c={DEMO_CHECKS[2]} show={demo >= 3} delay={0.05} />
          <CheckRow c={DEMO_CHECKS[0]} show={demo >= 3} delay={0.16} />
          <CheckRow c={DEMO_CHECKS[1]} show={demo >= 3} delay={0.27} />
        </div>
        <Reveal
          show={demo >= 3}
          delay={0.42}
          style={{ display: 'flex', gap: 9, alignItems: 'flex-start', marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--hair)', fontSize: 12.5, color: 'var(--color-ink-2)', lineHeight: 1.55 }}
        >
          <span style={{ color: 'var(--color-brand)', flexShrink: 0, marginTop: 1 }}>
            <Ico name="bolt" size={14} />
          </span>
          <span>没依据的内容当场压分或扣掉,每条结论都能追溯到你的原文。</span>
        </Reveal>
      </Section>
    </div>
  );
}

/* ── 简历馆 · upload preamble(收尾接力落点高亮用) ──────────────────── */
export function ResumesSurface({ phase = 'idle' }: { phase?: 'idle' | 'parsing' | 'done' }) {
  const items = ['读取经历与项目', '按真实校招标准比对', '标注每条的原文依据', '防编造护栏核查'];
  const litCount = phase === 'parsing' ? 2 : phase === 'done' ? 4 : 0;
  const fileChip = (w: number, h: number) => (
    <span style={{ width: w, height: h, borderRadius: 6, background: 'var(--color-surface)', position: 'relative', flexShrink: 0, boxShadow: '0 6px 16px rgba(0,0,0,.18)', border: '1px solid var(--hair)' }}>
      <span style={{ position: 'absolute', left: 7, top: 7, width: 10, height: 10, borderRadius: 3, background: 'var(--color-brand)' }} />
      <span style={{ position: 'absolute', left: 7, top: 23, right: 7, height: 2, borderRadius: 1, background: 'var(--color-line-2)', boxShadow: '0 6px 0 var(--color-line), 0 12px 0 var(--color-line)' }} />
    </span>
  );
  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '40px 32px' }}>
      <h1 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-.4px', margin: '0 0 4px' }}>简历馆</h1>
      <p style={{ fontSize: 13, color: 'var(--color-ink-3)', margin: '0 0 24px' }}>传一份进来,以后所有改写都从这儿开始。</p>

      <div
        data-guide="upload"
        className="lg"
        style={{ padding: 26, border: `1.5px dashed ${phase !== 'idle' ? 'var(--color-brand)' : 'var(--color-line-2)'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginBottom: 18, textAlign: 'center', transition: 'border-color .3s' }}
      >
        {phase === 'idle' && (
          <>
            <span style={{ width: 46, height: 46, borderRadius: 13, background: 'var(--color-brand-soft)', color: 'var(--color-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ico name="upload" size={20} />
            </span>
            <div style={{ fontSize: 14, color: 'var(--color-ink)', fontWeight: 600 }}>把简历拖进来 · PDF / Word 都行</div>
            <div style={{ fontSize: 12, color: 'var(--color-ink-3)' }}>它会成为你的底稿 —— 之后每次改写都能回溯、回滚。</div>
          </>
        )}
        {phase !== 'idle' && (
          <div className="ob-page-fade" style={{ width: '100%', maxWidth: 440 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              {fileChip(36, 46)}
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-ink)' }}>{DEMO_PERSONA.name}_简历.pdf</div>
                <div className="mono" style={{ fontSize: 11, color: phase === 'done' ? 'var(--color-success)' : 'var(--color-brand)', fontFamily: 'var(--font-mono)' }}>
                  {phase === 'done' ? '解析完成 ✓' : '正在按校招标准核对中…'}
                </div>
              </div>
            </div>
            {phase === 'parsing' && (
              <div className="ob-parse-track">
                <div className="ob-bar" />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 16, textAlign: 'left' }}>
              {items.map((it, i) => (
                <div key={it} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12.5, color: i < litCount ? 'var(--color-ink)' : 'var(--color-ink-4)', transition: 'color .3s' }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: i < litCount ? 'var(--color-success)' : 'var(--color-surface-3)', color: '#fff', fontSize: 10 }}>{i < litCount ? '✓' : ''}</span>
                  {it}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="lg" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14, opacity: phase === 'idle' ? 1 : 0.5, transition: 'opacity .3s' }}>
        {fileChip(38, 48)}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>{DEMO_PERSONA.name}_简历.pdf</div>
          <div className="mono" style={{ fontSize: 11.5, color: 'var(--color-brand)', fontFamily: 'var(--font-mono)' }}>{DEMO_PERSONA.version} · {DEMO_PERSONA.meta}</div>
        </div>
        <span className="mono" style={{ fontSize: 11, color: 'var(--color-ink-3)', fontFamily: 'var(--font-mono)' }}>刚刚</span>
      </div>
    </div>
  );
}

/* ── AI 改写 ──────────────────────────────────────────────────────────
   demo: 1 仅 before(红删除线) · 2 点改写脉冲→after 浮现(绿)+护栏标签 */
export function RewriteSurface({ demo = 2 }: { demo?: number }) {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 32px' }}>
      <FeatureHead icon="spark" title="AI 改写 · 内容运营" sub="把话说到位,没做过不编。" />
      <div className="lg" data-guide="rewrite-demo" style={{ padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-brand)', background: 'var(--color-brand-soft)', borderRadius: 6, padding: '3px 9px' }}>防编造护栏</span>
          <span style={{ fontSize: 12.5, color: 'var(--color-ink-3)' }}>新增的每个数字,必须能在你原文找到出处</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-ink-4)', marginBottom: 6 }}>你的原文</div>
        <div style={{ fontSize: 13, color: 'var(--color-danger)', background: 'var(--color-danger-soft)', borderRadius: 10, padding: '11px 13px', textDecoration: 'line-through', opacity: 0.85, marginBottom: 14 }}>{DEMO_REWRITE.before}</div>

        {/* 改写按钮(拍2 聚光灯点这里) */}
        <button
          data-guide="rewrite-run"
          style={{ ...brandBtn, padding: '8px 14px', marginBottom: 14 }}
        >
          <Ico name="spark" size={14} />
          改写
        </button>

        {demo >= 2 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-ink-4)', margin: '0 0 6px', fontSize: 11 }}>
              改写后 <Ico name="arrow" size={13} />
            </div>
            <Reveal show dir="up" style={{ fontSize: 13.5, color: 'var(--color-ink)', background: 'var(--color-success-soft)', borderRadius: 10, padding: '11px 13px', lineHeight: 1.6 }}>
              {DEMO_REWRITE.after}
            </Reveal>
            <Reveal show delay={0.25} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 11.5, fontWeight: 600, color: 'var(--color-success)', background: 'var(--color-success-soft)', borderRadius: 999, padding: '5px 11px' }}>
              <Ico name="check" size={13} />
              {DEMO_REWRITE.guardrail}
            </Reveal>
          </>
        )}
        <div style={{ marginTop: 16 }}>
          <AITag />
        </div>
      </div>
    </div>
  );
}

/* ── 问 Coach ─────────────────────────────────────────────────────────
   demo: 1 用户气泡 + 回复 · 2 + 行动卡(可点) */
export function ChatSurface({ demo = 2 }: { demo?: number }) {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 32px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h1 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-.4px', margin: '0 0 4px' }}>问 Coach</h1>
      <p style={{ fontSize: 13, color: 'var(--color-ink-3)', margin: '0 0 22px' }}>说你的情况,排出你的下一步,不用想怎么问。</p>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, justifyContent: 'center' }}>
        <div style={{ alignSelf: 'flex-end', maxWidth: '82%', background: 'linear-gradient(135deg,var(--color-brand),var(--color-brand-deep))', color: '#fff', borderRadius: '16px 16px 5px 16px', padding: '11px 15px', fontSize: 14, lineHeight: 1.55 }}>{DEMO_CHAT.user}</div>
        <Reveal show dir="up" style={{ display: 'flex', gap: 10, alignItems: 'flex-end', maxWidth: '88%' }}>
          <CoachMark size={30} />
          <div className="lg" style={{ borderRadius: '16px 16px 16px 5px', padding: '12px 15px', fontSize: 14, lineHeight: 1.6, color: 'var(--color-ink)' }}>{DEMO_CHAT.reply}</div>
        </Reveal>
        {demo >= 2 && (
          <div style={{ display: 'flex', gap: 9, paddingLeft: 40 }} data-guide="actcards">
            {DEMO_ACTCARDS.map((a, i) => (
              <Reveal key={a.id} show delay={0.1 + i * 0.1} className="lg" style={{ flex: 1, padding: 12, borderRadius: 12, cursor: 'pointer' }}>
                <span style={{ display: 'inline-flex', width: 26, height: 26, borderRadius: 8, background: 'var(--color-brand-soft)', color: 'var(--color-brand)', alignItems: 'center', justifyContent: 'center' }}>
                  <Ico name={a.icon} size={15} />
                </span>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-ink)', marginTop: 8 }}>{a.label}</div>
              </Reveal>
            ))}
          </div>
        )}
      </div>
      <div style={{ marginTop: 16 }}>
        <AITag />
      </div>
      <div className="lg" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', marginTop: 16 }}>
        <span style={{ flex: 1, fontSize: 13.5, color: 'var(--color-ink-4)' }}>说说你卡在哪…</span>
        <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--color-brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Ico name="arrow" size={16} />
        </span>
      </div>
    </div>
  );
}

/* ── 模拟面试(次线 1 拍) ─────────────────────────────────────────────── */
export function MockSurface() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 32px' }}>
      <FeatureHead icon="mock" title="模拟面试 · 内容运营" sub="出题你答,打字或开口都行。" />
      <div className="lg" data-guide="mock-demo" style={{ padding: 22 }}>
        <div style={{ display: 'inline-flex', gap: 4, padding: 4, borderRadius: 11, background: 'var(--color-surface-3)', marginBottom: 18 }}>
          {([['type', '文字', false], ['voice', '语音', true]] as const).map(([ic, t, on]) => (
            <span
              key={t}
              data-guide={ic === 'voice' ? 'mock-voice' : undefined}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, background: on ? 'var(--color-surface)' : 'transparent', color: on ? 'var(--color-ink)' : 'var(--color-ink-3)', boxShadow: on ? '0 1px 3px rgba(0,0,0,.15)' : 'none' }}
            >
              <Ico name={ic} size={14} />
              {t}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start', marginBottom: 14 }}>
          <CoachMark size={32} />
          <div className="lg" style={{ borderRadius: '6px 16px 16px 16px', padding: '12px 15px', fontSize: 14, color: 'var(--color-ink)', lineHeight: 1.6 }}>{DEMO_MOCK.question}</div>
        </div>
        <div style={{ border: '1px solid var(--hair)', borderRadius: 12, padding: '13px 15px', color: 'var(--color-ink-4)', fontSize: 13.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>把你的回答打在这儿…</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--color-brand)', fontWeight: 600, fontSize: 12.5 }}>
            <Ico name="voice" size={14} />
            也能开口说
          </span>
        </div>
        <div style={{ marginTop: 14 }}>
          <AITag />
        </div>
      </div>
    </div>
  );
}

/* ── 面试复盘(次线 1 拍 + 扫码一瞥) ──────────────────────────────────── */
export function DebriefSurface() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 32px' }}>
      <FeatureHead icon="debrief" title="面试复盘" sub="面完传录音,逐题给你盘。" />
      <div className="lg" data-guide="debrief-demo" style={{ padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: 'var(--color-surface-3)', marginBottom: 16 }}>
          <span style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--color-brand-soft)', color: 'var(--color-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ico name="debrief" size={16} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-ink)' }}>{DEMO_DEBRIEF.file}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--color-success)', fontFamily: 'var(--font-mono)' }}>转写完成 ✓ · {DEMO_DEBRIEF.dur}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 12, background: 'var(--color-success-soft)' }}>
            <span style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: 1 }}>
              <Ico name="check" size={15} />
            </span>
            <span style={{ fontSize: 13, color: 'var(--color-ink)', lineHeight: 1.55 }}>{DEMO_DEBRIEF.good}</span>
          </div>
          <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 12, background: 'var(--color-warn-soft)' }}>
            <span style={{ color: 'var(--color-warn)', flexShrink: 0, marginTop: 1 }}>
              <Ico name="alert" size={15} />
            </span>
            <span style={{ fontSize: 13, color: 'var(--color-ink)', lineHeight: 1.55 }}>{DEMO_DEBRIEF.warn}</span>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <AITag />
        </div>
      </div>
    </div>
  );
}

/* ── 赠品宫格(辅,一屏带过,钻石标分主次) ──────────────────────────── */
export function AuxOverview() {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 32px' }}>
      <FeatureHead icon="overview" title="还有这些,一直在" sub="这些用到再说,点开就能用。" />
      <div data-guide="aux-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {DEMO_AUX.map((a, i) => (
          <Reveal key={a.id} show delay={0.05 + i * 0.05} className="lg" style={{ padding: 16, position: 'relative' }}>
            <span style={{ position: 'absolute', top: 12, right: 12, fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '.04em', color: 'var(--color-ink-3)', background: 'var(--color-surface-3)', padding: '2px 6px', borderRadius: 5 }}>赠品</span>
            <span style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--color-surface-3)', color: 'var(--color-ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <Ico name={a.icon} size={16} />
            </span>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-ink)' }}>{a.title}</div>
            <div style={{ fontSize: 11.5, color: 'var(--color-ink-3)', marginTop: 3, lineHeight: 1.45 }}>{a.desc}</div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
