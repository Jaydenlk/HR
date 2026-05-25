// Coach Chat — 对话入口，所有工具的归集
// 一个真实的对话 in progress，带富卡片 (resume diagnose result)

const COACH_CHAT_CSS = `
.coach .chat-shell{display:flex;flex-direction:column;height:100%;overflow:hidden}

.coach .chat-feed{flex:1;overflow:hidden;padding:20px 32px 0;display:flex;flex-direction:column;gap:20px;min-height:0}
.coach .chat-feed-inner{max-width:820px;width:100%;margin:0 auto;display:flex;flex-direction:column;gap:22px}

.coach .day-divider{display:flex;align-items:center;gap:14px;font-family:"Geist Mono",monospace;font-size:10px;letter-spacing:.12em;color:var(--ink-4);text-transform:uppercase;margin:8px 0}
.coach .day-divider::before, .coach .day-divider::after{content:"";height:1px;background:var(--line);flex:1}

.coach .msg{display:flex;gap:14px}
.coach .msg .av{width:30px;height:30px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;background:var(--bg-2);border:1px solid var(--line);color:var(--ink-2)}
.coach .msg.ai .av{background:var(--ink);color:var(--bg);border-color:var(--ink);font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;font-size:13px}
.coach .msg.me{flex-direction:row-reverse}
.coach .msg.me .av{background:var(--accent);color:#fff;border-color:var(--accent);font-family:"Instrument Serif",serif;font-style:italic;font-size:13px}
.coach .msg .bub{font-size:15px;line-height:1.65;flex:1;min-width:0}
.coach .msg.me .bub{background:var(--accent-2);color:var(--ink);border-radius:18px 18px 6px 18px;padding:12px 16px;max-width:560px;align-self:flex-end}
.coach .msg.ai .bub{color:var(--ink)}
.coach .msg.ai .bub p{margin:0 0 10px}
.coach .msg.ai .bub p:last-child{margin-bottom:0}
.coach .msg.ai .bub b{font-weight:600}
.coach .msg.ai .bub .em-warm{color:var(--warm);font-style:italic;font-family:"Instrument Serif",serif}
.coach .msg.ai .stamp{display:flex;align-items:center;gap:6px;margin-top:4px;font-size:11px;color:var(--ink-3);font-family:"Geist Mono",monospace;letter-spacing:.04em}
.coach .msg.ai .stamp .tool{background:var(--accent-2);color:var(--accent-3);padding:2px 7px;border-radius:4px;font-weight:500;text-transform:uppercase;font-size:9.5px;letter-spacing:.06em}

/* rich card: diagnose result */
.coach .rich{margin-top:12px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px 20px;max-width:660px}
.coach .rich .rch{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;border-bottom:1px solid var(--line);margin-bottom:14px}
.coach .rich .rch h4{margin:0;font-family:"Instrument Serif",serif;font-style:italic;font-size:22px;font-weight:400;letter-spacing:-.01em;color:var(--ink)}
.coach .rich .rch .meta{font-family:"Geist Mono",monospace;font-size:10px;letter-spacing:.06em;color:var(--ink-3);text-transform:uppercase;text-align:right}
.coach .rich .rch .meta .score{display:block;font-family:"Instrument Serif",serif;font-style:italic;color:var(--accent);font-size:30px;line-height:1;letter-spacing:-.02em;text-transform:none;margin-bottom:2px}

.coach .rich .row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}

.coach .rich .findings{display:flex;flex-direction:column;gap:10px;margin-bottom:14px}
.coach .find{display:grid;grid-template-columns:22px 1fr;gap:10px;font-size:13px;line-height:1.55}
.coach .find .n{font-family:"Instrument Serif",serif;font-style:italic;font-size:17px;line-height:1.2;color:var(--accent)}
.coach .find b{font-weight:600;color:var(--ink)}
.coach .find .why{display:block;color:var(--ink-3);font-size:12px;margin-top:2px}

.coach .ba{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
.coach .ba .cell{padding:10px 13px;border-radius:8px;font-size:12.5px;line-height:1.55}
.coach .ba .cell.before{background:#fef3f1;color:var(--ink-2);border:1px solid #f3d7d3;text-decoration:line-through;text-decoration-color:rgba(207,85,68,.35)}
.coach .ba .cell.after{background:#eef5ee;color:var(--ink);border:1px solid #cce0cc}
.coach .ba .cell .lbl{display:block;font-family:"Geist Mono",monospace;font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);margin-bottom:4px;text-decoration:none;font-weight:500}
.coach .ba .cell.after .lbl{color:var(--good)}

.coach .rich-actions{display:flex;gap:8px;margin-top:14px;padding-top:14px;border-top:1px solid var(--line);flex-wrap:wrap}

/* suggestion chips */
.coach .chat-sugg{margin-top:14px;display:flex;flex-wrap:wrap;gap:6px}
.coach .chat-sugg .c{font-size:12.5px;padding:7px 14px;border:1px solid var(--line);background:var(--card);color:var(--ink-2);border-radius:999px;display:inline-flex;align-items:center;gap:6px}
.coach .chat-sugg .c .ic{color:var(--accent)}

/* input bar */
.coach .chat-input-wrap{padding:14px 32px 22px;border-top:1px solid var(--line);background:var(--bg)}
.coach .chat-input-inner{max-width:820px;margin:0 auto}
.coach .chat-box{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:14px 18px 10px;box-shadow:0 8px 28px -14px rgba(0,0,0,.08)}
.coach .chat-box .ph{font-size:14px;color:var(--ink-3);padding-bottom:10px;letter-spacing:-.003em}
.coach .chat-box .ph .you{color:var(--ink-4)}
.coach .chat-box .row{display:flex;justify-content:space-between;align-items:center;padding-top:10px;border-top:1px solid var(--line)}
.coach .chat-box .tools-l{display:flex;gap:6px}
.coach .chat-box .tool{display:inline-flex;align-items:center;gap:5px;padding:6px 11px;border:1px solid var(--line);border-radius:999px;background:var(--bg);color:var(--ink-2);font-size:12px}
.coach .chat-box .tool.acc{background:var(--accent-2);border-color:var(--accent-2);color:var(--accent-3)}
.coach .chat-box .tool .ic{color:var(--ink-3)}
.coach .chat-box .tool.acc .ic{color:var(--accent)}
.coach .chat-box .send{width:36px;height:36px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;border:0}

.coach .chat-footnote{margin-top:10px;font-size:11.5px;color:var(--ink-4);text-align:center;display:flex;justify-content:center;gap:18px}
.coach .chat-footnote kbd{font-family:"Geist Mono",monospace;font-size:10px;padding:2px 5px;border-radius:4px;border:1px solid var(--line);background:var(--card);color:var(--ink-3);margin:0 3px}
`;

const ChatScreen = () => (
  <div className="coach">
    <style>{window.COACH_CSS}</style>
    <style>{COACH_CHAT_CSS}</style>
    <div className="app">
      <window.CoachSide active="chat" />
      <div className="main">
        <window.CoachTopbar
          crumb={["与 Coach 对话 · ", "改简历 · 字节前端"]}
          title
          actions={<>
            <span className="chip" style={{ marginRight: 4 }}>{window.IK.bolt}<span style={{ marginLeft: 4 }}>使用 「简历馆」工具中</span></span>
            <button className="icon-btn">{window.IK.bookmark}</button>
            <button className="icon-btn">{window.IK.download}</button>
            <button className="icon-btn">{window.IK.more}</button>
          </>}
        />

        <div className="chat-shell">
          <div className="chat-feed" style={{ overflow: "auto" }}>
            <div className="chat-feed-inner">

              <div className="day-divider">2026 / 5 / 23 · 周五</div>

              <div className="msg me">
                <div className="av">明</div>
                <div className="bub">帮我看看这份简历投字节前端怎么样，附件已上传。</div>
              </div>

              <div className="msg ai">
                <div className="av">C</div>
                <div className="bub">
                  <p>看完了。<b>72 / 100</b> —— 经验对口是你的优势，但「成果量化」和「Tech Lead 信号」拖了后腿。</p>
                  <p>关键词命中 <b>7 / 12</b>，主要缺：<b>Next.js · SSR · Monorepo · Tech Lead</b> —— 这几个 JD 里反复出现，但你简历里没用对方的词说。</p>
                  <p>下面是诊断结果 ——</p>
                  <div className="stamp">⏱ 11s · 用 <span className="tool">简历馆 · JD 匹配</span></div>
                </div>
              </div>

              {/* rich card */}
              <div className="msg ai">
                <div className="av">C</div>
                <div className="bub" style={{ flex: 1 }}>
                  <div className="rich">
                    <div className="rch">
                      <div>
                        <h4>简历诊断 · 字节 资深前端</h4>
                        <span className="row" style={{ marginTop: 8, gap: 6 }}>
                          <span className="chip good"><span className="dot"></span>经验匹配 86</span>
                          <span className="chip good"><span className="dot"></span>技能覆盖 78</span>
                          <span className="chip warn"><span className="dot"></span>关键词 58</span>
                          <span className="chip bad"><span className="dot"></span>成果量化 41</span>
                          <span className="chip bad"><span className="dot"></span>Tech Lead 35</span>
                        </span>
                      </div>
                      <div className="meta">
                        <span className="score">72</span>
                        <span>/ 100 · 良好</span>
                      </div>
                    </div>

                    <div className="findings">
                      <div className="find">
                        <span className="n">01</span>
                        <div>
                          <b>第一条 bullet 几乎是空话 ——</b>
                          <span className="why">招聘者 6 秒扫一份简历，没数字 = 没记忆点。这是你今天就能改的最高 ROI 项目。</span>
                        </div>
                      </div>
                      <div className="find">
                        <span className="n">02</span>
                        <div>
                          <b>Tech Lead 信号缺失 ——</b>
                          <span className="why">JD 明确要求「跨团队协作和 Tech Lead 经验」，简历里只写「参与代码评审」远远不够。</span>
                        </div>
                      </div>
                    </div>

                    <div className="ba">
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
                      <button className="btn ghost sm">{window.IK.doc}<span>查看完整 5 条建议</span></button>
                      <button className="btn ghost sm" style={{ marginLeft: "auto" }}>{window.IK.download}<span>导出 PDF 报告</span></button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="msg me">
                <div className="av">明</div>
                <div className="bub">那帮我把整段「蚂蚁」经历改一下，按方向 A（数据驱动）。</div>
              </div>

              <div className="msg ai">
                <div className="av">C</div>
                <div className="bub">
                  <p>好。下面是整段重写 ——</p>
                  <div className="rich" style={{ background: "var(--good-2)", borderColor: "transparent" }}>
                    <div className="rch" style={{ borderColor: "rgba(0,0,0,.06)" }}>
                      <div>
                        <h4>蚂蚁集团 · 高级前端工程师 · 2022.03 — 至今</h4>
                        <span style={{ fontSize: 12, color: "var(--ink-3)" }}>4 条 bullets · 全部带数字 · 全部用 JD 关键词</span>
                      </div>
                      <div className="meta">
                        <span className="tool" style={{ background: "var(--good)", color: "#fff" }}>+18 PTS</span>
                      </div>
                    </div>
                    <ul style={{ margin: 0, padding: "0 0 0 18px", color: "var(--ink-2)", fontSize: 13.5, lineHeight: 1.7 }}>
                      <li>主导支付宝某业务线 <b>React 18 + SSR</b> 架构升级，FCP <b>−72%</b>，PV <b>+18%</b>；</li>
                      <li>牵头制定团队前端规范与组件库治理方案，mentor <b>3 名工程师</b>晋升中级；</li>
                      <li>推动可观测性体系落地，线上 JS 错误率从 <b>0.12% 降至 0.03%</b>；</li>
                      <li>与设计 / 产品形成「双周需求评审」机制，需求返工率降低 <b>40%</b>。</li>
                    </ul>
                    <div className="rich-actions" style={{ borderColor: "rgba(0,0,0,.06)" }}>
                      <button className="btn primary sm">{window.IK.check}<span>采纳到简历</span></button>
                      <button className="btn sm">{window.IK.refresh}<span>换一版</span></button>
                      <button className="btn ghost sm">{window.IK.copy || window.IK.doc}<span>复制</span></button>
                    </div>
                  </div>
                  <p style={{ marginTop: 14 }}>
                    顺带说一句 —— 你简历里类似「参与」「负责」「使用」的动词还有 <b>4 处</b>。
                    <span className="em-warm">要不要一起改了？</span>
                  </p>
                </div>
              </div>

              <div className="chat-sugg">
                <span className="c"><span className="ic">{window.IK.spark}</span><span>一起改掉那 4 处</span></span>
                <span className="c"><span className="ic">{window.IK.doc}</span><span>看完整 5 条建议</span></span>
                <span className="c"><span className="ic">{window.IK.play}</span><span>用这份简历模拟字节一面</span></span>
                <span className="c"><span className="ic">{window.IK.help}</span><span>字节前端面试常问什么</span></span>
                <span className="c"><span className="ic">{window.IK.bookmark}</span><span>保存到主版本</span></span>
              </div>

            </div>
          </div>

          <div className="chat-input-wrap">
            <div className="chat-input-inner">
              <div className="chat-box">
                <div className="ph">
                  <span className="you">继续 ——</span>
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
              <div className="chat-footnote">
                <span><kbd>/</kbd> 命令</span>
                <span><kbd>⌘ K</kbd> 搜索</span>
                <span><kbd>⌘ ↵</kbd> 发送</span>
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
