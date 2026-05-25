// Today — disciplined, white + ink with semantic colors only.

const TODAY_CSS = `
.coach .today-grid{display:grid;grid-template-columns:1.5fr 1fr;gap:20px;height:100%;min-height:0;overflow:hidden}
.coach .today-grid > .lt{display:flex;flex-direction:column;gap:14px;min-width:0}
.coach .today-grid > .rt{display:flex;flex-direction:column;gap:14px;min-width:0;overflow:hidden}

/* hero — the ONE colored card */
.coach .hello{
  background:var(--ink);color:#fff;border-radius:24px;
  padding:28px 30px;position:relative;overflow:hidden;
  display:grid;grid-template-columns:1fr auto;gap:24px;align-items:center;
}
.coach .hello::before{
  content:"";position:absolute;inset:0;
  background:radial-gradient(700px 360px at 80% -10%,rgba(10,132,255,.28),transparent 60%);
  pointer-events:none;
}
.coach .hello > *{position:relative;z-index:2}
.coach .hello .greet-row{display:flex;align-items:center;gap:14px}
.coach .hello h1{margin:0;font-size:36px;line-height:1.1;letter-spacing:-.03em;font-weight:800}
.coach .hello h1 .acc{color:var(--brand)}
.coach .hello .date{margin-top:6px;font-size:13px;color:rgba(255,255,255,.6);font-weight:500}
.coach .hello .ring-blk{position:relative;width:100px;height:100px;flex-shrink:0}
.coach .hello .ring-blk svg{transform:rotate(-90deg)}
.coach .hello .ring-blk .num{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.coach .hello .ring-blk .num b{font-size:30px;font-weight:800;letter-spacing:-.03em;line-height:1;color:#fff}
.coach .hello .ring-blk .num span{font-size:10px;color:rgba(255,255,255,.6);font-weight:600;letter-spacing:.04em;text-transform:uppercase;margin-top:3px}

/* compact streak inline */
.coach .streak-inline{margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,.1);display:flex;align-items:center;justify-content:space-between;gap:18px;font-size:13px;color:rgba(255,255,255,.7);font-weight:500}
.coach .streak-inline .flame{color:var(--warn);font-weight:700;font-size:14px;display:flex;align-items:center;gap:6px}
.coach .streak-inline .flame b{color:#fff;font-size:18px;font-weight:800;letter-spacing:-.02em}
.coach .streak-inline .dots{display:flex;gap:3px}
.coach .streak-inline .dots i{width:6px;height:18px;border-radius:2px;background:rgba(255,255,255,.18)}
.coach .streak-inline .dots i.on{background:#fff}
.coach .streak-inline .dots i.today{background:var(--brand);box-shadow:0 0 0 2px rgba(255,255,255,.15)}

/* tasks header */
.coach .tasks-h{display:flex;justify-content:space-between;align-items:baseline;padding:4px 4px 0}
.coach .tasks-h h2{margin:0;font-size:18px;font-weight:700;letter-spacing:-.015em}
.coach .tasks-h .meta{font-size:12.5px;color:var(--ink-3);font-weight:500}
.coach .tasks-h .meta b{color:var(--ink);font-weight:700}

/* task list */
.coach .task{
  display:grid;grid-template-columns:auto 1fr auto auto;gap:14px;align-items:center;
  padding:14px 18px;background:var(--surface);border:1px solid var(--line);border-radius:14px;
}
.coach .task.done{background:var(--surface-2);border-color:transparent}
.coach .task .chk{
  width:24px;height:24px;border-radius:50%;border:1.5px solid var(--line-2);
  display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff;
}
.coach .task.done .chk{background:var(--success);border-color:var(--success)}
.coach .task .body{min-width:0}
.coach .task .title{font-size:14.5px;font-weight:600;color:var(--ink);letter-spacing:-.005em}
.coach .task.done .title{color:var(--ink-3);text-decoration:line-through;text-decoration-color:var(--ink-4)}
.coach .task .why{font-size:12px;color:var(--ink-3);margin-top:3px;font-weight:500;display:flex;align-items:center;gap:8px}
.coach .task .dur{font-family:var(--font-mono);font-size:12px;color:var(--ink-3);font-weight:600}
.coach .task .open{padding:6px 12px;font-size:12.5px;font-weight:600;background:var(--ink);color:#fff;border-radius:8px;border:0;display:inline-flex;align-items:center;gap:5px}
.coach .task.done .open{display:none}
.coach .task .done-text{font-size:12px;color:var(--success);font-weight:600;display:inline-flex;align-items:center;gap:4px}

/* rest */
.coach .rest{
  background:var(--success-soft);border:1px solid transparent;border-radius:14px;
  padding:14px 18px;display:flex;align-items:center;gap:12px;
  font-size:13.5px;color:#1f7a31;font-weight:600;letter-spacing:-.003em;
}

/* right rail */
.coach .next-iv{
  background:var(--surface);border:1px solid var(--line);border-radius:20px;
  padding:22px 24px;
}
.coach .next-iv .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
.coach .next-iv .top .lbl{font-size:11px;color:var(--ink-3);font-weight:700;letter-spacing:.04em;text-transform:uppercase}
.coach .next-iv .top .badge{font-family:var(--font-mono);font-size:11px;color:var(--brand);font-weight:700;background:var(--brand-soft);padding:3px 8px;border-radius:6px}
.coach .next-iv .co{font-size:24px;font-weight:700;letter-spacing:-.02em;line-height:1.1;color:var(--ink)}
.coach .next-iv .role{font-size:13px;color:var(--ink-3);font-weight:500;margin-top:3px}

.coach .next-iv .when-row{
  margin-top:18px;padding:14px 16px;background:var(--surface-2);border-radius:12px;
  display:flex;justify-content:space-between;align-items:center;
}
.coach .next-iv .when-row .left b{display:block;font-size:13px;font-weight:700;color:var(--ink)}
.coach .next-iv .when-row .left span{font-size:11.5px;color:var(--ink-3);font-weight:500;margin-top:2px;display:block}
.coach .next-iv .when-row .days{font-size:28px;font-weight:800;letter-spacing:-.03em;color:var(--ink);line-height:1}
.coach .next-iv .when-row .days span{font-size:13px;color:var(--ink-3);font-weight:600;margin-left:4px}

.coach .next-iv .rounds{margin-top:14px;display:flex;gap:5px}
.coach .next-iv .rounds .r{flex:1;padding:7px 4px;background:var(--surface-2);border-radius:7px;font-size:11px;font-weight:600;color:var(--ink-3);text-align:center;letter-spacing:-.003em}
.coach .next-iv .rounds .r.done{background:var(--success-soft);color:#1f7a31}
.coach .next-iv .rounds .r.active{background:var(--ink);color:#fff}

.coach .next-iv .prep{margin-top:14px;padding-top:14px;border-top:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--ink-3);font-weight:500}
.coach .next-iv .prep .pct{font-size:22px;font-weight:800;letter-spacing:-.025em;color:var(--ink)}
.coach .next-iv .prep .pct span{font-size:13px;color:var(--ink-3);font-weight:600;margin-left:3px}

/* coach insight */
.coach .insight{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:22px 24px}
.coach .insight .who{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.coach .insight .who b{font-size:13.5px;font-weight:600;letter-spacing:-.003em}
.coach .insight .who .meta{font-size:11.5px;color:var(--ink-3);font-weight:500;margin-top:1px;display:block}
.coach .insight .body{font-size:14px;color:var(--ink);line-height:1.55;font-weight:500;letter-spacing:-.003em}
.coach .insight .body mark{background:var(--warn-soft);color:#a86200;padding:0 4px;border-radius:4px;font-weight:600}
.coach .insight .actions{display:flex;gap:6px;margin-top:14px;flex-wrap:wrap}

/* upcoming */
.coach .upcoming{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:18px 20px}
.coach .upcoming .h{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px}
.coach .upcoming .h h3{margin:0;font-size:14px;font-weight:600;letter-spacing:-.005em}
.coach .upcoming .h a{color:var(--brand);font-size:12px;font-weight:600;text-decoration:none}
.coach .upcoming .row{
  display:grid;grid-template-columns:8px 1fr auto;gap:12px;align-items:center;
  padding:10px 0;border-top:1px solid var(--line);font-size:13px;
}
.coach .upcoming .row:first-of-type{border-top:0}
.coach .upcoming .row .dotmark{width:8px;height:8px;border-radius:50%;background:var(--ink-4)}
.coach .upcoming .row.urgent .dotmark{background:var(--warn)}
.coach .upcoming .row .name{font-weight:600;color:var(--ink)}
.coach .upcoming .row .name .sub{display:block;font-size:11.5px;color:var(--ink-3);font-weight:500;margin-top:1px}
.coach .upcoming .row .when{font-family:var(--font-mono);font-size:11px;color:var(--ink-3);font-weight:600;text-align:right;line-height:1.35}
`;

const TodayScreen = () => {
  const t = window.COACH_TODAY;
  const done = t.tasks.filter(x => x.done).length;
  const pct = done / t.tasks.length;
  const R = 42, C = 2 * Math.PI * R;
  return (
    <div className="coach">
      <style>{window.CORE_CSS}</style>
      <style>{TODAY_CSS}</style>
      <div className="app">
        <window.CoachSide active="today" />
        <div className="main">
          <window.CoachTopbar
            title="今天"
            sub={`${t.date} · ${t.countdown}`}
            actions={<>
              <button className="btn sm">{window.IK.calendar}<span>本月日历</span></button>
              <button className="btn primary sm">{window.IK.plus}<span>自定义任务</span></button>
            </>}
          />

          <div className="scroll">
            <div className="today-grid">
              <div className="lt">
                {/* hero — single dark card */}
                <div className="hello">
                  <div>
                    <div className="greet-row">
                      <window.Avatar kind="user" size={48} ring="rgba(255,255,255,.12)" />
                      <h1>早上好，明 <span className="acc">·</span><br/>今天还有 <span className="acc">3 件事</span>。</h1>
                    </div>
                    <div className="streak-inline">
                      <span className="flame">🔥 <b>17</b> 天连续打卡</span>
                      <div className="dots">
                        {Array.from({ length: 18 }).map((_, i) => (
                          <i key={i} className={i < 11 ? "on" : i === 11 ? "today" : ""}></i>
                        ))}
                      </div>
                      <span>本周 <b style={{ color: "#fff", fontWeight: 700 }}>4/5</b> 天</span>
                    </div>
                  </div>
                  <div className="ring-blk">
                    <svg width="100" height="100" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="6" />
                      <circle cx="50" cy="50" r={R} fill="none" stroke="var(--brand)" strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
                    </svg>
                    <div className="num"><b>{done}/{t.tasks.length}</b><span>已完成</span></div>
                  </div>
                </div>

                {/* tasks */}
                <div className="tasks-h">
                  <h2>今日 5 步</h2>
                  <div className="meta">已完成 <b>{done}</b>/5 · 剩余 <b>~ 1h 40m</b></div>
                </div>

                {t.tasks.map((task, i) => (
                  <div key={task.id} className={"task" + (task.done ? " done" : "")}>
                    <div className="chk">{task.done ? window.IK.check : ""}</div>
                    <div className="body">
                      <div className="title">{task.title}</div>
                      <div className="why">
                        <span className="chip">{task.tag}</span>
                        <span>{task.done ? "✓ 已完成 · 早上 10:" + (20 + i * 7) : task.why}</span>
                      </div>
                    </div>
                    <span className="dur">{task.dur} min</span>
                    {!task.done
                      ? <button className="open">开始 {window.IK.arrow}</button>
                      : <span className="done-text">已完成</span>}
                  </div>
                ))}

                <div className="rest">
                  <span style={{ fontSize: 18 }}>🌿</span>
                  <span>做完剩下的 3 步，<span style={{ color: "#1f7a31", fontWeight: 700 }}>就可以去过别的生活</span>。秋招是马拉松。</span>
                </div>
              </div>

              {/* RIGHT */}
              <div className="rt">
                <div className="next-iv">
                  <div className="top">
                    <span className="lbl">下一场面试</span>
                    <span className="badge">面试包 72% · 7/10 项</span>
                  </div>
                  <div className="co">美团</div>
                  <div className="role">前端工程师 · 二面 · 技术 + HRBP</div>

                  <div className="when-row">
                    <div className="left">
                      <b>{t.next.when}</b>
                      <span>上海 / 望京</span>
                    </div>
                    <div className="days">{t.next.daysLeft}<span>天</span></div>
                  </div>

                  <div className="rounds">
                    {t.next.rounds.map((r, i) => (
                      <div key={i} className={"r " + (i < t.next.activeRound ? "done" : i === t.next.activeRound ? "active" : "")}>
                        {r}
                      </div>
                    ))}
                  </div>

                  <div className="prep">
                    <span>面试包准备进度</span>
                    <span className="pct">{t.next.prep}%<span>/ 100</span></span>
                  </div>
                </div>

                <div className="insight">
                  <div className="who">
                    <window.Avatar kind="coach" size={36} />
                    <div>
                      <b>Coach 今日洞察</b>
                      <div className="meta">基于昨天的美团二面录音</div>
                    </div>
                  </div>
                  <div className="body">
                    昨天的二面，<mark>17 秒的沉默</mark> 出现在「最难的技术决策」那道题。<br/>周一终面前，先把今日的 STAR ch.2 跑完。
                  </div>
                  <div className="actions">
                    <button className="btn brand sm">{window.IK.bolt}<span>现在跑一遍</span></button>
                    <button className="btn sm">告诉我故事</button>
                    <button className="btn ghost sm">先跳过</button>
                  </div>
                </div>

                <div className="upcoming">
                  <div className="h">
                    <h3>本周接下来</h3>
                    <a>全部 →</a>
                  </div>
                  <div className="row">
                    <span className="dotmark"></span>
                    <div className="name">字节客户端 · 笔试<span className="sub">已投递 · 等待</span></div>
                    <span className="when">5/24<br/>14:00</span>
                  </div>
                  <div className="row urgent">
                    <span className="dotmark"></span>
                    <div className="name">美团 · 终面<span className="sub">技术 + HRBP</span></div>
                    <span className="when">5/26<br/>14:00</span>
                  </div>
                  <div className="row urgent">
                    <span className="dotmark"></span>
                    <div className="name">Shopee SG · OA 截止<span className="sub">48h 内提交</span></div>
                    <span className="when">5/27<br/>23:59</span>
                  </div>
                  <div className="row">
                    <span className="dotmark"></span>
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
