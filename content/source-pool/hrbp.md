# hrbp source pool

检索日期: 2026-07-16
检索对象: TOP10 大厂招聘官网 + 智联招聘截面
禁用源检查: 未使用微博/小红书/抖音/贴吧; 未使用 X; 未把知乎专栏/CSDN/个人博客/公众号作为 A1/A2。

## 成熟度定级

结论: 国内初步规模型。

说明: 用户预判 HRBP 可能为国内稳定型, 但本轮严格按 §8.1 量化口径, 可审计 TOP10 官方正样本为 4 家, 未达到稳定型的 5 家门槛。由于 TOP10 为 3-4 家, 归入国内初步规模型; 现状层仍优先用国内大厂 JD, 但不把无法抓取的官网页面计入正样本。

量化证据:

| 指标 | 结果 | 计入样本 |
|---|---:|---|
| TOP10 近 12 个月公开在招 JD 家数 | 4/10 | 字节跳动、腾讯、美团、网易 |
| 平台独立雇主数 | 智联首屏 17 家 | 只作规模旁证 |

TOP10 检索矩阵:

| 公司 | 结果 | JD URL / 抓取口径 | 日期线索 | 是否计入 |
|---|---|---|---|---|
| ~~字节跳动~~ | **已作废(源失效/岗位更新,非造假): 2026-07-16 WebFetch 复核该 postId 当前 API/详情页返回「人力资源伙伴-人力与管理」正式社招 JD 正文,原摘录的「HRBP 实习方向」及实习生职责不在当前该 URL 正文中; 但同一段实习生摘录文字经第三方独立镜像(脉脉 2021-09-14 发布、复旦校友会、牛客网等)交叉核实为字节跳动 2021 年真实发布过的 HRBP 实习生 JD, Wayback Machine 对该 postId 无历史快照可直接取证, 但第三方镜像佐证原摘录并非凭空编造——结论: 该 postId 被字节跳动系统回收/重新分配给新岗位("源失效/岗位更新"), 原摘录曾经真实但当前页面已不再证明旧断言, 不构成虚假引用** | https://jobs.bytedance.com/experienced/position/7314979854024460595/detail | 2026-07-16 curl 核验作废, 2026-07-16 二审 WebFetch+Wayback+第三方镜像复核定性为源失效/岗位更新 | 否(作废) |
| 腾讯 | careers API 返回 HRBP Count=4 | http://careers.tencent.com/jobdesc.html?postId=2037452874962857984 | LastUpdateTime=2026年06月29日 | 是 |
| 美团 | 官方接口返回小象HRBP、门店HRBP | https://zhaopin.meituan.com/web/position/detail?jobUnionId=3438229663 | refreshTime 为 2026-07 截面 | 是 |
| 网易 | 官方接口返回 HRBP total=15 | https://hr.163.com/job-detail.html?id=72887 | 2026-07-16 抓取仍在列表 | 是 |
| 百度 | SSR 列表 `HRBP` 无岗位 | https://talent.baidu.com/jobs/social-list?search=HRBP | 无正样本 | 否 |
| 阿里 | 页面可打开但未获得可审计 JD 正文 | https://talent.alibaba.com/off-campus/position-list?keywords=HRBP | 无可用正文 | 否 |
| 华为 | 校招页前端壳未检出 HRBP 文本 | https://career.huawei.com/reccampportal/portal5/campus-recruitment.html?keyword=HRBP | 无正样本 | 否 |
| 京东 | 校招页前端壳, 社招接口返回 NotLogin | https://campus.jd.com/#/jobs?keyword=HRBP | 无可审计正文 | 否 |
| 拼多多 | 本轮未获得官方可审计 JD | - | 不硬凑 | 否 |
| 小米 | 页面未检出 HRBP 文本 | https://hr.xiaomi.com/job/list?keyword=HRBP | 无正样本 | 否 |

平台截面:

- 智联招聘 `HRBP`: 首屏解析到 17 家独立雇主, 包括中国平安人寿保险股份有限公司福建分公司、北京易才人力资源顾问有限公司、加多宝(中国)饮料有限公司、大瀚人力资源集团、日丰集团、科大讯飞股份有限公司等。该截面只用于规模旁证。

## 补源摘录

1. A2 / 腾讯官方 JD / CSIG HRBP
   - URL: http://careers.tencent.com/jobdesc.html?postId=2037452874962857984
   - 摘录: `深入了解所负责领域业务与人员发展状况，评估并明确组织与人才发展对HR的需求；驱动平台资源提供HR解决方案，并整合内部资源推动执行；协助管理层进行人才管理、团队发展、组织氛围建设等，确保公司文化在所属业务领域的落地。`
   - 用途: 定位、业务对接、组织与人才方案、落地执行。

2. A2 / 美团官方 JD / 小象HRBP
   - URL: https://zhaopin.meituan.com/web/position/detail?jobUnionId=3438229663
   - 获取方式: POST `https://zhaopin.meituan.com/api/official/job/getJobDetail` with `jobUnionId=3438229663`
   - 摘录: `深刻理解零售供应链业务逻辑，将业务战略解码为组织能力需求，关注团队健康度，主动识别并推动解决组织问题。通过人才盘点、人才发展、绩效激励等方式，关注人才。`
   - 用途: 业务理解、组织问题、人才盘点和绩效激励。

3. A2 / 美团官方 JD / 门店HRBP
   - URL: https://zhaopin.meituan.com/web/position/detail?jobUnionId=4545159296
   - 摘录: `负责前线业务的招聘计划设计与实施，合理配置人员；负责前线业务的员工培训、组织文化建设和推广落地；负责前线业务的员工关系和沟通，熟悉劳动法和地方性劳动法规；前线业务组织架构的搭建和人才梯队建设。`
   - 用途: 日常职责、员工关系、劳动法边界、组织架构和人才梯队。

4. A2 / 网易官方 JD / HRBP
   - URL: https://hr.163.com/job-detail.html?id=72887
   - 摘录: `为组织发展提供人力资源支持，定期进行组织盘点，在招聘、人才发展、绩效考核、员工关系等方面为对接部门提供有效的解决方案并实施；推动业务变革，负责完善业务部门人力资源的制度、流程、体系，提升人力资源运作效率。`
   - 用途: 组织盘点、招聘、绩效、员工关系、业务部门 HR 流程。

5. A2 / 网易官方 JD / 资深HRBP
   - URL: https://hr.163.com/job-detail.html?id=75451
   - 摘录: `深入理解部门业务和战略发展规划，对业务进行组织诊断，为业务部门的发展提供建议并参与实施；为业务发展提供人力资源专业支持，在人才盘点和培养、管理人员发展、团队建设等方面为部门提供有效的解决方案并落地。`
   - 用途: 发展层和管理上限旁证。

## 字段处置

- 已补入 evidence: 定位、日常流程、HR政策落地、业务部门实习信号、隐藏成本、管理上限、AI招聘/HR数据工具相关叶子追加 A2 官方 JD 证据。
- null 未复活: `operations.eval_metrics` 未复活, 因 JD 职责不足以形成可量化考核口径; `entry.eligible_majors` 未复活, 因官方 JD 多为学历/经验/模块能力, 不足以写成统一专业清单; `entry.campus_recruitment_signals` 未复活, 因本轮大厂样本多为社招; `threshold.income_structure`、独立路径、独立 ceiling 与全部 `typical_years` 缺少双 host 或直接证据, 继续保留 null。
