import Link from 'next/link';

// ── Coach Landing Page ─────────────────────────────────────────────────────
// Apple-disciplined, single brand color, generous whitespace.
// Static marketing content — no API calls.
//
// 诚实化原则(2026-06-14 重写,对照 design spec §0 五条红线):
//   1. 行业趋势/月刊的联网检索结果绝不称「已核验」——只说「实时检索·标注来源·查不到就说查不到」。
//   2. 能力盘点 AI 评分绝不称「权威评估」——区分平台评 / 用户自评,标「非权威评估」。
//   3. 防编造护栏不隐瞒局限——护栏区坦诚一句「极复杂多段经历交叉仍可能误判」。
//   4. credit 口径严格:「注册送 50 点 · 每次 AI 生成扣 1 点 · 试运行不收费、用完可免费续」,
//      绝不说「试运行完全免费」误导成无限免费。
//   5. 零虚构:不放任何用户数 / 提分数 / 岗位数 / 用户评价 / case。
// 页面上只允许:源自代码/README 的真实能力描述,及明确标注「演示 / 示例」的界面示意。

// 响应式:落地页用内联 style,无 Tailwind。移动端通过组件内注入的 <style> 媒体查询
// (className 配合)实现 SSR 友好、无 hydration 闪烁的真单列布局 + sticky 底部 CTA 条。

// ── 调色板(沿用现状,不引入新色)──
const INK = '#1d1d1f';
const BG = '#fbfbfd';
const BLUE = '#0a84ff';
const RED = '#ff453a'; // 仅用于「护栏拦截」标注
const GREEN = '#34c759';
const LINE = '#e5e5e7';
const SUB1 = '#424245';
const SUB2 = '#6e6e73';
const SUB3 = '#a1a1a6';
const MONO = '"JetBrains Mono",ui-monospace,monospace';

const RESPONSIVE_CSS = `
/* ── 移动端真响应式(≤760px)。落地页默认两列 grid → 窄屏强制单列。 ── */
@media (max-width: 760px) {
  .lp-nav { padding: 14px 18px !important; }
  .lp-nav-links { display: none !important; }
  .lp-section { padding-left: 18px !important; padding-right: 18px !important; }
  .lp-hero { grid-template-columns: 1fr !important; gap: 28px !important; padding: 36px 18px 32px !important; }
  /* Hero 文案在前、演示卡在后并缩小 */
  .lp-hero-copy { order: 1; }
  .lp-hero-card { order: 2; aspect-ratio: auto !important; padding: 22px !important; }
  .lp-h1 { font-size: 40px !important; }
  .lp-subtitle { max-width: none !important; font-size: 16px !important; }
  .lp-cta-row { flex-direction: column !important; align-items: stretch !important; }
  .lp-cta-primary, .lp-cta-secondary { width: 100% !important; justify-content: center !important; min-height: 48px !important; }
  .lp-meta { flex-wrap: wrap !important; gap: 10px !important; }
  .lp-grid-3 { grid-template-columns: 1fr !important; }
  .lp-grid-2 { grid-template-columns: 1fr !important; }
  .lp-compare { grid-template-columns: 1fr !important; }
  .lp-dark { padding: 26px 22px !important; border-radius: 22px !important; }
  .lp-h2 { font-size: 30px !important; }
  .lp-h2-dark { font-size: 28px !important; }
  .lp-section-head { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
  .lp-section-head-sub { text-align: left !important; max-width: none !important; }
  .lp-actioncards { grid-template-columns: 1fr !important; }
  .lp-points { font-size: 16px !important; }
  .lp-footer { padding: 48px 18px 120px !important; }
  .lp-footer-h2 { font-size: 38px !important; }
  /* 正文最小 16px 防 iOS 聚焦缩放破版 */
  .lp-body { font-size: 16px !important; }
  /* 移动端 sticky 底部 CTA 条显示 */
  .lp-sticky-cta { display: flex !important; }
  /* 给页面底部留出 sticky 条高度,避免遮挡收尾内容 */
}
@media (min-width: 761px) {
  .lp-sticky-cta { display: none !important; }
}
/* FAQ 展开器:用原生 details/summary,SSR 友好、零 JS、无 hydration 闪烁 */
.lp-faq summary { list-style: none; cursor: pointer; }
.lp-faq summary::-webkit-details-marker { display: none; }
.lp-faq summary .lp-faq-plus { transition: transform .2s ease; }
.lp-faq details[open] summary .lp-faq-plus { transform: rotate(45deg); }
`;

export default function LandingPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: BG,
        color: INK,
        fontSize: '14px',
        lineHeight: '1.5',
        letterSpacing: '-0.003em',
        WebkitFontSmoothing: 'antialiased',
        overflowX: 'hidden',
      }}
    >
      {/* SSR 注入的媒体查询:移动端单列 + sticky CTA,无 hydration 闪烁 */}
      <style dangerouslySetInnerHTML={{ __html: RESPONSIVE_CSS }} />

      {/* ── 2.1 NAV ───────────────────────────────────────────────────── */}
      <nav
        className="lp-nav"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 56px',
          background: 'rgba(251,251,253,0.85)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          position: 'sticky',
          top: 0,
          zIndex: 5,
          borderBottom: '1px solid rgba(0,0,0,0.04)',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 700,
            fontSize: '16px',
            letterSpacing: '-0.01em',
          }}
        >
          <span
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '10px',
              background: INK,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '14px',
              letterSpacing: '-0.02em',
            }}
          >
            C
          </span>
          <span>Coach</span>
        </div>

        {/* Nav links — 指向页面真实区块 */}
        <div
          className="lp-nav-links"
          style={{
            display: 'flex',
            gap: '32px',
            fontSize: '13.5px',
            color: SUB1,
            fontWeight: 500,
          }}
        >
          <a href="#dispatcher" style={{ color: SUB1, textDecoration: 'none' }}>
            对话调度台
          </a>
          <a href="#guardrails" style={{ color: SUB1, textDecoration: 'none' }}>
            防编造护栏
          </a>
          <a href="#features" style={{ color: SUB1, textDecoration: 'none' }}>
            能力全景
          </a>
        </div>

        {/* Right: login + CTA */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            fontSize: '13.5px',
            color: SUB1,
            fontWeight: 500,
          }}
        >
          <Link href="/login" style={{ color: SUB1, textDecoration: 'none', fontWeight: 500 }}>
            登录
          </Link>
          <Link
            href="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '6px 12px',
              borderRadius: '8px',
              background: INK,
              color: '#fff',
              fontSize: '12.5px',
              fontWeight: 600,
              textDecoration: 'none',
              letterSpacing: '-0.003em',
            }}
          >
            免费开始
          </Link>
        </div>
      </nav>

      {/* ── 2.2 HERO ──────────────────────────────────────────────────── */}
      <section
        className="lp-hero"
        style={{
          padding: '72px 56px 56px',
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: '48px',
          alignItems: 'center',
        }}
      >
        {/* Left — 文案块 */}
        <div className="lp-hero-copy">
          {/* Eyebrow — 人群预筛二合一 */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '999px',
              background: '#ffffff',
              border: `1px solid ${LINE}`,
              fontSize: '12.5px',
              fontWeight: 600,
              color: SUB1,
              marginBottom: '24px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: GREEN,
                flexShrink: 0,
              }}
            />
            <span>2026 秋招生 · 公测邀请制</span>
          </div>

          {/* H1 — 可证伪 */}
          <h1
            className="lp-h1"
            style={{
              margin: 0,
              fontSize: 'clamp(48px, 6.6vw, 76px)',
              lineHeight: 1.02,
              letterSpacing: '-0.04em',
              fontWeight: 800,
              color: INK,
            }}
          >
            把简历改到敢投,
            <br />
            但绝不替你<span style={{ color: BLUE }}>编一个数字。</span>
          </h1>

          {/* 副标题 — 一句机制 */}
          <p
            className="lp-subtitle lp-body"
            style={{
              marginTop: '24px',
              fontSize: '18px',
              color: SUB1,
              maxWidth: '42ch',
              lineHeight: 1.55,
              fontWeight: 500,
            }}
          >
            给 2026 秋招生的 AI 求职教练:你每段经历,它都逐条对着原文证据看一遍;想往上加的水分,由代码当场拦下 —— 不是求 AI 别乱来,是规则硬拦。
          </p>

          {/* CTA buttons — 主/次层级肉眼可分,全部 /login */}
          <div
            className="lp-cta-row"
            style={{ display: 'flex', gap: '10px', marginTop: '32px', flexWrap: 'wrap' }}
          >
            <Link
              href="/login"
              className="lp-cta-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '14px 24px',
                borderRadius: '12px',
                background: INK,
                color: '#fff',
                fontSize: '15px',
                fontWeight: 600,
                textDecoration: 'none',
                letterSpacing: '-0.003em',
                minHeight: '48px',
                boxSizing: 'border-box',
              }}
            >
              <span>免费诊断我的简历</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginLeft: '2px' }}>
                <path
                  d="M2 7h10M8 3l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            {/* 次 CTA — ghost 文字链层级,目的不同(已有账号) */}
            <Link
              href="/login"
              className="lp-cta-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '14px 22px',
                borderRadius: '12px',
                background: 'transparent',
                border: `1px solid ${LINE}`,
                color: SUB1,
                fontSize: '15px',
                fontWeight: 500,
                textDecoration: 'none',
                letterSpacing: '-0.003em',
                minHeight: '48px',
                boxSizing: 'border-box',
              }}
            >
              <span>已有邀请码?登录</span>
            </Link>
          </div>

          {/* 邀请码说明 — 紧贴 CTA */}
          <div style={{ marginTop: '14px', fontSize: '12.5px', color: SUB2, fontWeight: 500 }}>
            公测邀请码制 —— 还没有邀请码?试运行期间向我们索取。
          </div>

          {/* Meta 行 — 只放可兑现 */}
          <div
            className="lp-meta"
            style={{
              marginTop: '20px',
              fontSize: '12.5px',
              color: SUB2,
              fontWeight: 500,
              display: 'flex',
              gap: '18px',
              alignItems: 'center',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M6 1l1.2 3.6H11l-3 2.2 1.1 3.5L6 8.1l-3.1 2.2 1.1-3.5L1 4.6h3.8L6 1z"
                  stroke="currentColor"
                  strokeWidth="1.1"
                  strokeLinejoin="round"
                />
              </svg>
              <span>句句有据 · 信息不足就承认</span>
            </span>
            <span>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.1" />
                <path d="M6 3.4v2.6l1.6 1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
              </svg>
              <span>注册送 50 点 · 试运行期不收费</span>
            </span>
          </div>
        </div>

        {/* Right: Hero Card — 带护栏标注的真实产出(升级自演示对话)*/}
        <div
          className="lp-hero-card"
          style={{
            background: INK,
            color: '#fff',
            borderRadius: '28px',
            padding: '30px',
            aspectRatio: '1 / 1.05',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* Ambient gradient */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(800px 400px at 80% -20%,rgba(10,132,255,.32),transparent 60%), radial-gradient(600px 400px at -10% 110%,rgba(10,132,255,.18),transparent 60%)',
              pointerEvents: 'none',
            }}
          />

          {/* Top tag — 强调机器规则,非 AI 自觉 */}
          <div
            style={{
              display: 'inline-flex',
              alignSelf: 'flex-start',
              alignItems: 'center',
              gap: '6px',
              fontSize: '10.5px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.6)',
              border: '1px solid rgba(255,255,255,0.16)',
              borderRadius: '999px',
              padding: '5px 10px',
              position: 'relative',
              zIndex: 2,
            }}
          >
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: RED }} />
            确定性规则触发
          </div>

          {/* Conversation */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              marginTop: 'auto',
              marginBottom: '20px',
              position: 'relative',
              zIndex: 2,
            }}
          >
            {/* User bubble (弱句) */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexDirection: 'row-reverse' }}>
              <div
                style={{
                  background: BLUE,
                  color: '#fff',
                  borderRadius: '16px 16px 4px 16px',
                  padding: '10px 14px',
                  fontSize: '13.5px',
                  lineHeight: 1.5,
                  maxWidth: '82%',
                  fontWeight: 500,
                }}
              >
                这段项目把「用户增长 200%」写上去吧,看起来更有料。
              </div>
            </div>

            {/* Coach bubble + 红色拦截标注 */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
              {/* Coach avatar */}
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#0a0a0c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  overflow: 'hidden',
                }}
              >
                <svg viewBox="0 0 100 100" width="28" height="28">
                  <circle cx="50" cy="50" r="32" fill="#fafaf2" />
                  <rect x="22" y="32" width="56" height="4" rx="1" fill="#0a0a0c" />
                  <polygon points="22,32 78,32 50,22" fill="#0a0a0c" />
                  <circle cx="42" cy="52" r="2.4" fill="#0a0a0c" />
                  <circle cx="58" cy="52" r="2.4" fill="#0a0a0c" />
                  <circle cx="42.8" cy="51.4" r="0.8" fill="#fff" />
                  <circle cx="58.8" cy="51.4" r="0.8" fill="#fff" />
                  <path d="M 42 62 Q 50 68 58 62" stroke="#0a0a0c" strokeWidth="2" fill="none" strokeLinecap="round" />
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '86%' }}>
                <div
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    borderRadius: '16px 16px 16px 4px',
                    padding: '10px 14px',
                    fontSize: '13.5px',
                    lineHeight: 1.5,
                    fontWeight: 500,
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  你原文里没有这个数字,我不会替你写。说说你实际负责的部分和能查到的口径,我们把真实的写扎实。
                </div>
                {/* 红色拦截标注 */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'flex-start',
                    gap: '7px',
                    background: 'rgba(255,69,58,0.12)',
                    border: '1px solid rgba(255,69,58,0.35)',
                    borderRadius: '10px',
                    padding: '8px 11px',
                    fontSize: '12px',
                    lineHeight: 1.45,
                    color: '#ff938c',
                    fontWeight: 500,
                  }}
                >
                  <span style={{ flexShrink: 0, fontSize: '13px', lineHeight: 1.3 }}>⛔</span>
                  <span>
                    「增长 200%」没有分母 —— 已被护栏拦下,不会写进去。
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Signature */}
          <div
            style={{
              fontSize: '11.5px',
              color: 'rgba(255,255,255,0.45)',
              fontWeight: 500,
              letterSpacing: '0.02em',
              position: 'relative',
              zIndex: 2,
            }}
          >
            演示对话 · 真实产品里,编造会被代码护栏当场拦下
          </div>
        </div>
      </section>

      {/* ── 2.3 痛点共鸣(只共情不卖货)─────────────────────────────── */}
      <section
        className="lp-section"
        style={{ padding: '40px 56px 56px', maxWidth: '760px' }}
      >
        <p
          className="lp-body"
          style={{
            margin: 0,
            fontSize: 'clamp(22px, 3vw, 30px)',
            lineHeight: 1.5,
            letterSpacing: '-0.02em',
            fontWeight: 600,
            color: INK,
          }}
        >
          投出去几十份,大多没有回音。
          <br />
          改到第几版都不确定:写淡了怕没亮点,写满了又怕面试一问就穿帮。
          <br />
          <span style={{ color: SUB2 }}>这种悬着的感觉 —— 我们陪你,一条一条理清楚。</span>
        </p>
      </section>

      {/* ── 2.4 对话即调度台 Coach(最大差异化)──────────────────────── */}
      <section
        id="dispatcher"
        className="lp-section"
        style={{ padding: '24px 56px 24px', scrollMarginTop: '72px' }}
      >
        <div
          className="lp-section-head"
          style={{
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: '24px',
          }}
        >
          <h2
            className="lp-h2"
            style={{
              margin: 0,
              fontSize: 'clamp(30px, 4vw, 46px)',
              fontWeight: 800,
              letterSpacing: '-0.035em',
              lineHeight: 1.05,
              maxWidth: '16ch',
            }}
          >
            你说人话,Coach 配好下一步。
          </h2>
          <div
            className="lp-section-head-sub lp-body"
            style={{ fontSize: '15px', color: SUB1, maxWidth: '38ch', lineHeight: 1.55, fontWeight: 500 }}
          >
            不用学怎么用 —— 把你的处境讲给它听,它把下一步配好,你点一下就开始。
          </div>
        </div>

        {/* 演示卡(深色)*/}
        <div
          className="lp-dark"
          style={{
            background: INK,
            color: '#fff',
            borderRadius: '28px',
            padding: '36px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(700px 360px at 80% -10%,rgba(10,132,255,.2),transparent 60%)',
              pointerEvents: 'none',
            }}
          />
          <div style={{ position: 'relative', zIndex: 2 }}>
            {/* 用户气泡 */}
            <div style={{ display: 'flex', flexDirection: 'row-reverse', marginBottom: '14px' }}>
              <div
                style={{
                  background: BLUE,
                  color: '#fff',
                  borderRadius: '16px 16px 4px 16px',
                  padding: '11px 15px',
                  fontSize: '14px',
                  lineHeight: 1.5,
                  maxWidth: '70%',
                  fontWeight: 500,
                }}
              >
                下周有腾讯的产品岗面试,帮我准备一下。
              </div>
            </div>

            {/* Coach 回复 */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#0a0a0c',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                <svg viewBox="0 0 100 100" width="28" height="28">
                  <circle cx="50" cy="50" r="32" fill="#fafaf2" />
                  <rect x="22" y="32" width="56" height="4" rx="1" fill="#0a0a0c" />
                  <polygon points="22,32 78,32 50,22" fill="#0a0a0c" />
                  <circle cx="42" cy="52" r="2.4" fill="#0a0a0c" />
                  <circle cx="58" cy="52" r="2.4" fill="#0a0a0c" />
                  <path d="M 42 62 Q 50 68 58 62" stroke="#0a0a0c" strokeWidth="2" fill="none" strokeLinecap="round" />
                </svg>
              </div>
              <div
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  borderRadius: '16px 16px 16px 4px',
                  padding: '11px 15px',
                  fontSize: '14px',
                  lineHeight: 1.5,
                  maxWidth: '78%',
                  fontWeight: 500,
                  backdropFilter: 'blur(8px)',
                }}
              >
                好。我看了你的简历和这个岗位,先做这三件事最有用 —— 点哪张卡就从哪开始(点了才开始,不满意能退回):
              </div>
            </div>

            {/* 一排行动卡 — 只列真实 handoff 目标 */}
            <div
              className="lp-actioncards"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}
            >
              {[
                {
                  n: '①',
                  title: '针对腾讯产品岗 · 校招诊断',
                  route: '/diagnoses/campus',
                  icon: (
                    <path
                      d="M8 2l1.4 4.2H14l-3.5 2.6 1.3 4-3.8-2.7L4 12.8l1.3-4L1.8 6.2H6.6L8 2z"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinejoin="round"
                    />
                  ),
                },
                {
                  n: '②',
                  title: '模拟一轮产品岗面试',
                  route: '/mock',
                  icon: (
                    <>
                      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M6.5 5.8l4 2.2-4 2.2V5.8z" fill="currentColor" />
                    </>
                  ),
                },
                {
                  n: '③',
                  title: '改一版投腾讯的简历',
                  route: '/resumes',
                  icon: (
                    <>
                      <path d="M13 2H3a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V3a1 1 0 00-1-1z" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M5 6h6M5 9h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </>
                  ),
                },
              ].map((c, i) => (
                <div
                  key={i}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '16px',
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgba(255,255,255,0.85)',
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        {c.icon}
                      </svg>
                    </div>
                    <span style={{ fontFamily: MONO, fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                      {c.n}
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', lineHeight: 1.4, letterSpacing: '-0.01em' }}>
                    {c.title}
                  </div>
                  <div
                    style={{
                      marginTop: 'auto',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11.5px',
                      color: BLUE,
                      fontWeight: 600,
                    }}
                  >
                    <span style={{ fontFamily: MONO, color: 'rgba(255,255,255,0.4)' }}>{c.route}</span>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6h8M7 3l3 3-3 3" stroke={BLUE} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>

            {/* 微文案 — 降焦虑 */}
            <div style={{ marginTop: '18px', fontSize: '12.5px', color: 'rgba(255,255,255,0.5)', fontWeight: 500, lineHeight: 1.5 }}>
              点卡片才开始,扣点前会先告诉你;不满意可以退回 Coach 重新来。
            </div>
          </div>
        </div>
      </section>

      {/* ── 2.5 防编造护栏(从「说」到「秀」)──────────────────────────── */}
      <section
        id="guardrails"
        className="lp-section"
        style={{ padding: '40px 56px 24px', scrollMarginTop: '72px' }}
      >
        <div
          className="lp-dark"
          style={{
            background: INK,
            color: '#fff',
            borderRadius: '28px',
            padding: '40px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(700px 360px at 85% -10%,rgba(10,132,255,.22),transparent 60%)',
              pointerEvents: 'none',
            }}
          />
          <div
            className="lp-section-head"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              gap: '24px',
              marginBottom: '28px',
              position: 'relative',
              zIndex: 2,
            }}
          >
            <h2
              className="lp-h2-dark"
              style={{
                margin: 0,
                fontSize: 'clamp(28px, 3.6vw, 44px)',
                fontWeight: 800,
                letterSpacing: '-0.035em',
                lineHeight: 1.08,
                maxWidth: '20ch',
                color: '#fff',
              }}
            >
              别的工具帮你写得更像真的,
              <br />
              Coach 把编造<span style={{ color: BLUE }}>拦下来。</span>
            </h2>
            <div
              className="lp-section-head-sub"
              style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.6)', maxWidth: '32ch', lineHeight: 1.55, fontWeight: 500 }}
            >
              三道确定性护栏 —— 不靠 AI 自觉,靠代码硬拦。
            </div>
          </div>

          <div
            className="lp-grid-3"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', position: 'relative', zIndex: 2 }}
          >
            {/* 护栏 1 — 时间线勾稽 + 可视示意 */}
            <div style={guardrailCardStyle}>
              <div style={guardrailIconStyle}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M8 5v3l2 1.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </div>
              <h3 style={guardrailTitleStyle}>时间线勾稽</h3>
              <p style={guardrailDescStyle}>
                「实习早于入学」「项目结束比开始还早」这类 HR 一眼出局的硬伤,由纯代码扫原文抓出,写进报告最显眼处。
              </p>
              {/* 可视示意:一行经历旁标红 */}
              <div style={vizRowStyle}>
                <span style={{ color: 'rgba(255,255,255,0.75)' }}>2024.03 – 2024.06 · 某厂实习</span>
                <span style={redTagStyle}>时间对不上</span>
              </div>
            </div>

            {/* 护栏 2 — 可疑数字压分 + 78→61 可视 */}
            <div style={guardrailCardStyle}>
              <div style={guardrailIconStyle}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 2L4.5 14M11.5 2L10 14M2.5 5.5h11M2 10.5h11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </div>
              <h3 style={guardrailTitleStyle}>可疑数字压分</h3>
              <p style={guardrailDescStyle}>
                没有基数和口径的「增长 200%」不会被夸「数据扎实」—— 相关评分直接压制,改写只教你补上分母,不帮你圆谎。
              </p>
              {/* 可视示意:78 → 61 压分 */}
              <div style={{ ...vizRowStyle, justifyContent: 'flex-start', gap: '10px' }}>
                <span style={{ fontFamily: MONO, fontSize: '18px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textDecoration: 'line-through' }}>78</span>
                <svg width="16" height="12" viewBox="0 0 16 12" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M1 6h12M9 2l4 4-4 4" stroke={RED} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ fontFamily: MONO, fontSize: '18px', fontWeight: 700, color: RED }}>61</span>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.35, marginLeft: '2px' }}>
                  声称提升 40% 但简历无支撑 · 已压分
                </span>
              </div>
            </div>

            {/* 护栏 3 — 防编造溯源 + 张冠李戴 + 三态标注 */}
            <div style={guardrailCardStyle}>
              <div style={guardrailIconStyle}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1.5l5.5 2v4c0 3.4-2.3 5.9-5.5 7-3.2-1.1-5.5-3.6-5.5-7v-4l5.5-2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                  <path d="M5.5 8l1.8 1.8L10.8 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 style={guardrailTitleStyle}>防编造溯源 + 张冠李戴护栏</h3>
              <p style={guardrailDescStyle}>
                改写里新增的任何数字、经历,必须能在你原文里找到出处,且要跟这条技能真的相关 —— 对不上就拦下不发。
              </p>
              {/* 可视示意:三态标注 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                <span style={triStateStyle}>
                  <span style={triDotStyle(GREEN)} />已核实
                </span>
                <span style={triStateStyle}>
                  <span style={triDotStyle('#ffd60a')} />需你确认
                </span>
                <span style={triStateStyle}>
                  <span style={triDotStyle('rgba(255,255,255,0.4)')} />无依据已删
                </span>
              </div>
            </div>
          </div>

          {/* 坦诚一句(诚实红线 3)*/}
          <div
            style={{
              marginTop: '20px',
              fontSize: '12.5px',
              color: 'rgba(255,255,255,0.5)',
              fontWeight: 500,
              lineHeight: 1.55,
              position: 'relative',
              zIndex: 2,
            }}
          >
            护栏不是万能 —— 极复杂的多段经历交叉,仍可能判错;拿不准的,我们会标出来让你确认,而不是替你拍板。
          </div>
        </div>
      </section>

      {/* ── 2.6 价值观对比(紧凑对比框)─────────────────────────────── */}
      <section className="lp-section" style={{ padding: '40px 56px 24px' }}>
        <h2
          className="lp-h2"
          style={{
            margin: '0 0 28px',
            fontSize: 'clamp(30px, 4vw, 46px)',
            fontWeight: 800,
            letterSpacing: '-0.035em',
            lineHeight: 1.05,
            maxWidth: '20ch',
          }}
        >
          别人帮你过机器,我们帮你过<span style={{ color: BLUE }}>面试官。</span>
        </h2>

        <div
          className="lp-compare"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}
        >
          {/* 左:通用 AI / 简历工具 */}
          <div
            style={{
              background: '#ffffff',
              border: `1px solid ${LINE}`,
              borderRadius: '20px',
              padding: '26px 28px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, color: SUB2, marginBottom: '16px', letterSpacing: '0.02em' }}>
              通用 AI / 简历工具
            </div>
            {['塞关键词过 ATS', '把经历写得更漂亮', '漂亮到面试官一问就穿帮'].map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 0', fontSize: '14.5px', color: SUB1, fontWeight: 500, lineHeight: 1.5 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: '3px' }}>
                  <circle cx="8" cy="8" r="6.5" stroke={SUB3} strokeWidth="1.2" />
                  <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke={SUB3} strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <span>{t}</span>
              </div>
            ))}
          </div>

          {/* 右:Coach */}
          <div
            style={{
              background: '#ffffff',
              border: `1px solid ${BLUE}`,
              borderRadius: '20px',
              padding: '26px 28px',
              boxShadow: '0 0 0 1px rgba(10,132,255,0.12), 0 8px 24px rgba(10,132,255,0.06)',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, color: BLUE, marginBottom: '16px', letterSpacing: '0.02em' }}>
              Coach
            </div>
            {['每句都能在面试里站得住', '可疑数字反而被压分', '教你补口径,不帮你圆谎'].map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 0', fontSize: '14.5px', color: INK, fontWeight: 500, lineHeight: 1.5 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: '3px' }}>
                  <circle cx="8" cy="8" r="6.5" stroke={GREEN} strokeWidth="1.2" />
                  <path d="M5 8l2 2 4-4" stroke={GREEN} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 2.7 能力全景(合并瘦身 · 动词+收益)──────────────────────── */}
      <section
        id="features"
        className="lp-section"
        style={{ padding: '40px 56px 24px', scrollMarginTop: '72px' }}
      >
        <div
          className="lp-section-head"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '24px', marginBottom: '24px' }}
        >
          <h2
            className="lp-h2"
            style={{ margin: 0, fontSize: 'clamp(26px, 3.4vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.08, maxWidth: '20ch' }}
          >
            一个对话起步,背后是一整套陪跑工具。
          </h2>
          <div
            className="lp-section-head-sub"
            style={{ fontSize: '13.5px', color: SUB2, fontWeight: 500, maxWidth: '28ch', textAlign: 'right' }}
          >
            登录后,这些都在。
          </div>
        </div>

        <div
          className="lp-grid-3"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}
        >
          {[
            {
              title: '职业地图 · AI 能力盘点',
              desc: '看清这个方向要哪些能力,逐条标出你够不够 —— 评分区分平台评 / 你自评,你能自己改。',
              note: '非权威评估,自评可覆盖',
              slash: '/career',
              icon: (
                <>
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M8 1.5V8l3.5 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </>
              ),
            },
            {
              title: '行业趋势(实时联网)',
              desc: '这个秋招季,你目标岗位的 JD 在要什么新技能 —— 实时检索、标注来源;查不到就说查不到。',
              note: '来源 AI 自产、不可用直说',
              slash: '/industry-trend',
              icon: (
                <>
                  <path d="M2 12l3.5-4 3 2.5L13 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9.5 4H13v3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </>
              ),
            },
            {
              title: '简历馆',
              desc: '多版管理,改了哪版都找得回,一键采纳、随时回滚。',
              note: null,
              slash: '/resumes',
              icon: (
                <>
                  <path d="M13 2H3a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V3a1 1 0 00-1-1z" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M5 6h6M5 9h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </>
              ),
            },
            {
              title: '模拟面试',
              desc: '按 JD 出题,库里没有的公司还能联网补背景,逐题给反馈。',
              note: null,
              slash: '/mock',
              icon: (
                <>
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M6.5 5.8l4 2.2-4 2.2V5.8z" fill="currentColor" />
                </>
              ),
            },
            {
              title: '投递追踪',
              desc: '六阶段看板,每家进展一眼看清,该跟进的不漏。',
              note: null,
              slash: '/applications',
              icon: (
                <>
                  <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M5 8h6M5 5h6M5 11h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </>
              ),
            },
            {
              title: '求职信 · 面试复盘 · 薪资对标',
              desc: '从投递到复盘,该有的都在侧栏。',
              note: null,
              slash: '/cover-letter',
              icon: (
                <>
                  <path d="M2 4l6 4 6-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                </>
              ),
            },
          ].map((tile, i) => (
            <div
              key={i}
              style={{
                background: '#ffffff',
                border: `1px solid ${LINE}`,
                borderRadius: '16px',
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: '#f5f5f7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: SUB1,
                  border: `1px solid ${LINE}`,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  {tile.icon}
                </svg>
              </div>
              <h4 style={{ margin: 0, fontSize: '15.5px', fontWeight: 600, letterSpacing: '-0.005em' }}>{tile.title}</h4>
              <p className="lp-body" style={{ margin: 0, fontSize: '13px', color: SUB2, lineHeight: 1.55, fontWeight: 500 }}>
                {tile.desc}
              </p>
              {tile.note && (
                <span
                  style={{
                    display: 'inline-block',
                    alignSelf: 'flex-start',
                    fontSize: '10.5px',
                    color: SUB2,
                    background: '#f5f5f7',
                    border: `1px solid ${LINE}`,
                    borderRadius: '6px',
                    padding: '2px 7px',
                    fontWeight: 500,
                  }}
                >
                  {tile.note}
                </span>
              )}
              <span
                style={{
                  marginTop: 'auto',
                  paddingTop: '6px',
                  fontFamily: MONO,
                  fontSize: '10.5px',
                  color: SUB3,
                  fontWeight: 500,
                  letterSpacing: '0.02em',
                }}
              >
                {tile.slash}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── 2.8 点数说明(一句话,非定价表)─────────────────────────── */}
      <section className="lp-section" style={{ padding: '32px 56px 24px' }}>
        <div
          style={{
            background: '#ffffff',
            border: `1px solid ${LINE}`,
            borderRadius: '20px',
            padding: '28px 32px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '18px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: '#f5f5f7',
              border: `1px solid ${LINE}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: SUB1,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M10 6v8M7.5 8.2c0-1.2 1-2 2.5-2s2.5.7 2.5 1.8c0 1-0.8 1.5-2.5 2s-2.5 1-2.5 2c0 1.1 1 1.8 2.5 1.8s2.5-.8 2.5-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
          <p
            className="lp-points lp-body"
            style={{ margin: 0, fontSize: '16px', color: INK, lineHeight: 1.6, fontWeight: 500, maxWidth: '68ch' }}
          >
            <strong style={{ fontWeight: 700 }}>注册即送 50 点。</strong> 每次让 AI 帮你生成(诊断、改写、模拟面试…)用 1 点 —— 够你把简历反复打磨、面试练上很多回。<strong style={{ fontWeight: 700 }}>试运行期间不收费,点数用完可免费申请充值。</strong>
          </p>
        </div>
      </section>

      {/* ── 2.9 质量证据(保留盲评)──────────────────────────────────── */}
      <section className="lp-section" style={{ margin: '24px 56px 0', padding: '40px 0', borderTop: `1px solid ${LINE}` }}>
        <div
          className="lp-section-head"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '24px', marginBottom: '24px' }}
        >
          <h3
            className="lp-h2"
            style={{ margin: 0, fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, maxWidth: '22ch' }}
          >
            质量是验出来的,不是宣称的。
          </h3>
          <div
            className="lp-section-head-sub"
            style={{ fontSize: '13px', color: SUB2, fontWeight: 500, maxWidth: '34ch', textAlign: 'right' }}
          >
            不是用户量证明 —— 是我们上线前逐份盲评、逐个按钮走查出来的。
          </div>
        </div>

        <div className="lp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          {[
            {
              title: '上线前，先被自己往死里挑',
              desc: '上线前做了多轮对抗式盲审 —— 用多种身份模拟真实求职者、专门找茬：看它会不会被「再吹一吹、包装得亮眼点」带着替你编。实测它只精炼你写过的话，缺的能力关进「建议补充」，不替你编一个数字。',
              meta: '防编造能力 · 发布前对抗盲审',
            },
            {
              title: '两轮全站逐按钮走查',
              desc: '每个按钮、每条流程人工走一遍,P0 / P1 缺陷全部闭环 —— 上线前先把自己挑剔一遍,而不是等你来踩坑。',
              meta: '工程质量 · 发布前验收',
            },
          ].map((card, i) => (
            <div
              key={i}
              style={{
                background: '#ffffff',
                border: `1px solid ${LINE}`,
                borderRadius: '20px',
                padding: '28px 30px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ fontSize: '17px', fontWeight: 700, letterSpacing: '-0.015em', color: INK }}>{card.title}</div>
              <div className="lp-body" style={{ fontSize: '14px', lineHeight: 1.55, color: SUB1, fontWeight: 500 }}>{card.desc}</div>
              <div style={{ marginTop: 'auto', fontSize: '11.5px', color: SUB2, fontWeight: 600, letterSpacing: '0.02em' }}>{card.meta}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 2.10 FAQ / 异议处理(4 条,可展开)──────────────────────── */}
      <section className="lp-section lp-faq" style={{ padding: '48px 56px 24px' }}>
        <h3
          className="lp-h2"
          style={{ margin: '0 0 24px', fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 }}
        >
          几个你可能在想的问题。
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '820px' }}>
          {[
            {
              q: '和 ChatGPT 改简历有啥区别?',
              a: 'ChatGPT 会顺着你说的把数据写好看;Coach 用代码拦着你别这么干 —— 帮你过的是面试官,不是机器。',
            },
            {
              q: '公测免费,以后会收费吗?',
              a: '现在试运行期间不收费。往后是点数制,注册先送 50 点;点数用完,试运行期可免费申请充值。(未来定价方向是 10 元 50 点,正式收费前会另行说明。)',
            },
            {
              q: '会把我简历泄露 / 拿去训练吗?',
              a: '你的简历只用来给你做诊断和改写。',
            },
            {
              q: '没有邀请码怎么办?',
              a: '公测邀请制 —— 试运行期间向我们索取邀请码即可。',
            },
            {
              q: '护栏的技术原理是什么?(展开看)',
              a: '时间线勾稽:纯代码扫描简历原文里的日期,找出「实习早于入学」「结束早于开始」这类硬伤。可疑数字压分:对没有基数 / 口径的夸张数字,相关维度评分直接压制。邻近窗口相关性(张冠李戴护栏):改写新增的数字 / 经历必须能在你原文邻近上下文里找到出处、且与该技能相关,对不上就拦。坦诚一句:极复杂的多段经历交叉复用,护栏仍可能误判 —— 拿不准的我们会标出来让你确认,而不是替你拍板。',
            },
          ].map((item, i) => (
            <details
              key={i}
              style={{
                background: '#ffffff',
                border: `1px solid ${LINE}`,
                borderRadius: '14px',
                padding: '0',
                overflow: 'hidden',
              }}
            >
              <summary
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  padding: '18px 22px',
                  fontSize: '15.5px',
                  fontWeight: 600,
                  color: INK,
                  letterSpacing: '-0.01em',
                }}
              >
                <span>{item.q}</span>
                <span
                  className="lp-faq-plus"
                  style={{ flexShrink: 0, display: 'inline-flex', color: SUB2 }}
                  aria-hidden="true"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
              </summary>
              <div
                className="lp-body"
                style={{ padding: '0 22px 20px', fontSize: '14px', color: SUB1, lineHeight: 1.6, fontWeight: 500, maxWidth: '72ch' }}
              >
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ── 2.11 收尾 CTA + 边界坦诚 ──────────────────────────────────── */}
      <section className="lp-footer" style={{ padding: '64px 56px 88px', textAlign: 'center' }}>
        <h2
          className="lp-footer-h2"
          style={{ margin: 0, fontSize: 'clamp(38px, 6vw, 64px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.05 }}
        >
          先传一份简历,
          <br />
          <span style={{ color: BLUE }}>听它说真话。</span>
        </h2>
        <p className="lp-body" style={{ margin: '18px auto 0', fontSize: '17px', color: SUB2, fontWeight: 500, maxWidth: '40ch', lineHeight: 1.55 }}>
          句句有据,信息不足就承认。注册送 50 点,试运行期间不收费。
        </p>
        {/* 边界坦诚一行 */}
        <p style={{ margin: '12px auto 28px', fontSize: '13px', color: SUB3, fontWeight: 500, maxWidth: '44ch', lineHeight: 1.5 }}>
          它不做什么:不替你编经历、不承诺 offer、暂不覆盖社招 / 海外岗。
        </p>

        <div className="lp-cta-row" style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/login"
            className="lp-cta-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '14px 24px',
              borderRadius: '12px',
              background: INK,
              color: '#fff',
              fontSize: '15px',
              fontWeight: 600,
              textDecoration: 'none',
              letterSpacing: '-0.003em',
              minHeight: '48px',
              boxSizing: 'border-box',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>免费诊断我的简历</span>
          </Link>
          <Link
            href="/login"
            className="lp-cta-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '14px 22px',
              borderRadius: '12px',
              background: 'transparent',
              border: `1px solid ${LINE}`,
              color: SUB1,
              fontSize: '15px',
              fontWeight: 500,
              textDecoration: 'none',
              letterSpacing: '-0.003em',
              minHeight: '48px',
              boxSizing: 'border-box',
            }}
          >
            <span>已有邀请码?登录</span>
          </Link>
        </div>

        <div style={{ marginTop: '14px', fontSize: '12.5px', color: SUB2, fontWeight: 500 }}>
          公测邀请码制 —— 还没有邀请码?试运行期间向我们索取。
        </div>

        <div
          style={{
            marginTop: '36px',
            fontSize: '12px',
            color: SUB3,
            fontWeight: 500,
            display: 'flex',
            justifyContent: 'center',
            gap: '24px',
            flexWrap: 'wrap',
          }}
        >
          <span>句句有据 · 信息不足就承认</span>
          <span>注册送 50 点 · 试运行期不收费</span>
          <span>Coach 公测版</span>
        </div>
      </section>

      {/* ── 2.12 移动端 sticky 底部 CTA 条(默认隐藏,≤760px 显示)──── */}
      <div
        className="lp-sticky-cta"
        style={{
          display: 'none',
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 20,
          padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
          background: 'rgba(251,251,253,0.92)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderTop: `1px solid ${LINE}`,
        }}
      >
        <Link
          href="/login"
          style={{
            display: 'flex',
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '7px',
            padding: '14px',
            borderRadius: '12px',
            background: INK,
            color: '#fff',
            fontSize: '16px',
            fontWeight: 600,
            textDecoration: 'none',
            minHeight: '48px',
            boxSizing: 'border-box',
          }}
        >
          <span>免费诊断我的简历</span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

// ── 护栏卡共享样式(深色块内)──
const guardrailCardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '16px',
  padding: '22px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  backdropFilter: 'blur(8px)',
};

const guardrailIconStyle: React.CSSProperties = {
  width: '34px',
  height: '34px',
  borderRadius: '10px',
  background: 'rgba(255,255,255,0.08)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'rgba(255,255,255,0.85)',
  border: '1px solid rgba(255,255,255,0.12)',
};

const guardrailTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '16px',
  fontWeight: 700,
  letterSpacing: '-0.01em',
  color: '#fff',
};

const guardrailDescStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '13px',
  color: 'rgba(255,255,255,0.65)',
  lineHeight: 1.55,
  fontWeight: 500,
};

// 可视示意:经历行
const vizRowStyle: React.CSSProperties = {
  marginTop: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
  background: 'rgba(0,0,0,0.25)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '10px',
  padding: '9px 11px',
  fontSize: '12px',
  fontWeight: 500,
};

const redTagStyle: React.CSSProperties = {
  flexShrink: 0,
  fontSize: '11px',
  fontWeight: 600,
  color: '#ff938c',
  background: 'rgba(255,69,58,0.12)',
  border: '1px solid rgba(255,69,58,0.35)',
  borderRadius: '6px',
  padding: '2px 7px',
};

// 三态标注
const triStateStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '7px',
  fontSize: '12px',
  fontWeight: 500,
  color: 'rgba(255,255,255,0.7)',
};

function triDotStyle(color: string): React.CSSProperties {
  return {
    width: '8px',
    height: '8px',
    borderRadius: '2px',
    background: color,
    flexShrink: 0,
  };
}
