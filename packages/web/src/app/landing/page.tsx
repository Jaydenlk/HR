import Link from 'next/link';

// ── Coach Landing Page ─────────────────────────────────────────────────────
// Apple-disciplined, single brand color, generous whitespace.
// Static marketing content — no API calls.
// 诚实化原则:页面上只允许两类内容——
//   1. 源自代码/README 的真实能力描述(90 职业 × 双难度档、三道护栏、盲评结果等);
//   2. 明确标注「演示 / 示例」的界面示意。
// 禁止出现任何虚构的用户数、提分数、岗位数、用户评价。

export default function LandingPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#fbfbfd',
        color: '#1d1d1f',
        fontSize: '14px',
        lineHeight: '1.5',
        letterSpacing: '-0.003em',
        WebkitFontSmoothing: 'antialiased',
        overflowX: 'hidden',
      }}
    >
      {/* ── NAV ───────────────────────────────────────────────────────── */}
      <nav
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
              background: '#1d1d1f',
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

        {/* Nav links — 指向页面真实区块,不放虚构入口 */}
        <div
          style={{
            display: 'flex',
            gap: '32px',
            fontSize: '13.5px',
            color: '#424245',
            fontWeight: 500,
          }}
        >
          <a href="#steps" style={{ color: '#424245', textDecoration: 'none' }}>
            三步上手
          </a>
          <a href="#guardrails" style={{ color: '#424245', textDecoration: 'none' }}>
            防编造护栏
          </a>
          <a href="#features" style={{ color: '#424245', textDecoration: 'none' }}>
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
            color: '#424245',
            fontWeight: 500,
          }}
        >
          <Link
            href="/login"
            style={{
              color: '#424245',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            登录
          </Link>
          <Link
            href="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '6px 12px',
              borderRadius: '8px',
              background: '#1d1d1f',
              color: '#fff',
              fontSize: '12.5px',
              fontWeight: 600,
              textDecoration: 'none',
              letterSpacing: '-0.003em',
            }}
          >
            开始使用
          </Link>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section
        style={{
          padding: '72px 56px 56px',
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: '48px',
          alignItems: 'center',
        }}
      >
        {/* Left */}
        <div>
          {/* Tag — 公测口径,不放虚构用户数 */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '999px',
              background: '#ffffff',
              border: '1px solid #e5e5e7',
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#424245',
              marginBottom: '24px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#34c759',
                flexShrink: 0,
              }}
            />
            <span>公测进行中 · 邀请码制 · 试运行期免费</span>
          </div>

          {/* H1 */}
          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(52px, 7vw, 80px)',
              lineHeight: 1,
              letterSpacing: '-0.04em',
              fontWeight: 800,
              color: '#1d1d1f',
            }}
          >
            陪你跑完
            <br />
            整个<span style={{ color: '#0a84ff' }}>秋招。</span>
          </h1>

          {/* Subtitle — 一句话讲清产品 */}
          <p
            style={{
              marginTop: '24px',
              fontSize: '18px',
              color: '#424245',
              maxWidth: '36ch',
              lineHeight: 1.55,
              fontWeight: 500,
            }}
          >
            给校招生的 AI 求职教练：诊断简历、改写表达、陪跑求职
            <br />
            —— 句句有据，绝不编造。
          </p>

          {/* CTA buttons — 全部指向 /login */}
          <div
            style={{
              display: 'flex',
              gap: '10px',
              marginTop: '36px',
              flexWrap: 'wrap',
            }}
          >
            <Link
              href="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '12px 22px',
                borderRadius: '12px',
                background: '#1d1d1f',
                color: '#fff',
                fontSize: '15px',
                fontWeight: 600,
                textDecoration: 'none',
                letterSpacing: '-0.003em',
              }}
            >
              <span>免费开始</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                style={{ marginLeft: '2px' }}
              >
                <path
                  d="M2 7h10M8 3l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <Link
              href="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '12px 22px',
                borderRadius: '12px',
                background: '#ffffff',
                border: '1px solid #e5e5e7',
                color: '#1d1d1f',
                fontSize: '15px',
                fontWeight: 600,
                textDecoration: 'none',
                letterSpacing: '-0.003em',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect
                  x="2"
                  y="5"
                  width="10"
                  height="7"
                  rx="1.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="M4.5 5V3.8a2.5 2.5 0 015 0V5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
              <span>已有邀请码？登录</span>
            </Link>
          </div>

          {/* 邀请码说明 — 紧贴 CTA */}
          <div
            style={{
              marginTop: '14px',
              fontSize: '12.5px',
              color: '#6e6e73',
              fontWeight: 500,
            }}
          >
            公测邀请码制 —— 还没有邀请码？试运行期间向我们索取。
          </div>

          {/* Meta line — 只放可兑现的承诺 */}
          <div
            style={{
              marginTop: '20px',
              fontSize: '12.5px',
              color: '#6e6e73',
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
                <rect
                  x="1"
                  y="4"
                  width="10"
                  height="7"
                  rx="1.5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
                <path
                  d="M3.5 4V3a2.5 2.5 0 015 0v1"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
              <span>试运行期免费 · 配额防滥用</span>
            </span>
          </div>
        </div>

        {/* Right: Hero Card — 明确标注「演示对话」,展示拒绝编造的产品人设 */}
        <div
          style={{
            background: '#1d1d1f',
            color: '#fff',
            borderRadius: '28px',
            padding: '32px',
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

          {/* Top line */}
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.5)',
              position: 'relative',
              zIndex: 2,
            }}
          >
            Coach · 演示对话
          </div>

          {/* Conversation */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              marginTop: 'auto',
              marginBottom: '24px',
              position: 'relative',
              zIndex: 2,
            }}
          >
            {/* User bubble */}
            <div
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-end',
                flexDirection: 'row-reverse',
              }}
            >
              <div
                style={{
                  background: '#0a84ff',
                  color: '#fff',
                  borderRadius: '16px 16px 4px 16px',
                  padding: '10px 14px',
                  fontSize: '13.5px',
                  lineHeight: 1.5,
                  maxWidth: '80%',
                  fontWeight: 500,
                }}
              >
                这段项目经历太平了，数据帮我写好看点行吗？
              </div>
            </div>

            {/* Coach bubble */}
            <div
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-end',
              }}
            >
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
              <div
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  borderRadius: '16px 16px 16px 4px',
                  padding: '10px 14px',
                  fontSize: '13.5px',
                  lineHeight: 1.5,
                  maxWidth: '80%',
                  fontWeight: 500,
                  backdropFilter: 'blur(8px)',
                }}
              >
                不行。你原文里没有的数字，我不会替你编。但你已有的经历可以说得更有分量——补上口径和你负责的部分，每一句都能在你的简历里找到出处。
              </div>
            </div>

            {/* User bubble 2 */}
            <div
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-end',
                flexDirection: 'row-reverse',
              }}
            >
              <div
                style={{
                  background: '#0a84ff',
                  color: '#fff',
                  borderRadius: '16px 16px 4px 16px',
                  padding: '10px 14px',
                  fontSize: '13.5px',
                  lineHeight: 1.5,
                  maxWidth: '80%',
                  fontWeight: 500,
                }}
              >
                行，那就按真实的改。
              </div>
            </div>
          </div>

          {/* Signature */}
          <div
            style={{
              fontSize: '11.5px',
              color: 'rgba(255,255,255,0.45)',
              fontWeight: 500,
              letterSpacing: '0.04em',
              position: 'relative',
              zIndex: 2,
            }}
          >
            — 演示对话 · 真实产品里，编造会被代码护栏直接拦下
          </div>
        </div>
      </section>

      {/* ── BETA STRIP — 公测口径,定性表述,不放虚构指标 ─────────────────── */}
      <div
        style={{
          padding: '0 56px 32px',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          borderTop: '1px solid #e5e5e7',
        }}
      >
        {[
          { value: '公测进行中', label: '邀请码制 · 试运行期免费' },
          { value: '句句有据', label: '拒绝编造 · 信息不足就承认' },
          { value: '90 × 2', label: '职业预设 × 校招难度档' },
          { value: '三道护栏', label: '编造在产出前被代码拦下' },
        ].map((s, i) => (
          <div
            key={i}
            style={{
              padding: '24px 4px 0',
              borderRight: i < 3 ? '1px solid #e5e5e7' : 'none',
              paddingLeft: i === 0 ? 0 : '4px',
            }}
          >
            <div
              style={{
                fontSize: '26px',
                fontWeight: 700,
                letterSpacing: '-0.025em',
                lineHeight: 1,
                color: '#1d1d1f',
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#6e6e73',
                marginTop: '6px',
                fontWeight: 500,
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── 三步上手 ──────────────────────────────────────────────────── */}
      <section id="steps" style={{ padding: '64px 56px 24px', scrollMarginTop: '72px' }}>
        <div
          style={{
            marginBottom: '32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: '24px',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 'clamp(32px, 4vw, 48px)',
              fontWeight: 800,
              letterSpacing: '-0.035em',
              lineHeight: 1.05,
              maxWidth: '18ch',
            }}
          >
            三步上手。
          </h2>
          <div
            style={{
              fontSize: '15px',
              color: '#424245',
              maxWidth: '36ch',
              lineHeight: 1.55,
              fontWeight: 500,
            }}
          >
            不需要学习成本 —— 传一份简历，剩下的它带你走。
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '14px',
          }}
        >
          {[
            {
              step: '1',
              icon: (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M13 2H3a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V3a1 1 0 00-1-1z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M5 6h6M5 9h4"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              ),
              title: '传简历',
              desc: '上传或粘贴你的简历，建立版本档案 —— 之后每一次改写都可回溯、可回滚。',
            },
            {
              step: '2',
              icon: (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 2l1.4 4.2H14l-3.5 2.6 1.3 4-3.8-2.7L4 12.8l1.3-4L1.8 6.2H6.6L8 2z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                </svg>
              ),
              title: '跑校招诊断',
              desc: '选目标职业，按 90 职业 × 双难度档的校招标尺逐维评分 —— 每个判断都给理由和证据。',
            },
            {
              step: '3',
              icon: (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M2 8h12M9 3l5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ),
              title: '按建议改 + 陪跑投递',
              desc: '逐条 before / after 改写，然后投递看板、模拟面试、复盘一路陪跑到 offer。',
            },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                background: '#ffffff',
                border: '1px solid #e5e5e7',
                borderRadius: '20px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
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
                    color: '#424245',
                    border: '1px solid #e5e5e7',
                  }}
                >
                  {s.icon}
                </div>
                <span
                  style={{
                    fontFamily: '"JetBrains Mono",ui-monospace,monospace',
                    fontSize: '12px',
                    color: '#a1a1a6',
                    fontWeight: 600,
                  }}
                >
                  0{s.step}
                </span>
              </div>
              <h3
                style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: 700,
                  letterSpacing: '-0.015em',
                }}
              >
                {s.title}
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: '13.5px',
                  color: '#6e6e73',
                  lineHeight: 1.55,
                  fontWeight: 500,
                }}
              >
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 三道防编造护栏 — 差异化卖点 ───────────────────────────────── */}
      <section id="guardrails" style={{ padding: '40px 56px 24px', scrollMarginTop: '72px' }}>
        <div
          style={{
            background: '#1d1d1f',
            color: '#fff',
            borderRadius: '28px',
            padding: '40px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Ambient gradient */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(700px 360px at 85% -10%,rgba(10,132,255,.22),transparent 60%)',
              pointerEvents: 'none',
            }}
          />
          <div
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
              别的工具帮你写得更像真的，
              <br />
              Coach 把编造<span style={{ color: '#0a84ff' }}>拦下来。</span>
            </h2>
            <div
              style={{
                fontSize: '13.5px',
                color: 'rgba(255,255,255,0.6)',
                maxWidth: '32ch',
                lineHeight: 1.55,
                fontWeight: 500,
              }}
            >
              三道确定性护栏 —— 不靠 AI 自觉，靠代码硬拦。
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '14px',
              position: 'relative',
              zIndex: 2,
            }}
          >
            {[
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
                    <path
                      d="M8 5v3l2 1.2"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  </svg>
                ),
                title: '时间线勾稽',
                desc: '「实习早于入学」「项目结束比开始还早」这类 HR 一眼出局的硬伤，由纯代码扫描简历原文抓出，写进报告最显眼处。',
              },
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M6 2L4.5 14M11.5 2L10 14M2.5 5.5h11M2 10.5h11"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  </svg>
                ),
                title: '可疑数字禁背书',
                desc: '没有基数和口径的「增长 200%」不会被夸「数据扎实」—— 相关评分直接压制，改写建议教你补上分母，而不是帮你圆谎。',
              },
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M8 1.5l5.5 2v4c0 3.4-2.3 5.9-5.5 7-3.2-1.1-5.5-3.6-5.5-7v-4l5.5-2z"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M5.5 8l1.8 1.8L10.8 6"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ),
                title: '防编造溯源',
                desc: '改写产出里新增的任何数字、经历，必须能在你的原文里找到出处 —— 找不到，就拦下不发。',
              },
            ].map((g, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '16px',
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255,255,255,0.85)',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  {g.icon}
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: 700,
                    letterSpacing: '-0.01em',
                    color: '#fff',
                  }}
                >
                  {g.title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.65)',
                    lineHeight: 1.55,
                    fontWeight: 500,
                  }}
                >
                  {g.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PILLARS — 四个视角 ────────────────────────────────────────── */}
      <section style={{ padding: '40px 56px 24px' }}>
        {/* Heading */}
        <div
          style={{
            marginBottom: '32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: '24px',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 'clamp(32px, 4vw, 48px)',
              fontWeight: 800,
              letterSpacing: '-0.035em',
              lineHeight: 1.05,
              maxWidth: '18ch',
            }}
          >
            四个视角 ——<br />把秋招分成可以做的事。
          </h2>
          <div
            style={{
              fontSize: '15px',
              color: '#424245',
              maxWidth: '36ch',
              lineHeight: 1.55,
              fontWeight: 500,
            }}
          >
            求职不是一件事 —— 它是每天的、每周的、每场面试的、和整体的。Coach 给你四个对应的视角。
          </div>
        </div>

        {/* Pillar grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.3fr 1fr 1fr',
            gridTemplateRows: 'auto auto',
            gridTemplateAreas: '"a b c" "a d e"',
            gap: '14px',
          }}
        >
          {/* A — Today (hero, dark) */}
          <div
            style={{
              gridArea: 'a',
              background: '#1d1d1f',
              color: '#fff',
              borderRadius: '20px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              minHeight: '494px',
              border: '1px solid #1d1d1f',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'radial-gradient(500px 300px at 80% 20%,rgba(10,132,255,.16),transparent 60%)',
                pointerEvents: 'none',
              }}
            />
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.55)',
                position: 'relative',
                zIndex: 2,
              }}
            >
              日 · TODAY
            </span>
            <h3
              style={{
                margin: 0,
                fontSize: '40px',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                lineHeight: 1.05,
                color: '#fff',
                position: 'relative',
                zIndex: 2,
              }}
            >
              今天
              <br />
              该做什么？
            </h3>
            <p
              style={{
                fontSize: '13.5px',
                color: 'rgba(255,255,255,0.7)',
                lineHeight: 1.5,
                fontWeight: 500,
                maxWidth: '36ch',
                position: 'relative',
                zIndex: 2,
              }}
            >
              今日任务把投递、练习、复盘排成一张清单 —— 做完今天的就可以休息。
            </p>

            {/* Today 示例清单 — 演示界面,非真实用户数据 */}
            <div
              style={{
                marginTop: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                position: 'relative',
                zIndex: 2,
              }}
            >
              {[
                { done: true, text: '目标岗位 JD 解析', dur: '15m' },
                { done: true, text: '简历针对岗位逐条改写', dur: '30m' },
                { done: false, text: '模拟面试 · 一轮', dur: '20m' },
                { done: false, text: '昨天一面 · 复盘录入', dur: '10m' },
                { done: false, text: '投递看板 · 状态更新', dur: '5m' },
              ].map((row, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '11px 14px',
                    background: row.done
                      ? 'rgba(52,199,89,0.16)'
                      : 'rgba(255,255,255,0.06)',
                    borderRadius: '12px',
                    fontSize: '13.5px',
                    color: row.done ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.92)',
                    fontWeight: 500,
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <span
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      border: row.done ? 'none' : '1.5px solid rgba(255,255,255,0.25)',
                      background: row.done ? '#34c759' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: '#fff',
                    }}
                  >
                    {row.done && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path
                          d="M2 5l2.5 2.5L8 3"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <span style={{ flex: 1 }}>{row.text}</span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontFamily: '"JetBrains Mono",ui-monospace,monospace',
                      fontSize: '11px',
                      opacity: 0.7,
                      fontWeight: 500,
                    }}
                  >
                    {row.dur}
                  </span>
                </div>
              ))}
              <div
                style={{
                  fontSize: '10.5px',
                  color: 'rgba(255,255,255,0.4)',
                  fontWeight: 500,
                  marginTop: '4px',
                }}
              >
                示例清单 · 实际任务由你的进度生成
              </div>
            </div>
          </div>

          {/* B — Monthly */}
          <div
            style={{
              gridArea: 'b',
              background: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              minHeight: '240px',
              border: '1px solid #e5e5e7',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#6e6e73',
              }}
            >
              期 · MONTHLY
            </span>
            <h3
              style={{
                margin: 0,
                fontSize: '28px',
                fontWeight: 700,
                letterSpacing: '-0.025em',
                lineHeight: 1.05,
                color: '#1d1d1f',
              }}
            >
              求职月刊
              <br />
              定期整理
            </h3>
            <p
              style={{
                fontSize: '13.5px',
                color: '#6e6e73',
                lineHeight: 1.5,
                fontWeight: 500,
              }}
            >
              行业风向、招聘节奏与求职方法，整理成可读的月刊雷达 —— 时效信息联网检索并标注来源。
            </p>
          </div>

          {/* C — Interview */}
          <div
            style={{
              gridArea: 'c',
              background: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              minHeight: '240px',
              border: '1px solid #e5e5e7',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#6e6e73',
              }}
            >
              场 · INTERVIEW
            </span>
            <h3
              style={{
                margin: 0,
                fontSize: '28px',
                fontWeight: 700,
                letterSpacing: '-0.025em',
                lineHeight: 1.05,
                color: '#1d1d1f',
              }}
            >
              每场面试
              <br />
              都该复盘
            </h3>
            <p
              style={{
                fontSize: '13.5px',
                color: '#6e6e73',
                lineHeight: 1.5,
                fontWeight: 500,
              }}
            >
              记录 → 转写 → 逐题评估 → 预测下一轮。
            </p>
          </div>

          {/* D — Resume */}
          <div
            style={{
              gridArea: 'd',
              background: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              minHeight: '240px',
              border: '1px solid #e5e5e7',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#6e6e73',
              }}
            >
              配 · 简历
            </span>
            <h3
              style={{
                margin: 0,
                fontSize: '28px',
                fontWeight: 700,
                letterSpacing: '-0.025em',
                lineHeight: 1.05,
                color: '#1d1d1f',
              }}
            >
              投准
              <br />
              每个岗位
            </h3>
            <p
              style={{
                fontSize: '13.5px',
                color: '#6e6e73',
                lineHeight: 1.5,
                fontWeight: 500,
              }}
            >
              逐条 before / after 改写 · 关键词匹配诊断。
            </p>
          </div>

          {/* E — Overview */}
          <div
            style={{
              gridArea: 'e',
              background: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              minHeight: '240px',
              border: '1px solid #e5e5e7',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#6e6e73',
              }}
            >
              面 · OVERVIEW
            </span>
            <h3
              style={{
                margin: 0,
                fontSize: '28px',
                fontWeight: 700,
                letterSpacing: '-0.025em',
                lineHeight: 1.05,
                color: '#1d1d1f',
              }}
            >
              看清
              <br />
              整个秋招
            </h3>
            <p
              style={{
                fontSize: '13.5px',
                color: '#6e6e73',
                lineHeight: 1.5,
                fontWeight: 500,
              }}
            >
              投递 funnel · 薪资对标 · 能力盘点。
            </p>
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ─────────────────────────────────────────────── */}
      <section
        id="features"
        style={{
          padding: '0 56px 24px',
          marginTop: '14px',
          scrollMarginTop: '72px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: '24px',
            marginBottom: '20px',
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 'clamp(24px, 3vw, 36px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
            }}
          >
            能力全景。
          </h3>
          <div
            style={{
              fontSize: '13px',
              color: '#6e6e73',
              fontWeight: 500,
              maxWidth: '40ch',
              textAlign: 'right',
            }}
          >
            机会评估 · 行业趋势 · 学习路线 · 面试准备…… 登录后都在侧栏里。
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
          }}
        >
          {[
            {
              icon: (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 2l1.4 4.2H14l-3.5 2.6 1.3 4-3.8-2.7L4 12.8l1.3-4L1.8 6.2H6.6L8 2z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                </svg>
              ),
              title: '简历馆',
              desc: '版本管理 · 一键采纳改写 · 历史回滚。',
              slash: '/resumes',
            },
            {
              icon: (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M6.5 5.8l4 2.2-4 2.2V5.8z" fill="currentColor" />
                </svg>
              ),
              title: '模拟面试',
              desc: 'JD 定制题目 · AI 实时打分与反馈。',
              slash: '/mock',
            },
            {
              icon: (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
                  <path
                    d="M8 5v3l2 1.2"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              ),
              title: '薪资对标',
              desc: '校招薪资参考基准 · 同岗横向对比。',
              slash: '/salary',
            },
            {
              icon: (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M13 2H3a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V3a1 1 0 00-1-1z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M5 6h6M5 9h4"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              ),
              title: '求职信 + 内推',
              desc: '基于 JD 针对性撰写 · 三种语气可选。',
              slash: '/cover-letter',
            },
            {
              icon: (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect
                    x="2"
                    y="2"
                    width="12"
                    height="12"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M5 8h6M5 5h6M5 11h4"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              ),
              title: '投递追踪',
              desc: '六阶段看板 · 事件时间线 · 投递策略。',
              slash: '/applications',
            },
            {
              icon: (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
                  <path
                    d="M8 1.5V8l3.5 2"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              ),
              title: '职业地图',
              desc: '技能盘点 · 三年路径建议。',
              slash: '/career',
            },
          ].map((tile, i) => (
            <div
              key={i}
              style={{
                background: '#ffffff',
                border: '1px solid #e5e5e7',
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
                  color: '#424245',
                  border: '1px solid #e5e5e7',
                }}
              >
                {tile.icon}
              </div>
              <h4
                style={{
                  margin: 0,
                  fontSize: '15.5px',
                  fontWeight: 600,
                  letterSpacing: '-0.005em',
                }}
              >
                {tile.title}
              </h4>
              <p
                style={{
                  margin: 0,
                  fontSize: '12.5px',
                  color: '#6e6e73',
                  lineHeight: 1.5,
                  fontWeight: 500,
                }}
              >
                {tile.desc}
              </p>
              <span
                style={{
                  marginTop: 'auto',
                  paddingTop: '6px',
                  fontFamily: '"JetBrains Mono",ui-monospace,monospace',
                  fontSize: '10.5px',
                  color: '#a1a1a6',
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

      {/* ── QUALITY — 真实盲评结果,替代虚构用户评价 ───────────────────── */}
      <section
        style={{
          margin: '48px 56px 0',
          padding: '48px 0',
          borderTop: '1px solid #e5e5e7',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: '24px',
            marginBottom: '28px',
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 'clamp(24px, 3vw, 36px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              maxWidth: '22ch',
            }}
          >
            质量是验出来的，不是宣称的。
          </h3>
          <div
            style={{
              fontSize: '13px',
              color: '#6e6e73',
              fontWeight: 500,
              maxWidth: '30ch',
              textAlign: 'right',
            }}
          >
            发布前的真实验收记录 · 不放虚构用户评价
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '14px',
          }}
        >
          {[
            {
              title: '33 份混合简历盲评',
              desc: '含 5 份故意埋雷的陷阱卷、3 份真实被招聘方拒掉的卷子。「零编造 / 弱简历 100% 诚实 / 陷阱不上当 / 好简历也要指出剩余风险」四条硬杠全部通过。',
              meta: '防编造能力 · 发布前盲评',
            },
            {
              title: '两轮全站逐按钮走查',
              desc: '每个按钮、每条流程人工走一遍，P0 / P1 缺陷全部闭环 —— 上线前先把自己挑剔一遍，而不是等你来踩坑。',
              meta: '工程质量 · 发布前验收',
            },
          ].map((card, i) => (
            <div
              key={i}
              style={{
                background: '#ffffff',
                border: '1px solid #e5e5e7',
                borderRadius: '20px',
                padding: '28px 30px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  letterSpacing: '-0.015em',
                  color: '#1d1d1f',
                }}
              >
                {card.title}
              </div>
              <div
                style={{
                  fontSize: '14.5px',
                  lineHeight: 1.55,
                  color: '#424245',
                  fontWeight: 500,
                }}
              >
                {card.desc}
              </div>
              <div
                style={{
                  marginTop: 'auto',
                  fontSize: '11.5px',
                  color: '#6e6e73',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                }}
              >
                {card.meta}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER CTA ────────────────────────────────────────────────── */}
      <section
        style={{
          padding: '64px 56px 80px',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 'clamp(40px, 6vw, 64px)',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            lineHeight: 1.05,
          }}
        >
          先传一份简历，
          <br />
          <span style={{ color: '#0a84ff' }}>听它说真话。</span>
        </h2>
        <p
          style={{
            margin: '18px 0 28px',
            fontSize: '17px',
            color: '#6e6e73',
            fontWeight: 500,
          }}
        >
          公测进行中 · 邀请码制 · 试运行期免费
        </p>

        <div
          style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Link
            href="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '12px 22px',
              borderRadius: '12px',
              background: '#1d1d1f',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 600,
              textDecoration: 'none',
              letterSpacing: '-0.003em',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M2 7h10M8 3l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>免费开始</span>
          </Link>
          <Link
            href="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '12px 22px',
              borderRadius: '12px',
              background: '#ffffff',
              border: '1px solid #e5e5e7',
              color: '#1d1d1f',
              fontSize: '15px',
              fontWeight: 600,
              textDecoration: 'none',
              letterSpacing: '-0.003em',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect
                x="2"
                y="5"
                width="10"
                height="7"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <path
                d="M4.5 5V3.8a2.5 2.5 0 015 0V5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
            <span>已有邀请码？登录</span>
          </Link>
        </div>

        {/* 邀请码说明 — 紧贴 CTA */}
        <div
          style={{
            marginTop: '14px',
            fontSize: '12.5px',
            color: '#6e6e73',
            fontWeight: 500,
          }}
        >
          公测邀请码制 —— 还没有邀请码？试运行期间向我们索取。
        </div>

        <div
          style={{
            marginTop: '36px',
            fontSize: '12px',
            color: '#a1a1a6',
            fontWeight: 500,
            display: 'flex',
            justifyContent: 'center',
            gap: '24px',
            flexWrap: 'wrap',
          }}
        >
          <span>句句有据 · 拒绝编造</span>
          <span>试运行期免费 · 配额防滥用</span>
          <span>Coach 公测版</span>
        </div>
      </section>
    </div>
  );
}
