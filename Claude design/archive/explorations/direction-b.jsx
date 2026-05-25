// Direction B · Career Cockpit 求职驾驶舱
// Concept: 求职是一个项目，用数据管理它。funnel、趋势、市场温度。
// Tone: 深色、密度高、Pro 感，像 Linear / Levels.fyi / Stripe Atlas

const DIR_B_CSS = `
.dir-b{
  --bg:#0a0d12;
  --bg-2:#0f1319;
  --surface:#141923;
  --surface-2:#1a2030;
  --line:#252b38;
  --line-2:#363d4d;
  --ink:#e8ecf3;
  --ink-2:#b8c0cc;
  --ink-3:#7a8090;
  --ink-4:#525968;
  --accent:#83e08c;
  --accent-d:#3a8a44;
  --info:#7ab8ff;
  --warn:#f7b955;
  --bad:#ff7a7a;

  position:absolute;inset:0;background:var(--bg);color:var(--ink);
  font-family:"Geist","Noto Sans SC",sans-serif;font-size:13px;line-height:1.5;
  -webkit-font-smoothing:antialiased;letter-spacing:-.005em;
  overflow:hidden;
}
.dir-b *{box-sizing:border-box}
.dir-b .mono{font-family:"Geist Mono",ui-monospace,monospace;font-variant-numeric:tabular-nums}

/* nav */
.dir-b .b-nav{display:flex;align-items:center;justify-content:space-between;padding:14px 24px;border-bottom:1px solid var(--line);background:var(--bg)}
.dir-b .b-logo{display:flex;align-items:center;gap:10px;font-weight:600;font-size:13px}
.dir-b .b-logo .mark{width:24px;height:24px;border-radius:6px;background:var(--accent);color:#0a0d12;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700}
.dir-b .b-nav-links{display:flex;gap:24px;font-size:12.5px;color:var(--ink-2);font-weight:500}
.dir-b .b-nav-links a{color:inherit;text-decoration:none;display:flex;align-items:center;gap:4px}
.dir-b .b-nav-links a.active{color:var(--accent)}
.dir-b .b-right{display:flex;align-items:center;gap:10px;font-size:12px;color:var(--ink-3)}
.dir-b .b-pill{padding:5px 10px;border:1px solid var(--line-2);border-radius:6px;font-size:11px;color:var(--ink-2);display:flex;align-items:center;gap:6px}
.dir-b .b-pill .pulse{width:6px;height:6px;background:var(--accent);border-radius:50%;box-shadow:0 0 6px var(--accent)}
.dir-b .b-cta{padding:6px 14px;background:var(--accent);color:#0a0d12;border-radius:6px;border:0;font-size:12.5px;font-weight:600;cursor:pointer}
.dir-b .b-cta.ghost{background:transparent;color:var(--ink);border:1px solid var(--line-2)}

/* hero */
.dir-b .b-hero{display:grid;grid-template-columns:1.05fr 1fr;gap:32px;padding:42px 36px 24px;align-items:start}
.dir-b .b-h1{font-family:"Geist",sans-serif;font-size:60px;line-height:1.02;letter-spacing:-.03em;margin:0;font-weight:600;color:var(--ink)}
.dir-b .b-h1 .hl{color:var(--accent);font-feature-settings:"ss01"}
.dir-b .b-h1 .small{display:block;font-size:14px;line-height:1.5;font-weight:400;color:var(--ink-3);letter-spacing:0;margin-top:18px;max-width:48ch}
.dir-b .b-tag-row{display:flex;gap:8px;margin-bottom:18px}
.dir-b .b-tag{font-family:"Geist Mono",monospace;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);padding:4px 8px;border:1px solid var(--line);border-radius:4px}
.dir-b .b-tag.live{color:var(--accent);border-color:var(--accent-d)}
.dir-b .b-tag.live::before{content:"";display:inline-block;width:6px;height:6px;background:var(--accent);border-radius:50%;margin-right:6px;box-shadow:0 0 6px var(--accent);vertical-align:middle}

.dir-b .b-hero-cta{display:flex;gap:10px;margin-top:24px}
.dir-b .b-hero-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin-top:30px;border-top:1px solid var(--line);padding-top:20px}
.dir-b .b-hero-stats .stat{padding:0 18px;border-right:1px solid var(--line)}
.dir-b .b-hero-stats .stat:first-child{padding-left:0}
.dir-b .b-hero-stats .stat:last-child{border-right:0}
.dir-b .b-hero-stats .v{font-size:28px;font-weight:600;color:var(--ink);letter-spacing:-.02em;line-height:1;font-family:"Geist Mono",monospace}
.dir-b .b-hero-stats .v .acc{color:var(--accent);font-size:14px;margin-left:4px}
.dir-b .b-hero-stats .l{font-size:11px;color:var(--ink-3);margin-top:6px;letter-spacing:.04em}

/* dashboard preview card on the right */
.dir-b .b-dash{background:var(--surface);border:1px solid var(--line-2);border-radius:10px;padding:18px;position:relative}
.dir-b .b-dash::before{content:"";position:absolute;top:-1px;left:24px;right:24px;height:1px;background:linear-gradient(90deg,transparent,var(--accent),transparent);opacity:.6}
.dir-b .b-dash .dash-hd{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px}
.dir-b .b-dash .dash-hd h3{margin:0;font-size:12px;font-weight:600;letter-spacing:.04em;color:var(--ink-2)}
.dir-b .b-dash .dash-hd .when{font-size:10px;color:var(--ink-3);font-family:"Geist Mono",monospace}

/* funnel */
.dir-b .funnel{display:flex;flex-direction:column;gap:6px}
.dir-b .funnel .row{display:grid;grid-template-columns:90px 1fr 70px 50px;gap:10px;align-items:center;font-size:12px}
.dir-b .funnel .stage{color:var(--ink-2)}
.dir-b .funnel .bar{height:24px;background:var(--bg-2);border-radius:3px;position:relative;overflow:hidden;border:1px solid var(--line)}
.dir-b .funnel .bar i{display:block;height:100%;background:var(--surface-2);position:relative}
.dir-b .funnel .bar i::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(131,224,140,0) 0%,rgba(131,224,140,.25) 100%)}
.dir-b .funnel .count{font-family:"Geist Mono",monospace;color:var(--ink);font-weight:600;text-align:right}
.dir-b .funnel .delta{font-family:"Geist Mono",monospace;font-size:11px;text-align:right}
.dir-b .funnel .delta.up{color:var(--accent)}
.dir-b .funnel .delta.flat{color:var(--ink-3)}

/* mini chart */
.dir-b .mini-chart{display:flex;align-items:flex-end;height:60px;gap:3px;margin-top:14px;border-bottom:1px solid var(--line);padding-bottom:6px}
.dir-b .mini-chart i{flex:1;background:var(--surface-2);border-radius:2px 2px 0 0;position:relative}
.dir-b .mini-chart i.hi{background:var(--accent)}

/* feature strip */
.dir-b .b-features{display:grid;grid-template-columns:repeat(4,1fr);gap:0;padding:0 36px 28px;border-top:1px solid var(--line);padding-top:24px;margin-top:8px}
.dir-b .b-feat{padding:18px 22px;border-right:1px solid var(--line);display:flex;flex-direction:column;gap:8px}
.dir-b .b-feat:first-child{padding-left:0}
.dir-b .b-feat:last-child{border-right:0;padding-right:0}
.dir-b .b-feat .ic{color:var(--accent);width:24px;height:24px}
.dir-b .b-feat .name{font-size:13px;font-weight:600;display:flex;align-items:baseline;gap:6px}
.dir-b .b-feat .name .en{font-family:"Geist Mono",monospace;font-size:10px;letter-spacing:.06em;color:var(--ink-3);font-weight:400}
.dir-b .b-feat .desc{font-size:11.5px;color:var(--ink-3);line-height:1.5}

/* product screen styles */
.dir-b .pb{display:grid;grid-template-columns:64px 1fr;height:100%}
.dir-b .pb-rail{background:var(--bg-2);border-right:1px solid var(--line);display:flex;flex-direction:column;align-items:center;padding:16px 0;gap:6px}
.dir-b .pb-rail .logo-sm{width:32px;height:32px;border-radius:8px;background:var(--accent);color:#0a0d12;display:flex;align-items:center;justify-content:center;font-weight:700;margin-bottom:14px}
.dir-b .pb-rail .ri{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--ink-3);cursor:pointer}
.dir-b .pb-rail .ri:hover{background:var(--surface)}
.dir-b .pb-rail .ri.active{background:var(--surface-2);color:var(--accent)}
.dir-b .pb-rail .sep{height:1px;width:24px;background:var(--line);margin:8px 0}

.dir-b .pb-main{padding:18px 24px;overflow:hidden}
.dir-b .pb-bread{font-family:"Geist Mono",monospace;font-size:11px;color:var(--ink-3);margin-bottom:14px;letter-spacing:.04em}
.dir-b .pb-bread b{color:var(--ink)}

.dir-b .pb-h{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid var(--line)}
.dir-b .pb-h h1{margin:0;font-size:26px;font-weight:600;letter-spacing:-.02em}
.dir-b .pb-h .sub{margin-top:4px;font-size:12px;color:var(--ink-3)}
.dir-b .pb-h .pb-actions{display:flex;gap:8px}

/* salary explorer table */
.dir-b .pb-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;height:calc(100% - 100px)}
.dir-b .pb-panel{background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:16px;overflow:hidden}
.dir-b .pb-panel h3{margin:0 0 10px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);font-weight:600;display:flex;justify-content:space-between;align-items:baseline}
.dir-b .pb-panel h3 .meta{font-family:"Geist Mono",monospace;color:var(--ink-4);font-weight:400;font-size:10px}

/* salary distribution */
.dir-b .salary-headline{display:flex;align-items:baseline;gap:8px;margin-bottom:8px}
.dir-b .salary-headline .n{font-family:"Geist Mono",monospace;font-size:38px;font-weight:600;color:var(--accent);letter-spacing:-.02em;line-height:1}
.dir-b .salary-headline .unit{font-size:14px;color:var(--ink-3)}
.dir-b .salary-sub{font-size:11px;color:var(--ink-3);margin-bottom:14px}

.dir-b .dist{height:80px;display:flex;align-items:flex-end;gap:2px;border-bottom:1px solid var(--line)}
.dir-b .dist i{flex:1;background:var(--surface-2);border-radius:2px 2px 0 0}
.dir-b .dist i.peak{background:var(--accent)}
.dir-b .dist-ax{display:flex;justify-content:space-between;margin-top:4px;font-family:"Geist Mono",monospace;font-size:10px;color:var(--ink-4)}

.dir-b .pb-offers{width:100%;border-collapse:collapse;font-size:12px}
.dir-b .pb-offers th,.dir-b .pb-offers td{padding:8px 8px;text-align:left;border-bottom:1px solid var(--line)}
.dir-b .pb-offers th{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);font-weight:500}
.dir-b .pb-offers td{color:var(--ink-2);font-family:"Geist Mono",monospace}
.dir-b .pb-offers td.co{font-family:"Geist",sans-serif;color:var(--ink);font-weight:500}
.dir-b .pb-offers td.total{color:var(--accent);font-weight:600}
.dir-b .pb-offers tr.hi td{background:rgba(131,224,140,.06)}

.dir-b .filter-row{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap}
.dir-b .filter{font-family:"Geist Mono",monospace;font-size:11px;padding:4px 10px;border:1px solid var(--line);background:var(--bg-2);color:var(--ink-2);border-radius:4px;display:flex;align-items:center;gap:6px}
.dir-b .filter.on{border-color:var(--accent-d);color:var(--accent);background:rgba(131,224,140,.08)}

/* benchmark card */
.dir-b .benchmark{display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin-top:14px;padding-top:14px;border-top:1px solid var(--line)}
.dir-b .benchmark .b-cell{padding:0 14px;border-right:1px solid var(--line)}
.dir-b .benchmark .b-cell:first-child{padding-left:0}
.dir-b .benchmark .b-cell:last-child{border-right:0;padding-right:0}
.dir-b .benchmark .v{font-family:"Geist Mono",monospace;font-size:20px;color:var(--ink);font-weight:600}
.dir-b .benchmark .v .up{color:var(--accent);font-size:11px;margin-left:6px}
.dir-b .benchmark .l{font-size:10px;color:var(--ink-3);margin-top:4px;letter-spacing:.04em}
`;

// ─── B. Landing ─────────────────────────────────────────────────────────
const B_Landing = () => {
  const chartBars = [42,38,48,52,49,55,61,58,65,72,68,76,82,79,88];
  return (
    <div className="dir-b">
      <style>{DIR_B_CSS}</style>

      <div className="b-nav">
        <div style={{display:"flex",alignItems:"center",gap:32}}>
          <div className="b-logo"><span className="mark">{"⌖"}</span><span>Cockpit</span></div>
          <div className="b-nav-links">
            <a className="active">仪表盘</a><a>岗位库</a><a>薪资</a><a>题库</a><a>简历</a><a>文档</a>
          </div>
        </div>
        <div className="b-right">
          <span className="b-pill"><span className="pulse"></span><span>市场 · 活跃</span></span>
          <span className="b-pill mono">EN / 中</span>
          <button className="b-cta ghost">登录</button>
          <button className="b-cta">开始追踪</button>
        </div>
      </div>

      <div className="b-hero">
        <div>
          <div className="b-tag-row">
            <span className="b-tag">v 4.2 · 2026 春招版</span>
            <span className="b-tag live">实时</span>
            <span className="b-tag">FOR 校招 / GRAD</span>
          </div>
          <h1 className="b-h1">
            把秋招当成<br/>
            一个<span className="hl">数据项目</span>来做。
            <span className="small">不要凭感觉投简历。把你的求职 funnel 可视化 —— 投递、笔试、面试、Offer 每一层的通过率，对比同校同届的基准。看清楚瓶颈在哪一层，再去针对性发力。</span>
          </h1>
          <div className="b-hero-cta">
            <button className="b-cta" style={{padding:"10px 18px"}}>启动我的驾驶舱 →</button>
            <button className="b-cta ghost" style={{padding:"10px 18px"}}>查看公开样本</button>
          </div>
          <div className="b-hero-stats">
            <div className="stat">
              <div className="v">12,408 <span className="acc">↑ 8%</span></div>
              <div className="l">校招用户 / 周</div>
            </div>
            <div className="stat">
              <div className="v">3,802</div>
              <div className="l">活跃岗位 · 24h</div>
            </div>
            <div className="stat">
              <div className="v">¥38.4k <span className="acc">↑ 4%</span></div>
              <div className="l">前端校招中位</div>
            </div>
          </div>
        </div>

        <div className="b-dash">
          <div className="dash-hd">
            <h3>YOUR PIPELINE · 求职 funnel</h3>
            <span className="when">UPDATED 14:22 CST</span>
          </div>
          <div className="funnel">
            {window.FUNNEL.map((f,i)=>{
              const max = window.FUNNEL[0].count;
              const delta = f.count - f.last;
              return (
                <div key={f.stage} className="row">
                  <span className="stage">{f.stage}</span>
                  <div className="bar"><i style={{width:(f.count/max*100)+"%",background:i===5?"var(--accent)":undefined}}></i></div>
                  <span className="count">{f.count}</span>
                  <span className={"delta " + (delta>0?"up":"flat")}>
                    {delta>0?`+${delta}`:delta===0?"—":delta}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mini-chart">
            {chartBars.map((v,i)=>(
              <i key={i} style={{height:v+"%"}} className={i===chartBars.length-1?"hi":""}></i>
            ))}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontFamily:"Geist Mono",fontSize:10,color:"var(--ink-4)",marginTop:6,letterSpacing:".04em"}}>
            <span>5月09 周</span>
            <span>每周新增投递</span>
            <span>本周 · 11</span>
          </div>

          <div className="benchmark">
            <div className="b-cell"><div className="v">61%</div><div className="l">投递→笔试 通过率</div></div>
            <div className="b-cell"><div className="v">54%<span className="up">↑ 12%</span></div><div className="l">笔试→面试 通过率</div></div>
            <div className="b-cell"><div className="v">P 73</div><div className="l">同校同届排名</div></div>
          </div>
        </div>
      </div>

      <div className="b-features">
        <div className="b-feat">
          <div className="ic">{window.IK.chart}</div>
          <div className="name">求职 Funnel<span className="en">PIPELINE</span></div>
          <div className="desc">每一层投递→面试→offer 的转化率，找瓶颈。</div>
        </div>
        <div className="b-feat">
          <div className="ic">{window.IK.money}</div>
          <div className="name">薪资雷达<span className="en">SALARY</span></div>
          <div className="desc">校招 Offer 数据库 · 同岗对比 · 谈判区间。</div>
        </div>
        <div className="b-feat">
          <div className="ic">{window.IK.doc}</div>
          <div className="name">JD 匹配<span className="en">MATCH</span></div>
          <div className="desc">关键词命中率 + 量化成果检测 + 改写建议。</div>
        </div>
        <div className="b-feat">
          <div className="ic">{window.IK.mic}</div>
          <div className="name">模拟面试<span className="en">MOCK IV</span></div>
          <div className="desc">岗位定制题 · 评分卡 · 复盘转写。</div>
        </div>
      </div>
    </div>
  );
};

// ─── B. Product — Salary Lab ────────────────────────────────────────────
const B_Product = () => {
  const dist = [4,8,12,18,24,30,38,42,48,52,55,58,54,46,38,28,18,12,8,5];
  return (
    <div className="dir-b">
      <style>{DIR_B_CSS}</style>
      <div className="pb">
        <div className="pb-rail">
          <div className="logo-sm">⌖</div>
          <div className="ri">{window.IK.chart}</div>
          <div className="ri active">{window.IK.money}</div>
          <div className="ri">{window.IK.doc}</div>
          <div className="ri">{window.IK.mic}</div>
          <div className="ri">{window.IK.brief}</div>
          <div className="sep"></div>
          <div className="ri">{window.IK.search}</div>
          <div className="ri">{window.IK.bell}</div>
        </div>

        <div className="pb-main">
          <div className="pb-bread">驾驶舱 / <b>薪资雷达</b> / 前端工程师 · 校招</div>

          <div className="pb-h">
            <div>
              <h1>薪资雷达 — <span style={{color:"var(--accent)"}}>前端工程师 · 校招</span></h1>
              <div className="sub">基于 1,247 条 2024–2026 届真实 offer · 数据来源：用户上传 + 公开核实</div>
            </div>
            <div className="pb-actions">
              <button className="b-cta ghost" style={{display:"flex",alignItems:"center",gap:6}}>{window.IK.filter}<span>筛选</span></button>
              <button className="b-cta" style={{display:"flex",alignItems:"center",gap:6}}>{window.IK.plus}<span>提交我的 offer</span></button>
            </div>
          </div>

          <div className="filter-row">
            <span className="filter on">岗位：前端工程师</span>
            <span className="filter on">学历：本/硕 应届</span>
            <span className="filter">城市：所有 ▾</span>
            <span className="filter">公司类型：所有 ▾</span>
            <span className="filter">学校梯度：所有 ▾</span>
          </div>

          <div className="pb-grid">
            {/* left: distribution */}
            <div className="pb-panel">
              <h3>年包分布 <span className="meta">N = 1,247</span></h3>
              <div className="salary-headline">
                <span className="n">38.4</span>
                <span className="unit">k / 月 · 中位数</span>
              </div>
              <div className="salary-sub">P25 ¥28k · P50 ¥38k · P75 ¥48k · P90 ¥62k</div>

              <div className="dist">
                {dist.map((v,i)=>(
                  <i key={i} style={{height:v*1.4+"%"}} className={i===10?"peak":""}></i>
                ))}
              </div>
              <div className="dist-ax">
                <span>15k</span><span>25k</span><span>35k</span><span>45k</span><span>55k</span><span>65k+</span>
              </div>

              <div className="benchmark">
                <div className="b-cell"><div className="v">¥36.8k</div><div className="l">本科 中位</div></div>
                <div className="b-cell"><div className="v">¥42.5k<span className="up">↑ 16%</span></div><div className="l">硕士 中位</div></div>
                <div className="b-cell"><div className="v">¥58k+</div><div className="l">TOP 校 ≥ P90</div></div>
              </div>

              <div style={{marginTop:18,padding:"12px 14px",background:"var(--surface-2)",border:"1px solid var(--line)",borderRadius:6,fontSize:12,color:"var(--ink-2)",lineHeight:1.55}}>
                <span style={{fontFamily:"Geist Mono",fontSize:10,letterSpacing:".06em",color:"var(--accent)",display:"block",marginBottom:6}}>★ COCKPIT INSIGHT</span>
                你目前手里 <b style={{color:"var(--ink)"}}>¥36k</b> 的 offer 位于 <b style={{color:"var(--accent)"}}>P 47</b>。
                同校同届前端 <b style={{color:"var(--ink)"}}>72%</b> 拿到了更高数字 —— 还可以再等一周。
              </div>
            </div>

            {/* right: comparison table */}
            <div className="pb-panel">
              <h3>同岗对比 <span className="meta">5 条 · 已脱敏</span></h3>

              <table className="pb-offers">
                <thead>
                  <tr><th>公司</th><th>城市</th><th>月薪</th><th>奖金</th><th>股票</th><th>年包</th></tr>
                </thead>
                <tbody>
                  {window.MOCK_OFFERS.map((o,i)=>(
                    <tr key={i} className={i===0?"hi":""}>
                      <td className="co">{o.co}</td>
                      <td>{o.city}</td>
                      <td>{o.base}k</td>
                      <td>{o.bonus}k</td>
                      <td>{o.stock||"—"}</td>
                      <td className="total">{o.total}k</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{marginTop:18}}>
                <h3 style={{marginBottom:8}}>地区差异 <span className="meta">中位</span></h3>
                <div style={{display:"flex",flexDirection:"column",gap:6,fontSize:12}}>
                  {[
                    {c:"北京",  v:42,bar:88},
                    {c:"上海",  v:40,bar:84},
                    {c:"深圳",  v:38,bar:78},
                    {c:"杭州",  v:32,bar:64},
                    {c:"新加坡 (折算)",v:48,bar:100},
                    {c:"成都 / 武汉",v:24,bar:48},
                  ].map(r=>(
                    <div key={r.c} style={{display:"grid",gridTemplateColumns:"110px 1fr 60px",gap:10,alignItems:"center"}}>
                      <span style={{color:"var(--ink-2)"}}>{r.c}</span>
                      <div style={{height:14,background:"var(--bg-2)",borderRadius:2,border:"1px solid var(--line)",overflow:"hidden"}}>
                        <i style={{display:"block",height:"100%",width:r.bar+"%",background:r.c.includes("新加坡")?"var(--accent)":"var(--surface-2)",borderRight:"1px solid var(--line)"}}></i>
                      </div>
                      <span className="mono" style={{textAlign:"right",color:"var(--ink)"}}>¥{r.v}k</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { B_Landing, B_Product });
