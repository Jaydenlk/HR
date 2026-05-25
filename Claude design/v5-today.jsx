// v5 Today — light/airy: no dark hero, data IS the visual focus.
// Overrides window.TodayScreen when loaded after s-today.jsx.

const V5_TODAY_CSS = `
.coach .v5{display:flex;flex-direction:column;gap:0;height:100%;min-height:0;overflow:hidden}

/* greeting — no card chrome, just type */
.coach .v5 .greet{display:grid;grid-template-columns:auto 1fr auto;gap:20px;align-items:center;padding:6px 4px 22px;border-bottom:1px solid var(--line)}
.coach .v5 .greet h1{margin:0;font-size:32px;line-height:1.1;letter-spacing:-.025em;font-weight:700;color:var(--ink)}
.coach .v5 .greet h1 .acc{color:var(--brand)}
.coach .v5 .greet .sub{margin-top:4px;font-size:13.5px;color:var(--ink-3);font-weight:500}
.coach .v5 .greet .ring-blk{position:relative;width:120px;height:120px;flex-shrink:0}
.coach .v5 .greet .ring-blk svg{transform:rotate(-90deg);position:absolute;inset:0}
.coach .v5 .greet .ring-blk .num{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.coach .v5 .greet .ring-blk .num b{font-size:36px;line-height:1;font-weight:800;letter-spacing:-.03em;color:var(--ink)}
.coach .v5 .greet .ring-blk .num b .of{font-size:18px;color:var(--ink-3);font-weight:600;letter-spacing:-.02em}
.coach .v5 .greet .ring-blk .num span{font-size:11px;color:var(--ink-3);font-weight:600;letter-spacing:.04em;text-transform:uppercase;margin-top:4px}

/* streak strip — slim horizontal pill row, no dark fill */
.coach .v5 .streak-bar{display:flex;align-items:center;gap:18px;padding:14px 18px;margin:18px 0 8px;background:var(--surface);border:1px solid var(--line);border-radius:14px;font-size:13.5px;color:var(--ink-2);font-weight:500}
.coach .v5 .streak-bar .lbl{font-size:11px;color:var(--ink-3);font-weight:700;letter-spacing:.04em;text-transform:uppercase}
.coach .v5 .streak-bar .flame{display:inline-flex;align-items:center;gap:6px;color:#c87317;font-weight:600}
.coach .v5 .streak-bar .flame b{color:var(--ink);font-size:18px;font-weight:800;letter-spacing:-.02em}
.coach .v5 .streak-bar .dots{display:flex;gap:3px;flex:1}
.coach .v5 .streak-bar .dots i{flex:1;max-width:14px;height:14px;border-radius:3px;background:var(--surface-3)}
.coach .v5 .streak-bar .dots i.on{background:#c87317}
.coach .v5 .streak-bar .dots i.today{background:var(--brand);box-shadow:0 0 0 2px var(--surface)}
.coach .v5 .streak-bar .week{font-family:var(--font-mono);font-size:12px;color:var(--ink-3);font-weight:600;white-space:nowrap}
.coach .v5 .streak-bar .week b{color:var(--ink);font-weight:800;font-family:var(--font);font-size:14px}

/* 2-col body */
.coach .v5 .body{display:grid;grid-template-columns:1.5fr 1fr;gap:20px;flex:1;min-height:0;overflow:hidden;padding-top:10px}
.coach .v5 .body > .lt{display:flex;flex-direction:column;gap:10px;min-width:0;overflow:hidden}
.coach .v5 .body > .rt{display:flex;flex-direction:column;gap:14px;min-width:0;overflow:hidden}

.coach .v5 .tasks-h{display:flex;justify-content:space-between;align-items:baseline;padding:4px 4px 4px}
.coach .v5 .tasks-h h2{margin:0;font-size:18px;font-weight:700;letter-spacing:-.015em}
.coach .v5 .tasks-h .meta{font-size:12.5px;color:var(--ink-3);font-weight:500}
.coach .v5 .tasks-h .meta b{color:var(--ink);font-weight:700}

/* tasks — light white cards, NO heavy bg */
.coach .v5 .task{display:grid;grid-template-columns:auto 1fr auto auto;gap:14px;align-items:center;padding:14px 18px;background:var(--surface);border:1px solid var(--line);border-radius:14px;transition:.12s}
.coach .v5 .task:hover{border-color:var(--line-2)}
.coach .v5 .task.done{background:var(--surface-2);border-color:transparent}
.coach .v5 .task .chk{width:22px;height:22px;border-radius:50%;border:1.5px solid var(--line-2);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff}
.coach .v5 .task.done .chk{background:var(--success);border-color:var(--success)}
.coach .v5 .task .body-cell{min-width:0}
.coach .v5 .task .title{font-size:14.5px;font-weight:600;color:var(--ink);letter-spacing:-.005em}
.coach .v5 .task.done .title{color:var(--ink-3);text-decoration:line-through;text-decoration-color:var(--ink-4)}
.coach .v5 .task .why{font-size:12px;color:var(--ink-3);margin-top:3px;font-weight:500;display:flex;align-items:center;gap:8px}
.coach .v5 .task .dur{font-family:var(--font-mono);font-size:12px;color:var(--ink-3);font-weight:600}
.coach .v5 .task .open{padding:6px 12px;font-size:12.5px;font-weight:600;background:var(--brand);color:#fff;border-radius:8px;border:0;display:inline-flex;align-items:center;gap:5px}
.coach .v5 .task.done .open{display:none}
.coach .v5 .task .done-text{font-size:12px;color:var(--success);font-weight:600;display:inline-flex;align-items:center;gap:4px}

/* rest — soft success tint, NO heavy */
.coach .v5 .rest{
  background:var(--success-soft);border-radius:12px;padding:13px 16px;
  display:flex;align-items:center;gap:12px;
  font-size:13.5px;color:#1f7a31;font-weight:600;
}

/* right rail cards — all white, single accent stripe each */
.coach .v5 .r-card{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:20px 22px;position:relative;overflow:hidden}
.coach .v5 .r-card .stripe{position:absolute;top:18px;bottom:18px;left:0;width:3px;border-radius:0 3px 3px 0}

/* next interview — blue stripe accent, light bg */
.coach .v5 .next-iv .stripe{background:var(--brand)}
.coach .v5 .next-iv{padding-left:24px}
.coach .v5 .next-iv .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
.coach .v5 .next-iv .top .lbl{font-size:11px;color:var(--brand);font-weight:700;letter-spacing:.04em;text-transform:uppercase}
.coach .v5 .next-iv .top .badge{font-family:var(--font-mono);font-size:11px;color:var(--ink-2);font-weight:600;background:var(--surface-2);padding:3px 8px;border-radius:6px}
.coach .v5 .next-iv .co-row{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:4px}
.coach .v5 .next-iv .co{font-size:24px;font-weight:700;letter-spacing:-.02em;line-height:1;color:var(--ink)}
.coach .v5 .next-iv .days{font-family:var(--font-mono);font-size:14px;font-weight:700;color:var(--brand);background:var(--brand-soft);padding:3px 9px;border-radius:7px}
.coach .v5 .next-iv .role{font-size:13px;color:var(--ink-3);font-weight:500}
.coach .v5 .next-iv .when{margin-top:12px;font-size:13px;color:var(--ink-2);font-weight:500}
.coach .v5 .next-iv .when b{color:var(--ink);font-weight:700}
.coach .v5 .next-iv .rounds{margin-top:12px;display:flex;gap:5px}
.coach .v5 .next-iv .rounds .r{flex:1;padding:7px 4px;background:var(--surface-2);border-radius:7px;font-size:11px;font-weight:600;color:var(--ink-3);text-align:center;letter-spacing:-.003em}
.coach .v5 .next-iv .rounds .r.done{background:var(--success-soft);color:#1f7a31}
.coach .v5 .next-iv .rounds .r.active{background:var(--brand);color:#fff}
.coach .v5 .next-iv .prep-row{margin-top:14px;display:flex;justify-content:space-between;align-items:center;font-size:12.5px;color:var(--ink-3);font-weight:500}
.coach .v5 .next-iv .prep-row .pct{font-family:var(--font);font-size:18px;font-weight:800;letter-spacing:-.02em;color:var(--brand)}
.coach .v5 .next-iv .prep-row .pct span{font-size:11px;color:var(--ink-3);font-weight:600;margin-left:3px}

/* coach insight — white with subtle blue tint + avatar */
.coach .v5 .coach-c{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:20px 22px}
.coach .v5 .coach-c .who{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.coach .v5 .coach-c .who b{font-size:13.5px;font-weight:700;letter-spacing:-.003em;color:var(--ink)}
.coach .v5 .coach-c .who .meta{font-size:11.5px;color:var(--ink-3);font-weight:500;margin-top:1px;display:block}
.coach .v5 .coach-c .body{font-size:14px;color:var(--ink);line-height:1.55;font-weight:500;letter-spacing:-.003em}
.coach .v5 .coach-c .body mark{background:var(--warn-soft);color:#a86200;padding:0 4px;border-radius:4px;font-weight:600}
.coach .v5 .coach-c .actions{display:flex;gap:6px;margin-top:14px;flex-wrap:wrap}

/* upcoming */
.coach .v5 .upcoming{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:18px 20px}
.coach .v5 .upcoming .h{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px}
.coach .v5 .upcoming .h h3{margin:0;font-size:14px;font-weight:700;letter-spacing:-.005em}
.coach .v5 .upcoming .h a{color:var(--brand);font-size:12px;font-weight:600;text-decoration:none}
.coach .v5 .upcoming .row{display:grid;grid-template-columns:8px 1fr auto;gap:12px;align-items:center;padding:9px 0;border-top:1px solid var(--line);font-size:13px}
.coach .v5 .upcoming .row:first-of-type{border-top:0}
.coach .v5 .upcoming .row .dotmark{width:8px;height:8px;border-radius:50%;background:var(--ink-4)}
.coach .v5 .upcoming .row.urgent .dotmark{background:var(--warn)}
.coach .v5 .upcoming .row .name{font-weight:600;color:var(--ink)}
.coach .v5 .upcoming .row .name .sub{display:block;font-size:11.5px;color:var(--ink-3);font-weight:500;margin-top:1px}
.coach .v5 .upcoming .row .when{font-family:var(--font-mono);font-size:11px;color:var(--ink-3);font-weight:600;text-align:right;line-height:1.35}
`;

const TodayScreenV5 = () => {
  const t = window.COACH_TODAY;
  const done = t.tasks.filter(x => x.done).length;
  const pct = done / t.tasks.length;
  const R = 52, C = 2 * Math.PI * R;
  return (
    <div className="coach">
      <style>{window.CORE_CSS}</style>
      <style>{V5_TODAY_CSS}</style>
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
            <div className="v5">
              {/* greeting — open, no card */}
              <div className="greet">
                <window.Avatar kind="user" size={48} />
                <div>
                  <h1>早上好，明 <span className="acc">·</span> 今天还有 <span className="acc">3 件事</span>。</h1>
                  <div className="sub">{t.date} · 距离秋招正式批 还有 38 天</div>
                </div>
                <div className="ring-blk">
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r={R} fill="none" stroke="var(--surface-3)" strokeWidth="8" />
                    <circle cx="60" cy="60" r={R} fill="none" stroke="var(--brand)" strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
                  </svg>
                  <div className="num">
                    <b>{done}<span className="of">/{t.tasks.length}</span></b>
                    <span>今日完成</span>
                  </div>
                </div>
              </div>

              {/* streak — slim bar */}
              <div className="streak-bar">
                <span className="flame">🔥 <b>17</b>天</span>
                <span className="lbl">连续打卡 · 月度 57%</span>
                <div className="dots">
                  {Array.from({ length: 18 }).map((_, i) => (
                    <i key={i} className={i < 11 ? "on" : i === 11 ? "today" : ""}></i>
                  ))}
                </div>
                <span className="week">本周 <b>4</b>/5 天 · 2.1h 学习</span>
              </div>

              {/* body */}
              <div className="body">
                <div className="lt">
                  <div className="tasks-h">
                    <h2>今日 5 步</h2>
                    <div className="meta">已完成 <b>{done}</b>/5 · 剩余 <b>~ 1h 40m</b></div>
                  </div>

                  {t.tasks.map((task, i) => (
                    <div key={task.id} className={"task" + (task.done ? " done" : "")}>
                      <div className="chk">{task.done ? window.IK.check : ""}</div>
                      <div className="body-cell">
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
                    <span>做完剩下的 3 步，<span style={{ color: "#1f7a31", fontWeight: 700 }}>就可以去过别的生活</span>。</span>
                  </div>
                </div>

                <div className="rt">
                  {/* next interview — light with blue stripe */}
                  <div className="r-card next-iv">
                    <span className="stripe"></span>
                    <div className="top">
                      <span className="lbl">下一场面试</span>
                      <span className="badge">准备 72%</span>
                    </div>
                    <div className="co-row">
                      <span className="co">美团</span>
                      <span className="days">{t.next.daysLeft} 天</span>
                    </div>
                    <div className="role">前端工程师 · 二面 · 技术 + HRBP</div>
                    <div className="when"><b>{t.next.when}</b> · 上海 / 望京</div>
                    <div className="rounds">
                      {t.next.rounds.map((r, i) => (
                        <div key={i} className={"r " + (i < t.next.activeRound ? "done" : i === t.next.activeRound ? "active" : "")}>
                          {r}
                        </div>
                      ))}
                    </div>
                    <div className="prep-row">
                      <span>面试包准备进度</span>
                      <span><span className="pct">{t.next.prep}%</span><span>/ 100</span></span>
                    </div>
                  </div>

                  {/* coach insight — light, avatar */}
                  <div className="coach-c">
                    <div className="who">
                      <window.Avatar kind="coach" size={36} />
                      <div>
                        <b>Coach 今日洞察</b>
                        <span className="meta">基于昨天的美团二面录音</span>
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

                  {/* upcoming */}
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
    </div>
  );
};

// Override v4's TodayScreen
window.TodayScreen = TodayScreenV5;
