// Direction C · Campus Quarterly 校招月刊
// Concept: 求职像读杂志 —— 编辑视角的策展，每周一期，深度内容驱动。
// Tone: 编辑感、出版物风、衬线大字、米黄纸感、有审美。

const DIR_C_CSS = `
.dir-c{
  --paper:#f1ebde;
  --paper-2:#f7f2e5;
  --paper-3:#ede5d2;
  --ink:#16140f;
  --ink-2:#3a3528;
  --ink-3:#7d7561;
  --ink-4:#b5ad96;
  --line:#d8cfb6;
  --line-2:#c2b89a;
  --red:#b8321f;
  --red-2:#e8c8be;
  --gold:#a07a26;
  --moss:#5a6b3a;

  position:absolute;inset:0;background:var(--paper);color:var(--ink);
  font-family:"Geist","Noto Sans SC",sans-serif;font-size:14px;line-height:1.55;
  -webkit-font-smoothing:antialiased;
  overflow:hidden;
}
.dir-c *{box-sizing:border-box}
.dir-c .serif{font-family:"Instrument Serif","Noto Serif SC",serif}

/* paper texture */
.dir-c::before{
  content:"";position:absolute;inset:0;pointer-events:none;
  background-image:radial-gradient(circle at 20% 30%,rgba(184,154,90,.04) 0%,transparent 50%),
                   radial-gradient(circle at 80% 70%,rgba(184,154,90,.03) 0%,transparent 50%);
  z-index:0;
}
.dir-c > *{position:relative;z-index:1}

/* masthead */
.dir-c .c-mast{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:18px 36px 14px;border-bottom:1px solid var(--ink);font-family:"Geist Mono",monospace;font-size:11px;color:var(--ink-2);letter-spacing:.08em}
.dir-c .c-mast .left{display:flex;gap:18px}
.dir-c .c-mast .title{font-family:"Instrument Serif","Noto Serif SC",serif;font-size:30px;line-height:1;letter-spacing:.02em;text-align:center;font-style:italic;color:var(--ink);text-transform:none}
.dir-c .c-mast .title .reg{font-style:normal;letter-spacing:.04em}
.dir-c .c-mast .right{display:flex;gap:18px;justify-content:flex-end;align-items:center}

/* second nav */
.dir-c .c-nav{display:flex;justify-content:center;gap:24px;padding:8px 36px;border-bottom:2px double var(--ink);font-family:"Instrument Serif",serif;font-size:14px;font-style:italic;color:var(--ink-2)}
.dir-c .c-nav a{color:inherit;text-decoration:none}
.dir-c .c-nav a.active{color:var(--red)}

/* hero — magazine cover */
.dir-c .c-cover{display:grid;grid-template-columns:1.4fr 1fr;gap:36px;padding:32px 36px;border-bottom:1px solid var(--ink)}
.dir-c .c-issue{font-family:"Geist Mono",monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);margin-bottom:14px;display:flex;justify-content:space-between;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:6px 0}
.dir-c .c-headline{font-family:"Instrument Serif","Noto Serif SC",serif;font-size:84px;line-height:.95;letter-spacing:-.02em;margin:0;color:var(--ink);font-weight:400}
.dir-c .c-headline .it{font-style:italic;color:var(--red)}
.dir-c .c-deck{font-family:"Instrument Serif","Noto Serif SC",serif;font-size:22px;line-height:1.35;color:var(--ink-2);margin:18px 0 0;font-style:italic;max-width:38ch;font-weight:400}
.dir-c .c-byline{margin-top:18px;font-family:"Geist Mono",monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3)}
.dir-c .c-byline b{color:var(--ink)}

.dir-c .c-cover-actions{display:flex;gap:8px;margin-top:24px}
.dir-c .c-btn{padding:10px 18px;background:var(--ink);color:var(--paper);border:0;border-radius:0;font-size:13px;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-family:"Geist",sans-serif}
.dir-c .c-btn.ghost{background:transparent;color:var(--ink);border:1px solid var(--ink)}
.dir-c .c-btn.red{background:var(--red);color:var(--paper)}

/* cover image side */
.dir-c .c-cover-vis{position:relative}
.dir-c .c-img{width:100%;height:330px;background:linear-gradient(135deg,#c4a878,#8b7148);border-radius:0;position:relative;overflow:hidden}
.dir-c .c-img::after{
  content:"";position:absolute;inset:0;
  background:radial-gradient(circle at 30% 20%,rgba(255,255,255,.25) 0%,transparent 50%),
             radial-gradient(circle at 70% 80%,rgba(0,0,0,.15) 0%,transparent 50%);
}
.dir-c .c-img-label{position:absolute;bottom:14px;left:14px;color:rgba(255,255,255,.9);font-family:"Geist Mono",monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;z-index:2}
.dir-c .c-img-overlay{position:absolute;top:20px;left:20px;font-family:"Instrument Serif",serif;font-style:italic;color:rgba(255,255,255,.95);font-size:48px;line-height:.95;z-index:2;max-width:80%}

.dir-c .c-pullq{margin-top:14px;font-family:"Instrument Serif",serif;font-style:italic;font-size:16px;line-height:1.45;color:var(--ink-2);padding-left:14px;border-left:2px solid var(--red)}
.dir-c .c-pullq cite{display:block;font-family:"Geist Mono",monospace;font-style:normal;font-size:10px;letter-spacing:.1em;color:var(--ink-3);text-transform:uppercase;margin-top:6px;text-decoration:none}

/* TOC strip */
.dir-c .c-toc{padding:24px 36px;border-bottom:1px solid var(--ink)}
.dir-c .c-toc-h{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:18px}
.dir-c .c-toc-h h2{font-family:"Instrument Serif",serif;font-style:italic;font-size:28px;margin:0;color:var(--ink);font-weight:400}
.dir-c .c-toc-h .sub{font-family:"Geist Mono",monospace;font-size:10px;letter-spacing:.1em;color:var(--ink-3);text-transform:uppercase}
.dir-c .c-toc-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:0}
.dir-c .c-toc-item{padding:14px 18px 14px 0;border-right:1px solid var(--line);display:flex;flex-direction:column;gap:6px}
.dir-c .c-toc-item:last-child{border-right:0}
.dir-c .c-toc-item:nth-child(n+1){padding-left:18px}
.dir-c .c-toc-item:first-child{padding-left:0}
.dir-c .c-toc-num{font-family:"Instrument Serif",serif;font-style:italic;font-size:30px;line-height:1;color:var(--red)}
.dir-c .c-toc-item .name{font-family:"Instrument Serif",serif;font-size:18px;line-height:1.2;color:var(--ink);font-weight:400}
.dir-c .c-toc-item .name .en{display:block;font-family:"Geist Mono",monospace;font-style:normal;font-size:9px;letter-spacing:.12em;color:var(--ink-3);text-transform:uppercase;margin-top:2px}
.dir-c .c-toc-item .desc{font-size:11.5px;color:var(--ink-3);line-height:1.5}
.dir-c .c-toc-item .page{font-family:"Geist Mono",monospace;font-size:10px;color:var(--ink-3);margin-top:auto;display:flex;justify-content:space-between}

/* product page (a feature article-style screen) */
.dir-c .pc{display:grid;grid-template-rows:auto 1fr;height:100%;background:var(--paper)}
.dir-c .pc-top{display:flex;justify-content:space-between;align-items:center;padding:16px 36px;border-bottom:1px solid var(--ink);font-family:"Geist Mono",monospace;font-size:11px;color:var(--ink-3);letter-spacing:.08em;text-transform:uppercase}
.dir-c .pc-top .b-title{font-family:"Instrument Serif",serif;font-style:italic;font-size:18px;color:var(--ink);text-transform:none;letter-spacing:0}
.dir-c .pc-top .pc-nav{display:flex;gap:18px;font-family:"Instrument Serif",serif;font-style:italic;font-size:13px;color:var(--ink-2);text-transform:none;letter-spacing:0}
.dir-c .pc-top .pc-nav a.active{color:var(--red)}

.dir-c .pc-body{display:grid;grid-template-columns:170px 1fr 220px;padding:24px 36px 24px;gap:32px;overflow:hidden}

.dir-c .pc-side{font-family:"Geist Mono",monospace;font-size:10px;letter-spacing:.1em;color:var(--ink-3);text-transform:uppercase}
.dir-c .pc-side h6{margin:0 0 8px;color:var(--ink-3);font-size:10px;letter-spacing:.12em;font-weight:600}
.dir-c .pc-side ul{list-style:none;padding:0;margin:0 0 18px;display:flex;flex-direction:column;gap:7px}
.dir-c .pc-side li{font-family:"Geist",sans-serif;font-size:12px;color:var(--ink-2);text-transform:none;letter-spacing:0;display:flex;justify-content:space-between;border-bottom:1px dotted var(--line);padding-bottom:6px}
.dir-c .pc-side li.active{color:var(--red);font-weight:500}
.dir-c .pc-side li .pg{color:var(--ink-4)}

.dir-c .pc-article h1{font-family:"Instrument Serif",serif;font-size:56px;line-height:.98;margin:0 0 4px;letter-spacing:-.02em;font-weight:400}
.dir-c .pc-article h1 em{color:var(--red);font-style:italic}
.dir-c .pc-article .deck{font-family:"Instrument Serif",serif;font-style:italic;font-size:20px;line-height:1.4;color:var(--ink-2);margin:14px 0 18px;max-width:42ch}
.dir-c .pc-article .meta{font-family:"Geist Mono",monospace;font-size:10px;letter-spacing:.1em;color:var(--ink-3);text-transform:uppercase;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:6px 0;margin-bottom:18px;display:flex;justify-content:space-between}
.dir-c .pc-cols{column-count:2;column-gap:28px;font-size:13.5px;line-height:1.65;color:var(--ink-2);max-height:340px;overflow:hidden}
.dir-c .pc-cols p{margin:0 0 10px}
.dir-c .pc-cols p:first-child::first-letter{font-family:"Instrument Serif",serif;font-size:60px;line-height:.85;float:left;padding:4px 8px 0 0;color:var(--red)}
.dir-c .pc-cols b{color:var(--ink);font-weight:500}
.dir-c .pc-cols em{color:var(--red);font-style:italic}

/* right rail "featured + tools" */
.dir-c .pc-rail{font-family:"Geist",sans-serif;font-size:12px;color:var(--ink-2)}
.dir-c .pc-rail h6{font-family:"Geist Mono",monospace;font-size:10px;letter-spacing:.12em;color:var(--ink-3);text-transform:uppercase;margin:0 0 10px;font-weight:600;border-bottom:1px solid var(--ink);padding-bottom:6px}
.dir-c .ranking{display:flex;flex-direction:column;gap:8px;margin-bottom:24px}
.dir-c .rank-row{display:grid;grid-template-columns:22px 1fr auto;gap:8px;align-items:baseline;font-size:12px;padding-bottom:6px;border-bottom:1px dotted var(--line)}
.dir-c .rank-row .n{font-family:"Instrument Serif",serif;font-size:18px;font-style:italic;color:var(--red);line-height:1}
.dir-c .rank-row .name{font-weight:500;color:var(--ink)}
.dir-c .rank-row .name .role{display:block;font-size:10px;color:var(--ink-3);font-weight:400}
.dir-c .rank-row .v{font-family:"Geist Mono",monospace;font-size:11px;color:var(--ink-3)}

.dir-c .tool-tile{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:10px 0;border-bottom:1px dotted var(--line);font-size:12px;color:var(--ink-2)}
.dir-c .tool-tile .ic{width:30px;height:30px;border:1px solid var(--ink);border-radius:0;display:flex;align-items:center;justify-content:center;color:var(--ink);background:var(--paper-2)}
.dir-c .tool-tile b{display:block;color:var(--ink);font-weight:500;font-family:"Instrument Serif",serif;font-style:italic;font-size:14px}
.dir-c .tool-tile .arr{color:var(--red)}
`;

// ─── C. Landing ─────────────────────────────────────────────────────────
const C_Landing = () => (
  <div className="dir-c">
    <style>{DIR_C_CSS}</style>

    <div className="c-mast">
      <div className="left">
        <span>VOL. 24 · NO. 5</span>
        <span>BEIJING · SHANGHAI</span>
      </div>
      <div className="title"><span className="reg">Campus </span>Quarterly</div>
      <div className="right">
        <span>EST. 2024</span>
        <span>EN / 中</span>
        <span style={{color:"var(--ink)",fontWeight:600}}>订阅</span>
      </div>
    </div>

    <div className="c-nav">
      <a className="active">本期</a>
      <a>简历馆</a>
      <a>面试馆</a>
      <a>薪资馆</a>
      <a>岗位地图</a>
      <a>校友故事</a>
      <a>资料库</a>
    </div>

    <div className="c-cover">
      <div>
        <div className="c-issue">
          <span>2026 · 5 · 23 · 星期五</span>
          <span>校招特刊 / GRAD ISSUE</span>
          <span>176 页 · 48 分钟读完</span>
        </div>
        <h1 className="c-headline">
          投不出去的<br/>
          不是简历，<br/>
          是<span className="it">焦虑。</span>
        </h1>
        <p className="c-deck">
          我们走访了 12 位拿到 offer 的应届生，发现他们的简历都有同样一个秘密 —— 不是更漂亮，而是更<em style={{fontStyle:"italic",color:"var(--red)"}}>具体</em>。
        </p>
        <div className="c-byline">
          编辑 <b>晏 樂</b> · 撰文 <b>梁 知秋</b> · 数据 <b>编辑部</b>
        </div>

        <div className="c-cover-actions">
          <button className="c-btn red">{window.IK.doc}<span>开始阅读 →</span></button>
          <button className="c-btn ghost">{window.IK.bookmark}<span>本期目录</span></button>
        </div>

        <div className="c-pullq">
          「我整整一个月没投出去一份简历。后来才明白，问题不是公司挑剔，是我自己看不上自己。」
          <cite>— 张同学 · 北京交大 · 字节 offer</cite>
        </div>
      </div>

      <div className="c-cover-vis">
        <div className="c-img">
          <span className="c-img-overlay">"具体" <br/>是最被低估的能力。</span>
          <span className="c-img-label">封面 / 编辑部 · A-side</span>
        </div>
        <div style={{marginTop:14,fontFamily:"Geist Mono",fontSize:10,letterSpacing:".1em",color:"var(--ink-3)",textTransform:"uppercase",display:"flex",justifyContent:"space-between",borderTop:"1px solid var(--line)",paddingTop:8}}>
          <span>本期话题</span>
          <span>#具体 #秋招 #量化 #STAR</span>
        </div>

        <div style={{marginTop:16,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:11}}>
          <div style={{borderTop:"1px solid var(--ink)",paddingTop:8}}>
            <div style={{fontFamily:"Geist Mono",fontSize:9,letterSpacing:".1em",color:"var(--ink-3)",textTransform:"uppercase",marginBottom:4}}>本周精选 · 01</div>
            <div style={{fontFamily:"Instrument Serif",fontSize:17,lineHeight:1.2,color:"var(--ink)"}}>3 个让 HR 多看 30 秒的 bullet 写法</div>
          </div>
          <div style={{borderTop:"1px solid var(--ink)",paddingTop:8}}>
            <div style={{fontFamily:"Geist Mono",fontSize:9,letterSpacing:".1em",color:"var(--ink-3)",textTransform:"uppercase",marginBottom:4}}>本周精选 · 02</div>
            <div style={{fontFamily:"Instrument Serif",fontSize:17,lineHeight:1.2,color:"var(--ink)"}}>实习转正的 4 个关键时间窗口</div>
          </div>
        </div>
      </div>
    </div>

    <div className="c-toc">
      <div className="c-toc-h">
        <h2>本期工具 — Tools in this Issue</h2>
        <span className="sub">8 件 · 本月更新</span>
      </div>
      <div className="c-toc-grid">
        <div className="c-toc-item">
          <span className="c-toc-num">I</span>
          <div className="name">简历馆<span className="en">Resume Studio</span></div>
          <div className="desc">逐条改写、关键词匹配、版式优化，针对你心仪的那一个岗位。</div>
          <div className="page"><span>编辑精选</span><span>P. 12</span></div>
        </div>
        <div className="c-toc-item">
          <span className="c-toc-num">II</span>
          <div className="name">面试馆<span className="en">Interview Hall</span></div>
          <div className="desc">语音 / 文字模拟、岗位题库、行为面试 STAR 复盘。</div>
          <div className="page"><span>读者最常用</span><span>P. 38</span></div>
        </div>
        <div className="c-toc-item">
          <span className="c-toc-num">III</span>
          <div className="name">薪资馆<span className="en">Salary Lab</span></div>
          <div className="desc">校招 1,247 条真实 offer · 同岗对比 · 谈判区间。</div>
          <div className="page"><span>本期数据</span><span>P. 72</span></div>
        </div>
        <div className="c-toc-item">
          <span className="c-toc-num">IV</span>
          <div className="name">投递台<span className="en">Application Desk</span></div>
          <div className="desc">看板管理所有投递，节点提醒，复盘历史 funnel。</div>
          <div className="page"><span>新增</span><span>P. 96</span></div>
        </div>
      </div>
    </div>
  </div>
);

// ─── C. Product (Resume Studio article-page) ────────────────────────────
const C_Product = () => (
  <div className="dir-c">
    <style>{DIR_C_CSS}</style>
    <div className="pc">
      <div className="pc-top">
        <span>Campus <i style={{fontFamily:"Instrument Serif",fontStyle:"italic"}}>Quarterly</i> · P. 12</span>
        <div className="b-title">Resume Studio · 简历馆</div>
        <div className="pc-nav">
          <a className="active">读一篇</a><a>用工具</a><a>看案例</a>
        </div>
      </div>

      <div className="pc-body">
        <div className="pc-side">
          <h6>—— 本馆目录</h6>
          <ul>
            <li className="active"><span>00. 序言</span><span className="pg">012</span></li>
            <li><span>01. 关键词命中</span><span className="pg">016</span></li>
            <li><span>02. 把动词换掉</span><span className="pg">020</span></li>
            <li><span>03. 数字的力量</span><span className="pg">024</span></li>
            <li><span>04. 一页 vs 两页</span><span className="pg">028</span></li>
            <li><span>05. 校招版式</span><span className="pg">032</span></li>
            <li><span>06. 实习如何写</span><span className="pg">036</span></li>
          </ul>

          <h6>—— 相关</h6>
          <ul>
            <li><span>同期 · 面试馆</span><span className="pg">038</span></li>
            <li><span>本周专题</span><span className="pg">→</span></li>
          </ul>

          <h6>—— 阅读时长</h6>
          <div style={{fontFamily:"Instrument Serif",fontStyle:"italic",fontSize:30,color:"var(--red)",letterSpacing:"-.01em"}}>
            7 min
          </div>
        </div>

        <div className="pc-article">
          <div className="meta">
            <span>SECTION I · 简历馆 · 序言</span>
            <span>编辑部 · 2026 / 5 / 23</span>
          </div>
          <h1>简历不需要漂亮 ——<em> 只需要 "具体"。</em></h1>
          <p className="deck">
            我们看了 1,200 份应届生简历，发现最大的问题不是排版，也不是经验薄。是它们读起来像同一个人写的：模糊、谦虚、安全。
          </p>

          <div className="pc-cols">
            <p>九月秋招的第一周，我在咖啡馆见到了刚刚拿到字节 offer 的张同学。他递给我两份简历 —— 同一份内容的"前"和"后"。一字之差，决定了他从被拒到面试再到 offer。</p>
            <p>变化在哪里？不是用了什么花哨的句式，也不是删了什么 "无关" 的经历。<b>而是把每一条都写得更具体了。</b></p>
            <p>原文："使用 React 重构了一个旧项目，提升了页面加载速度"。<br/>改后："主导 jQuery 项目向 React 18 + SSR 迁移，FCP 从 3.2s 降至 0.9s（−72%），日活 PV +18%"。</p>
            <p>同一件事。一个让人想问"哪个项目？提了多少？"，一个让人想问"我们也想这样做，能聊聊吗？" <em>这就是简历的全部秘密。</em></p>
            <p>我们整理了 3 个具体方法，下文将逐一展开 ——</p>
          </div>

          <div style={{marginTop:18,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
            <div style={{padding:14,background:"var(--paper-3)",border:"1px solid var(--line)"}}>
              <div style={{fontFamily:"Instrument Serif",fontStyle:"italic",fontSize:22,color:"var(--red)",lineHeight:1}}>01</div>
              <div style={{fontFamily:"Instrument Serif",fontSize:16,marginTop:6,color:"var(--ink)"}}>动词具体化</div>
              <div style={{fontSize:11,color:"var(--ink-3)",marginTop:4}}>"参与" → "主导"</div>
            </div>
            <div style={{padding:14,background:"var(--paper-3)",border:"1px solid var(--line)"}}>
              <div style={{fontFamily:"Instrument Serif",fontStyle:"italic",fontSize:22,color:"var(--red)",lineHeight:1}}>02</div>
              <div style={{fontFamily:"Instrument Serif",fontSize:16,marginTop:6,color:"var(--ink)"}}>数据带单位</div>
              <div style={{fontSize:11,color:"var(--ink-3)",marginTop:4}}>"很多" → "320 万"</div>
            </div>
            <div style={{padding:14,background:"var(--paper-3)",border:"1px solid var(--line)"}}>
              <div style={{fontFamily:"Instrument Serif",fontStyle:"italic",fontSize:22,color:"var(--red)",lineHeight:1}}>03</div>
              <div style={{fontFamily:"Instrument Serif",fontSize:16,marginTop:6,color:"var(--ink)"}}>结果可验证</div>
              <div style={{fontSize:11,color:"var(--ink-3)",marginTop:4}}>"提升" → "+72%"</div>
            </div>
          </div>
        </div>

        <div className="pc-rail">
          <h6>本期 · 工具入口</h6>
          <div className="tool-tile">
            <div className="ic">{window.IK.doc}</div>
            <div><b>JD 匹配诊断</b><span style={{fontSize:11,color:"var(--ink-3)"}}>贴一份 JD，3 分钟</span></div>
            <span className="arr">→</span>
          </div>
          <div className="tool-tile">
            <div className="ic">{window.IK.spark}</div>
            <div><b>AI 重写本段</b><span style={{fontSize:11,color:"var(--ink-3)"}}>把不"具体"的句子换一版</span></div>
            <span className="arr">→</span>
          </div>
          <div className="tool-tile">
            <div className="ic">{window.IK.brief}</div>
            <div><b>校招版式模板</b><span style={{fontSize:11,color:"var(--ink-3)"}}>12 套 · 一键应用</span></div>
            <span className="arr">→</span>
          </div>

          <h6 style={{marginTop:22}}>校友 · 这个月的 Offer</h6>
          <div className="ranking">
            <div className="rank-row">
              <span className="n">1</span>
              <div><div className="name">张 明</div><span className="role">前端 · 字节 · 上海</span></div>
              <span className="v">46k×16</span>
            </div>
            <div className="rank-row">
              <span className="n">2</span>
              <div><div className="name">陈 远</div><span className="role">Frontend · Shopee · SG</span></div>
              <span className="v">S$ 6.5k</span>
            </div>
            <div className="rank-row">
              <span className="n">3</span>
              <div><div className="name">林 晓</div><span className="role">数据 · 美团 · 北京</span></div>
              <span className="v">28k×15</span>
            </div>
            <div className="rank-row">
              <span className="n">4</span>
              <div><div className="name">王 沛</div><span className="role">客户端 · 腾讯 · 深圳</span></div>
              <span className="v">30k×16</span>
            </div>
          </div>

          <h6 style={{marginTop:8}}>下期预告</h6>
          <div style={{fontFamily:"Instrument Serif",fontStyle:"italic",fontSize:18,color:"var(--ink)",lineHeight:1.25,marginTop:6}}>
            五月号 B 面：<br/>面试官不会告诉你的<span style={{color:"var(--red)"}}> 3 个真问题</span>
          </div>
          <div style={{fontSize:10,color:"var(--ink-3)",fontFamily:"Geist Mono",letterSpacing:".1em",textTransform:"uppercase",marginTop:6}}>
            5 / 30 上线 · 已预约 1,208
          </div>
        </div>
      </div>
    </div>
  </div>
);

Object.assign(window, { C_Landing, C_Product });
