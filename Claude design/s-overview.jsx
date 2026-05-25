// Overview — disciplined data dashboard. Ink + brand + semantic.

const OV_CSS = `
.coach .ov{display:flex;flex-direction:column;gap:16px;height:100%;min-height:0;overflow:hidden}

/* hero — one dark card */
.coach .ov-hero{
  background:var(--ink);color:#fff;border-radius:24px;
  padding:28px 32px;position:relative;overflow:hidden;
  display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:0;align-items:stretch;
}
.coach .ov-hero::before{
  content:"";position:absolute;inset:0;
  background:radial-gradient(700px 360px at 75% -10%,rgba(10,132,255,.25),transparent 60%);
}
.coach .ov-hero > *{position:relative;z-index:2}
.coach .ov-hero .greet{padding-right:24px;border-right:1px solid rgba(255,255,255,.1);display:flex;flex-direction:column;justify-content:center}
.coach .ov-hero .badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.1);padding:5px 12px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;width:fit-content;margin-bottom:12px;backdrop-filter:blur(8px)}
.coach .ov-hero h1{margin:0;font-size:34px;line-height:1.1;letter-spacing:-.025em;font-weight:800}
.coach .ov-hero h1 .acc{color:var(--brand)}
.coach .ov-hero p{margin:10px 0 0;font-size:14px;color:rgba(255,255,255,.7);font-weight:500;line-height:1.55;max-width:46ch}
.coach .ov-hero p b{color:#fff;font-weight:600}
.coach .ov-hero .qs{padding:0 24px;border-right:1px solid rgba(255,255,255,.1);display:flex;flex-direction:column;justify-content:center}
.coach .ov-hero .qs:last-child{border-right:0;padding-right:0}
.coach .ov-hero .qs .lbl{font-size:11px;color:rgba(255,255,255,.5);font-weight:600;letter-spacing:.04em;text-transform:uppercase}
.coach .ov-hero .qs .v{margin-top:6px;font-size:34px;font-weight:800;letter-spacing:-.025em;line-height:1}
.coach .ov-hero .qs .v .delta{font-family:var(--font-mono);font-size:12px;font-weight:700;margin-left:6px;letter-spacing:0}
.coach .ov-hero .qs .v .delta.up{color:var(--success)}
.coach .ov-hero .qs .v .delta.down{color:var(--danger)}
.coach .ov-hero .qs .extra{margin-top:6px;font-size:12px;font-weight:500;color:rgba(255,255,255,.6)}

/* row 1 — funnel + salary */
.coach .ov-row{display:grid;grid-template-columns:1.3fr 1fr;gap:14px}
.coach .ov-card{background:var(--surface);border:1px solid var(--line);border-radius:22px;padding:22px 26px;display:flex;flex-direction:column;gap:14px;overflow:hidden}
.coach .ov-card .hd{display:flex;justify-content:space-between;align-items:baseline}
.coach .ov-card .hd h3{margin:0;font-size:17px;font-weight:700;letter-spacing:-.012em}
.coach .ov-card .hd .meta{font-family:var(--font-mono);font-size:11px;color:var(--ink-3);font-weight:600;letter-spacing:.02em}

/* funnel */
.coach .funnel{display:flex;flex-direction:column;gap:9px}
.coach .funnel .r{display:grid;grid-template-columns:90px 1fr 60px 56px;gap:14px;align-items:center;font-size:13px}
.coach .funnel .stage{font-weight:600;color:var(--ink-2)}
.coach .funnel .bar-wrap{height:28px;background:var(--surface-2);border-radius:10px;overflow:hidden;position:relative}
.coach .funnel .bar-wrap i{display:block;height:100%;border-radius:10px;background:var(--ink);position:relative}
.coach .funnel .bar-wrap i.brand{background:var(--brand)}
.coach .funnel .bar-wrap .pct-inline{position:absolute;right:10px;top:50%;transform:translateY(-50%);font-family:var(--font-mono);font-size:10.5px;color:rgba(255,255,255,.85);letter-spacing:.04em;font-weight:600}
.coach .funnel .cnt{font-family:var(--font-mono);font-size:15px;font-weight:800;color:var(--ink);text-align:right;letter-spacing:-.01em}
.coach .funnel .delta{font-family:var(--font-mono);font-size:11px;font-weight:700;text-align:right}
.coach .funnel .delta.up{color:var(--success)}
.coach .funnel .delta.flat{color:var(--ink-3)}

.coach .funnel-rates{margin-top:6px;padding-top:14px;border-top:1px solid var(--line);display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.coach .fr{padding:0 8px;border-right:1px solid var(--line)}
.coach .fr:last-child{border-right:0}
.coach .fr .v{font-size:24px;font-weight:800;letter-spacing:-.02em;line-height:1}
.coach .fr .v .delta{font-family:var(--font-mono);font-size:11px;font-weight:700;margin-left:5px}
.coach .fr .v .delta.up{color:var(--success)}
.coach .fr .v .delta.down{color:var(--danger)}
.coach .fr .l{font-size:11.5px;color:var(--ink-3);font-weight:500;margin-top:4px}
.coach .fr .l.warn{color:var(--danger);font-weight:700}

.coach .insight-strip{background:var(--surface-2);border-radius:12px;padding:11px 16px;font-size:13px;color:var(--ink-2);line-height:1.55;font-weight:500;display:flex;align-items:flex-start;gap:8px}
.coach .insight-strip b{color:var(--ink);font-weight:700}
.coach .insight-strip .ic{flex-shrink:0;color:var(--brand);margin-top:2px}

/* salary */
.coach .sal{display:flex;flex-direction:column;gap:6px}
.coach .sal .headline{display:flex;align-items:baseline;gap:8px}
.coach .sal .headline .n{font-size:46px;font-weight:800;color:var(--ink);letter-spacing:-.03em;line-height:1}
.coach .sal .headline .unit{font-size:14px;color:var(--ink-3);font-weight:600}
.coach .sal .headline .delta{font-family:var(--font-mono);font-size:11px;color:var(--success);font-weight:700;margin-left:auto;background:var(--success-soft);padding:3px 9px;border-radius:6px}
.coach .sal .sub{font-size:12px;color:var(--ink-3);font-weight:500}

.coach .dist{height:80px;display:flex;align-items:flex-end;gap:3px;position:relative;padding-top:22px;margin-top:10px}
.coach .dist i{flex:1;background:var(--surface-3);border-radius:3px 3px 0 0}
.coach .dist i.peak{background:var(--ink)}
.coach .dist i.you{background:var(--brand);position:relative}
.coach .dist i.you::after{content:"你 ¥36k";position:absolute;top:-22px;left:50%;transform:translateX(-50%);font-family:var(--font-mono);font-size:10px;color:#fff;background:var(--brand);padding:3px 7px;border-radius:5px;white-space:nowrap;font-weight:700}
.coach .dist-ax{display:flex;justify-content:space-between;margin-top:6px;font-family:var(--font-mono);font-size:10px;color:var(--ink-4);font-weight:600}

.coach .sal-px{margin-top:12px;padding-top:12px;border-top:1px solid var(--line);display:grid;grid-template-columns:repeat(5,1fr);gap:8px;font-size:11px}
.coach .sal-px .px{text-align:center}
.coach .sal-px .px b{display:block;font-family:var(--font-mono);font-size:13.5px;font-weight:800;color:var(--ink);letter-spacing:-.005em}
.coach .sal-px .px.you-px b{color:var(--brand)}
.coach .sal-px .px span{color:var(--ink-3);font-weight:600;margin-top:2px;display:block}

/* row 2: trend + market */
.coach .ov-row3{display:grid;grid-template-columns:1.5fr 1fr;gap:14px}

.coach .trend{background:var(--surface);border:1px solid var(--line);border-radius:22px;padding:22px 26px;display:flex;flex-direction:column;gap:14px}
.coach .trend .hd{display:flex;justify-content:space-between;align-items:baseline}
.coach .trend .hd h3{margin:0;font-size:17px;font-weight:700;letter-spacing:-.012em}
.coach .trend .hd .meta{font-size:12px;color:var(--ink-3);font-weight:500}
.coach .trend-svg{width:100%;height:130px}

.coach .trend-legend{display:flex;gap:18px;flex-wrap:wrap}
.coach .lg{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--ink-3);font-weight:500}
.coach .lg .dot{width:10px;height:10px;border-radius:3px}
.coach .lg .n{color:var(--ink);font-weight:700;font-family:var(--font-mono);margin-left:4px}

/* market */
.coach .market{background:var(--surface);border:1px solid var(--line);border-radius:22px;padding:22px 24px}
.coach .market .hd{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px}
.coach .market .hd h3{margin:0;font-size:17px;font-weight:700;letter-spacing:-.012em}
.coach .market .hd .meta{font-family:var(--font-mono);font-size:11px;color:var(--ink-3);font-weight:600}
.coach .market .co-row{display:grid;grid-template-columns:36px 1fr auto auto;gap:12px;align-items:center;padding:9px 0;font-size:13px;border-top:1px solid var(--line)}
.coach .market .co-row:first-of-type{border-top:0}
.coach .market .co-logo{width:36px;height:36px;border-radius:10px;background:var(--surface-2);color:var(--ink);font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;letter-spacing:-.01em;border:1px solid var(--line)}
.coach .market .co-name{font-weight:600;color:var(--ink)}
.coach .market .co-name .hot{display:inline-flex;align-items:center;gap:3px;background:var(--danger-soft);color:#bf2418;font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px;margin-left:6px;letter-spacing:.02em}
.coach .market .co-name .sub{display:block;font-size:11px;color:var(--ink-3);font-weight:500;margin-top:1px}
.coach .market .co-open{font-family:var(--font-mono);font-size:14px;font-weight:800;color:var(--ink);text-align:right}
.coach .market .co-open .l-tag{display:block;font-family:var(--font);font-size:9.5px;color:var(--ink-3);font-weight:600;letter-spacing:.04em;text-transform:uppercase}
.coach .market .co-trend{font-family:var(--font-mono);font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:6px;width:48px;text-align:center}
.coach .market .co-trend.up{background:var(--success-soft);color:#1f7a31}
.coach .market .co-trend.down{background:var(--danger-soft);color:#bf2418}
.coach .market .co-trend.flat{background:var(--surface-2);color:var(--ink-3)}

/* skill audit */
.coach .skill{background:var(--surface);border:1px solid var(--line);border-radius:22px;padding:22px 26px}
.coach .skill .hd{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px}
.coach .skill .hd h3{margin:0;font-size:17px;font-weight:700;letter-spacing:-.012em}
.coach .skill .hd .meta{font-size:12px;color:var(--ink-3);font-weight:500}
.coach .skill-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.coach .skill-col .lbl{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px}
.coach .skill-col.good .lbl{color:var(--success)}
.coach .skill-col.bad .lbl{color:var(--danger)}
.coach .skill-row{display:grid;grid-template-columns:108px 1fr 80px;gap:10px;align-items:center;padding:6px 0;font-size:12.5px;border-bottom:1px dotted var(--line)}
.coach .skill-row:last-child{border-bottom:0}
.coach .skill-row .name{font-weight:600;color:var(--ink)}
.coach .skill-row .bar{height:6px;background:var(--surface-2);border-radius:3px;overflow:hidden}
.coach .skill-row .bar i{display:block;height:100%;border-radius:3px}
.coach .skill-row.good .bar i{background:var(--ink)}
.coach .skill-row.bad .bar i{background:var(--danger)}
.coach .skill-row .v{font-family:var(--font-mono);font-size:11px;color:var(--ink-3);text-align:right;font-weight:700}
.coach .skill-row .v b{color:var(--ink);font-weight:800;font-family:var(--font)}

.coach .skill-advice{margin-top:14px;background:var(--brand-soft);border-radius:12px;padding:12px 16px;font-size:13px;color:var(--brand-ink);line-height:1.55;font-weight:500;display:flex;align-items:center;gap:8px}
.coach .skill-advice b{font-weight:700}
.coach .skill-advice .ic{flex-shrink:0;color:var(--brand)}
`;

const Overview = () => {
  const f = window.COACH_FUNNEL;
  const m = window.COACH_MARKET;
  const max = f[0].count;
  const dist = [3, 6, 10, 16, 22, 30, 38, 42, 46, 50, 53, 55, 52, 44, 36, 26, 18, 12, 8, 5];
  return (
    <div className="coach">
      <style>{window.CORE_CSS}</style>
      <style>{OV_CSS}</style>
      <div className="app">
        <window.CoachSide active="overview" />
        <div className="main">
          <window.CoachTopbar
            title="求职总览"
            sub="整个秋招的鸟瞰视角 · 每周看一次"
            actions={<>
              <button className="btn sm">{window.IK.calendar}<span>2026 校招</span></button>
              <button className="btn sm">{window.IK.download}<span>导出周报</span></button>
            </>}
          />

          <div className="scroll">
            <div className="ov">
              {/* hero — single dark card */}
              <div className="ov-hero">
                <div className="greet">
                  <div className="badge">总览 · OVERVIEW</div>
                  <h1>已经走过 <span className="acc">一半。</span><br/>剩下 38 天。</h1>
                  <p>投了 <b>18</b> 家，进面试的 <b>6</b> 家，<b>1 个 offer</b> 在手。<br/>经验对口度高，瓶颈在面试转化。</p>
                </div>
                <div className="qs">
                  <div className="lbl">同校排名</div>
                  <div className="v">P 73 <span className="delta up">↑ 12</span></div>
                  <div className="extra">2026 届 · 前端</div>
                </div>
                <div className="qs">
                  <div className="lbl">投递 → 笔试</div>
                  <div className="v">61% <span className="delta up">↑ 6%</span></div>
                  <div className="extra">高于平均 18 pts</div>
                </div>
                <div className="qs">
                  <div className="lbl">面试 → Offer</div>
                  <div className="v">33% <span className="delta down">↓ 4%</span></div>
                  <div className="extra">● 主要瓶颈</div>
                </div>
              </div>

              {/* row 2 — funnel + salary */}
              <div className="ov-row">
                <div className="ov-card">
                  <div className="hd">
                    <h3>求职 funnel · 整个秋招</h3>
                    <span className="meta">UPDATED 14:22</span>
                  </div>
                  <div className="funnel">
                    {f.map((row, i) => (
                      <div key={row.stage} className="r">
                        <span className="stage">{row.stage}</span>
                        <div className="bar-wrap">
                          <i className={i === 5 ? "brand" : ""} style={{ width: (row.count / max * 100) + "%" }}>
                            {i > 0 && <span className="pct-inline">{row.rate}%</span>}
                          </i>
                        </div>
                        <span className="cnt">{row.count}</span>
                        <span className="delta up">+{Math.max(1, Math.floor(row.count / 4))}</span>
                      </div>
                    ))}
                  </div>

                  <div className="funnel-rates">
                    <div className="fr">
                      <div className="v">61%<span className="delta up">↑ 6%</span></div>
                      <div className="l">投递 → 笔试</div>
                    </div>
                    <div className="fr">
                      <div className="v">55%</div>
                      <div className="l">笔试 → 一面</div>
                    </div>
                    <div className="fr">
                      <div className="v">33%<span className="delta down">↓ 4%</span></div>
                      <div className="l warn">面试 → Offer · 瓶颈</div>
                    </div>
                  </div>

                  <div className="insight-strip">
                    <span className="ic">{window.IK.spark}</span>
                    <span><b>Coach 洞察 ——</b> 你的「投递 → 笔试」通过率 61%，比同校同届高 18 pts。瓶颈是「面试 → offer」，主要在行为面试和反问。</span>
                  </div>
                </div>

                <div className="ov-card">
                  <div className="hd">
                    <h3>薪资雷达</h3>
                    <span className="meta">FRONTEND · 校招 · N=1,247</span>
                  </div>
                  <div className="sal">
                    <div className="headline">
                      <span className="n">¥38.4</span>
                      <span className="unit">k / 月 · 中位</span>
                      <span className="delta">↑ 4% MoM</span>
                    </div>
                    <div className="sub">全国 · 5 月 · 已脱敏</div>

                    <div className="dist">
                      {dist.map((v, i) => (
                        <i key={i}
                           className={i === 10 ? "peak" : i === 8 ? "you" : ""}
                           style={{ height: v * 1.4 + "%" }}></i>
                      ))}
                    </div>
                    <div className="dist-ax">
                      <span>15</span><span>25</span><span>35</span><span>45</span><span>55</span><span>65k+</span>
                    </div>

                    <div className="sal-px">
                      <div className="px"><b>¥28</b><span>P25</span></div>
                      <div className="px"><b>¥38</b><span>P50</span></div>
                      <div className="px you-px"><b>¥36</b><span>你 · P47</span></div>
                      <div className="px"><b>¥48</b><span>P75</span></div>
                      <div className="px"><b>¥62</b><span>P90</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* row 3 — trend + market */}
              <div className="ov-row3">
                <div className="trend">
                  <div className="hd">
                    <h3>趋势 · 过去 12 周</h3>
                    <span className="meta">投递 / 面试 / 完成任务</span>
                  </div>
                  <svg className="trend-svg" viewBox="0 0 600 130" preserveAspectRatio="none">
                    {[0, 1, 2, 3].map(i => (
                      <line key={i} x1="0" y1={30 * i + 18} x2="600" y2={30 * i + 18} stroke="#e5e5e7" strokeWidth="1" strokeDasharray="3 4" />
                    ))}
                    {/* tasks done — ink */}
                    <polyline fill="none" stroke="#1d1d1f" strokeWidth="2.2"
                      points="0,108 50,100 100,90 150,78 200,68 250,58 300,50 350,42 400,36 450,28 500,22 600,18" strokeLinecap="round" strokeLinejoin="round" />
                    {/* applied — brand */}
                    <polyline fill="none" stroke="#0a84ff" strokeWidth="2"
                      points="0,100 50,90 100,80 150,68 200,62 250,54 300,46 350,40 400,34 450,28 500,24 600,20" strokeLinecap="round" strokeLinejoin="round" />
                    {/* interviews — gray */}
                    <polyline fill="none" stroke="#a1a1a6" strokeWidth="1.6"
                      points="0,118 50,114 100,110 150,104 200,96 250,90 300,80 350,70 400,62 450,52 500,46 600,42" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 4" />
                    <circle cx="600" cy="18" r="4" fill="#1d1d1f" />
                    <circle cx="600" cy="20" r="3.5" fill="#0a84ff" />
                  </svg>
                  <div className="trend-legend">
                    <div className="lg"><span className="dot" style={{ background: "#1d1d1f" }}></span><span>完成任务</span><span className="n">本周 17</span></div>
                    <div className="lg"><span className="dot" style={{ background: "#0a84ff" }}></span><span>累计投递</span><span className="n">18 家</span></div>
                    <div className="lg"><span className="dot" style={{ background: "#a1a1a6" }}></span><span>面试场次</span><span className="n">12 场</span></div>
                  </div>
                </div>

                <div className="market">
                  <div className="hd">
                    <h3>市场温度 · 本周</h3>
                    <span className="meta">FRONTEND · 24H</span>
                  </div>
                  {m.map((c) => (
                    <div key={c.co} className="co-row">
                      <div className="co-logo">{c.co.slice(0, 2)}</div>
                      <div className="co-name">
                        {c.co}
                        {c.hot && <span className="hot">🔥 热招</span>}
                        <span className="sub">在招 {c.openings} 个前端岗</span>
                      </div>
                      <div className="co-open">{c.openings}<span className="l-tag">岗位</span></div>
                      <span className={"co-trend " + (c.trend > 0 ? "up" : c.trend < 0 ? "down" : "flat")}>
                        {c.trend > 0 ? `+${c.trend}` : c.trend === 0 ? "—" : c.trend}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* skill */}
              <div className="skill">
                <div className="hd">
                  <h3>能力盘点 · vs 6 个心仪岗位</h3>
                  <span className="meta">基于 6 个目标 JD 聚合分析</span>
                </div>
                <div className="skill-grid">
                  <div className="skill-col good">
                    <span className="lbl">✓ 优势 · 已具备</span>
                    <div className="skill-row good"><span className="name">React 18</span><div className="bar"><i style={{ width: "94%" }}></i></div><span className="v"><b>专家</b></span></div>
                    <div className="skill-row good"><span className="name">TypeScript</span><div className="bar"><i style={{ width: "88%" }}></i></div><span className="v"><b>熟练</b></span></div>
                    <div className="skill-row good"><span className="name">前端工程化</span><div className="bar"><i style={{ width: "82%" }}></i></div><span className="v"><b>熟练</b></span></div>
                    <div className="skill-row good"><span className="name">组件库治理</span><div className="bar"><i style={{ width: "78%" }}></i></div><span className="v"><b>熟练</b></span></div>
                    <div className="skill-row good"><span className="name">H5 / C 端性能</span><div className="bar"><i style={{ width: "72%" }}></i></div><span className="v"><b>OK</b></span></div>
                  </div>
                  <div className="skill-col bad">
                    <span className="lbl">⚠ 缺口 · JD 要但你弱</span>
                    <div className="skill-row bad"><span className="name">SSR · Next.js</span><div className="bar"><i style={{ width: "32%" }}></i></div><span className="v">6 个 JD 要</span></div>
                    <div className="skill-row bad"><span className="name">Monorepo</span><div className="bar"><i style={{ width: "28%" }}></i></div><span className="v">5 个 JD 要</span></div>
                    <div className="skill-row bad"><span className="name">STAR 法则</span><div className="bar"><i style={{ width: "42%" }}></i></div><span className="v">通用必备</span></div>
                    <div className="skill-row bad"><span className="name">英文表达</span><div className="bar"><i style={{ width: "48%" }}></i></div><span className="v">海外 / 外企</span></div>
                    <div className="skill-row bad"><span className="name">系统设计</span><div className="bar"><i style={{ width: "22%" }}></i></div><span className="v">3 个 JD</span></div>
                  </div>
                </div>
                <div className="skill-advice">
                  <span className="ic">{window.IK.spark}</span>
                  <span><b>建议 ——</b> 缺口里 <b>SSR / Next.js</b> 投入产出比最高（6 个 JD 都要，你只需补 ~ 8 小时）。Coach 已为你生成 4 天 learning plan，<b>要不要加进今日任务？</b></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { Overview });
