import Link from 'next/link';

// ── Coach Landing Page ─────────────────────────────────────────────────────
// Apple-disciplined, single brand color, generous whitespace.
// Static marketing content — no API calls.

export default function LandingPage() {
  const R = 26;
  const C = 2 * Math.PI * R;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#fbfbfd',
        color: '#1d1d1f',
        fontFamily:
          '"Plus Jakarta Sans","PingFang SC","Noto Sans SC","Helvetica Neue",ui-sans-serif,system-ui,sans-serif',
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

        {/* Nav links */}
        <div
          style={{
            display: 'flex',
            gap: '32px',
            fontSize: '13.5px',
            color: '#424245',
            fontWeight: 500,
          }}
        >
          <span style={{ cursor: 'default' }}>能力</span>
          <span style={{ cursor: 'default' }}>面经库</span>
          <span style={{ cursor: 'default' }}>校友故事</span>
          <span style={{ cursor: 'default' }}>定价</span>
          <span style={{ cursor: 'default' }}>下载</span>
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
          {/* Tag */}
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
            <span>已陪 12,408 位同学走完秋招</span>
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

          {/* Subtitle */}
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
            不是简历模板，不是题库 —— 是一个真的 AI 教练。
            <br />
            每天告诉你做什么，每场面试帮你复盘。
          </p>

          {/* CTA buttons */}
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
                <circle
                  cx="7"
                  cy="7"
                  r="6"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="M5.5 5.2l4 1.8-4 1.8V5.2z"
                  fill="currentColor"
                />
              </svg>
              <span>看 30 秒</span>
            </Link>
          </div>

          {/* Meta line */}
          <div
            style={{
              marginTop: '24px',
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
              <span>对话端到端加密</span>
            </span>
            <span>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M6 1l1.2 3.6H11l-3 2.2 1.1 3.5L6 8.1l-3.1 2.2 1.1-3.5L1 4.6h3.8L6 1z"
                  stroke="currentColor"
                  strokeWidth="1.1"
                  strokeLinejoin="round"
                />
              </svg>
              <span>免费 5 次诊断 / 周</span>
            </span>
          </div>
        </div>

        {/* Right: Hero Card */}
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
            Coach · 进行中 · 5月23日 14:22
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
                今天投了 0 份简历，我是不是该休息一下？
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
                可以。你已经连续 17 天打卡，过去 3 周节奏很稳。今天就 1 件事：跑完 STAR ch.2 ——周一终面有用。
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
                好。明早再补投递。
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
            — 像真的有人在陪你
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ───────────────────────────────────────────────── */}
      <div
        style={{
          padding: '0 56px 32px',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          borderTop: '1px solid #e5e5e7',
        }}
      >
        {[
          {
            value: '12,408',
            accent: '↑ 8%',
            label: '校招用户 · 本周',
          },
          { value: '+24', accent: '分', label: '简历平均提分' },
          { value: '8.4', unit: 'min', label: '平均复盘时长' },
          { value: '3,802', label: '24h 新增岗位' },
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
                fontSize: '34px',
                fontWeight: 700,
                letterSpacing: '-0.025em',
                lineHeight: 1,
                color: '#1d1d1f',
              }}
            >
              {s.value}
              {s.accent && (
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    marginLeft: '6px',
                    color: '#34c759',
                  }}
                >
                  {s.accent}
                </span>
              )}
              {s.unit && (
                <span
                  style={{
                    fontSize: '13px',
                    color: '#6e6e73',
                    fontWeight: 600,
                    marginLeft: '4px',
                  }}
                >
                  {s.unit}
                </span>
              )}
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

      {/* ── PILLARS — 四个视角 ────────────────────────────────────────── */}
      <section style={{ padding: '64px 56px 24px' }}>
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
              该做哪 5 件事？
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
              每天清晨自动生成 5 步，覆盖投递、练习、复盘、学习。做完今天的就可以休息。
            </p>

            {/* Today preview list */}
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
                { done: true, text: '腾讯算法 · 二叉树 #8', dur: '20m' },
                { done: true, text: '字节客户端实习 · 投递', dur: '15m' },
                { done: false, text: '美团二面 · 录音转写复盘', dur: '10m' },
                { done: false, text: 'STAR 法则 ch.2', dur: '25m' },
                { done: false, text: '简历 · 项目栏目润色', dur: '30m' },
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
              面经
              <br />
              每天更新
            </h3>
            <p
              style={{
                fontSize: '13.5px',
                color: '#6e6e73',
                lineHeight: 1.5,
                fontWeight: 500,
              }}
            >
              叫月刊，更新是实时的。编辑部 + 校友 + Coach 整理。
            </p>
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                {
                  timeLabel: '🔥 2h ago',
                  co: '字节',
                  title: '字节二面 5 道题 + 一个 Tech Lead 陷阱',
                  hot: true,
                },
                {
                  timeLabel: '5h ago',
                  co: '拼多多',
                  title: 'PDD 校招前端 base 38–46k，但有个 catch',
                  hot: false,
                },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                    padding: '11px 0',
                    borderTop: i === 0 ? 'none' : '1px solid #e5e5e7',
                    paddingTop: i === 0 ? 0 : '11px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 600,
                      color: '#6e6e73',
                      letterSpacing: '0.02em',
                    }}
                  >
                    <span style={{ color: '#ff3b30' }}>{item.timeLabel}</span>
                    {' · '}{item.co}
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#1d1d1f',
                      fontWeight: 600,
                      lineHeight: 1.35,
                    }}
                  >
                    {item.title}
                  </div>
                </div>
              ))}
            </div>
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
              录音 → 转写 → 逐题评估 → 预测下一轮。
            </p>
            {/* Interview preview */}
            <div
              style={{
                marginTop: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '14px',
                  background: '#f5f5f7',
                  color: '#1d1d1f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  border: '1px solid #e5e5e7',
                  flexShrink: 0,
                }}
              >
                B+
              </div>
              <div>
                <b
                  style={{
                    display: 'block',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    color: '#1d1d1f',
                  }}
                >
                  美团 · 前端二面
                </b>
                <span
                  style={{
                    fontSize: '11.5px',
                    color: '#6e6e73',
                    fontWeight: 500,
                  }}
                >
                  昨天 16:00 · 62 min
                </span>
                {/* Progress bars */}
                <div
                  style={{
                    marginTop: '7px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                    width: '80px',
                  }}
                >
                  {[
                    { width: '86%', color: '#1d1d1f' },
                    { width: '78%', color: '#34c759' },
                    { width: '42%', color: '#ff3b30' },
                  ].map((bar, i) => (
                    <div
                      key={i}
                      style={{
                        height: '4px',
                        background: '#eeeef0',
                        borderRadius: '2px',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          height: '100%',
                          width: bar.width,
                          background: bar.color,
                          borderRadius: '2px',
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
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
              funnel · 薪资 · 市场温度 · 能力盘点。
            </p>
            {/* Overview ring preview */}
            <div
              style={{
                marginTop: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div style={{ position: 'relative', width: '64px', height: '64px', flexShrink: 0 }}>
                <svg width="64" height="64" viewBox="0 0 64 64">
                  <circle
                    cx="32"
                    cy="32"
                    r={R}
                    fill="none"
                    stroke="#eeeef0"
                    strokeWidth="5"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r={R}
                    fill="none"
                    stroke="#1d1d1f"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={C}
                    strokeDashoffset={C * (1 - 0.73)}
                    transform="rotate(-90 32 32)"
                  />
                </svg>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    color: '#1d1d1f',
                  }}
                >
                  P73
                </div>
              </div>
              <div>
                <b
                  style={{
                    display: 'block',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    color: '#1d1d1f',
                  }}
                >
                  同校排名
                </b>
                <span
                  style={{
                    fontSize: '11.5px',
                    color: '#6e6e73',
                    fontWeight: 500,
                  }}
                >
                  2026 届 前端
                </span>
                <span
                  style={{
                    fontFamily: '"JetBrains Mono",ui-monospace,monospace',
                    fontSize: '11px',
                    color: '#34c759',
                    fontWeight: 600,
                    marginTop: '3px',
                    display: 'block',
                  }}
                >
                  ↑ 12 位 / 月
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ─────────────────────────────────────────────── */}
      <section
        style={{
          padding: '0 56px 24px',
          marginTop: '14px',
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
            desc: '逐条改写、关键词匹配 —— 一份简历一个岗位。',
            slash: '/diagnose',
          },
          {
            icon: (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M6.5 5.8l4 2.2-4 2.2V5.8z" fill="currentColor" />
              </svg>
            ),
            title: '模拟面试',
            desc: '岗位定制题 · 语音 / 文字 · 自动评分。',
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
            title: '薪资雷达',
            desc: '1,247 条真实 offer · 同岗对比。',
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
            title: '求职信',
            desc: '三种语气、一键定制。',
            slash: '/cover',
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
            desc: '看板 · 节点提醒 · funnel 复盘。',
            slash: '/track',
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
            desc: '技能盘点 · 三年路径 · 校友参考。',
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
      </section>

      {/* ── SOCIAL PROOF ──────────────────────────────────────────────── */}
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
            不止我们说好用 —— 校友说也好用。
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
            来自已签 offer 的 2026 届校友 · 已脱敏
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
              quote:
                '「整整一个月没投出一份简历。后来才明白，问题不是公司挑剔，是我自己看不上自己 —— Coach 帮我看见这一点。」',
              initial: '张',
              name: '张同学',
              meta: '北京交大 · 字节前端 offer',
            },
            {
              quote:
                '「美团二面前一晚我跑了一次 Coach 模拟，第二天面试官问的 5 道题里有 3 道一样。主线问得心里有底。」',
              initial: '小',
              name: '陈小雨',
              meta: '复旦 · 美团数据 offer',
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
                gap: '22px',
              }}
            >
              <div
                style={{
                  fontSize: '18px',
                  lineHeight: 1.45,
                  color: '#1d1d1f',
                  fontWeight: 500,
                  letterSpacing: '-0.005em',
                }}
              >
                {card.quote}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: '#f5f5f7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    color: '#1d1d1f',
                    fontSize: '14px',
                    flexShrink: 0,
                  }}
                >
                  {card.initial}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '13.5px',
                      fontWeight: 600,
                      letterSpacing: '-0.003em',
                    }}
                  >
                    {card.name}
                  </div>
                  <div
                    style={{
                      fontSize: '11.5px',
                      color: '#6e6e73',
                      fontWeight: 500,
                      marginTop: '1px',
                    }}
                  >
                    {card.meta}
                  </div>
                </div>
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
          把今天的 5 步，
          <br />
          <span style={{ color: '#0a84ff' }}>先走完。</span>
        </h2>
        <p
          style={{
            margin: '18px 0 28px',
            fontSize: '17px',
            color: '#6e6e73',
            fontWeight: 500,
          }}
        >
          剩下的 38 天，慢慢来。
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
            <span>免费开始 · 微信扫码</span>
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
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.4" />
              <path d="M5.5 5.2l4 1.8-4 1.8V5.2z" fill="currentColor" />
            </svg>
            <span>看 30 秒介绍</span>
          </Link>
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
          <span>已陪 12,408 位同学走完秋招</span>
          <span>对话端到端加密 · 不用于训练</span>
          <span>Coach v4</span>
        </div>
      </section>
    </div>
  );
}
