// Vibe Overview — Apple Health summary-style bento, vibrant cards.

const VIBE_OV_CSS = `
.vibe .ov-page{display:flex;flex-direction:column;gap:14px;height:100%;min-height:0;overflow:hidden}

/* hero stat strip (5 vibrant cards) */
.vibe .ov-hero{display:grid;grid-template-columns:1.8fr 1fr 1fr 1fr;gap:14px;flex-shrink:0}
.vibe .ov-greet{background:var(--c-blue);color:#fff;border-radius:var(--r-card-lg);padding:24px 28px;position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between}
.vibe .ov-greet::after{content:"";position:absolute;width:220px;height:220px;border-radius:50%;background:rgba(255,255,255,.16);right:-80px;top:-80px}
.vibe .ov-greet > *{position:relative;z-index:2}
.vibe .ov-greet .badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.22);padding:5px 12px;border-radius:999px;font-size:11.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;width:fit-content;backdrop-filter:blur(8px)}
.vibe .ov-greet h1{margin:14px 0 0;font-size:38px;font-weight:800;letter-spacing:-.025em;line-height:1.05}
.vibe .ov-greet h1 .acc{color:var(--c-yellow)}
.vibe .ov-greet p{margin:14px 0 0;font-size:14px;font-weight:500;opacity:.88;line-height:1.5;max-width:50ch}
.vibe .ov-greet p b{font-weight:700;color:#fff;opacity:1}

.vibe .quick-stat{border-radius:var(--r-card);padding:18px 22px;color:#fff;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;min-height:140px}
.vibe .quick-stat::after{content:"";position:absolute;width:140px;height:140px;border-radius:50%;background:rgba(255,255,255,.16);right:-50px;bottom:-50px}
.vibe .quick-stat > *{position:relative;z-index:2}
.vibe .quick-stat .v{font-size:34px;font-weight:800;letter-spacing:-.025em;line-height:1}
.vibe .quick-stat .v .acc{font-size:13px;font-weight:700;margin-left:4px}
.vibe .quick-stat .l{font-size:12px;font-weight:600;opacity:.85;margin-top:4px}
.vibe .quick-stat .ic{align-self:flex-end;opacity:.92}
.vibe .quick-stat.green{background:var(--c-green)}
.vibe .quick-stat.orange{background:var(--c-orange)}
.vibe .quick-stat.red{background:var(--c-red)}

/* row 2: funnel + salary */
.vibe .ov-row{display:grid;grid-template-columns:1.3fr 1fr;gap:14px;min-height:0}
.vibe .ov-card{background:var(--bg-card);border:1px solid var(--line);border-radius:var(--r-card-lg);padding:22px 26px;display:flex;flex-direction:column;min-height:0;overflow:hidden}
.vibe .ov-card .hd{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px}
.vibe .ov-card .hd h3{margin:0;font-size:18px;font-weight:700;letter-spacing:-.01em}
.vibe .ov-card .hd .meta{font-size:11.5px;color:var(--ink-3);font-weight:600;letter-spacing:.02em}

/* funnel */
.vibe .funnel{display:flex;flex-direction:column;gap:9px}
.vibe .funnel .row{display:grid;grid-template-columns:84px 1fr 60px 50px;gap:14px;align-items:center;font-size:13px}
.vibe .funnel .stage{font-weight:600;color:var(--ink-2)}
.vibe .funnel .bar-wrap{height:30px;background:var(--bg-tint);border-radius:10px;overflow:hidden;position:relative}
.vibe .funnel .bar-wrap i{display:block;height:100%;border-radius:10px;position:relative}
.vibe .funnel .bar-wrap i.b0{background:#cdd5de}
.vibe .funnel .bar-wrap i.b1{background:var(--c-cyan)}
.vibe .funnel .bar-wrap i.b2{background:var(--c-mint)}
.vibe .funnel .bar-wrap i.b3{background:var(--c-green)}
.vibe .funnel .bar-wrap i.b4{background:var(--c-yellow)}
.vibe .funnel .bar-wrap i.b5{background:var(--c-pink)}
.vibe .funnel .bar-wrap .pct-inline{position:absolute;right:10px;top:50%;transform:translateY(-50%);font-family:"JetBrains Mono",monospace;font-size:10.5px;color:rgba(0,0,0,.5);letter-spacing:.04em;font-weight:700}
.vibe .funnel .cnt{font-family:"JetBrains Mono",monospace;font-size:15px;font-weight:800;color:var(--ink);text-align:right;letter-spacing:-.01em}
.vibe .funnel .delta{font-family:"JetBrains Mono",monospace;font-size:11px;font-weight:700;text-align:right}
.vibe .funnel .delta.up{color:var(--c-green)}
.vibe .funnel .delta.flat{color:var(--ink-3)}

.vibe .funnel-rates{margin-top:14px;padding-top:14px;border-top:1px solid var(--line);display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.vibe .fr-cell{padding:0 8px;border-right:1px solid var(--line)}
.vibe .fr-cell:last-child{border-right:0}
.vibe .fr-cell .v{font-size:24px;font-weight:800;letter-spacing:-.02em;line-height:1}
.vibe .fr-cell .v .acc{font-family:"JetBrains Mono",monospace;font-size:11px;font-weight:700;margin-left:5px}
.vibe .fr-cell .v .acc.up{color:var(--c-green)}
.vibe .fr-cell .v .acc.down{color:var(--c-red)}
.vibe .fr-cell .l{font-size:11.5px;color:var(--ink-3);margin-top:4px;font-weight:600}
.vibe .fr-cell .l.warn{color:var(--c-red);font-weight:700}

/* insight stripe */
.vibe .insight-strip{margin-top:14px;background:var(--c-yellow-2);border-radius:14px;padding:12px 16px;font-size:13px;color:#5a4500;line-height:1.55;font-weight:500;display:flex;align-items:flex-start;gap:8px}
.vibe .insight-strip b{font-weight:700;color:#3d2f00}
.vibe .insight-strip .ic{font-size:18px;flex-shrink:0}

/* salary */
.vibe .sal-headline{display:flex;align-items:baseline;gap:8px;margin-bottom:4px}
.vibe .sal-headline .n{font-size:46px;font-weight:800;color:var(--c-blue);letter-spacing:-.03em;line-height:1}
.vibe .sal-headline .unit{font-size:14px;color:var(--ink-3);font-weight:600}
.vibe .sal-headline .delta{font-family:"JetBrains Mono",monospace;font-size:12px;color:var(--c-green);font-weight:700;margin-left:auto;background:var(--c-green-2);padding:3px 9px;border-radius:7px}
.vibe .sal-sub{font-size:12px;color:var(--ink-3);font-weight:600;margin-bottom:14px}

.vibe .dist{height:90px;display:flex;align-items:flex-end;gap:4px;position:relative;padding-top:24px}
.vibe .dist i{flex:1;background:var(--c-blue-2);border-radius:4px 4px 0 0;position:relative}
.vibe .dist i.peak{background:var(--c-blue)}
.vibe .dist i.you{background:var(--c-pink);position:relative}
.vibe .dist i.you::after{content:"你 ¥36";position:absolute;top:-26px;left:50%;transform:translateX(-50%);font-family:"JetBrains Mono",monospace;font-size:10px;color:#fff;background:var(--c-pink);padding:3px 7px;border-radius:5px;white-space:nowrap;font-weight:700}
.vibe .dist-ax{display:flex;justify-content:space-between;margin-top:6px;font-family:"JetBrains Mono",monospace;font-size:10px;color:var(--ink-4);font-weight:600}

.vibe .sal-px{margin-top:12px;padding-top:12px;border-top:1px solid var(--line);display:grid;grid-template-columns:repeat(5,1fr);gap:8px;font-size:11px}
.vibe .sal-px .px{text-align:center}
.vibe .sal-px b{display:block;font-family:"JetBrains Mono",monospace;font-size:13.5px;font-weight:800;color:var(--ink);letter-spacing:-.005em}
.vibe .sal-px .you-px b{color:var(--c-pink)}
.vibe .sal-px span{color:var(--ink-3);font-weight:600;margin-top:2px;display:block}

/* row 3: trend + market */
.vibe .ov-row3{display:grid;grid-template-columns:1.5fr 1fr;gap:14px}

.vibe .trend-big{background:var(--ink);color:#fff;border-radius:var(--r-card-lg);padding:22px 26px;display:flex;flex-direction:column;gap:14px;position:relative;overflow:hidden}
.vibe .trend-big::after{content:"";position:absolute;width:240px;height:240px;border-radius:50%;background:rgba(89,99,245,.5);right:-100px;top:-100px;filter:blur(20px)}
.vibe .trend-big > *{position:relative;z-index:2}
.vibe .trend-big .hd{display:flex;justify-content:space-between;align-items:baseline}
.vibe .trend-big .hd h3{margin:0;font-size:18px;font-weight:700;letter-spacing:-.01em}
.vibe .trend-big .hd .meta{font-size:11.5px;color:rgba(255,255,255,.55);font-family:"JetBrains Mono",monospace;font-weight:600;letter-spacing:.04em}
.vibe .trend-svg{width:100%;height:130px}

.vibe .trend-legend{display:flex;gap:14px;flex-wrap:wrap}
.vibe .trend-legend .lg{display:flex;align-items:center;gap:8px;font-size:12.5px;color:rgba(255,255,255,.78);font-weight:500}
.vibe .trend-legend .dot{width:10px;height:10px;border-radius:3px}
.vibe .trend-legend .n{color:#fff;font-weight:700}

.vibe .market{background:var(--bg-card);border:1px solid var(--line);border-radius:var(--r-card-lg);padding:22px 24px;display:flex;flex-direction:column;gap:6px}
.vibe .market .hd{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px}
.vibe .market .hd h3{margin:0;font-size:18px;font-weight:700;letter-spacing:-.01em}
.vibe .market .hd .meta{font-size:11.5px;color:var(--ink-3);font-weight:600}
.vibe .market .co-row{display:grid;grid-template-columns:38px 1fr auto auto;gap:12px;align-items:center;padding:8px 0;font-size:13px;border-top:1px solid var(--line)}
.vibe .market .co-row:first-of-type{border-top:0}
.vibe .market .co-logo{width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:800;letter-spacing:-.01em}
.vibe .market .co-logo.blue{background:var(--c-blue)}
.vibe .market .co-logo.red{background:var(--c-red)}
.vibe .market .co-logo.yellow{background:var(--c-yellow);color:var(--ink)}
.vibe .market .co-logo.green{background:var(--c-green)}
.vibe .market .co-logo.mint{background:var(--c-mint)}
.vibe .market .co-name{font-weight:700;color:var(--ink)}
.vibe .market .co-name .hot{display:inline-block;background:var(--c-red-2);color:#cb1c14;font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px;margin-left:6px;letter-spacing:.02em}
.vibe .market .co-name .meta{display:block;font-size:11px;color:var(--ink-3);font-weight:500;margin-top:1px}
.vibe .market .co-open{font-family:"JetBrains Mono",monospace;font-size:14px;font-weight:800;color:var(--ink);text-align:right}
.vibe .market .co-open .l{display:block;font-size:9.5px;color:var(--ink-3);font-weight:600;letter-spacing:.04em;text-transform:uppercase;font-family:"Plus Jakarta Sans"}
.vibe .market .co-trend{font-family:"JetBrains Mono",monospace;font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:7px;width:50px;text-align:center}
.vibe .market .co-trend.up{background:var(--c-green-2);color:#1e7a3a}
.vibe .market .co-trend.down{background:var(--c-red-2);color:#cb1c14}
.vibe .market .co-trend.flat{background:var(--bg-tint);color:var(--ink-3)}

/* skill audit */
.vibe .skill{background:var(--bg-card);border:1px solid var(--line);border-radius:var(--r-card-lg);padding:22px 26px}
.vibe .skill .hd{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px}
.vibe .skill .hd h3{margin:0;font-size:18px;font-weight:700;letter-spacing:-.01em}
.vibe .skill .hd .meta{font-size:11.5px;color:var(--ink-3);font-weight:600}
.vibe .skill-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.vibe .skill-col{display:flex;flex-direction:column;gap:6px}
.vibe .skill-col .lbl{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:4px}
.vibe .skill-col.good .lbl{color:var(--c-green)}
.vibe .skill-col.bad .lbl{color:var(--c-red)}
.vibe .skill-row{display:grid;grid-template-columns:100px 1fr 80px;gap:10px;align-items:center;font-size:12.5px;padding:5px 0;border-bottom:1px dotted var(--line)}
.vibe .skill-row:last-child{border-bottom:0}
.vibe .skill-row .name{font-weight:600;color:var(--ink)}
.vibe .skill-row .bar{height:6px;background:var(--bg-tint);border-radius:3px;overflow:hidden}
.vibe .skill-row .bar i{display:block;height:100%;border-radius:3px}
.vibe .skill-row.good .bar i{background:var(--c-green)}
.vibe .skill-row.bad .bar i{background:var(--c-red)}
.vibe .skill-row .v{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--ink-3);text-align:right;font-weight:700}
.vibe .skill-row .v b{color:var(--ink);font-weight:800}

.vibe .skill-advice{margin-top:14px;background:var(--c-blue-2);border-radius:14px;padding:12px 16px;font-size:13px;color:#003580;line-height:1.55;font-weight:500;display:flex;align-items:center;gap:8px}
.vibe .skill-advice b{font-weight:700}
.vibe .skill-advice .ic{flex-shrink:0;color:var(--c-blue)}
`;

const Overview = () => {
  const f = window.COACH_FUNNEL;
  const m = window.COACH_MARKET;
  const max = f[0].count;
  const dist = [3, 6, 10, 16, 22, 30, 38, 42, 46, 50, 53, 55, 52, 44, 36, 26, 18, 12, 8, 5];

  return (
    <div className="vibe">
      <style>{window.VIBE_CSS}</style>
      <style>{VIBE_OV_CSS}</style>
      <div className="app">
        <window.VibeSide active="overview" />
        <div className="main">
          <window.VibeTopbar
            title="求职总览"
            sub="整个秋招的鸟瞰视角 · 每周看一次"
            actions={<>
              <button className="btn sm">{window.IK.calendar}<span>2026 校招</span></button>
              <button className="btn sm">{window.IK.download}<span>导出周报</span></button>
            </>}
          />

          <div className="scroll">
            <div className="ov-page">
              {/* HERO */}
              <div className="ov-hero">
                <div className="ov-greet">
                  <div className="badge">🌟 总览 · OVERVIEW</div>
                  <div>
                    <h1>已经走过 <span className="acc">一半。</span><br/>剩下 38 天。</h1>
                    <p>投了 <b>18</b> 家，进面试的 <b>6</b> 家，<b>1 个 offer</b> 在手。
                      经验对口度高，瓶颈在面试转化 —— <b>这个数字今天就能改</b>。
                    </p>
                  </div>
                </div>

                <div className="quick-stat green">
                  <div className="ic">{window.IK.award}</div>
                  <div>
                    <div className="v">P 73 <span className="acc">↑ 12</span></div>
                    <div className="l">同校同届排名</div>
                  </div>
                </div>

                <div className="quick-stat orange">
                  <div className="ic">{window.IK.trend}</div>
                  <div>
                    <div className="v">61% <span className="acc">↑ 6%</span></div>
                    <div className="l">投递 → 笔试</div>
                  </div>
                </div>

                <div className="quick-stat red">
                  <div className="ic">{window.IK.bolt}</div>
                  <div>
                    <div className="v">33% <span className="acc" style={{ color: "rgba(255,255,255,.8)" }}>↓ 4%</span></div>
                    <div className="l">面试 → Offer · 瓶颈</div>
                  </div>
                </div>
              </div>

              {/* ROW 2 */}
              <div className="ov-row">
                <div className="ov-card">
                  <div className="hd">
                    <h3>求职 funnel · 整个秋招</h3>
                    <span className="meta">UPDATED 14:22</span>
                  </div>
                  <div className="funnel">
                    {f.map((row, i) => {
                      const last = i === 0 ? row.count : f[i - 1].count;
                      const delta = row.count - (last - 1);
                      return (
                        <div key={row.stage} className="row">
                          <span className="stage">{row.stage}</span>
                          <div className="bar-wrap">
                            <i className={"b" + i} style={{ width: (row.count / max * 100) + "%" }}>
                              {i > 0 && <span className="pct-inline">{row.rate}%</span>}
                            </i>
                          </div>
                          <span className="cnt">{row.count}</span>
                          <span className="delta up">+{Math.max(1, Math.floor(row.count / 4))}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="funnel-rates">
                    <div className="fr-cell">
                      <div className="v">61% <span className="acc up">↑ 6%</span></div>
                      <div className="l">投递 → 笔试</div>
                    </div>
                    <div className="fr-cell">
                      <div className="v">55%</div>
                      <div className="l">笔试 → 一面</div>
                    </div>
                    <div className="fr-cell">
                      <div className="v">33% <span className="acc down">↓ 4%</span></div>
                      <div className="l warn">⚠️ 面试 → Offer 瓶颈</div>
                    </div>
                  </div>

                  <div className="insight-strip">
                    <span className="ic">💡</span>
                    <span><b>Coach 洞察 ——</b> 你的「投递 → 笔试」通过率 <b>61%</b>，比同校同届高 18 pts —— 简历筛选这关你 OK 了。瓶颈是「面试 → offer」，<b>主要在行为面试和反问</b>。</span>
                  </div>
                </div>

                <div className="ov-card">
                  <div className="hd">
                    <h3>薪资雷达</h3>
                    <span className="meta">FRONTEND · 校招 · N=1,247</span>
                  </div>
                  <div className="sal-headline">
                    <span className="n">¥38.4</span>
                    <span className="unit">k / 月 · 中位</span>
                    <span className="delta">↑ 4% MoM</span>
                  </div>
                  <div className="sal-sub">全国 · 5 月数据 · 已脱敏</div>

                  <div className="dist">
                    {dist.map((v, i) => (
                      <i key={i}
                         className={i === 10 ? "peak" : i === 8 ? "you" : ""}
                         style={{ height: v * 1.5 + "%" }}></i>
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

              {/* ROW 3 */}
              <div className="ov-row3">
                <div className="trend-big">
                  <div className="hd">
                    <h3>趋势 · 过去 12 周</h3>
                    <span className="meta">投递 / 面试 / 完成任务</span>
                  </div>
                  <svg className="trend-svg" viewBox="0 0 600 160" preserveAspectRatio="none">
                    {[0, 1, 2, 3].map(i => (
                      <line key={i} x1="0" y1={40 * i + 20} x2="600" y2={40 * i + 20} stroke="rgba(255,255,255,.08)" strokeWidth="1" strokeDasharray="3 4" />
                    ))}
                    {/* tasks done — yellow */}
                    <polyline fill="none" stroke="#FFCC00" strokeWidth="2.5"
                      points="0,130 50,118 100,108 150,92 200,80 250,68 300,58 350,48 400,40 450,32 500,26 600,22" strokeLinecap="round" strokeLinejoin="round" />
                    {/* applied — mint */}
                    <polyline fill="none" stroke="#00C7BE" strokeWidth="2"
                      points="0,120 50,108 100,95 150,82 200,76 250,66 300,55 350,48 400,40 450,32 500,28 600,20" strokeLinecap="round" strokeLinejoin="round" />
                    {/* interviews — pink */}
                    <polyline fill="none" stroke="#FF2D55" strokeWidth="2"
                      points="0,142 50,138 100,134 150,128 200,118 250,110 300,98 350,86 400,76 450,64 500,58 600,52" strokeLinecap="round" strokeLinejoin="round" />
                    {/* end dots */}
                    <circle cx="600" cy="22" r="5" fill="#FFCC00" />
                    <circle cx="600" cy="20" r="4" fill="#00C7BE" />
                    <circle cx="600" cy="52" r="4" fill="#FF2D55" />
                  </svg>
                  <div className="trend-legend">
                    <div className="lg"><span className="dot" style={{ background: "#FFCC00" }}></span><span>完成任务</span><span className="n">本周 17 ↑</span></div>
                    <div className="lg"><span className="dot" style={{ background: "#00C7BE" }}></span><span>累计投递</span><span className="n">18 家</span></div>
                    <div className="lg"><span className="dot" style={{ background: "#FF2D55" }}></span><span>面试场次</span><span className="n">12 场</span></div>
                  </div>
                </div>

                <div className="market">
                  <div className="hd">
                    <h3>市场温度 · 本周</h3>
                    <span className="meta">FRONTEND · 24H</span>
                  </div>
                  {m.map((c, i) => (
                    <div key={c.co} className="co-row">
                      <div className={"co-logo " + c.color}>{c.co.slice(0, 2)}</div>
                      <div className="co-name">
                        {c.co}
                        {c.hot && <span className="hot">🔥 热招</span>}
                        <span className="meta">在招 {c.openings} 个前端岗</span>
                      </div>
                      <div className="co-open">{c.openings}<span className="l">岗位</span></div>
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
                    <div className="skill-row good"><span className="name">H5 · C 端性能</span><div className="bar"><i style={{ width: "72%" }}></i></div><span className="v"><b>OK</b></span></div>
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
                  <span><b>建议 ——</b> 缺口里 <b>SSR / Next.js</b> 投入产出比最高（6 个 JD 都要，但你只需要补 ~ 8 小时）。Coach 已为你生成 4 天 learning plan，<b>要不要加进今日任务？</b></span>
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
