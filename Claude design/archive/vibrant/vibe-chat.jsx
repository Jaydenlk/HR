// Vibe Chat — clean conversational with rich cards and vivid actions.

const VIBE_CHAT_CSS = `
.vibe .chat-shell{display:flex;flex-direction:column;height:100%;overflow:hidden}
.vibe .chat-feed{flex:1;overflow:auto;padding:18px 32px 0}
.vibe .chat-feed-inner{max-width:820px;width:100%;margin:0 auto;display:flex;flex-direction:column;gap:22px}

.vibe .day-divider{display:flex;align-items:center;gap:14px;font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.08em;color:var(--ink-4);font-weight:700;margin:6px 0}
.vibe .day-divider::before,.vibe .day-divider::after{content:"";height:1px;background:var(--line);flex:1}

.vibe .msg{display:flex;gap:12px;align-items:flex-end}
.vibe .msg.me{flex-direction:row-reverse;align-items:flex-end}
.vibe .msg .av-wrap{flex-shrink:0;position:relative;align-self:flex-end}
.vibe .msg.ai .bub{background:var(--bg-card);border:1px solid var(--line);color:var(--ink);border-radius:18px 18px 18px 6px;padding:14px 18px;max-width:580px;font-size:14.5px;line-height:1.6;font-weight:500}
.vibe .msg.me .bub{background:var(--c-blue);color:#fff;border-radius:18px 18px 6px 18px;padding:12px 16px;max-width:520px;font-size:14.5px;line-height:1.55;font-weight:500}
.vibe .msg.ai .bub p{margin:0 0 10px}
.vibe .msg.ai .bub p:last-child{margin-bottom:0}
.vibe .msg.ai .bub b{font-weight:700;color:var(--ink)}
.vibe .msg.ai .bub mark{background:var(--c-yellow-2);color:#7a5b00;padding:0 4px;border-radius:4px;font-weight:600}

.vibe .msg.ai .stamp{display:flex;align-items:center;gap:8px;margin-top:6px;font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--ink-3);font-weight:600}
.vibe .msg.ai .stamp .tool{background:var(--c-purple-2);color:#7e3eaa;padding:2px 8px;border-radius:5px;font-weight:700;letter-spacing:0;font-family:"Plus Jakarta Sans"}

/* rich card: diagnose result */
.vibe .rich-msg{display:flex;gap:12px}
.vibe .rich-msg .av-wrap{flex-shrink:0;align-self:flex-start}
.vibe .rich{background:var(--bg-card);border:1px solid var(--line);border-radius:20px;padding:0;max-width:660px;overflow:hidden}
.vibe .rich .rch{padding:18px 22px;display:grid;grid-template-columns:1fr auto;gap:14px;align-items:start;background:linear-gradient(135deg,var(--c-blue) 0%,var(--c-indigo) 100%);color:#fff;position:relative;overflow:hidden}
.vibe .rich .rch::after{content:"";position:absolute;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,.16);right:-80px;top:-80px}
.vibe .rich .rch > *{position:relative;z-index:2}
.vibe .rich .rch h4{margin:0;font-size:18px;font-weight:800;letter-spacing:-.015em}
.vibe .rich .rch .chips{margin-top:8px;display:flex;flex-wrap:wrap;gap:5px}
.vibe .rich .rch .chips .c-mini{font-size:10.5px;padding:3px 8px;border-radius:7px;background:rgba(255,255,255,.22);color:#fff;font-weight:700;letter-spacing:0;backdrop-filter:blur(8px)}
.vibe .rich .rch .chips .c-mini .dot{width:5px;height:5px;border-radius:50%;background:currentColor;display:inline-block;margin-right:4px}
.vibe .rich .score-blk{text-align:center;flex-shrink:0;background:rgba(255,255,255,.18);padding:8px 14px;border-radius:12px;backdrop-filter:blur(8px)}
.vibe .rich .score-blk .v{font-size:36px;font-weight:800;letter-spacing:-.03em;line-height:1}
.vibe .rich .score-blk .l{font-size:10.5px;font-weight:700;opacity:.85;letter-spacing:.04em;text-transform:uppercase;margin-top:2px}

.vibe .rich .findings{padding:18px 22px 0;display:flex;flex-direction:column;gap:10px}
.vibe .find{display:grid;grid-template-columns:30px 1fr;gap:10px;font-size:13.5px;line-height:1.55}
.vibe .find .n{width:24px;height:24px;border-radius:8px;background:var(--c-orange);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px}
.vibe .find b{font-weight:700;color:var(--ink)}
.vibe .find .why{display:block;color:var(--ink-3);font-size:12.5px;margin-top:2px;font-weight:500}

.vibe .ba-pair{padding:14px 22px;display:grid;grid-template-columns:1fr 1fr;gap:10px}
.vibe .ba-pair .cell{padding:12px 14px;border-radius:14px;font-size:13px;line-height:1.55}
.vibe .ba-pair .cell.before{background:var(--c-red-2);color:#831e16}
.vibe .ba-pair .cell.after{background:var(--c-green-2);color:#1e5a2a}
.vibe .ba-pair .cell .lbl{display:flex;align-items:center;gap:5px;font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-bottom:6px;opacity:.85}
.vibe .ba-pair .cell.before .lbl{color:#cb1c14}
.vibe .ba-pair .cell.after .lbl{color:#1e7a3a}
.vibe .ba-pair .cell.after b{color:#0e4a18}

.vibe .rich-actions{padding:14px 22px 18px;display:flex;gap:8px;flex-wrap:wrap;border-top:1px solid var(--line)}

/* second rich (rewrite) */
.vibe .rich.success .rch{background:linear-gradient(135deg,var(--c-green) 0%,#1e7a3a 100%)}
.vibe .rich.success .score-blk{background:rgba(255,255,255,.22)}

.vibe .bullet-list{padding:14px 22px;display:flex;flex-direction:column;gap:8px}
.vibe .bullet-list .b{display:flex;gap:10px;font-size:13.5px;line-height:1.55;color:var(--ink-2);font-weight:500}
.vibe .bullet-list .b .dot{width:6px;height:6px;border-radius:50%;background:var(--c-green);margin-top:8px;flex-shrink:0}
.vibe .bullet-list .b b{color:var(--ink);font-weight:700}

/* suggestion chips */
.vibe .sugg-row{margin-top:6px;display:flex;flex-wrap:wrap;gap:6px}
.vibe .sugg-row .c{font-size:13px;padding:8px 14px;background:var(--bg-card);border:1px solid var(--line);border-radius:999px;color:var(--ink-2);display:inline-flex;align-items:center;gap:5px;font-weight:600;letter-spacing:-.003em}
.vibe .sugg-row .c:hover{background:var(--bg-tint)}
.vibe .sugg-row .c .ic{color:var(--c-blue)}
.vibe .sugg-row .c.yel{background:var(--c-yellow-2);border-color:transparent;color:#7a5b00}
.vibe .sugg-row .c.yel .ic{color:#7a5b00}

/* input */
.vibe .chat-input-wrap{padding:16px 32px 22px;background:var(--bg);border-top:1px solid var(--line)}
.vibe .chat-input-inner{max-width:820px;margin:0 auto}
.vibe .chat-box{background:var(--bg-card);border:1px solid var(--line);border-radius:22px;padding:14px 18px 10px;box-shadow:0 8px 28px -16px rgba(0,0,0,.08)}
.vibe .chat-box .ph{font-size:14.5px;color:var(--ink-3);padding-bottom:10px;font-weight:500}
.vibe .chat-box .ph .you{color:var(--ink-4);font-weight:600}
.vibe .chat-box .row{display:flex;justify-content:space-between;align-items:center;padding-top:10px;border-top:1px solid var(--line)}
.vibe .chat-box .tools-l{display:flex;gap:6px}
.vibe .chat-box .tool{display:inline-flex;align-items:center;gap:5px;padding:7px 13px;border:1px solid var(--line);border-radius:999px;background:var(--bg);color:var(--ink-2);font-size:12.5px;font-weight:600}
.vibe .chat-box .tool.acc{background:var(--c-blue-2);border-color:transparent;color:var(--c-blue)}
.vibe .chat-box .tool .ic{color:var(--ink-3)}
.vibe .chat-box .tool.acc .ic{color:var(--c-blue)}
.vibe .chat-box .send{width:38px;height:38px;border-radius:50%;background:var(--c-blue);color:#fff;display:flex;align-items:center;justify-content:center;border:0}

.vibe .chat-foot{margin-top:10px;font-size:11.5px;color:var(--ink-4);text-align:center;display:flex;justify-content:center;gap:18px;font-weight:500}
.vibe .chat-foot kbd{font-family:"JetBrains Mono",monospace;font-size:10px;padding:2px 5px;border-radius:5px;border:1px solid var(--line);background:var(--bg-card);color:var(--ink-3);margin:0 2px;font-weight:600}
`;

const ChatScreen = () => (
  <div className="vibe">
    <style>{window.VIBE_CSS}</style>
    <style>{VIBE_CHAT_CSS}</style>
    <div className="app">
      <window.VibeSide active="chat" />
      <div className="main">
        <window.VibeTopbar
          title="改简历 · 字节前端"
          sub="使用「简历馆」 · 2 分钟前"
          actions={<>
            <button className="icon-btn">{window.IK.bookmark}</button>
            <button className="icon-btn">{window.IK.download}</button>
            <button className="icon-btn">{window.IK.more}</button>
          </>}
        />

        <div className="chat-shell">
          <div className="chat-feed">
            <div className="chat-feed-inner">

              <div className="day-divider">2026 · 5 · 23 · 周五</div>

              {/* User message */}
              <div className="msg me">
                <div className="av-wrap"><window.Avatar kind="ming" size={36} /></div>
                <div className="bub">帮我看看这份简历投字节前端怎么样？附件已上传。</div>
              </div>

              {/* AI response */}
              <div className="msg ai">
                <div className="av-wrap"><window.Avatar kind="coach" size={36} bg="var(--c-purple)" /></div>
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

              {/* Rich card */}
              <div className="rich-msg">
                <div className="av-wrap"><window.Avatar kind="coach" size={36} bg="var(--c-purple)" /></div>
                <div className="rich">
                  <div className="rch">
                    <div>
                      <h4>📊 简历诊断 · 字节资深前端</h4>
                      <div className="chips">
                        <span className="c-mini"><span className="dot" style={{ background: "#83e08c" }}></span>经验匹配 86</span>
                        <span className="c-mini"><span className="dot" style={{ background: "#83e08c" }}></span>技能覆盖 78</span>
                        <span className="c-mini"><span className="dot" style={{ background: "#ffcc00" }}></span>关键词 58</span>
                        <span className="c-mini"><span className="dot" style={{ background: "#ff7a7a" }}></span>成果量化 41</span>
                        <span className="c-mini"><span className="dot" style={{ background: "#ff7a7a" }}></span>Tech Lead 35</span>
                      </div>
                    </div>
                    <div className="score-blk">
                      <div className="v">72</div>
                      <div className="l">/ 100 · 良好</div>
                    </div>
                  </div>

                  <div className="findings">
                    <div className="find">
                      <span className="n">1</span>
                      <div>
                        <b>第一条 bullet 几乎是空话</b>
                        <span className="why">招聘者 6 秒扫一份简历，没数字 = 没记忆点。这是今天能改的最高 ROI 项。</span>
                      </div>
                    </div>
                    <div className="find">
                      <span className="n" style={{ background: "var(--c-red)" }}>2</span>
                      <div>
                        <b>Tech Lead 信号严重缺失</b>
                        <span className="why">JD 明确要「跨团队协作和 Tech Lead 经验」，简历里只写「参与代码评审」远远不够。</span>
                      </div>
                    </div>
                  </div>

                  <div className="ba-pair">
                    <div className="cell before">
                      <span className="lbl">❌ 原文 · BEFORE</span>
                      使用 React 重构了一个旧项目，提升了页面加载速度。
                    </div>
                    <div className="cell after">
                      <span className="lbl">✓ 建议 · AFTER</span>
                      主导 jQuery 项目向 React 18 + SSR 迁移，<b>FCP −72%（3.2s → 0.9s）</b>，日活 PV +18%。
                    </div>
                  </div>

                  <div className="rich-actions">
                    <button className="btn primary sm">{window.IK.check}<span>采纳改写</span></button>
                    <button className="btn sm">{window.IK.refresh}<span>换一版</span></button>
                    <button className="btn sm">{window.IK.doc}<span>查看完整 5 条</span></button>
                    <button className="btn sm" style={{ marginLeft: "auto" }}>{window.IK.download}<span>导出 PDF</span></button>
                  </div>
                </div>
              </div>

              {/* User follow-up */}
              <div className="msg me">
                <div className="av-wrap"><window.Avatar kind="ming" size={36} /></div>
                <div className="bub">那帮我把整段「蚂蚁」经历改一下，按方向 A（数据驱动）。</div>
              </div>

              {/* AI response 2 */}
              <div className="msg ai">
                <div className="av-wrap"><window.Avatar kind="coach" size={36} bg="var(--c-purple)" /></div>
                <div className="bub">
                  <p>好。整段重写如下 —— 全部带数字、全部用 JD 关键词。</p>
                </div>
              </div>

              <div className="rich-msg">
                <div className="av-wrap" style={{ visibility: "hidden", width: 36 }}></div>
                <div className="rich success">
                  <div className="rch">
                    <div>
                      <h4>✨ 蚂蚁集团 · 高级前端 · 2022.03 — 至今</h4>
                      <div className="chips">
                        <span className="c-mini">4 条 bullets</span>
                        <span className="c-mini">全部带数字</span>
                        <span className="c-mini">命中 5 个 JD 关键词</span>
                      </div>
                    </div>
                    <div className="score-blk">
                      <div className="v">+18</div>
                      <div className="l">分</div>
                    </div>
                  </div>

                  <div className="bullet-list">
                    <div className="b"><span className="dot"></span><span>主导支付宝某业务线 <b>React 18 + SSR</b> 架构升级，FCP <b>−72%</b>，PV <b>+18%</b>；</span></div>
                    <div className="b"><span className="dot"></span><span>牵头制定团队前端规范与组件库治理方案，mentor <b>3 名工程师</b>晋升中级；</span></div>
                    <div className="b"><span className="dot"></span><span>推动可观测性体系落地，线上 JS 错误率从 <b>0.12% 降至 0.03%</b>；</span></div>
                    <div className="b"><span className="dot"></span><span>与设计 / 产品形成「双周需求评审」机制，需求返工率降低 <b>40%</b>。</span></div>
                  </div>

                  <div className="rich-actions">
                    <button className="btn primary sm">{window.IK.check}<span>采纳到简历</span></button>
                    <button className="btn sm">{window.IK.refresh}<span>换一版</span></button>
                    <button className="btn sm">{window.IK.bookmark}<span>保存到主版本</span></button>
                  </div>
                </div>
              </div>

              {/* AI follow-up suggestion */}
              <div className="msg ai">
                <div className="av-wrap"><window.Avatar kind="coach" size={36} bg="var(--c-purple)" /></div>
                <div className="bub">
                  <p>顺带一提 —— 你简历里类似 「参与」「负责」「使用」的弱动词还有 <b>4 处</b>。<br/>
                  <mark>要不要一起改了？</mark></p>
                </div>
              </div>

              <div className="sugg-row">
                <span className="c yel">{window.IK.spark && <span className="ic">{window.IK.spark}</span>}<span>一起改掉那 4 处</span></span>
                <span className="c"><span className="ic">{window.IK.doc}</span><span>看完整 5 条建议</span></span>
                <span className="c"><span className="ic">{window.IK.play}</span><span>用这份简历模拟字节一面</span></span>
                <span className="c"><span className="ic">{window.IK.help}</span><span>字节前端常问什么</span></span>
                <span className="c"><span className="ic">{window.IK.bookmark}</span><span>保存到主版本</span></span>
              </div>

            </div>
          </div>

          <div className="chat-input-wrap">
            <div className="chat-input-inner">
              <div className="chat-box">
                <div className="ph">
                  <span className="you">继续：</span>
                  例如「把第二段实习也按 A 方向改」、「针对 Shopee 再生成一份」……
                </div>
                <div className="row">
                  <div className="tools-l">
                    <div className="tool"><span className="ic">{window.IK.doc}</span><span>附件</span></div>
                    <div className="tool acc"><span className="ic">{window.IK.command}</span><span>/ 命令</span></div>
                    <div className="tool"><span className="ic">{window.IK.mic}</span></div>
                  </div>
                  <button className="send">{window.IK.send}</button>
                </div>
              </div>
              <div className="chat-foot">
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
