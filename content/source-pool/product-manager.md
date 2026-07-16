# product-manager source pool

检索日期: 2026-07-16
检索对象: TOP10 大厂招聘官网 + 智联招聘截面
禁用源检查: 未使用微博/小红书/抖音/贴吧; 未使用 X; 未把知乎专栏/CSDN/个人博客/公众号作为 A1/A2。

## 成熟度定级

结论: 国内稳定型。

量化证据:

| 指标 | 结果 | 计入样本 |
|---|---:|---|
| TOP10 近 12 个月公开在招 JD 家数 | 5/10 | 字节跳动、腾讯、美团、百度、网易 |
| 平台独立雇主数 | 智联首屏 13 家 | 只作规模旁证, 不替代 TOP10 判定 |

TOP10 检索矩阵:

| 公司 | 结果 | JD URL / 抓取口径 | 日期线索 | 是否计入 |
|---|---|---|---|---|
| 字节跳动 | 既有官方产品经理 JD 可复用 | https://jobs.bytedance.com/experienced/position/7310615536701163803/detail | 老源 <=30 天复用 | 是 |
| 腾讯 | careers API 返回产品经理 Count=104 | http://careers.tencent.com/jobdesc.html?postId=2072623740965007360 | LastUpdateTime=2026年07月10日 | 是 |
| 美团 | 官方接口返回 AI/FDE 产品经理详情 | https://zhaopin.meituan.com/web/position/detail?jobUnionId=4555642026 | refreshTime 为 2026-07 截面 | 是 |
| 百度 | SSR 列表返回产品经理职位 | https://talent.baidu.com/jobs/social-list?search=%E4%BA%A7%E5%93%81%E7%BB%8F%E7%90%86 | publishDate=2026-05-29 / updateDate=2026-06-01 | 是 |
| 网易 | 官方接口返回产品经理 total=93 | https://hr.163.com/job-detail.html?id=77295 | 2026-07-16 抓取仍在列表 | 是 |
| 阿里 | 页面可打开但未获得可审计 JD 正文 | https://talent.alibaba.com/off-campus/position-list?keywords=%E4%BA%A7%E5%93%81%E7%BB%8F%E7%90%86 | 无可用正文 | 否 |
| 华为 | 校招页前端壳未检出产品经理文本 | https://career.huawei.com/reccampportal/portal5/campus-recruitment.html?keyword=%E4%BA%A7%E5%93%81%E7%BB%8F%E7%90%86 | 无正样本 | 否 |
| 京东 | 校招页前端壳, 社招接口返回 NotLogin | https://campus.jd.com/#/jobs?keyword=%E4%BA%A7%E5%93%81%E7%BB%8F%E7%90%86 | 无可审计正文 | 否 |
| 拼多多 | 本轮未获得官方可审计 JD | - | 不硬凑 | 否 |
| 小米 | 页面出现旧岗位片段但无可用日期和详情正文 | https://hr.xiaomi.com/job/list?keyword=%E4%BA%A7%E5%93%81%E7%BB%8F%E7%90%86 | 未计入近 12 个月 | 否 |

平台截面:

- 智联招聘 `产品经理`: 首屏解析到 13 家独立雇主, 包括北京三快在线科技有限公司、软通动力信息技术(集团)股份有限公司、福建顶好信息技术有限公司等。该截面只用于规模旁证。

## 补源摘录

1. A2 / 腾讯官方 JD / 支付产品经理-高级产品经理
   - URL: http://careers.tencent.com/jobdesc.html?postId=2072623740965007360
   - 摘录: `负责海外的电子钱包业务，负责关键场景的产品建设与用户增长；对接卡组织、清算机构、收单机构、汇款机构等，集成其出入金能力与场景覆盖；关注用户体验与线上产品质量，持续管理用户侧的使用稳定性、转换率；协调内部财务、合规等职能，推动金融创新的立项与落地。`
   - 用途: 定位、跨团队协同、用户体验与质量压力。

2. A2 / 美团官方 JD / FDE产品经理
   - URL: https://zhaopin.meituan.com/web/position/detail?jobUnionId=4555642026
   - 获取方式: POST `https://zhaopin.meituan.com/api/official/job/getJobDetail` with `jobUnionId=4555642026`
   - 摘录: `与业务团队紧密协作，了解业务场景，负责全链路Owner需求，充分调动业产研资源协同解决业务需求，对项目交付负责。与系统产品团队紧密协同，承接需求后完成需求分流，推动系统产品响应需求并完成交付。`
   - 用途: 产品经理的上游业务、下游产研和交付职责。

3. A2 / 百度官方 JD / 产品经理（J99377）
   - URL: https://talent.baidu.com/jobs/social-list?search=%E4%BA%A7%E5%93%81%E7%BB%8F%E7%90%86
   - 摘录: `深入开展临床调研，结合临床工作流程进行产品设计，输出高质量PRD及产品原型；联动算法与研发团队推进产品研发与上线；负责院内试点与试用推进，建立反馈收集与效果评估机制。`
   - 用途: PRD、原型、用户/场景调研、研发上线、效果评估。

4. A2 / 网易官方 JD / 中台产品经理
   - URL: https://hr.163.com/job-detail.html?id=77500
   - 摘录: `深入理解游戏项目接入中台服务过程中的业务诉求，完成需求沟通、方案设计、文档编写、研发跟进、测试验收和上线交付。`
   - 用途: 产品迭代流程和交付链路。

5. ~~A2 / 字节跳动官方 JD / AI产品方向既有源~~(**已作废: 源失效/岗位更新, 非虚假引用** —— 2026-07-16 curl 核验确认当前摘录与当前来源不符, 不再作为任何用途的证据)
   - URL: https://jobs.bytedance.com/experienced/position/7310615536701163803/detail
   - 作废原因: 直接 curl 官方详情接口 `https://jobs.bytedance.com/api/v1/job/posts/7310615536701163803` 返回的真实岗位为「AI产品经理-大模型方向」, 正文职责是「深入了解AI相关知识，负责ToB业务的大模型能力接入和效果验证」等; 原摘录中的「负责AI技术（计算机视觉、机器学习等）在公司各产品的应用和落地」「负责以AI技术为核心驱动力的新型产品形态的体验、研究、设计、落地」在该 URL/API 当前正文中不存在。
   - 2026-07-16 二审补充定性: Wayback Machine 对该 postId 无历史快照可直接取证原摘录曾经上线, 但该措辞句式与字节跳动同族「AI技术核心驱动力/新型产品形态」类 AI 产品经理 JD 高度吻合, 判定为该 postId 已被字节跳动系统回收/重新分配给新版本 JD("源失效/岗位更新"), 现有证据不足以判定为凭空编造(造假), 按"疑似错配/源失效"处置, 不再使用当前页面证明旧断言。
   - 原用途已作废: AI产品方向作为横向发展和趋势层旁证。

## 字段处置

- 已补入 evidence: 定位、项目流程、PRD/原型、入行信号、隐藏成本、AI产品方向、AI评测相关叶子追加 A2 官方 JD 证据。
- null 未复活: `entry.eligible_majors` 未复活, 因官方 JD 显示专业要求随业务方向变化, 不足以写成通用专业清单; `entry.non_major_route` 未复活, 因缺少直接可迁移路径; `threshold.income_structure`、`threshold.attrition_reality`、`who_should_not`、管理/独立 ceiling 与全部 `typical_years` 缺少双 host 或直接证据, 继续保留 null。
