// 求职总览 — Overview (B 概念，D 视觉)
// 把整个秋招当成一个项目来看：funnel、市场温度、薪资分布、趋势

const COACH_OVERVIEW_CSS = `
.coach .ov-wrap{display:flex;flex-direction:column;gap:14px;height:100%;min-height:0;overflow:hidden}

.coach .ov-headline{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:22px 24px;display:grid;grid-template-columns:1.2fr 1fr;gap:24px;align-items:center}
.coach .ov-headline h1{margin:0;font-family:"Instrument Serif",serif;font-style:italic;font-size:38px;line-height:1.1;letter-spacing:-.02em;font-weight:400}
.coach .ov-headline h1 em{color:var(--accent)}
.coach .ov-headline .sub{margin-top:8px;font-size:13.5px;color:var(--ink-3);line-height:1.5;max-width:48ch}
.coach .ov-headline .quick-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-left:1px solid var(--line);padding-left:24px}
.coach .ov-headline .quick-stats .s{padding:0 14px;border-right:1px solid var(--line)}
.coach .ov-headline .quick-stats .s:last-child{border-right:0;padding-right:0}
.coach .ov-headline .quick-stats .v{font-family:"Instrument Serif",serif;font-style:italic;font-size:32px;color:var(--ink);line-height:1;letter-spacing:-.02em}
.coach .ov-headline .quick-stats .v .acc{font-family:"Geist Mono",monospace;font-size:12px;font-style:normal;color:var(--good);margin-left:5px}
.coach .ov-headline .quick-stats .v .bad{color:var(--bad) !important}
.coach .ov-headline .quick-stats .l{font-size:11px;color:var(--ink-3);margin-top:6px;letter-spacing:.04em}

.coach .ov-row{display:grid;grid-template-columns:1.4fr 1fr;gap:14px;min-height:0}
.coach .ov-card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px 22px;display:flex;flex-direction:column;min-height:0;overflow:hidden}
.coach .ov-card .hd{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px}
.coach .ov-card .hd h3{margin:0;font-family:"Instrument Serif",serif;font-style:italic;font-size:24px;font-weight:400;letter-spacing:-.01em}
.coach .ov-card .hd .meta{font-family:"Geist Mono",monospace;font-size:10.5px;letter-spacing:.06em;color:var(--ink-3);text-transform:uppercase}
.coach .ov-card .hd .meta a{color:var(--accent);text-decoration:none;margin-left:8px;font-weight:500}

/* funnel */
.coach .funnel{display:flex;flex-direction:column;gap:10px}
.coach .funnel .row{display:grid;grid-template-columns:80px 1fr 60px 60px;gap:14px;align-items:center;font-size:13.5px}
.coach .funnel .stage{color:var(--ink-2)}
.coach .funnel .bar-wrap{height:28px;background:var(--bg-2);border-radius:5px;overflow:hidden;border:1px solid var(--line);position:relative}
.coach .funnel .bar-wrap i{display:block;height:100%;background:var(--ink);border-radius:4px;position:relative}
.coach .funnel .bar-wrap i.acc{background:var(--accent)}
.coach .funnel .bar-wrap .pct-inline{position:absolute;right:8px;top:50%;transform:translateY(-50%);font-family:"Geist Mono",monospace;font-size:10.5px;color:var(--ink-3);letter-spacing:.04em}
.coach .funnel .count{font-family:"Geist Mono",monospace;color:var(--ink);font-weight:600;text-align:right;font-size:14px;font-variant-numeric:tabular-nums}
.coach .funnel .delta{font-family:"Geist Mono",monospace;font-size:11px;text-align:right}
.coach .funnel .delta.up{color:var(--good)}
.coach .funnel .delta.flat{color:var(--ink-3)}

.coach .funnel-rates{margin-top:14px;padding-top:14px;border-top:1px solid var(--line);display:grid;grid-template-columns:repeat(3,1fr);gap:14px;font-size:12px;color:var(--ink-3)}
.coach .funnel-rates .r{padding:0 6px}
.coach .funnel-rates .v{font-family:"Instrument Serif",serif;font-style:italic;font-size:22px;color:var(--ink);line-height:1;letter-spacing:-.01em;margin-bottom:2px}
.coach .funnel-rates .v .acc{font-family:"Geist Mono",monospace;font-size:10px;font-style:normal;color:var(--good);margin-left:4px}
.coach .funnel-rates .l{font-size:11px;color:var(--ink-3)}

/* insight box */
.coach .insight-stripe{background:linear-gradient(180deg,var(--accent-2) 0%,#f3f1ff 100%);border-radius:10px;padding:12px 14px;font-size:12.5px;color:var(--ink-2);line-height:1.55;border-left:3px solid var(--accent);margin-top:14px}
.coach .insight-stripe b{color:var(--accent-3)}

/* salary card */
.coach .salary-headline{display:flex;align-items:baseline;gap:8px;margin-bottom:4px}
.coach .salary-headline .n{font-family:"Instrument Serif",serif;font-style:italic;font-size:44px;font-weight:400;color:var(--accent);letter-spacing:-.02em;line-height:1}
.coach .salary-headline .unit{font-size:14px;color:var(--ink-3)}
.coach .salary-headline .delta{font-family:"Geist Mono",monospace;font-size:11px;color:var(--good);margin-left:auto;align-self:center}
.coach .salary-sub{font-size:11.5px;color:var(--ink-3);font-family:"Geist Mono",monospace;letter-spacing:.04em;margin-bottom:14px}

.coach .dist{height:74px;display:flex;align-items:flex-end;gap:3px}
.coach .dist i{flex:1;background:var(--bg-3);border-radius:2px 2px 0 0;position:relative}
.coach .dist i.peak{background:var(--accent)}
.coach .dist i.you{background:var(--warm);position:relative}
.coach .dist i.you::after{content:"你 ¥36";position:absolute;top:-22px;left:50%;transform:translateX(-50%);font-family:"Geist Mono",monospace;font-size:9px;color:var(--warm);white-space:nowrap;letter-spacing:.04em;font-weight:500}
.coach .dist-ax{display:flex;justify-content:space-between;margin-top:6px;font-family:"Geist Mono",monospace;font-size:10px;color:var(--ink-4)}

.coach .salary-px{margin-top:14px;padding-top:14px;border-top:1px solid var(--line);display:flex;justify-content:space-between;font-size:11.5px;color:var(--ink-3)}
.coach .salary-px .px b{display:block;color:var(--ink);font-family:"Geist Mono",monospace;font-size:14px;font-weight:600;margin-bottom:2px}

/* market companies */
.coach .market-card .co-row{display:grid;grid-template-columns:auto 1fr auto auto auto;gap:10px;align-items:center;padding:10px 0;border-bottom:1px dotted var(--line);font-size:13px}
.coach .market-card .co-row:last-child{border-bottom:0}
.coach .market-card .co-logo{width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#d8c9a8,#a89572);display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff;font-weight:600;font-family:"Geist Mono",monospace;letter-spacing:.04em}
.coach .market-card .co-name{font-weight:500;color:var(--ink)}
.coach .market-card .co-name .hot{display:inline-block;font-size:9.5px;background:var(--bad-2);color:var(--bad);padding:1px 6px;border-radius:3px;margin-left:6px;letter-spacing:.06em;font-weight:500;text-transform:uppercase}
.coach .market-card .co-open{font-family:"Geist Mono",monospace;color:var(--ink-2);font-size:12.5px;font-variant-numeric:tabular-nums;text-align:right;min-width:50px}
.coach .market-card .co-open .l{display:block;font-family:"Geist",sans-serif;font-size:10px;color:var(--ink-3);font-weight:400}
.coach .market-card .co-trend{font-family:"Geist Mono",monospace;font-size:11px;width:38px;text-align:right}
.coach .market-card .co-trend.up{color:var(--good)}
.coach .market-card .co-trend.down{color:var(--bad)}
.coach .market-card .co-trend.flat{color:var(--ink-3)}
.coach .market-card .co-cta{padding:5px 12px;font-size:11px;border:1px solid var(--line);border-radius:999px;color:var(--ink-2);background:var(--bg-2)}

/* trend chart */
.coach .trend-card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px 22px}
.coach .trend-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:center}
.coach .trend-chart{height:160px;position:relative}
.coach .trend-svg{width:100%;height:100%}
.coach .trend-legend{display:flex;flex-direction:column;gap:10px;font-size:12px;color:var(--ink-3)}
.coach .trend-legend .row{display:grid;grid-template-columns:14px 1fr auto;gap:8px;align-items:center}
.coach .trend-legend .dot{width:10px;height:10px;border-radius:2px}
.coach .trend-legend .n{font-family:"Geist Mono",monospace;color:var(--ink);font-weight:600;font-size:13px}

/* bottom row: skill gap */
.coach .skill-card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px 22px}
.coach .skill-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.coach .skill-col{display:flex;flex-direction:column;gap:8px}
.coach .skill-col .lbl{font-family:"Geist Mono",monospace;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);margin-bottom:4px}
.coach .skill{display:grid;grid-template-columns:100px 1fr 70px;gap:10px;align-items:center;font-size:12.5px;padding:5px 0;border-bottom:1px dotted var(--line)}
.coach .skill:last-child{border-bottom:0}
.coach .skill .name{color:var(--ink-2)}
.coach .skill .bar{height:5px;background:var(--bg-2);border-radius:2px;overflow:hidden}
.coach .skill .bar i{display:block;height:100%;border-radius:2px;background:var(--good)}
.coach .skill.weak .bar i{background:var(--bad)}
.coach .skill .v{font-family:"Geist Mono",monospace;font-size:10.5px;color:var(--ink-3);text-align:right}
.coach .skill .v b{color:var(--ink);font-weight:600}
`;

const Overview = () => {
  const funnel = window.COACH_FUNNEL;
  const market = window.COACH_MARKET;
  const max = funnel[0].count;
  const dist = [3,6,10,16,22,30,38,42,46,50,53,55,52,44,36,26,18,12,8,5];

  return (
    <div className="coach">
      <style>{window.COACH_CSS}</style>
      <style>{COACH_OVERVIEW_CSS}</style>
      <div className="app">
        <window.CoachSide active="overview" />
        <div className="main">
          <window.CoachTopbar
            crumb={["求职总览 · Overview"]}
            title
            actions={<>
              <button className="btn ghost sm">{window.IK.calendar}<span>本届 ·</span><b style={{ color: "var(--ink)" }}>2026 校招</b></button>
              <button className="btn ghost sm">{window.IK.download}<span>导出周报</span></button>
            </>}
          />

          <div className="scroll" style={{ overflow: "auto" }}>
            <div className="ov-wrap">
              {/* headline */}
              <div className="ov-headline">
                <div>
                  <h1>你的秋招，<em>已经走完一半。</em></h1>
                  <p className="sub">
                    投了 <b style={{ color: "var(--ink)" }}>18</b> 家，进到面试的 <b style={{ color: "var(--ink)" }}>6</b> 家，目前手握 <b style={{ color: "var(--accent)" }}>1 个 offer</b>。
                    经验对口度高，瓶颈在面试转化 —— <span className="it">这个数字今天就可以改</span>。
                  </p>
                </div>
                <div className="quick-stats">
                  <div className="s">
                    <div className="v">P 73 <span className="acc">↑ 12</span></div>
                    <div className="l">同校同届排名</div>
                  </div>
                  <div className="s">
                    <div className="v">61%<span className="acc">↑ 6%</span></div>
                    <div className="l">投递→笔试通过率</div>
                  </div>
                  <div className="s">
                    <div className="v">33%<span className="acc bad">↓ 4%</span></div>
                    <div className="l">面试→Offer 通过率</div>
                  </div>
                </div>
              </div>

              {/* row 1: funnel + salary */}
              <div className="ov-row">
                <div className="ov-card">
                  <div className="hd">
                    <h3>求职 funnel · 整个秋招</h3>
                    <span className="meta">UPDATED 14:22 · <a>详情 →</a></span>
                  </div>
                  <div className="funnel">
                    {funnel.map((f, i) => {
                      const delta = f.count - f.last;
                      const rate = i === 0 ? 100 : Math.round(f.count / funnel[i - 1].count * 100);
                      return (
                        <div key={f.stage} className="row">
                          <span className="stage">{f.stage}</span>
                          <div className="bar-wrap">
                            <i className={i === 5 ? "acc" : ""} style={{ width: f.count / max * 100 + "%" }}>
                              <span className="pct-inline">{i > 0 ? rate + "%" : ""}</span>
                            </i>
                          </div>
                          <span className="count">{f.count}</span>
                          <span className={"delta " + (delta > 0 ? "up" : "flat")}>
                            {delta > 0 ? `+${delta}` : delta === 0 ? "—" : delta}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="funnel-rates">
                    <div className="r">
                      <div className="v">61% <span className="acc">↑ 6%</span></div>
                      <div className="l">投递 → 笔试</div>
                    </div>
                    <div className="r">
                      <div className="v">55%</div>
                      <div className="l">笔试 → 一面</div>
                    </div>
                    <div className="r">
                      <div className="v">33% <span className="acc" style={{color:"var(--bad)"}}>↓ 4%</span></div>
                      <div className="l">面试 → Offer ← 瓶颈</div>
                    </div>
                  </div>

                  <div className="insight-stripe">
                    <b>● Coach 洞察 ——</b> 你的「投递 → 笔试」通过率 <b>61%</b>，比同校同届高 18 pts —— 简历筛选这关你 OK 了。瓶颈是「面试 → offer」，<span className="it">是要把行为面试和反问环节练起来</span>。
                  </div>
                </div>

                <div className="ov-card">
                  <div className="hd">
                    <h3>薪资雷达</h3>
                    <span className="meta">FRONTEND · GRAD · N=1,247</span>
                  </div>
                  <div className="salary-headline">
                    <span className="n">¥38.4</span>
                    <span className="unit">k / 月 · 中位</span>
                    <span className="delta">↑ 4% MoM</span>
                  </div>
                  <div className="salary-sub">前端 · 校招 · 全国 · 5 月</div>

                  <div className="dist">
                    {dist.map((v, i) => (
                      <i key={i}
                         className={i === 10 ? "peak" : i === 8 ? "you" : ""}
                         style={{ height: v * 1.3 + "%" }}></i>
                    ))}
                  </div>
                  <div className="dist-ax">
                    <span>15k</span><span>25k</span><span>35k</span><span>45k</span><span>55k</span><span>65k+</span>
                  </div>

                  <div className="salary-px">
                    <div className="px"><b>¥28k</b>P25</div>
                    <div className="px"><b>¥38k</b>P50 中位</div>
                    <div className="px" style={{ color: "var(--warm)" }}><b style={{ color: "var(--warm)" }}>¥36k</b>你 · P47</div>
                    <div className="px"><b>¥48k</b>P75</div>
                    <div className="px"><b>¥62k</b>P90</div>
                  </div>

                  <div className="insight-stripe" style={{ marginTop: 14 }}>
                    <b>● 还可以等。</b>同校同届前端 <b>53%</b> 拿到了更高数字。本周还有 3 场二面在路上，<span className="it">再等一周</span>。
                  </div>
                </div>
              </div>

              {/* row 2: trend + market */}
              <div className="ov-row">
                <div className="trend-card">
                  <div className="hd" style={{ display: "flex", justifyContent: "space-between" }}>
                    <h3 style={{ margin: 0, fontFamily: "Instrument Serif, serif", fontStyle: "italic", fontSize: 24, fontWeight: 400 }}>趋势 · 过去 12 周</h3>
                    <span className="meta" style={{ fontFamily: "Geist Mono, monospace", fontSize: 10.5, letterSpacing: ".06em", color: "var(--ink-3)" }}>每周投递 / 面试 / 完成任务</span>
                  </div>
                  <div className="trend-grid">
                    <div className="trend-chart">
                      <svg className="trend-svg" viewBox="0 0 400 160" preserveAspectRatio="none">
                        {/* gridlines */}
                        {[0, 1, 2, 3].map(i => (
                          <line key={i} x1="0" y1={40 * i + 20} x2="400" y2={40 * i + 20} stroke="#ece9df" strokeWidth="1" strokeDasharray="3 3" />
                        ))}
                        {/* applied (ink-3) */}
                        <polyline fill="none" stroke="#7a7973" strokeWidth="1.8"
                          points="0,120 35,108 70,95 105,82 140,76 175,66 210,55 245,48 280,40 315,32 350,28 400,20" />
                        {/* interviews (warm) */}
                        <polyline fill="none" stroke="#d97757" strokeWidth="1.8"
                          points="0,142 35,138 70,134 105,128 140,118 175,110 210,98 245,86 280,76 315,64 350,58 400,52" />
                        {/* tasks done (accent) */}
                        <polyline fill="none" stroke="#5963f5" strokeWidth="2"
                          points="0,128 35,118 70,108 105,92 140,80 175,68 210,58 245,48 280,40 315,32 350,26 400,22" />
                        {/* dot at end of accent */}
                        <circle cx="400" cy="22" r="3.5" fill="#5963f5" />
                      </svg>
                    </div>
                    <div className="trend-legend">
                      <div className="row">
                        <span className="dot" style={{ background: "#5963f5" }}></span>
                        <span>完成日任务</span>
                        <span className="n">本周 17 ↑</span>
                      </div>
                      <div className="row">
                        <span className="dot" style={{ background: "#7a7973" }}></span>
                        <span>累计投递</span>
                        <span className="n">18 家</span>
                      </div>
                      <div className="row">
                        <span className="dot" style={{ background: "#d97757" }}></span>
                        <span>面试场次</span>
                        <span className="n">12 场</span>
                      </div>
                      <div style={{ paddingTop: 8, marginTop: 8, borderTop: "1px solid var(--line)", fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.5 }}>
                        本周节奏 <b style={{ color: "var(--good)" }}>↑ 健康</b> —— 你已经从 4 月的"低气压周"走出来，<span className="it">不需要再加码了</span>。
                      </div>
                    </div>
                  </div>
                </div>

                <div className="ov-card market-card">
                  <div className="hd">
                    <h3>市场温度 · 本周</h3>
                    <span className="meta">FRONTEND · 24H</span>
                  </div>
                  {market.hotCo.map((c, i) => (
                    <div key={c.name} className="co-row">
                      <div className="co-logo" style={{ background: `linear-gradient(135deg, hsl(${i*40} 35% 60%), hsl(${i*40+25} 30% 38%))` }}>
                        {c.name.slice(0, 2)}
                      </div>
                      <div className="co-name">
                        {c.name}
                        {c.hot && <span className="hot">热招</span>}
                      </div>
                      <div className="co-open">
                        {c.openings}
                        <span className="l">岗位</span>
                      </div>
                      <span className={"co-trend " + (c.trend > 0 ? "up" : c.trend < 0 ? "down" : "flat")}>
                        {c.trend > 0 ? `+${c.trend}` : c.trend === 0 ? "—" : c.trend}
                      </span>
                      <span className="co-cta">查看</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* row 3: skill audit */}
              <div className="skill-card">
                <div className="hd" style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontFamily: "Instrument Serif, serif", fontStyle: "italic", fontSize: 24, fontWeight: 400 }}>你的能力盘点 · vs 心仪岗位需求</h3>
                  <span className="meta" style={{ fontFamily: "Geist Mono, monospace", fontSize: 10.5, color: "var(--ink-3)" }}>基于 6 个目标 JD 聚合</span>
                </div>
                <div className="skill-grid">
                  <div className="skill-col">
                    <span className="lbl">优势 · 已具备</span>
                    <div className="skill"><span className="name">React 18</span><div className="bar"><i style={{width:"94%"}}></i></div><span className="v"><b>专家</b></span></div>
                    <div className="skill"><span className="name">TypeScript</span><div className="bar"><i style={{width:"88%"}}></i></div><span className="v"><b>熟练</b></span></div>
                    <div className="skill"><span className="name">前端工程化</span><div className="bar"><i style={{width:"82%"}}></i></div><span className="v"><b>熟练</b></span></div>
                    <div className="skill"><span className="name">组件库治理</span><div className="bar"><i style={{width:"78%"}}></i></div><span className="v"><b>熟练</b></span></div>
                    <div className="skill"><span className="name">H5 / C 端性能</span><div className="bar"><i style={{width:"72%"}}></i></div><span className="v"><b>OK</b></span></div>
                  </div>
                  <div className="skill-col">
                    <span className="lbl">缺口 · JD 要但你弱</span>
                    <div className="skill weak"><span className="name">SSR / Next.js</span><div className="bar"><i style={{width:"32%"}}></i></div><span className="v">6 个 JD 要</span></div>
                    <div className="skill weak"><span className="name">Monorepo</span><div className="bar"><i style={{width:"28%"}}></i></div><span className="v">5 个 JD 要</span></div>
                    <div className="skill weak"><span className="name">行为面试 STAR</span><div className="bar"><i style={{width:"42%"}}></i></div><span className="v">通用</span></div>
                    <div className="skill weak"><span className="name">英文表达</span><div className="bar"><i style={{width:"48%"}}></i></div><span className="v">海外岗位</span></div>
                    <div className="skill weak"><span className="name">系统设计</span><div className="bar"><i style={{width:"22%"}}></i></div><span className="v">3 个 JD</span></div>
                  </div>
                </div>
                <div style={{ marginTop: 14, padding: "10px 14px", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.55 }}>
                  <span style={{ color: "var(--accent)", fontWeight: 500 }}>↳ 建议 ——</span> 缺口里 <b>SSR / Next.js</b> 投入产出比最高（6 个 JD 都要，但你只需要补 ≈ 8 小时）。Coach 已经为你生成 1 个 4 天的 learning plan，加进今日任务？
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
