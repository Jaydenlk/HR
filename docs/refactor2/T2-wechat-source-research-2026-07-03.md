# T2 微信公众号推文抓取技术选型调研报告

调研日期：2026-07-03。本报告所有关于"当前是否可用/是否已失效/是否仍在维护"的判断均已联网核实（非训练记忆），无法核实之处已逐条标注"**需进一步验证**"。

---

## 1. 一句话结论 + 推荐方案

**推荐方案：管理后台人工把关录入（运营每周粘贴重点推文链接/正文）+ GLM5.1 结构化解析，作为 T2 短期主力；极致了（dajiala.com）商业 API 作为公众号数量增长后的规模化补充，不作为首发必需项。**

理由从四个维度拆开看：

| 维度 | 人工把关+GLM5.1（推荐） | 开源自建爬虫（wewe-rss/we-mp-rss/搜狗系） | 商业 API（新榜/清博/极致了） |
|---|---|---|---|
| **合规性** | 最高：运营只看自己能公开访问的文章、手动复制，不触碰任何微信账号自动化行为，零 ToS 风险、零封号风险 | 中低：几乎全部方案都要绑定一个真实微信/微信读书账号做自动化操作，程度不同地踩在平台风控红线上（详见第2、3节） | 中高：数据源头仍是第三方厂商的抓取行为，只是风险外部化给了厂商；作为付费数据消费方不直接违规，但并非"零风险" |
| **稳定性** | 最高：不受微信风控策略变化影响，唯一变量是运营是否按时执行——这是可管理的流程问题，不是随时会"一夜团灭"的技术故障 | 最低：本次调研证实 wewe-rss（用户已在评估的方案）**仓库已于 2026-05-11 被作者归档、停止维护**；搜狗微信爬虫长期处于反爬军备竞赛；MITM 抓包类方案架构上不适合云端无人值守 | 中：商业公司有专职团队维护，但清博指数当前接口能力证据偏旧（2016年线索），需要重新核实；新榜/极致了公开文档相对可信 |
| **接入成本** | 最低：不新增任何抓取基础设施，直接复用 T2 已规划的 `wechat_dump` 上传通道和现有 GLM5.1 解析流水线，只需一个表单/上传入口 | 最高：Docker 部署 + 账号维护（扫码登录/cookie/代理池）+ 随时因上游变化（风控/仓库归档）推倒重来的隐性维护成本 | 中：标准 REST 对接，但仍需开发调用脚本、处理计费额度、字段清洗；极致了不支持原生批量查询，需应用层循环 |
| **产物形态匹配度** | 完全匹配：产出就是结构化 json，与 T2 设计文档里 `wechat_dump` 适配器"管理页上传工具导出文件(json/md/html)"的既定形态一致，无需额外适配 | 部分匹配：多数方案产出是 RSS/Atom feed 或数据库记录，需要额外写适配层转换成 T2 要的 json 结构 | 匹配：API 返回结构化 JSON，可编程落地为文件后走同一上传口子 |

**结论**：T2 的实际业务量级是"周更、几十条重点公众号推文"，不是"实时、全网抓取"。在这个量级下，任何自动抓取方案带来的工程复杂度和合规/稳定性风险，都换不来相应的收益——尤其是用户已经怀疑的 wewe-rss，本次调研证实它已经**停止维护（仓库归档）**，不建议再投入。人工把关方案零工程、零合规风险、且与现有设计天然对齐，应作为 T2 首发方案；如果未来重点公众号数量涨到人工覆盖不过来（比如超过 30-50 个号），可以引入极致了的按条付费正文 API 做半自动补充（仍由人工触发生成 json 文件，不做无人值守定时抓取），复用同一套 `wechat_dump` 解析逻辑。

---

## 2. wewe-rss 专项评估

**它是什么**：[cooderl/wewe-rss](https://github.com/cooderl/wewe-rss) 是一个把微信公众号文章转成 RSS 的开源工具，MIT 协议，用户此前已知晓但怀疑"可能不合适"。

**技术原理**：不依赖公众号后台的素材库/草稿箱官方 API，而是依赖 **微信读书（WeRead）账号扫码登录**，用该账号的会话去调用微信读书自身对公众号"关注 + 读文章"的内部接口来抓取内容；关键请求还要经过一个**第三方中转服务 `weread.111965.xyz`** 转发（作者声称不留数据，但这是一个不受使用者控制的黑盒依赖）。社区里已经有人直接质疑这是"假开源"（核心逻辑绑定不可控的第三方转发）。
来源：[README](https://github.com/cooderl/wewe-rss)、[Issue #11「假开源吗」](https://github.com/cooderl/wewe-rss/issues/11)、[Issue #314](https://github.com/cooderl/wewe-rss/issues/314)

**产出形态**：支持 `.atom/.rss/.json` 三种格式导出 + OPML，也有 `/feeds/:feed` 接口，但不是真正意义上的开放 JSON API，也不支持直连数据库查询。订阅方式是提交该公众号任意一篇文章的分享链接，由后端解析出 `biz` 后自动关注，理论上可以指定任意公众号（不要求微信读书号事先关注过），但每个微信读书账号"稳定可关注"的公众号数量约 10 个左右，超出容易触发限流。
来源：[README](https://github.com/cooderl/wewe-rss)、[Issue #223](https://github.com/cooderl/wewe-rss/issues/223)

**部署复杂度**：官方提供 Docker 镜像，需要 MySQL 或 SQLite 数据库，且必须维持微信读书扫码登录态（登录时不能勾选"24小时自动退出"），**没有自动续期机制**，掉线需要人工重新扫码。
来源：[README](https://github.com/cooderl/wewe-rss)、[Issue #279](https://github.com/cooderl/wewe-rss/issues/279)、[Issue #417](https://github.com/cooderl/wewe-rss/issues/417)

**维护活跃度（关键发现）**：最新 release 是 **v2.6.1（2024-12-15）**，此后再无新版本；**仓库已于 2026-05-11 被作者归档（archived），变为只读，不再维护**。Issue 区长期存在"账号频繁失效需重新登录"（#417）、"扫码登录报错"（#279、#409）、"订阅更新失败问题汇总"（#223，长期滚动更新）等系统性问题，说明失效不是个例而是结构性问题。
来源：[Releases 页](https://github.com/cooderl/wewe-rss/releases)、仓库首页归档提示、上述 issue

**法律/ToS 风险**：未查到工商处罚或官方"违法"定性的实锤。社区反馈显示：单个微信读书号关注公众号数量/拉取频率超阈值会触发腾讯"封控"（临时限流/拉黑，通常 24 小时后自动解封或重启容器可清），**未查到"永久封号"的确凿案例——这一点需进一步验证**，不代表零风险，只是目前证据是"临时限流"而非"永久封号"。
来源：[Issue #223](https://github.com/cooderl/wewe-rss/issues/223)、[Issue #96](https://github.com/cooderl/wewe-rss/issues/96)

**为什么不适合 Coach**：核心链路完全绑定"个人微信读书账号扫码会话 + 不受控的第三方中转"，登录态会过期且无自动续期，抓取行为踩在平台限流红线上随时可能断更；更关键的是**项目本身已被作者归档、停止修复新问题**——这几条叠加意味着一旦线上出故障没人能接盘修复（还依赖别人转发的黑盒接口，自己排障空间很小）。对于"生产环境周更自动化"这种要求可预期、可维护的场景，这是硬伤，不是可以靠运维投入弥补的小问题。

**结论**：不建议采用。用户此前"觉得可能不合适"的直觉是对的，本次调研找到了确凿依据——仓库已归档停止维护，而不只是"依赖账号扫码登录"这一点。

---

## 3. 候选方案对比表

| 方案名 | 类型 | 产物形态 | 接入成本 | 合规性 | 失效风险 | 计费 | 参考 URL |
|---|---|---|---|---|---|---|---|
| **wewe-rss** | 开源自建（微信读书扫码代理） | RSS/Atom/JSON feed | 中（Docker+DB+需人工维持扫码登录） | 中低（绑定第三方黑盒中转+超额易触发限流） | **高（仓库已于2026-05-11归档，停止维护）** | 免费（自托管） | [github.com/cooderl/wewe-rss](https://github.com/cooderl/wewe-rss) |
| **we-mp-rss（rachelos）** | 开源自建（需拥有自己的公众号+mp后台fakeid接口越权查询他号） | Web管理台，可导出 Markdown/PDF/JSON | 中高（需注册运营自己的公众号+扫码/cookie鉴权） | 中（用自身认证公众号会话查询他人数据，配额约50次/号/天、300次/IP/天，属越权使用内部接口） | 中（当前三者里最活跃：v1.5.2/2026-04-16，3.7k star，但方法论本身踩红线，长期看有被官方针对的可能） | 免费（自托管） | [github.com/rachelos/we-mp-rss](https://github.com/rachelos/we-mp-rss) |
| **chyroc/WechatSogou** | 开源（基于搜狗微信接口） | Python库返回结构化数据 | 中（需验证码打码服务+IP代理池配合） | 中低（反爬对抗而非直接违反微信ToS） | 高（最后release为2018-05-05，实际已无人维护，搜狗接口持续变化） | 免费 | [github.com/chyroc/WechatSogou](https://github.com/chyroc/WechatSogou) |
| **striver-ing/wechat-spider** | 开源（mitmproxy中间人抓包） | 结构化数据 | 高（需真实微信号手机登录且与服务器同局域网触发抓包） | 中（依赖真实账号在线抓包，规模化易触发风控） | 中高（架构上不适合云端无人值守生产环境；最后维护时间**需进一步验证**） | 免费 | [github.com/striver-ing/wechat-spider](https://github.com/striver-ing/wechat-spider) |
| **qiye45/wechatDownload** | 开源（打开单篇文章链接自动捕获密钥后下载） | 本地文件（html/md等） | 中（本质是按需单篇下载，非批量自动巡检） | 中（单篇按需操作，风险相对较低） | 中（v4.6/2026-06-21发布，8.4k star活跃维护，但是否支持定时无人值守巡检**需进一步验证**） | 免费 | [github.com/qiye45/wechatDownload](https://github.com/qiye45/wechatDownload) |
| **搜狗微信直连爬虫（通用方案）** | 自建 | 结构化数据 | 高（需Cookie(SUV/SNUID)+验证码打码平台+代理IP池，约40次换一次Cookie） | 中低（持续的反爬军备竞赛） | 高 | 免费（代理/打码服务另计费） | 综合多方讨论，**需进一步验证**当前2026年具体限流阈值 |
| **RSSHub 微信路由（/wechat/mp、/wechat/sogou等）** | 开源（可自建实例） | RSS feed | 中（需自建实例，部分路由需额外token/cookie） | 中（转发第三方数据源，非直接抓微信） | 高（源码 `namespace.ts` 自述"公众号直接抓取困难"，只能提供间接方案；GitHub issue长期存在未解决的"无法抓取"报告） | 免费（自托管） | [DIYgod/RSSHub/lib/routes/wechat](https://github.com/DIYgod/RSSHub/tree/master/lib/routes/wechat) |
| **wechat2rss.xlab.app（开源组件ttttmr/Wechat2RSS）** | 第三方SaaS+可自建两种模式 | RSS feed | 低（托管模式）/中（自建模式） | 中（托管版仅覆盖平台预置的"免费公众号"列表，能否自由添加任意目标账号**需进一步验证**） | 中（2026-04仍有更新，判断在维护中） | 托管版免费（限额），自建免费 | [github.com/ttttmr/Wechat2RSS](https://github.com/ttttmr/Wechat2RSS) |
| **新榜 newrank.cn API** | 商业API | JSON（含正文，原生支持多账号批量传入） | 中（注册+申请Key+按官方文档对接） | 高（付费数据服务，抓取责任由厂商承担） | 低-中（商业产品持续维护） | 按内部虚拟币"u"计费，**RMB兑换汇率未在公开页面查到，需联系商务确认实际成本** | [api.newrank.cn/list](https://api.newrank.cn/list) |
| **清博指数 gsdata.cn API** | 商业API | JSON（据2016年官方GitHub线索含正文；当前后台是否保留同样接口**需进一步验证**） | 中（需注册开发者账号+签名对接，文档为JS渲染SPA，逐条核实较难） | 高（理论上同新榜） | 中（关键证据偏旧，当前状态待核实） | 无自助价目表，走商务报价（参考到的是政府采购整体服务合同价，非API单价，**需进一步验证**真实调用成本） | [databus.gsdata.cn](http://databus.gsdata.cn/)、[gsdata-qingbo/wechatAPI](https://github.com/gsdata-qingbo/wechatAPI) |
| **极致了 dajiala.com/jzl.com API** | 商业API | JSON（先拉历史发文列表，再逐条查正文；单次仅支持单公众号，需应用层循环实现"批量"） | 低-中（Apifox标准REST文档，按条付费即接即用） | 高（付费数据服务） | 低-中（文档公开、当前维护中） | 约0.02~0.06元/条，阶梯计价，无最低消费 | [Apifox文档](https://s.apifox.cn/apidoc/shared-410674f9-f451-4b4f-957a-5f54f243bc83/api-199746415) |
| **微小宝 wxb.com** | 商业SaaS（仅面向账号主自己） | 网页看板+客户端，无开放API | 不适用（已排除） | 不适用 | 不适用 | 无公开API | [wxb.com](https://www.wxb.com/) |
| **人工把关+GLM5.1结构化（推荐）** | 人工录入+AI解析 | 管理后台表单/上传的 json | 极低（复用现有GLM解析流水线，零新增抓取基础设施） | 最高（零自动抓取，零ToS风险，人工只看公开可访问文章） | 最低（不依赖任何微信风控策略变化，唯一变量是运营执行流程） | 零边际成本（仅运营人力，每周约15-30分钟） | 分析结论，非引用；相关旁证见第4/5节 |

---

## 4. 对 T2 的落地建议

### 4.1 wechat_dump 适配器输入格式

T2 设计文档（`docs/refactor2/T2-recruit-intel.md`）里 `wechat_dump` 源类型此前留了一个待定项："管理页上传工具导出文件(json/md/html均预留)，等用户给具体工具后按其真实输出格式对齐"。本次调研的结论是：**不需要再等一个具体的自动化抓取工具**，直接把这个上传口子对齐成"人工/半自动均可复用"的统一 json 结构即可：

- **输入方式**：不做定时读目录、也不接内部抓取 API，走"管理页文件上传/表单提交"——与 `sheet_file` 类型完全同构，只是内容来源换成人工整理或极致了 API 拉取脚本产出。这样实现上可以直接复用 T2 已有的上传解析框架，只新增一份 `wechat_dump` 专属的 json schema 校验。
- **两种落地路径共用同一入口**：
  1. **人工路径（首发主力）**：运营在管理页表单里粘贴重点推文链接或正文文本，前端/后端简单整理成下方 json 结构后提交；
  2. **半自动路径（规模化后再引入，非首发必需）**：接极致了 API 写一个小脚本，按公众号批量拉取"历史发文列表→逐条查正文"，落地为同样结构的 json 文件后手动/半自动上传（仍建议保留人工确认这一步，不做无人值守全自动入库，避免脏数据未经审核直接影响用户看到的月刊内容）。

### 4.2 示例 JSON 结构

```json
{
  "source_type": "wechat_dump",
  "account_name": "字节跳动招聘",
  "batch_note": "2026年7月第1周人工整理",
  "articles": [
    {
      "title": "2027届校园招聘正式开启，覆盖研发/产品/设计等50+岗位",
      "content": "文章正文纯文本，去除HTML标签和公众号排版噪音，仅保留可读文字内容……",
      "url": "https://mp.weixin.qq.com/s/xxxxxxxxxxxxxxxxxxxxxx",
      "publish_time": "2026-07-01T09:00:00+08:00",
      "author": "字节跳动招聘",
      "digest": "网申将于7月1日开启，截止8月31日，覆盖北京/上海/深圳/杭州"
    }
  ]
}
```

字段说明：

| 字段 | 是否必填 | 说明 |
|---|---|---|
| `account_name` | 必填 | 公众号名称，用于 `recruit_events` 的 `source_ref` 溯源和展示 |
| `title` | 必填 | 文章标题 |
| `content` | 必填 | 正文纯文本（去除公众号排版的图片/样式噪音），喂给 GLM5.1 做结构化抽取 |
| `url` | 必填 | 原文链接，供用户跳转，与 T2 设计文档"来源链接必须原样保留可跳转"的红线一致 |
| `publish_time` | 必填 | 发布时间（ISO 8601，含时区），用于排序和"过期自动隐藏"判断 |
| `author` | 选填 | 公众号署名（可能与 `account_name` 一致，也可能不同，保留原样） |
| `digest` | 选填 | 公众号自带摘要，可选传入辅助 GLM 解析，缺失不影响主流程 |

这个结构和 T2 设计文档里 `recruit_events` 实体所需的输入完全对齐——GLM5.1 解析时仍然遵守"字段缺失就 null，禁止推断补全日期/链接"的现有红线；`content` 缺失校验、去重键计算等复用现有 `sheet_file`/`sheet_link` 适配器已经建好的框架，不需要另起炉灶。

### 4.3 人工路径的可行性分析（分析，非引用）

未搜索到与"人工粘贴公众号推文 + LLM 结构化，替代自动抓取"完全对应的公开案例文章，但搜到两类邻近的、已被业界认可的设计模式可以佐证思路方向是合理的：

- **Human-in-the-loop + LLM extraction** 是数据抽取领域公认的模式，核心主张是人工负责判断/把关，AI 负责格式化和结构化，这与本方案同源：[Human-in-the-Loop, Human-on-the-Loop, and LLM-as-a-Judge](https://kili-technology.com/blog/human-in-the-loop-human-on-the-loop-and-llm-as-a-judge-for-validating-ai-outputs)、[SortSpoke Human-in-the-Loop AI](https://sortspoke.com/our-approach/human-in-the-loop-ai)
- **Newsletter/内容聚合领域** 普遍认可"人工精选链接 + AI 做摘要/格式化"优于纯自动抓取：[Using AI in Newsletter Content Curation](https://curatedletters.com/ai-in-newsletter-content-curation/)、[Cut Through The Noise: AI-Curated News Digests](https://marmelab.com/blog/2024/03/21/ai-curator.html)；Simon Willison 的博客也提到小规模一次性任务用复制粘贴虽显笨拙但完全可行：[LLM schemas](https://simonwillison.net/2025/Feb/28/llm-schemas/)

**以下是分析，非引用**：

- **够用性**：T2 是周更、聚焦"重点公众号"的场景，量级是几十条/周而非全网抓取，人工筛选完全覆盖，且人天然具备"是否公益/是否重点公司"的判断力，这是自动抓取做不到的。
- **成本**：自动抓取要承受反爬策略变化、代理/打码服务、账号维护等隐性且不可预测的成本；人工每周 15-30 分钟，边际成本趋近于零且可预测，总体拥有成本更低。
- **可靠性**：不依赖微信风控策略，不会"一夜之间抓取器全挂"（wewe-rss 归档就是活生生的例子）；唯一风险是运营是否按时执行，这是流程管理问题，比技术故障更容易兜底（可以设提醒、可以有人代班）。
- **合规性**：运营作为普通读者查看公开可访问的文章、手动复制，不触碰微信/微信读书的自动化接口，反爬和 ToS 风险接近于零；若结构化后对外展示的是"标题+跳转原链"而非全文转载，版权风险也更低（这点与 T2 设计文档"注明来源可跳转原文"的既定产品形态一致）。
- **局限性**：强依赖人工执行纪律；覆盖不到运营视野之外的长尾公众号；时效性取决于运营是否当周及时处理；扩展性弱——如果未来信息源扩大到几百个公众号，需要重新评估，届时可以引入极致了 API 做半自动补充（见 4.1 的半自动路径）。
- **结论**：对"周更、公益转载、聚焦重点号"这个场景，人工把关方案是务实、低风险、可以直接落地的候选方案，适合作为 T2 首发验证需求，再根据实际运营负担决定是否投入半自动化。

---

## 附：本报告关键信息来源汇总

- wewe-rss：[github.com/cooderl/wewe-rss](https://github.com/cooderl/wewe-rss)（含 Issues #11、#96、#223、#279、#314、#409、#417 及 Releases 页）
- we-mp-rss：[github.com/rachelos/we-mp-rss](https://github.com/rachelos/we-mp-rss)
- chyroc/WechatSogou：[github.com/chyroc/WechatSogou](https://github.com/chyroc/WechatSogou)
- striver-ing/wechat-spider：[github.com/striver-ing/wechat-spider](https://github.com/striver-ing/wechat-spider)
- qiye45/wechatDownload：[github.com/qiye45/wechatDownload](https://github.com/qiye45/wechatDownload)
- RSSHub 微信路由源码：[github.com/DIYgod/RSSHub/tree/master/lib/routes/wechat](https://github.com/DIYgod/RSSHub/tree/master/lib/routes/wechat)（含 Issues #3752、#14049、#15874）
- wechat2rss：[github.com/ttttmr/Wechat2RSS](https://github.com/ttttmr/Wechat2RSS)
- 新榜开放API：[api.newrank.cn/list](https://api.newrank.cn/list)
- 清博开放平台：[databus.gsdata.cn](http://databus.gsdata.cn/)、[github.com/gsdata-qingbo/wechatAPI](https://github.com/gsdata-qingbo/wechatAPI)
- 极致了API文档：[Apifox](https://s.apifox.cn/apidoc/shared-410674f9-f451-4b4f-957a-5f54f243bc83/api-199746415)
- 微小宝：[wxb.com](https://www.wxb.com/)
- Human-in-the-loop 相关：[Kili Technology](https://kili-technology.com/blog/human-in-the-loop-human-on-the-loop-and-llm-as-a-judge-for-validating-ai-outputs)、[SortSpoke](https://sortspoke.com/our-approach/human-in-the-loop-ai)、[Curated Letters](https://curatedletters.com/ai-in-newsletter-content-curation/)、[Marmelab](https://marmelab.com/blog/2024/03/21/ai-curator.html)、[Simon Willison](https://simonwillison.net/2025/Feb/28/llm-schemas/)

**未能核实/需要进一步验证的事项清单**（供后续如需深入时优先复核）：
1. 极致了/新榜的实际到手 RMB 单价（新榜 u 积分兑换汇率未公开）
2. 清博指数当前后台是否仍保留 2016 年 GitHub 线索里的正文抓取接口
3. wechat2rss 托管版是否可以自由添加任意目标公众号，还是仅限预置"免费列表"
4. striver-ing/wechat-spider 与 qiye45/wechatDownload 是否支持真正的定时无人值守巡检模式
5. wewe-rss 社区反馈里"临时限流"是否在极端情况下会升级为永久封号
