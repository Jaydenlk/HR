// Chat — clean conversational, iMessage-style discipline.

const CHAT_CSS = `
.coach .chat-shell{display:flex;flex-direction:column;height:100%;overflow:hidden}
.coach .chat-feed{flex:1;overflow:auto;padding:16px 32px 0}
.coach .feed-inner{max-width:840px;width:100%;margin:0 auto;display:flex;flex-direction:column;gap:20px}

.coach .day-sep{display:flex;align-items:center;gap:14px;font-family:var(--font-mono);font-size:11px;letter-spacing:.08em;color:var(--ink-4);font-weight:600;margin:4px 0}
.coach .day-sep::before,.coach .day-sep::after{content:"";height:1px;background:var(--line);flex:1}

.coach .msg{display:flex;gap:12px;align-items:flex-end}
.coach .msg.me{flex-direction:row-reverse}
.coach .msg .av-wrap{flex-shrink:0;align-self:flex-end}
.coach .msg.ai .bub{
  background:var(--surface);border:1px solid var(--line);color:var(--ink);
  border-radius:18px 18px 18px 6px;padding:13px 18px;max-width:580px;
  font-size:14.5px;line-height:1.6;font-weight:500;letter-spacing:-.003em;
}
.coach .msg.me .bub{
  background:var(--brand);color:#fff;
  border-radius:18px 18px 6px 18px;padding:12px 16px;max-width:520px;
  font-size:14.5px;line-height:1.55;font-weight:500;letter-spacing:-.003em;
}
.coach .msg.ai .bub p{margin:0 0 10px}
.coach .msg.ai .bub p:last-child{margin-bottom:0}
.coach .msg.ai .bub b{font-weight:700;color:var(--ink)}
.coach .msg.ai .bub mark{background:var(--warn-soft);color:#a86200;padding:0 4px;border-radius:4px;font-weight:600}

.coach .stamp{display:flex;align-items:center;gap:8px;margin-top:6px;font-family:var(--font-mono);font-size:11px;color:var(--ink-3);font-weight:500}
.coach .stamp .tool{background:var(--surface-2);color:var(--ink-2);padding:2px 9px;border-radius:5px;font-weight:600;letter-spacing:0;font-family:var(--font)}

/* rich card — single colored hero, no rainbow */
.coach .rich-msg{display:flex;gap:12px}
.coach .rich-msg .av-wrap{flex-shrink:0;align-self:flex-start}
.coach .rich{background:var(--surface);border:1px solid var(--line);border-radius:20px;max-width:660px;overflow:hidden}
.coach .rich .rch-head{padding:20px 22px;background:var(--ink);color:#fff;position:relative;overflow:hidden;display:grid;grid-template-columns:1fr auto;gap:14px;align-items:start}
.coach .rich .rch-head::before{content:"";position:absolute;inset:0;background:radial-gradient(400px 200px at 90% -10%,rgba(10,132,255,.32),transparent 60%)}
.coach .rich .rch-head > *{position:relative;z-index:2}
.coach .rich .rch-head h4{margin:0;font-size:18px;font-weight:700;letter-spacing:-.015em}
.coach .rich .rch-head .chips-row{margin-top:10px;display:flex;flex-wrap:wrap;gap:5px}
.coach .rich .rch-head .chips-row .c{font-size:10.5px;padding:3px 8px;border-radius:6px;background:rgba(255,255,255,.12);color:rgba(255,255,255,.92);font-weight:600;letter-spacing:0;display:flex;align-items:center;gap:4px}
.coach .rich .rch-head .chips-row .c .dot{width:5px;height:5px;border-radius:50%}
.coach .rich .rch-head .chips-row .c.good .dot{background:var(--success)}
.coach .rich .rch-head .chips-row .c.warn .dot{background:var(--warn)}
.coach .rich .rch-head .chips-row .c.bad .dot{background:var(--danger)}

.coach .rich .score-tile{
  background:rgba(255,255,255,.12);padding:10px 16px;border-radius:12px;
  text-align:center;backdrop-filter:blur(8px);flex-shrink:0;
}
.coach .rich .score-tile .v{font-size:32px;font-weight:800;letter-spacing:-.03em;line-height:1}
.coach .rich .score-tile .l{font-size:10.5px;font-weight:600;opacity:.7;letter-spacing:.04em;margin-top:2px}

.coach .rich .findings{padding:18px 22px 0;display:flex;flex-direction:column;gap:10px}
.coach .find{display:grid;grid-template-columns:28px 1fr;gap:10px;font-size:13.5px;line-height:1.5}
.coach .find .n{width:22px;height:22px;border-radius:7px;background:var(--surface-2);color:var(--ink);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;border:1px solid var(--line)}
.coach .find .body b{display:block;color:var(--ink);font-weight:700}
.coach .find .body span{display:block;color:var(--ink-3);font-size:12.5px;font-weight:500;margin-top:2px}

.coach .ba-pair{padding:14px 22px;display:grid;grid-template-columns:1fr 1fr;gap:10px}
.coach .ba-pair .cell{padding:12px 14px;border-radius:12px;font-size:13px;line-height:1.55;font-weight:500}
.coach .ba-pair .cell.before{background:var(--danger-soft);color:#831e16}
.coach .ba-pair .cell.after{background:var(--success-soft);color:#1e5a2a}
.coach .ba-pair .cell .lbl{font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-bottom:6px;display:flex;align-items:center;gap:5px}
.coach .ba-pair .cell.before .lbl{color:#bf2418}
.coach .ba-pair .cell.after .lbl{color:#1f7a31}
.coach .ba-pair .cell.after b{color:#0e4a18;font-weight:700}

.coach .rich-actions{padding:14px 22px 18px;display:flex;gap:6px;flex-wrap:wrap;border-top:1px solid var(--line)}

/* rewrite (subtle, neutral) */
.coach .rich.rewrite .rch-head{background:var(--surface-2);color:var(--ink);border-bottom:1px solid var(--line)}
.coach .rich.rewrite .rch-head::before{display:none}
.coach .rich.rewrite .rch-head h4{color:var(--ink)}
.coach .rich.rewrite .rch-head .chips-row .c{background:var(--surface);color:var(--ink-2);border:1px solid var(--line)}
.coach .rich.rewrite .score-tile{background:var(--success);color:#fff;backdrop-filter:none}
.coach .rich.rewrite .score-tile .l{opacity:.85}

.coach .bullet-list{padding:14px 22px;display:flex;flex-direction:column;gap:9px}
.coach .bl{display:flex;gap:10px;font-size:13.5px;line-height:1.55;color:var(--ink-2);font-weight:500}
.coach .bl .dot{width:5px;height:5px;border-radius:50%;background:var(--ink);margin-top:8px;flex-shrink:0}
.coach .bl b{color:var(--ink);font-weight:700}

/* sugg chips */
.coach .sugg{margin-top:6px;display:flex;flex-wrap:wrap;gap:6px;padding-left:48px}
.coach .sugg .c{font-size:12.5px;padding:7px 13px;background:var(--surface);border:1px solid var(--line);border-radius:999px;color:var(--ink-2);display:inline-flex;align-items:center;gap:5px;font-weight:600}
.coach .sugg .c:hover{background:var(--surface-2)}
.coach .sugg .c .ic{color:var(--brand)}
.coach .sugg .c.brand{background:var(--brand);color:#fff;border-color:var(--brand)}
.coach .sugg .c.brand .ic{color:#fff}

/* input */
.coach .input-wrap{padding:16px 32px 22px;background:var(--bg)}
.coach .input-inner{max-width:840px;margin:0 auto}
.coach .input-box{background:var(--surface);border:1px solid var(--line);border-radius:22px;padding:14px 18px 10px}
.coach .input-box .ph{font-size:14px;color:var(--ink-3);padding-bottom:10px;font-weight:500;letter-spacing:-.003em}
.coach .input-box .ph .you{color:var(--ink-4);font-weight:600}
.coach .input-box .r{display:flex;justify-content:space-between;align-items:center;padding-top:10px;border-top:1px solid var(--line)}
.coach .input-box .tools{display:flex;gap:6px}
.coach .input-box .tool{display:inline-flex;align-items:center;gap:5px;padding:7px 13px;border:1px solid var(--line);border-radius:999px;background:var(--bg);color:var(--ink-2);font-size:12.5px;font-weight:600}
.coach .input-box .tool .ic{color:var(--ink-3)}
.coach .input-box .send{width:36px;height:36px;border-radius:50%;background:var(--brand);color:#fff;display:flex;align-items:center;justify-content:center;border:0}

.coach .foot-line{margin-top:10px;font-size:11.5px;color:var(--ink-4);text-align:center;display:flex;justify-content:center;gap:18px;font-weight:500}
.coach .foot-line kbd{font-family:var(--font-mono);font-size:10px;padding:2px 5px;border-radius:5px;border:1px solid var(--line);background:var(--surface);color:var(--ink-3);margin:0 2px;font-weight:600}
`;

const ChatScreen = () => (
  <div className="coach">
    <style>{window.CORE_CSS}</style>
    <style>{CHAT_CSS}</style>
    <div className="app">
      <window.CoachSide active="chat" />
      <div className="main">
        <window.CoachTopbar
          title="改简历 · 字节前端"
          sub="使用「简历馆」 · 2 分钟前"
          actions={<>
            <button className="ico-btn">{window.IK.bookmark}</button>
            <button className="ico-btn">{window.IK.download}</button>
            <button className="ico-btn">{window.IK.more}</button>
          </>}
        />

        <div className="chat-shell">
          <div className="chat-feed">
            <div className="feed-inner">
              <div className="day-sep">2026 · 5 · 23 · 周五</div>

              <div className="msg me">
                <div className="av-wrap"><window.Avatar kind="user" size={36} /></div>
                <div className="bub">帮我看看这份简历投字节前端怎么样？附件已上传。</div>
              </div>

              <div className="msg ai">
                <div className="av-wrap"><window.Avatar kind="coach" size={36} /></div>
                <div className="bub">
                  <p>看完了 —— <b>72 / 100</b>。经验对口是你的优势，但 <mark>「成果量化」</mark> 和 <mark>「Tech Lead 信号」</mark> 拖了后腿。</p>
                  <p>关键词命中 <b>7 / 12</b>，主要缺 <b>Next.js · SSR · Monorepo · Tech Lead</b> —— JD 反复提，但你简历里没用这些词。</p>
                  <div className="stamp">
                    <span>⏱ 用时 11s</span>
                    <span>·</span>
                    <span className="tool">简历馆 · JD 匹配</span>
                  </div>
                </div>
              </div>

              <div className="rich-msg">
                <div className="av-wrap"><window.Avatar kind="coach" size={36} /></div>
                <div className="rich">
                  <div className="rch-head">
                    <div>
                      <h4>简历诊断 · 字节资深前端</h4>
                      <div className="chips-row">
                        <span className="c good"><span className="dot"></span>经验匹配 86</span>
                        <span className="c good"><span className="dot"></span>技能覆盖 78</span>
                        <span className="c warn"><span className="dot"></span>关键词 58</span>
                        <span className="c bad"><span className="dot"></span>成果量化 41</span>
                        <span className="c bad"><span className="dot"></span>Tech Lead 35</span>
                      </div>
                    </div>
                    <div className="score-tile">
                      <div className="v">72</div>
                      <div className="l">/ 100 · 良好</div>
                    </div>
                  </div>

                  <div className="findings">
                    <div className="find">
                      <span className="n">1</span>
                      <div className="body">
                        <b>第一条 bullet 几乎是空话</b>
                        <span>招聘者 6 秒扫一份简历，没数字 = 没记忆点。今天能改的最高 ROI 项。</span>
                      </div>
                    </div>
                    <div className="find">
                      <span className="n">2</span>
                      <div className="body">
                        <b>Tech Lead 信号严重缺失</b>
                        <span>JD 明确要「跨团队协作和 Tech Lead 经验」，简历里只写「参与代码评审」远远不够。</span>
                      </div>
                    </div>
                  </div>

                  <div className="ba-pair">
                    <div className="cell before">
                      <span className="lbl">原文 · before</span>
                      使用 React 重构了一个旧项目，提升了页面加载速度。
                    </div>
                    <div className="cell after">
                      <span className="lbl">建议 · after</span>
                      主导 jQuery 项目向 React 18 + SSR 迁移，<b>FCP −72%（3.2s → 0.9s）</b>，日活 PV +18%。
                    </div>
                  </div>

                  <div className="rich-actions">
                    <button className="btn primary sm">{window.IK.check}<span>采纳改写</span></button>
                    <button className="btn sm">{window.IK.refresh}<span>换一版</span></button>
                    <button className="btn sm">{window.IK.doc}<span>看完整 5 条</span></button>
                    <button className="btn ghost sm" style={{ marginLeft: "auto" }}>{window.IK.download}<span>导出 PDF</span></button>
                  </div>
                </div>
              </div>

              <div className="msg me">
                <div className="av-wrap"><window.Avatar kind="user" size={36} /></div>
                <div className="bub">那帮我把整段「蚂蚁」经历改一下，按方向 A（数据驱动）。</div>
              </div>

              <div className="msg ai">
                <div className="av-wrap"><window.Avatar kind="coach" size={36} /></div>
                <div className="bub">
                  <p>好。整段重写如下 —— 全部带数字、全部用 JD 关键词。</p>
                </div>
              </div>

              <div className="rich-msg">
                <div className="av-wrap" style={{ width: 36, visibility: "hidden" }}></div>
                <div className="rich rewrite">
                  <div className="rch-head">
                    <div>
                      <h4>蚂蚁集团 · 高级前端 · 2022.03 — 至今</h4>
                      <div className="chips-row">
                        <span className="c">4 条 bullets</span>
                        <span className="c">全部带数字</span>
                        <span className="c">命中 5 个 JD 关键词</span>
                      </div>
                    </div>
                    <div className="score-tile">
                      <div className="v">+18</div>
                      <div className="l">分</div>
                    </div>
                  </div>

                  <div className="bullet-list">
                    <div className="bl"><span className="dot"></span><span>主导支付宝某业务线 <b>React 18 + SSR</b> 架构升级，FCP <b>−72%</b>，PV <b>+18%</b>；</span></div>
                    <div className="bl"><span className="dot"></span><span>牵头制定团队前端规范与组件库治理方案，mentor <b>3 名工程师</b>晋升中级；</span></div>
                    <div className="bl"><span className="dot"></span><span>推动可观测性体系落地，线上 JS 错误率从 <b>0.12% 降至 0.03%</b>；</span></div>
                    <div className="bl"><span className="dot"></span><span>与设计 / 产品形成「双周需求评审」机制，需求返工率降低 <b>40%</b>。</span></div>
                  </div>

                  <div className="rich-actions">
                    <button className="btn primary sm">{window.IK.check}<span>采纳到简历</span></button>
                    <button className="btn sm">{window.IK.refresh}<span>换一版</span></button>
                    <button className="btn ghost sm">{window.IK.bookmark}<span>保存到主版本</span></button>
                  </div>
                </div>
              </div>

              <div className="msg ai">
                <div className="av-wrap"><window.Avatar kind="coach" size={36} /></div>
                <div className="bub">
                  <p>顺带一提 —— 你简历里类似 「参与」「负责」「使用」的弱动词还有 <b>4 处</b>。<br/><mark>要不要一起改了？</mark></p>
                </div>
              </div>

              <div className="sugg">
                <span className="c brand"><span className="ic">{window.IK.spark}</span><span>一起改掉那 4 处</span></span>
                <span className="c"><span className="ic">{window.IK.doc}</span><span>看完整 5 条建议</span></span>
                <span className="c"><span className="ic">{window.IK.play}</span><span>用这份简历模拟字节一面</span></span>
                <span className="c"><span className="ic">{window.IK.help}</span><span>字节前端常问什么</span></span>
                <span className="c"><span className="ic">{window.IK.bookmark}</span><span>保存到主版本</span></span>
              </div>
            </div>
          </div>

          <div className="input-wrap">
            <div className="input-inner">
              <div className="input-box">
                <div className="ph">
                  <span className="you">继续 ——</span>
                  例如「把第二段实习也按 A 方向改」、「针对 Shopee 再生成一份」……
                </div>
                <div className="r">
                  <div className="tools">
                    <div className="tool"><span className="ic">{window.IK.doc}</span><span>附件</span></div>
                    <div className="tool"><span className="ic">{window.IK.command}</span><span>/ 命令</span></div>
                    <div className="tool"><span className="ic">{window.IK.mic}</span></div>
                  </div>
                  <button className="send">{window.IK.send}</button>
                </div>
              </div>
              <div className="foot-line">
                <span><kbd>/</kbd>命令</span>
                <span><kbd>⌘ K</kbd>搜索</span>
                <span><kbd>⌘ ↵</kbd>发送</span>
                <span style={{ opacity: .7 }}>对话端到端加密 · 不用于训练</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

Object.assign(window, { ChatScreen });
