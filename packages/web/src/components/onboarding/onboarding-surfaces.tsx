'use client';

// onboarding-surfaces.tsx — 引导演示 surface(渲染在聚光灯之下,真实壳之内)。
//
// 核心(用户拍板「A 复用真组件 + 精选演示」):每个 surface 直接渲染**产品里真正在用的
// 功能组件**,喂以虚构 persona(陈思宁 / 北辰文化)的精选演示数据 —— 形式 100% 是真的,
// 因为就是真组件本身。复用清单:
//   · 校招诊断 = 真实 ScoreBadge + ProfessionDimensionCard + ConventionCheckRow
//               (export 自 diagnoses/[id]/diagnosis-detail.tsx)
//   · AI 改写 = 真实 SuggestionCard(components/diagnosis/suggestion-card)
//   · 问 Coach = 真实 MessageBubble + HandoffCard(components/chat)
//   · 模拟面试 = 真实 MockStage(components/mock/mock-stage),mode='type' 不触发 TTS,
//               onAnswer/onComplete 传 no-op,绝不触发真实 API / 扣点
//   · 面试复盘 = 真实 QuestionCard + ScoreRadar(components/interview)
//
// 真组件常带数据请求/context 依赖 → 这里一律以纯展示态渲染:静态 props,api 只在点击时触发
// (演示态下用户不点 / 点了也只是路由,不消费),不 mount 任何拉数据的 useEffect。
//
// 精选演示:不倾倒整份结果。每屏只放 1-2 个真组件实例(已是精选数据),配「怎么用」浮层,
// 聚光灯由 tour 层只突出该屏要讲的片段。诊断屏保留 wow 连播节奏(评分→压分→依据)。
//
// 双主题:复用真组件天然主题正确(组件本身用 var(--color-*) 令牌),省去重画。

import type { CSSProperties } from 'react';
import { Ico } from './onboarding-icons';
import { AITag } from './onboarding-atoms';
import {
  DEMO_PERSONA,
  DEMO_DIAG_TOTAL,
  DEMO_DIM,
  DEMO_CONVENTION,
  DEMO_SUGGESTION,
  DEMO_CHAT_MESSAGES,
  DEMO_MOCK_QUESTIONS,
  DEMO_MOCK_ANSWERS,
  DEMO_DEBRIEF_QUESTIONS,
  DEMO_DEBRIEF_SCORES,
  DEMO_TRACKER,
  DEMO_AUX,
} from './onboarding-data';
import {
  ScoreBadge,
  ProfessionDimensionCard,
  ConventionCheckRow,
} from '@/app/(main)/diagnoses/[id]/diagnosis-detail';
import { SuggestionCard } from '@/components/diagnosis/suggestion-card';
import { MessageBubble } from '@/components/chat/message-bubble';
import { MockStage } from '@/components/mock/mock-stage';
import { QuestionCard } from '@/components/interview/question-card';
import { ScoreRadar } from '@/components/interview/score-radar';

const NOOP_ASYNC = async () => {};

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
  padding: '8px 14px',
  cursor: 'pointer',
  boxShadow: '0 10px 30px -12px var(--au-blue-glow), inset 0 1px 0 rgba(255,255,255,.4)',
};

const sectionTitle: CSSProperties = {
  fontFamily: 'var(--serif)',
  fontSize: 15,
  fontWeight: 600,
  color: 'var(--color-ink)',
  margin: '0 0 14px',
};

function PageHead({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: 'var(--color-brand-soft)',
            color: 'var(--color-brand)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ico name={icon} size={18} />
        </span>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 21, fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-.4px', margin: 0 }}>
          {title}
        </h1>
      </div>
      {sub && <p style={{ fontSize: 13, color: 'var(--color-ink-3)', margin: '8px 0 0' }}>{sub}</p>}
    </div>
  );
}

/* ── 校招诊断 result ──────────────────────────────────────────────────
   复用真实 ScoreBadge + ProfessionDimensionCard + ConventionCheckRow。
   wow 连播节奏照旧:demo 1 评分浮现(光爆) · 2 压分(抖+盖章) · 3 依据(逐条 reveal)。
   精选:只露 评分环 + 2 维度 + 1 本土核查 + 1 句护栏总结,不摆整份诊断。 */
export function ResultSurface({ demo = 3 }: { demo?: number }) {
  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: 'clamp(16px, 3vh, 24px) clamp(20px, 3vw, 32px)' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 0', color: 'var(--color-ink-3)', fontSize: 13.5, marginBottom: 10 }}>
        <Ico name="arrowL" size={15} />
        返回简历
      </span>

      {/* L0 概览:真实 ScoreBadge + 职业镜头(压分时抖动 + 盖章) */}
      <div
        className="lg"
        data-guide="scorering"
        style={{ padding: 18, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', position: 'relative' }}
      >
        <div className={demo === 2 ? 'ob-ring-shake' : ''} style={{ position: 'relative' }}>
          {demo === 1 && <div className="ob-score-burst" />}
          <ScoreBadge score={DEMO_DIAG_TOTAL} />
          {demo >= 2 && (
            <div
              className="ob-gr-stamp"
              style={{
                position: 'absolute',
                top: -14,
                right: -18,
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 700,
                color: '#fff',
                background: 'var(--color-danger)',
                padding: '4px 8px',
                borderRadius: 7,
                letterSpacing: '.03em',
                boxShadow: '0 8px 20px -6px var(--color-danger)',
              }}
            >
              护栏压分
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--color-brand)', display: 'flex' }}>
              <Ico name="campus" size={18} />
            </span>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 600, color: 'var(--color-ink)', letterSpacing: '-.3px', margin: 0, whiteSpace: 'nowrap' }}>
              {DEMO_PERSONA.job}
            </h1>
          </div>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--color-ink-3)' }}>
            <Ico name="calendar" size={13} />
            {DEMO_PERSONA.target} · {DEMO_PERSONA.name}
          </span>
          <div style={{ marginTop: 10 }}>
            <AITag />
          </div>
        </div>
      </div>

      {/* L1 依据:真实维度卡 + 本土核查(demo 3 逐条升起) */}
      <div className="lg" data-guide="checks" style={{ padding: 18, opacity: demo >= 3 ? 1 : 0, transform: demo >= 3 ? 'none' : 'translateY(16px)', transition: 'opacity .55s var(--ob-ease-out), transform .6s var(--ob-ease-out)' }}>
        <h2 style={{ ...sectionTitle, margin: '0 0 10px' }}>各维度评估 · 每条都给依据</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {DEMO_DIM.map((dim) => (
            <ProfessionDimensionCard key={dim.key} dim={dim} />
          ))}
        </div>
        <h2 style={{ ...sectionTitle, margin: '14px 0 10px' }}>本土简历核查</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {DEMO_CONVENTION.map((check) => (
            <ConventionCheckRow key={check.key} check={check} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--hair)', fontSize: 12.5, color: 'var(--color-ink-2)', lineHeight: 1.55 }}>
          <span style={{ color: 'var(--color-brand)', flexShrink: 0, marginTop: 1 }}>
            <Ico name="bolt" size={14} />
          </span>
          <span>没依据的内容当场压分或扣掉,每条结论都能追溯到你的原文。</span>
        </div>
      </div>
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
    <div style={{ maxWidth: 780, margin: '0 auto', padding: 'clamp(20px, 4vh, 40px) clamp(20px, 3vw, 32px)' }}>
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
            <div style={{ fontSize: 12, color: 'var(--color-ink-3)' }}>传进来就是你的底稿 —— 之后每次改写都从这份开始。</div>
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
   复用真实 SuggestionCard(原文/建议改为 双栏 + 复制/采纳)。
   demo: 1 仅头部「点改写」按钮提示 · 2 真实改写卡浮入 + 护栏说明。
   精选:只放 1 张改写卡(这屏要讲的就是「改一条」)。 */
export function RewriteSurface({ demo = 2 }: { demo?: number }) {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(20px, 4vh, 40px) clamp(20px, 3vw, 32px)' }}>
      <PageHead icon="spark" title="AI 改写 · 内容运营" sub="把话说到位,没做过不编。" />
      <div className="lg" data-guide="rewrite-demo" style={{ padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-brand)', background: 'var(--color-brand-soft)', borderRadius: 6, padding: '3px 9px' }}>防编造护栏</span>
          <span style={{ fontSize: 12.5, color: 'var(--color-ink-3)' }}>新增的每个数字,必须能在你原文找到出处</span>
        </div>

        {/* 改写按钮(demo 1/2 都在;demo 2 聚光灯点这里) */}
        <button data-guide="rewrite-run" type="button" style={brandBtn}>
          <Ico name="spark" size={14} />
          改写这一条
        </button>

        {demo >= 2 && (
          <div className="ob-page-fade" style={{ marginTop: 16 }}>
            {/* 真实改写卡(精选 1 张) */}
            <SuggestionCard suggestion={DEMO_SUGGESTION} resumeId="demo" index={0} />
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 11.5, fontWeight: 600, color: 'var(--color-success)', background: 'var(--color-success-soft)', borderRadius: 999, padding: '5px 11px' }}>
              <Ico name="check" size={13} />
              只用了你写过的内容
            </div>
          </div>
        )}
        <div style={{ marginTop: 16 }}>
          <AITag />
        </div>
      </div>
    </div>
  );
}

/* ── 问 Coach ─────────────────────────────────────────────────────────
   复用真实 MessageBubble(含 assistant 行动卡 HandoffCard)。
   demo: 1 一问一答(用户气泡 + 回复) · 2 + assistant 的行动卡浮现。
   精选:只放这一轮对话,讲「说处境→排下一步」。 */
export function ChatSurface({ demo = 2 }: { demo?: number }) {
  const messages = demo >= 2 ? DEMO_CHAT_MESSAGES : DEMO_CHAT_MESSAGES.slice(0, 1).concat({ ...DEMO_CHAT_MESSAGES[1], rich_card: null });
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(20px, 4vh, 40px) clamp(20px, 3vw, 32px)', display: 'flex', flexDirection: 'column' }}>
      <h1 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-.4px', margin: '0 0 4px' }}>问 Coach</h1>
      <p style={{ fontSize: 13, color: 'var(--color-ink-3)', margin: '0 0 22px' }}>说你的情况,排出你的下一步,不用想怎么问。</p>
      <div data-guide="actcards" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
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

/* ── 模拟面试 ──────────────────────────────────────────────────────────
   复用真实 MockStage:mode='type'(不触发 TTS),onAnswer/onComplete 为 no-op,
   不触发真实 API / 扣点。精选:1 道题的题卡 + 作答区。聚光灯点「也能开口说」。 */
export function MockSurface() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(20px, 4vh, 40px) clamp(20px, 3vw, 32px)' }}>
      <PageHead icon="mock" title="模拟面试 · 内容运营" sub="出题你答,打字或开口都行。" />
      <div data-guide="mock-demo" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
        <div data-guide="mock-voice" style={{ display: 'inline-flex', gap: 4, padding: 4, borderRadius: 11, background: 'var(--color-surface-3)' }}>
          {([['type', '文字', true], ['voice', '语音', false]] as const).map(([ic, t, on]) => (
            <span
              key={t}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, background: on ? 'var(--color-surface)' : 'transparent', color: on ? 'var(--color-ink)' : 'var(--color-ink-3)', boxShadow: on ? '0 1px 3px rgba(0,0,0,.15)' : 'none' }}
            >
              <Ico name={ic} size={14} />
              {t}
            </span>
          ))}
        </div>
        <span style={{ fontSize: 12, color: 'var(--color-ink-3)' }}>语音挡能开口说,系统读题你答</span>
      </div>

      {/* 真实 MockStage(文字挡,不扣点) */}
      <MockStage
        sessionId="demo"
        mode="type"
        questions={[...DEMO_MOCK_QUESTIONS]}
        answers={[...DEMO_MOCK_ANSWERS]}
        onAnswer={NOOP_ASYNC}
        onComplete={NOOP_ASYNC}
        submitting={false}
        completing={false}
      />
      <div style={{ marginTop: 14 }}>
        <AITag />
      </div>
    </div>
  );
}

/* ── 面试复盘 ──────────────────────────────────────────────────────────
   复用真实 ScoreRadar(能力分布) + QuestionCard(逐题点评)。
   精选:转写完成头 + 3 维能力条 + 2 道逐题(1 亮点 1 可改),不摆整份复盘。 */
export function DebriefSurface() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(20px, 4vh, 40px) clamp(20px, 3vw, 32px)' }}>
      <PageHead icon="debrief" title="面试复盘" sub="面完传录音,逐题给你盘。" />
      <div className="lg" data-guide="debrief-demo" style={{ padding: 22, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <span style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--color-brand-soft)', color: 'var(--color-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ico name="debrief" size={16} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-ink)' }}>北辰文化_一面_录音.m4a</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--color-success)', fontFamily: 'var(--font-mono)' }}>转写完成 ✓ · 21:38</div>
          </div>
        </div>
        {/* 真实能力分布 */}
        <div style={{ fontFamily: 'var(--serif)', fontSize: 13.5, fontWeight: 700, color: 'var(--color-ink)', marginBottom: 14 }}>能力分布 · {DEMO_DEBRIEF_SCORES.length} 个维度</div>
        <ScoreRadar scores={[...DEMO_DEBRIEF_SCORES]} />
      </div>

      {/* 真实逐题卡(精选 2 题) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {DEMO_DEBRIEF_QUESTIONS.map((q, i) => (
          <QuestionCard key={i} question={q} index={i} />
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        <AITag />
      </div>
    </div>
  );
}

/* ── 投递追踪(非 AI 功能,自绘演示看板) ──────────────────────────────
   呼应真实 /applications:6 阶段看板(想投/已投递/面试中/终面/Offer/已拒),卡片记公司+岗位,
   顶部各阶段计数;下拉切换即改阶段。阶段标签与点色逐字对齐真实 KanbanBoard 的 STAGES。
   精选:铺虚构 persona(陈思宁 / 北辰文化)的 4 条投递,讲「投了哪家、到哪步了,一眼看清」。
   纯展示静态卡片:不可拖、不拉数据。 */
const TRACKER_STAGES: readonly { id: string; label: string; dot: string }[] = [
  { id: 'wishlist',  label: '想投',   dot: 'var(--color-ink-4)' },
  { id: 'applied',   label: '已投递', dot: 'var(--color-brand)' },
  { id: 'interview', label: '面试中', dot: 'var(--color-warn)' },
  { id: 'final',     label: '终面',   dot: 'var(--au-violet)' },
  { id: 'offer',     label: 'Offer',  dot: 'var(--color-success)' },
  { id: 'rejected',  label: '已拒',   dot: 'var(--color-danger)' },
];
export function TrackerSurface() {
  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: 'clamp(20px, 4vh, 40px) clamp(20px, 3vw, 32px)' }}>
      <PageHead icon="tracker" title="投递追踪" sub="投了哪家、到哪一步了,一眼看清,不用再用 Excel 手记。" />

      {/* 投递概览:玻璃分区卡 + 兄弟同款 sectionTitle,各阶段计数为内部扁平胶囊(呼应真实 TrackerStats) */}
      <div className="lg" style={{ padding: 18, marginBottom: 16 }}>
        <h2 style={{ ...sectionTitle, margin: '0 0 12px' }}>投递概览</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TRACKER_STAGES.map((st) => {
            const count = DEMO_TRACKER.filter((a) => a.stage === st.id).length;
            return (
              <span key={st.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 12px', fontSize: 12.5, borderRadius: 'var(--radius-default)', border: '1px solid var(--hair)', background: 'rgba(47,143,255,.05)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: st.dot, flexShrink: 0 }} />
                <span style={{ color: 'var(--color-ink-2)' }}>{st.label}</span>
                <span className="mono" style={{ fontWeight: 700, color: 'var(--color-ink)', fontFamily: 'var(--font-mono)' }}>{count}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* 按阶段看板:玻璃分区卡 + sectionTitle;内含 6 列扁平列槽,卡片记公司+岗位,下拉切换即改阶段。
          AITag 收在卡内底部,与兄弟拍(账户/帮助/复盘)一致 */}
      <div className="lg" data-guide="tracker-board" style={{ padding: 18 }}>
        <h2 style={{ ...sectionTitle, margin: '0 0 12px' }}>按阶段看板</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
          {TRACKER_STAGES.map((st) => {
            const cards = DEMO_TRACKER.filter((a) => a.stage === st.id);
            return (
              <div key={st.id} style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 132 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--color-ink-2)' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: st.dot, flexShrink: 0 }} />
                  {st.label}
                </div>
                {cards.map((c) => (
                  <div key={c.id} style={{ padding: '9px 10px', borderRadius: 'var(--radius-default)', border: '1px solid var(--hair)', background: 'rgba(47,143,255,.05)' }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-ink)', lineHeight: 1.3 }}>{c.company}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-ink-3)', marginTop: 3 }}>{c.role}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 14 }}>
          <AITag />
        </div>
      </div>
    </div>
  );
}

/* ── 账户 · 点数(Part A「看点数」主区:呼应聚光左上账户区) ────────────────────
   用户反馈:讲点数时主区应是「用户界面」而非辅助功能宫格。这里以演示态呈现账户区
   (头像 / 名字 / 余额)+ 点数计费规则,与侧栏聚光的账户区对应。
   计费数字依据已确认机制:多数功能每次 1 点,面试复盘(转写+分析)成功才扣 7 点、失败不扣。 */
const CREDIT_RULES: readonly { label: string; cost: string; note?: string }[] = [
  { label: '简历诊断 / AI 改写 / 问 Coach', cost: '1 点 / 次' },
  { label: '模拟面试 / 求职信 / 找岗位', cost: '1 点 / 次' },
  { label: '面试复盘(转写 + 分析)', cost: '7 点 / 次', note: '成功才扣,失败不扣' },
];
export function AccountSurface() {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 'clamp(20px, 4vh, 40px) clamp(20px, 3vw, 32px)' }}>
      <PageHead icon="overview" title="我的账户" sub="头像、名字、点数余额都在这儿,点数用多少扣多少。" />

      {/* 账户卡:头像 + 名字 + 余额(呼应侧栏左上账户区) */}
      <div className="lg" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <span style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,var(--color-brand),var(--color-brand-deep))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, fontFamily: 'var(--serif)', flexShrink: 0 }}>
          {DEMO_PERSONA.initial}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-ink)' }}>{DEMO_PERSONA.name}</div>
          <div style={{ fontSize: 12.5, color: 'var(--color-ink-3)', marginTop: 2 }}>{DEMO_PERSONA.meta}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-brand)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>50</div>
          <div style={{ fontSize: 11.5, color: 'var(--color-ink-3)', marginTop: 4 }}>剩余点数</div>
        </div>
      </div>

      {/* 点数计费规则 */}
      <div className="lg" style={{ padding: 18 }}>
        <h2 style={{ ...sectionTitle, margin: '0 0 12px' }}>点数怎么算</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {CREDIT_RULES.map((r) => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingBottom: 10, borderBottom: '1px solid var(--hair)' }}>
              <div style={{ fontSize: 13, color: 'var(--color-ink-2)', lineHeight: 1.4 }}>
                {r.label}
                {r.note && <span style={{ display: 'block', fontSize: 11, color: 'var(--color-success)', marginTop: 2 }}>{r.note}</span>}
              </div>
              <span className="mono" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-ink)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', flexShrink: 0 }}>{r.cost}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <AITag />
        </div>
      </div>
    </div>
  );
}

/* ── 使用帮助 · 能力速览(Part B「使用帮助」主区:呼应聚光左下) ────────────────
   help 拍主区应呼应「使用帮助 / 能力速览」,而非辅助功能宫格(画面与主题不符)。
   文案照搬既有产品常量(capability-guide.tsx 的 FIRST_STEPS + 标题/副标题),不新写句子。
   纯展示静态卡片:不可点、不拉数据。图标走本文件的 Ico 字符串 key(FileText/GraduationCap
   /MessageSquare → resumes/campus/chat),与 surface 图标体系一致。 */
const HELP_FIRST_STEPS: readonly { icon: string; title: string; desc: string }[] = [
  { icon: 'resumes', title: '传一份简历', desc: '把简历传进来,之后所有改写都从它开始' },
  { icon: 'campus', title: '跑一份诊断', desc: '按真实校招标准给简历逐条诊断,不糊弄' },
  { icon: 'chat', title: '问 Coach 一句', desc: '说清你的处境,排出你的下一步' },
];
export function HelpSurface() {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 'clamp(20px, 4vh, 40px) clamp(20px, 3vw, 32px)' }}>
      <PageHead icon="overview" title="Coach 能做什么" sub="不用记功能藏在哪,从这儿点一下就能去用。" />

      <div className="lg" style={{ padding: 18 }}>
        <h2 style={{ ...sectionTitle, margin: '0 0 12px' }}>先做这几件</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {HELP_FIRST_STEPS.map((item) => (
            <div key={item.title} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', borderRadius: 'var(--radius-default)', border: '1px solid var(--hair)', background: 'rgba(47,143,255,.05)' }}>
              <span style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 'var(--radius-default)', background: 'var(--color-brand-soft)', color: 'var(--color-brand)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ico name={item.icon} size={17} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--color-ink)', letterSpacing: '-.005em' }}>{item.title}</span>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--color-ink-3)', lineHeight: 1.45, marginTop: 2 }}>{item.desc}</span>
              </span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <AITag />
        </div>
      </div>
    </div>
  );
}

/* ── 辅助功能宫格(辅,一屏带过,角标标分主次) ──────────────────────────── */
export function AuxOverview() {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(20px, 4vh, 40px) clamp(20px, 3vw, 32px)' }}>
      <PageHead icon="overview" title="还有这些,一直在" sub="还有这些功能可以选择使用哦~" />
      <div data-guide="aux-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {DEMO_AUX.map((a) => (
          <div key={a.id} className="lg" style={{ padding: 16, position: 'relative' }}>
            <span style={{ position: 'absolute', top: 12, right: 12, fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '.04em', color: 'var(--color-ink-3)', background: 'var(--color-surface-3)', padding: '2px 6px', borderRadius: 5 }}>辅助功能</span>
            <span style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--color-surface-3)', color: 'var(--color-ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <Ico name={a.icon} size={16} />
            </span>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-ink)' }}>{a.title}</div>
            <div style={{ fontSize: 11.5, color: 'var(--color-ink-3)', marginTop: 3, lineHeight: 1.45 }}>{a.desc}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14 }}>
        <AITag />
      </div>
    </div>
  );
}
