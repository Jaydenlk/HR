// Vibe Today — Apple Activity-like, vibrant bento layout.

const VIBE_TODAY_CSS = `
.vibe .today-grid{display:grid;grid-template-columns:1.45fr 1fr;gap:14px;height:100%;min-height:0;overflow:hidden}
.vibe .today-grid > .left{display:flex;flex-direction:column;gap:14px;min-width:0}
.vibe .today-grid > .right{display:flex;flex-direction:column;gap:14px;min-width:0;overflow:hidden}

/* greeting hero */
.vibe .hello{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:18px;background:var(--bg-card);border-radius:var(--r-card-lg);padding:22px 26px;border:1px solid var(--line)}
.vibe .hello h1{margin:0;font-size:32px;font-weight:800;letter-spacing:-.03em;line-height:1.05;color:var(--ink)}
.vibe .hello h1 .acc{color:var(--c-orange)}
.vibe .hello .date{margin-top:6px;font-size:13.5px;color:var(--ink-3);font-weight:500}
.vibe .hello .progress-ring{position:relative;width:100px;height:100px}
.vibe .hello .progress-ring svg{transform:rotate(-90deg)}
.vibe .hello .progress-ring .num{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.vibe .hello .progress-ring .num b{font-size:32px;font-weight:800;letter-spacing:-.03em;color:var(--ink);line-height:1}
.vibe .hello .progress-ring .num span{font-size:11px;color:var(--ink-3);font-weight:600;margin-top:2px}

/* streak ribbon */
.vibe .streak{background:var(--c-orange);color:#fff;border-radius:var(--r-card);padding:18px 22px;display:grid;grid-template-columns:auto 1fr auto;gap:18px;align-items:center;position:relative;overflow:hidden}
.vibe .streak .blob{position:absolute;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,.18);right:-50px;top:-50px}
.vibe .streak .flame-big{font-size:60px;line-height:1;position:relative;z-index:2;font-weight:800;letter-spacing:-.04em}
.vibe .streak .lbl{font-size:11.5px;font-weight:700;letter-spacing:.02em;opacity:.78;text-transform:uppercase}
.vibe .streak .v{font-size:14.5px;font-weight:600;margin-top:2px}
.vibe .streak .v b{font-weight:800}
.vibe .streak-dots{display:flex;gap:4px;margin-top:8px;position:relative;z-index:2}
.vibe .streak-dots i{width:9px;height:24px;border-radius:3px;background:rgba(255,255,255,.25)}
.vibe .streak-dots i.on{background:#fff}
.vibe .streak-dots i.today{background:var(--ink);box-shadow:0 0 0 2px rgba(255,255,255,.4)}
.vibe .streak .right-col{position:relative;z-index:2;text-align:right}
.vibe .streak .right-col b{font-weight:800}

/* tasks header */
.vibe .tasks-h{display:flex;justify-content:space-between;align-items:baseline;margin:4px 4px -2px}
.vibe .tasks-h h2{margin:0;font-size:20px;font-weight:700;letter-spacing:-.015em;color:var(--ink)}
.vibe .tasks-h .meta{font-size:13px;color:var(--ink-3);font-weight:500}
.vibe .tasks-h .meta b{color:var(--ink);font-weight:700}

/* task cards (vivid) */
.vibe .task-card{display:grid;grid-template-columns:42px 1fr auto auto;gap:14px;align-items:center;padding:16px 18px;background:var(--bg-card);border:1px solid var(--line);border-radius:var(--r-card);transition:.15s}
.vibe .task-card.done{background:var(--bg-tint);opacity:.7}
.vibe .task-card .num-tile{width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:18px;letter-spacing:-.02em;flex-shrink:0}
.vibe .task-card.done .num-tile{background:var(--c-green) !important;color:#fff}
.vibe .task-card.color-indigo .num-tile{background:var(--c-indigo)}
.vibe .task-card.color-blue .num-tile{background:var(--c-blue)}
.vibe .task-card.color-pink .num-tile{background:var(--c-pink)}
.vibe .task-card.color-orange .num-tile{background:var(--c-orange)}
.vibe .task-card.color-green .num-tile{background:var(--c-green)}
.vibe .task-card.color-purple .num-tile{background:var(--c-purple)}
.vibe .task-card.color-mint .num-tile{background:var(--c-mint)}
.vibe .task-card .body .title{font-size:15px;font-weight:600;color:var(--ink);letter-spacing:-.005em}
.vibe .task-card.done .body .title{text-decoration:line-through;text-decoration-color:var(--ink-4);color:var(--ink-3)}
.vibe .task-card .body .why{font-size:12px;color:var(--ink-3);margin-top:3px;display:flex;align-items:center;gap:8px;font-weight:500}
.vibe .task-card .dur{font-family:"JetBrains Mono",monospace;font-size:12px;color:var(--ink-3);font-weight:600}
.vibe .task-card .open{padding:7px 14px;font-size:12.5px;font-weight:600;background:var(--ink);color:#fff;border:0;border-radius:10px;display:inline-flex;align-items:center;gap:5px}
.vibe .task-card.done .open{display:none}
.vibe .task-card .done-tag{font-size:12px;font-weight:600;color:var(--c-green);display:flex;align-items:center;gap:4px}

/* rest stripe */
.vibe .rest{background:var(--c-green-2);border-radius:var(--r-card);padding:14px 18px;display:flex;align-items:center;gap:12px;font-size:14px;color:#1e7a3a;font-weight:600}
.vibe .rest .emoji{font-size:22px}

/* right rail — next interview hero */
.vibe .next-iv{background:var(--c-purple);color:#fff;border-radius:var(--r-card-lg);padding:24px;position:relative;overflow:hidden}
.vibe .next-iv .blob{position:absolute;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,.16);top:-60px;right:-60px}
.vibe .next-iv .blob2{position:absolute;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.12);bottom:-40px;left:-30px}
.vibe .next-iv > *{position:relative;z-index:2}
.vibe .next-iv .head{display:flex;justify-content:space-between;align-items:center;font-size:11.5px;font-weight:700;opacity:.85;letter-spacing:.04em;text-transform:uppercase;margin-bottom:6px}
.vibe .next-iv .head .ago-pill{background:rgba(255,255,255,.22);padding:4px 10px;border-radius:999px}
.vibe .next-iv .co{font-size:36px;font-weight:800;letter-spacing:-.025em;margin-top:6px;line-height:1.05}
.vibe .next-iv .role{font-size:14px;font-weight:600;opacity:.85;margin-top:4px}
.vibe .next-iv .days-card{background:rgba(255,255,255,.96);color:var(--c-purple);border-radius:14px;padding:14px 16px;margin-top:18px;display:flex;justify-content:space-between;align-items:center}
.vibe .next-iv .days-card .when{font-size:13px;color:var(--ink-2);font-weight:600}
.vibe .next-iv .days-card .when b{display:block;color:var(--ink);font-size:14px;font-weight:700}
.vibe .next-iv .days-card .days{font-size:34px;font-weight:800;letter-spacing:-.03em;line-height:1}
.vibe .next-iv .days-card .days span{font-size:13px;font-weight:600;color:var(--ink-3);margin-left:4px}

.vibe .next-iv .rounds{margin-top:16px;display:flex;gap:5px}
.vibe .next-iv .rounds .r{flex:1;padding:8px 4px;background:rgba(255,255,255,.18);border-radius:9px;font-size:11px;text-align:center;font-weight:600;opacity:.8}
.vibe .next-iv .rounds .r.done{background:rgba(255,255,255,.88);color:var(--c-purple)}
.vibe .next-iv .rounds .r.active{background:#fff;color:var(--c-purple);opacity:1;font-weight:700}

.vibe .next-iv .prep{margin-top:14px;font-size:13px;display:flex;justify-content:space-between;align-items:center;opacity:.92}
.vibe .next-iv .prep .pct-num{font-size:22px;font-weight:800;letter-spacing:-.02em}

/* coach card (Coach speaking) */
.vibe .coach-card{background:var(--ink);color:#fff;border-radius:var(--r-card);padding:20px}
.vibe .coach-card .who{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.vibe .coach-card .who-name{font-size:13.5px;font-weight:700;letter-spacing:-.003em}
.vibe .coach-card .who-meta{font-size:11.5px;color:rgba(255,255,255,.5);font-weight:500;margin-top:1px}
.vibe .coach-card .body{font-size:15px;line-height:1.55;font-weight:500}
.vibe .coach-card .body em{color:var(--c-yellow);font-style:normal;font-weight:700}
.vibe .coach-card .actions{display:flex;gap:6px;margin-top:14px;flex-wrap:wrap}
.vibe .coach-card .actions .a{font-size:12.5px;padding:7px 13px;border-radius:999px;background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.16);font-weight:600;display:inline-flex;align-items:center;gap:5px}
.vibe .coach-card .actions .a.acc{background:var(--c-yellow);border-color:var(--c-yellow);color:var(--ink)}

/* upcoming */
.vibe .upcoming{background:var(--bg-card);border:1px solid var(--line);border-radius:var(--r-card);padding:18px 20px}
.vibe .upcoming .h{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px}
.vibe .upcoming .h h3{margin:0;font-size:15px;font-weight:700;letter-spacing:-.005em}
.vibe .upcoming .h a{color:var(--c-blue);font-size:12px;font-weight:600;text-decoration:none}
.vibe .upcoming .row{display:grid;grid-template-columns:36px 1fr auto;gap:12px;align-items:center;padding:9px 0;border-top:1px solid var(--line);font-size:13px}
.vibe .upcoming .row:first-of-type{border-top:0}
.vibe .upcoming .row .ic-box{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0}
.vibe .upcoming .row .name{font-weight:600;color:var(--ink)}
.vibe .upcoming .row .name .sub{display:block;font-size:11.5px;color:var(--ink-3);font-weight:500;margin-top:1px}
.vibe .upcoming .row .when{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--ink-3);text-align:right;font-weight:600;line-height:1.4}
`;

const TodayScreen = () => {
  const t = window.COACH_TODAY;
  const done = t.tasks.filter(x => x.done).length;
  const pct = done / t.tasks.length;
  const r = 42, C = 2 * Math.PI * r;
  return (
    <div className="vibe">
      <style>{window.VIBE_CSS}</style>
      <style>{VIBE_TODAY_CSS}</style>
      <div className="app">
        <window.VibeSide active="today" />
        <div className="main">
          <window.VibeTopbar
            title="今天"
            sub={`${t.date} · ${t.countdown}`}
            actions={<>
              <button className="btn sm">{window.IK.calendar}<span>本月日历</span></button>
              <button className="btn primary sm">{window.IK.plus}<span>自定义任务</span></button>
            </>}
          />

          <div className="scroll">
            <div className="today-grid">
              {/* LEFT */}
              <div className="left">
                {/* hello card */}
                <div className="hello">
                  <window.Avatar kind="ming" size={70} bg="var(--c-yellow-2)" />
                  <div>
                    <h1>早上好，明 <span className="acc">·</span><br/>今天还有 <span className="acc">3</span> 件事。</h1>
                    <div className="date">{t.date}</div>
                  </div>
                  <div className="progress-ring">
                    <svg width="100" height="100" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--bg-tint)" strokeWidth="8" />
                      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--c-orange)" strokeWidth="8" strokeLinecap="round"
                        strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
                    </svg>
                    <div className="num"><b>{done}/{t.tasks.length}</b><span>已完成</span></div>
                  </div>
                </div>

                {/* streak */}
                <div className="streak">
                  <div className="blob"></div>
                  <div className="flame-big">17</div>
                  <div style={{ position: "relative", zIndex: 2 }}>
                    <div className="lbl">🔥 连续打卡</div>
                    <div className="v">已完成 <b>57%</b> 的月度目标</div>
                    <div className="streak-dots">
                      {Array.from({ length: 18 }).map((_, i) => (
                        <i key={i} className={i < 11 ? "on" : i === 11 ? "today" : ""}></i>
                      ))}
                    </div>
                  </div>
                  <div className="right-col">
                    <div className="lbl">本周</div>
                    <div className="v"><b>4</b>/5 天</div>
                    <div className="v" style={{ opacity: .8 }}>共 <b>2.1h</b> 学习</div>
                  </div>
                </div>

                {/* tasks */}
                <div className="tasks-h">
                  <h2>今日 5 步 ·</h2>
                  <div className="meta">已完成 <b>{done}</b>/5 · 剩余 <b>~ 1h 40m</b></div>
                </div>

                {t.tasks.map((task, i) => (
                  <div key={task.id} className={"task-card color-" + task.color + (task.done ? " done" : "")}>
                    <div className="num-tile">
                      {task.done ? window.IK.check : String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="body">
                      <div className="title">{task.title}</div>
                      <div className="why">
                        <span className={"chip " + task.color}>{task.tag}</span>
                        <span>{task.done ? "✓ 已完成 · 早上 10:" + (20 + i * 7) : task.why}</span>
                      </div>
                    </div>
                    <span className="dur">{task.dur} min</span>
                    {!task.done
                      ? <button className="open">开始 {window.IK.arrow}</button>
                      : <span className="done-tag">{window.IK.check}已完成</span>}
                  </div>
                ))}

                <div className="rest">
                  <span className="emoji">🌿</span>
                  <span>做完剩下的 3 步，<b>就可以去过别的生活了</b>。秋招是马拉松。</span>
                </div>
              </div>

              {/* RIGHT */}
              <div className="right">
                <div className="next-iv">
                  <div className="blob"></div>
                  <div className="blob2"></div>
                  <div className="head">
                    <span>下一场面试</span>
                    <span className="ago-pill">📍 准备包 72%</span>
                  </div>
                  <div className="co">美团</div>
                  <div className="role">前端工程师 · 二面</div>

                  <div className="days-card">
                    <div className="when">
                      <b>{t.next.when}</b>
                      技术 + HRBP · 上海 / 望京
                    </div>
                    <div className="days">{t.next.daysLeft}<span>天</span></div>
                  </div>

                  <div className="rounds">
                    {t.next.rounds.map((rd, i) => (
                      <div key={i} className={"r " + (i < t.next.activeRound ? "done" : i === t.next.activeRound ? "active" : "")}>
                        {rd}
                      </div>
                    ))}
                  </div>

                  <div className="prep">
                    <span>面试包准备 · 7/10 项</span>
                    <span className="pct-num">72%</span>
                  </div>
                </div>

                <div className="coach-card">
                  <div className="who">
                    <window.Avatar kind="coach" size={40} bg="var(--c-purple)" />
                    <div>
                      <div className="who-name">Coach 今日洞察</div>
                      <div className="who-meta">基于昨天的美团二面录音</div>
                    </div>
                  </div>
                  <div className="body">
                    昨天的二面，<em>17 秒的沉默</em> 出现在「最难的技术决策」那道题。<br/>
                    周一终面前，先把今日的 STAR ch.2 跑完，我可以帮你提前写好那个故事。
                  </div>
                  <div className="actions">
                    <span className="a acc">{window.IK.bolt}<span>现在跑一遍</span></span>
                    <span className="a">告诉我故事</span>
                    <span className="a">先跳过</span>
                  </div>
                </div>

                <div className="upcoming">
                  <div className="h">
                    <h3>本周接下来</h3>
                    <a>全部 →</a>
                  </div>
                  <div className="row">
                    <div className="ic-box" style={{ background: "var(--c-cyan)" }}>{window.IK.doc}</div>
                    <div className="name">字节客户端 · 笔试<span className="sub">已投递 · 等待</span></div>
                    <span className="when">5/24<br/>14:00</span>
                  </div>
                  <div className="row">
                    <div className="ic-box" style={{ background: "var(--c-purple)" }}>{window.IK.mic}</div>
                    <div className="name">美团 · 终面<span className="sub">技术 + HRBP</span></div>
                    <span className="when">5/26<br/>14:00</span>
                  </div>
                  <div className="row">
                    <div className="ic-box" style={{ background: "var(--c-mint)" }}>{window.IK.brief}</div>
                    <div className="name">Shopee SG · OA 截止<span className="sub">48h 内提交</span></div>
                    <span className="when">5/27<br/>23:59</span>
                  </div>
                  <div className="row">
                    <div className="ic-box" style={{ background: "var(--c-orange)" }}>{window.IK.send}</div>
                    <div className="name">拼多多 · 内推生效<span className="sub">@阿海 帮你</span></div>
                    <span className="when">5/28</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { TodayScreen });
