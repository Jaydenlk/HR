// Today — 个人时效层 (从 A direction 进化)
// 在 in-app shell 内，左 sidebar 已在 base，右侧只渲染 main 区。

const COACH_TODAY_CSS = `
.coach .today-wrap{display:grid;grid-template-columns:1fr 320px;gap:24px;align-items:start;height:100%}
.coach .today-wrap > .left{display:flex;flex-direction:column;gap:14px;min-width:0}

.coach .greet-card{background:linear-gradient(160deg,var(--card) 0%,var(--accent-2) 120%);border:1px solid var(--line);border-radius:16px;padding:24px 26px;display:grid;grid-template-columns:1fr auto;gap:24px;align-items:center}
.coach .greet-card h1{margin:0;font-family:"Instrument Serif",serif;font-style:italic;font-size:38px;line-height:1.1;letter-spacing:-.02em;font-weight:400;color:var(--ink)}
.coach .greet-card h1 em{color:var(--accent);font-style:italic}
.coach .greet-card .date{margin-top:6px;font-size:13px;color:var(--ink-3)}
.coach .greet-card .countdown{font-family:"Geist Mono",monospace;font-size:11px;color:var(--ink-3);letter-spacing:.04em}
.coach .greet-card .right{text-align:right}
.coach .greet-card .progress{font-family:"Instrument Serif",serif;font-style:italic;font-size:54px;color:var(--accent);line-height:1;letter-spacing:-.02em}
.coach .greet-card .progress .of{font-family:"Geist",sans-serif;font-style:normal;font-size:16px;color:var(--ink-3);font-weight:400;margin-left:2px}
.coach .greet-card .progress-lbl{font-size:11px;color:var(--ink-3);letter-spacing:.06em;text-transform:uppercase;margin-top:6px}

/* streak ribbon */
.coach .streak{display:grid;grid-template-columns:auto 1fr auto;gap:18px;align-items:center;background:var(--ink);color:var(--bg);border-radius:14px;padding:16px 20px}
.coach .streak .flame{font-family:"Instrument Serif",serif;font-style:italic;font-size:46px;line-height:1;color:var(--warm)}
.coach .streak .lbl{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.5)}
.coach .streak .v{font-size:13.5px}
.coach .streak .v b{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;font-size:18px;margin-right:4px}
.coach .streak-dots{display:flex;gap:3px;margin-top:8px}
.coach .streak-dots i{width:7px;height:22px;border-radius:2px;background:rgba(255,255,255,.18)}
.coach .streak-dots i.on{background:var(--warm)}
.coach .streak-dots i.today{background:var(--accent);box-shadow:0 0 0 2px rgba(255,255,255,.12)}

/* tasks header */
.coach .tasks-hd{display:flex;justify-content:space-between;align-items:baseline;margin:4px 4px 0}
.coach .tasks-hd h3{margin:0;font-size:14px;font-weight:600}
.coach .tasks-hd .sub{font-size:12px;color:var(--ink-3)}
.coach .tasks-hd .sub b{color:var(--ink);font-family:"Instrument Serif",serif;font-style:italic}

/* task */
.coach .task{display:grid;grid-template-columns:auto 1fr auto auto;gap:14px;align-items:center;padding:14px 16px;background:var(--card);border:1px solid var(--line);border-radius:12px}
.coach .task.done{background:var(--bg-2);opacity:.78}
.coach .task .chk{width:22px;height:22px;border:1.5px solid var(--line-2);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0}
.coach .task.done .chk{background:var(--good);border-color:var(--good)}
.coach .task .title-wrap{min-width:0}
.coach .task .title{font-size:14px;font-weight:500;letter-spacing:-.003em}
.coach .task.done .title{text-decoration:line-through;text-decoration-color:var(--ink-4);color:var(--ink-3)}
.coach .task .why{font-size:11.5px;color:var(--ink-3);margin-top:3px;display:flex;align-items:center;gap:6px}
.coach .task .why .tag{font-family:"Geist Mono",monospace;font-size:9.5px;background:var(--bg-2);border:1px solid var(--line);padding:1px 6px;border-radius:3px;letter-spacing:.04em;color:var(--ink-2)}
.coach .task .why .why-text{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.coach .task .dur{font-family:"Geist Mono",monospace;font-size:11px;color:var(--ink-3)}
.coach .task .go{padding:6px 12px;border:1px solid var(--line);border-radius:8px;font-size:12px;color:var(--ink-2);background:transparent;display:inline-flex;align-items:center;gap:5px}

/* rest hint */
.coach .rest-card{margin-top:6px;background:var(--good-2);border:1px solid var(--good-2);border-radius:12px;padding:13px 16px;display:flex;align-items:center;gap:10px;font-size:13px;color:var(--ink-2)}
.coach .rest-card b{color:var(--good)}

/* quick chat input */
.coach .quick-chat{margin-top:4px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 18px 10px}
.coach .quick-chat .ph{font-size:14px;color:var(--ink-3);padding-bottom:10px}
.coach .quick-chat .ph b{color:var(--ink-2)}
.coach .quick-chat .row{display:flex;justify-content:space-between;align-items:center;padding-top:10px;border-top:1px solid var(--line)}

/* right rail */
.coach .right-rail{display:flex;flex-direction:column;gap:14px}
.coach .next-iv-card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px}
.coach .next-iv-card .label{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);font-weight:500;display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px}
.coach .next-iv-card .label a{color:var(--accent);text-decoration:none;font-weight:500}
.coach .next-iv-card .co{font-family:"Instrument Serif",serif;font-style:italic;font-size:28px;line-height:1.1;letter-spacing:-.01em;color:var(--ink);margin-top:2px}
.coach .next-iv-card .role{font-size:12.5px;color:var(--ink-3);margin-top:4px}

.coach .when-strip{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:var(--accent-2);border-radius:10px;margin-top:14px;font-size:12.5px;color:var(--ink-2)}
.coach .when-strip b{font-family:"Instrument Serif",serif;font-style:italic;color:var(--accent);font-size:22px;letter-spacing:-.01em}

.coach .rounds{display:flex;gap:4px;margin-top:14px}
.coach .rounds .r{flex:1;padding:7px 4px;background:var(--bg-2);border:1px solid var(--line);border-radius:6px;font-size:10.5px;text-align:center;color:var(--ink-3);letter-spacing:-.003em}
.coach .rounds .r.done{background:var(--good-2);border-color:transparent;color:var(--good)}
.coach .rounds .r.active{background:var(--ink);border-color:var(--ink);color:var(--bg);font-weight:500}

.coach .prep-row{margin-top:14px;padding-top:14px;border-top:1px solid var(--line);font-size:12px;color:var(--ink-3);display:flex;justify-content:space-between;align-items:center}
.coach .prep-row .pct{font-family:"Instrument Serif",serif;font-style:italic;color:var(--accent);font-size:22px;letter-spacing:-.01em}
.coach .prep-row .pct-lbl{font-size:11px}

/* daily insight (Coach speaking) */
.coach .insight-card{background:var(--ink);color:var(--bg);border-radius:14px;padding:18px}
.coach .insight-card .who{display:flex;align-items:center;gap:8px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.5);margin-bottom:10px}
.coach .insight-card .who .av{width:20px;height:20px;border-radius:50%;background:var(--warm);color:var(--ink);display:flex;align-items:center;justify-content:center;font-family:"Instrument Serif",serif;font-style:italic;font-size:11px}
.coach .insight-card .body{font-family:"Instrument Serif",serif;font-style:italic;font-size:18px;line-height:1.45;color:var(--bg)}
.coach .insight-card .body em{color:var(--warm);font-style:italic}
.coach .insight-card .actions{display:flex;gap:6px;margin-top:14px;flex-wrap:wrap}
.coach .insight-card .actions .b{font-size:12px;padding:6px 12px;border-radius:999px;background:rgba(255,255,255,.08);color:var(--bg);border:1px solid rgba(255,255,255,.12);cursor:default}
.coach .insight-card .actions .b:hover{background:rgba(255,255,255,.15)}

/* upcoming list */
.coach .upcoming-list{display:flex;flex-direction:column}
.coach .upcoming-item{display:flex;justify-content:space-between;padding:9px 0;border-top:1px dashed var(--line);font-size:12.5px}
.coach .upcoming-item:first-child{border-top:0}
.coach .upcoming-item .name{color:var(--ink)}
.coach .upcoming-item .name .sub{display:block;font-size:11px;color:var(--ink-3)}
.coach .upcoming-item .when{font-family:"Geist Mono",monospace;font-size:11px;color:var(--ink-3);text-align:right;white-space:nowrap}
`;

const TodayScreen = () => {
  const t = window.COACH_TODAY;
  const sevenDay = [0,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,2,0,0,0,0,0,0,0,0,0,0,0,0];
  const doneCount = t.tasks.filter(x=>x.done).length;
  return (
    <div className="coach">
      <style>{window.COACH_CSS}</style>
      <style>{COACH_TODAY_CSS}</style>
      <div className="app">
        <window.CoachSide active="today" />
        <div className="main">
          <window.CoachTopbar
            crumb={["今天 · 2026 / 5 / 23"]}
            title
            actions={<>
              <button className="btn ghost sm">{window.IK.calendar}<span>本月日历</span></button>
              <button className="btn sm">{window.IK.plus}<span>自定义任务</span></button>
            </>}
          />

          <div className="scroll">
            <div className="today-wrap">
              {/* LEFT */}
              <div className="left">
                <div className="greet-card">
                  <div>
                    <h1>早安，明<em>。</em>今天<em>还差 3 步。</em></h1>
                    <div className="date">{t.date} · <span className="countdown">{t.countdown}</span></div>
                  </div>
                  <div className="right">
                    <div className="progress">{doneCount}<span className="of">/{t.tasks.length}</span></div>
                    <div className="progress-lbl">今日完成</div>
                  </div>
                </div>

                <div className="streak">
                  <div className="flame">{t.streak.days}</div>
                  <div>
                    <div className="lbl">连续打卡</div>
                    <div className="v"><b>{t.streak.goal}</b>天 月度目标 · 已完成 <b>{Math.round(t.streak.days/t.streak.goal*100)}%</b></div>
                    <div className="streak-dots">
                      {sevenDay.slice(0,18).map((s,i)=>(
                        <i key={i} className={s===1?"on":s===2?"today":""}></i>
                      ))}
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div className="lbl">本周</div>
                    <div className="v"><b>{t.streak.week}</b>/{t.streak.weekTotal} 天</div>
                    <div className="v" style={{marginTop:4,color:"rgba(255,255,255,.7)"}}>共 <b style={{color:"var(--bg)"}}>2.1h</b> 学习</div>
                  </div>
                </div>

                <div className="tasks-hd">
                  <h3>今日 5 步</h3>
                  <div className="sub">已完成 <b>{doneCount}</b>/5 · 还需约 <b>1h 40m</b></div>
                </div>

                {t.tasks.map((task,i)=>(
                  <div key={task.id} className={"task" + (task.done?" done":"")}>
                    <div className="chk">{task.done && window.IK.check}</div>
                    <div className="title-wrap">
                      <div className="title">{task.title}</div>
                      <div className="why">
                        <span className="tag">{task.tag}</span>
                        <span className="why-text">{task.done ? "✓ " + task.type + " · " + (i+1).toString().padStart(2,"0") : "↳ " + task.why}</span>
                      </div>
                    </div>
                    <span className="dur">{task.dur}</span>
                    {!task.done
                      ? <button className="go">开始 {window.IK.arrow}</button>
                      : <span style={{fontSize:11,color:"var(--good)"}}>完成 · {task.dur}</span>}
                  </div>
                ))}

                <div className="rest-card">
                  <span style={{fontSize:18}}>🌿</span>
                  <span>做完剩下 3 步，<b>就可以去过别的生活了</b>。秋招是马拉松，不必每天加班学习。</span>
                </div>

                <div className="quick-chat">
                  <div className="ph"><b>有什么想问 Coach 的？</b> · "把第三步的复盘也一起做了" · "面试包里我还差什么"</div>
                  <div className="row">
                    <div style={{display:"flex",gap:6}}>
                      <div className="chip">{window.IK.command}<span>命令</span></div>
                      <div className="chip">{window.IK.mic}</div>
                      <div className="chip">{window.IK.doc}<span>附件</span></div>
                    </div>
                    <button className="btn accent sm">{window.IK.send}<span>发送</span></button>
                  </div>
                </div>
              </div>

              {/* RIGHT */}
              <div className="right-rail">
                {/* Next interview */}
                <div className="next-iv-card">
                  <div className="label">下一场面试 · NEXT INTERVIEW <a>查看准备包 →</a></div>
                  <div className="co">{t.next.co}</div>
                  <div className="role">{t.next.role}</div>

                  <div className="when-strip">
                    <span>{t.next.when}</span>
                    <span><b>{t.next.daysLeft}</b><span style={{fontSize:11,color:"var(--ink-3)",marginLeft:3}}>天后</span></span>
                  </div>

                  <div className="rounds">
                    {t.next.rounds.map((r,i)=>(
                      <div key={i} className={"r " + (i<t.next.activeRound?"done":i===t.next.activeRound?"active":"")}>
                        {r}
                      </div>
                    ))}
                  </div>

                  <div className="prep-row">
                    <span>面试包准备进度</span>
                    <span>
                      <span className="pct">{t.next.prep}%</span>
                      <span className="pct-lbl" style={{marginLeft:4,color:"var(--ink-3)"}}>· 7/10 项</span>
                    </span>
                  </div>
                </div>

                {/* Coach insight */}
                <div className="insight-card">
                  <div className="who">
                    <span className="av">C</span>
                    <span>Coach · 今日洞察</span>
                  </div>
                  <div className="body">
                    昨天的美团二面，<em>17 秒的沉默</em> 出现在「最难的技术决策」那道题。<br/>
                    周一终面前，我建议你完成今日的「STAR ch.2」并把那个故事跑通。
                  </div>
                  <div className="actions">
                    <span className="b">现在就跑一遍</span>
                    <span className="b">告诉我故事</span>
                  </div>
                </div>

                {/* Upcoming */}
                <div className="card">
                  <div className="label" style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:"var(--ink-3)",fontWeight:500,marginBottom:10,display:"flex",justifyContent:"space-between"}}>
                    <span>本周接下来</span>
                    <a style={{color:"var(--accent)",textDecoration:"none",fontWeight:500}}>全部 →</a>
                  </div>
                  <div className="upcoming-list">
                    <div className="upcoming-item">
                      <span className="name">字节客户端 · 笔试<span className="sub">已投递 · 等待</span></span>
                      <span className="when">5/24 · 周六<br/>14:00 — 16:00</span>
                    </div>
                    <div className="upcoming-item">
                      <span className="name">美团 · 二面终面<span className="sub">技术 + HRBP</span></span>
                      <span className="when">5/26 · 周一<br/>14:00</span>
                    </div>
                    <div className="upcoming-item">
                      <span className="name">Shopee SG · OA 截止<span className="sub">需在 48h 内提交</span></span>
                      <span className="when">5/27 · 周二<br/>23:59</span>
                    </div>
                    <div className="upcoming-item">
                      <span className="name">拼多多 · 内推码生效<span className="sub">@阿远 帮你</span></span>
                      <span className="when">5/28 · 周三</span>
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

Object.assign(window, { TodayScreen });
