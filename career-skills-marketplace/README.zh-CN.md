# Career Skills Marketplace

**求职主理人 + 37 个可调用 skill 的半自动求职操作系统**，专为中国求职市场设计，运行于 Claude Code 环境。

---

## 这是什么

Career Skills Marketplace 是一套以 Claude Code 为运行时的 skill 插件集。你用自然语言描述求职需求，「求职主理人」（career-principal）识别意图、自动编排下游 skill，最终输出带置信度和来源引用的结构化建议。

系统不联网爬取实时数据，不生成简历中你没有的经历，不对知识图谱范围外的公司或岗位给出高置信判断。这是设计原则，不是局限。

---

## 适合谁

- **应届生校招**：不知道如何在 JD 海洋中判断自己是否匹配
- **在职社招**：需要精准改写简历表达，突出与目标岗位的关联性
- **跨赛道转行**：评估转行可行性，识别能力迁移路径
- **面试准备**：基于岗位 JD 和知识图谱准备行业背景知识
- **Offer 决策**：在多个 offer 之间做有据可查的对比分析

---

## 能做什么

### Layer 1：核心推理（6 个）

| Skill | 作用 |
|-------|------|
| `career-principal` | 求职主理人：识别意图，编排下游 skill，汇总输出 |
| `profile-builder` | 从你的简历或对话中提取结构化能力画像 |
| `jd-analyzer` | 解析职位描述为结构化字段，并标注风险信号 |
| `match-diagnosis` | 对比画像与 JD，输出多维匹配度评分 |
| `resume-tailor` | 基于 JD 重组简历表达，不编造经历 |
| `source-quality-auditor` | 评估信息来源的可信度和时效性 |

### Layer 2：求职执行（7 个）

| Skill | 作用 |
|-------|------|
| `opportunity-intelligence` | 分析岗位吸引力、公司健康度与时机窗口 |
| `application-strategist` | 制定岗位优先级、时间节点与投递路径 |
| `application-tracker` | 记录和管理多岗位投递状态与跟进提醒 |
| `daily-plan-generator` | 基于求职阶段和面试安排生成每日行动计划 |
| `networking-message-writer` | 生成向内推人或行业联系人发送的开场消息 |
| `referral-strategy` | 识别内推路径、优先级与接触时机 |
| `follow-up-message-writer` | 面试后或投递后的礼貌跟进文案生成 |

### Layer 3：面试（8 个）

| Skill | 作用 |
|-------|------|
| `interview-intelligence` | 汇总目标公司面试流程、高频题型与评委风格 |
| `mock-interviewer` | 基于岗位和公司风格进行互动式模拟面试 |
| `interview-debrief` | 分析面试表现，提炼改进点与下一步准备重点 |
| `question-bank-builder` | 为目标岗位和公司生成定制化面试题库 |
| `company-interview-playbook` | 提供特定公司的面试攻略、考察维度与通关建议 |
| `behavioral-story-builder` | 将个人经历结构化为 STAR 格式的行为面试素材 |
| `technical-interview-coach` | 针对技术岗位的编程、系统设计题目讲解与练习 |
| `case-interview-coach` | 咨询类 Case 题解题框架训练与反馈 |

### Layer 4：市场情报（8 个）

| Skill | 作用 |
|-------|------|
| `market-radar` | 扫描目标行业和岗位的招聘热度与趋势变化 |
| `xhs-interview-miner` | 从小红书提取近期真实面经和招聘信号 |
| `nowcoder-tech-miner` | 从牛客网提取技术岗面经与招聘行情 |
| `wechat-insight-reader` | 解析公众号文章和行业报告中的求职相关信号 |
| `salary-radar` | 基于岗位、城市、经验层级的薪资区间分析 |
| `offer-comparator` | 多维度对比多个 Offer 的薪资、成长、风险 |
| `company-risk-auditor` | 评估目标公司的财务健康、舆情与雇主风险信号 |
| `industry-trend-analyst` | 解读行业增长周期、政策影响与人才需求变化 |

### Layer 5：职业战略（8 个）

| Skill | 作用 |
|-------|------|
| `career-path-planner` | 基于能力画像和目标输出 3-5 年职业发展路径 |
| `role-transition-advisor` | 评估跨赛道转型的可行性、风险和最优路径 |
| `skill-gap-planner` | 识别当前能力与目标岗位的差距并量化优先级 |
| `learning-roadmap-builder` | 生成针对目标岗位的分阶段技能提升计划 |
| `personal-brand-builder` | 提炼差异化定位并指导领英/GitHub/简历的一致性表达 |
| `portfolio-project-advisor` | 建议适合目标岗位的实战项目选题与包装策略 |
| `graduate-school-vs-job-advisor` | 多维度分析继续深造与直接就业的利弊 |
| `city-industry-fit-advisor` | 基于目标行业分布和个人约束推荐最优就业城市 |

---

## 快速开始

这是一个 **Claude Code 插件**，一个「求职主理人」统一入口，手握 37 个 playbook 工具覆盖从匹配诊断到面试准备的完整流程。

**前提**：已安装 [Claude Code](https://docs.anthropic.com/claude-code)。

### 推荐：插件安装（两条命令）

```
/plugin marketplace add Jaydenlk/HR
/plugin install career-principal@career-skills
```

### 备选：clone 后脚本安装

```bash
# macOS / Linux
git clone https://github.com/Jaydenlk/HR
cd HR/career-skills-marketplace
bash install.sh
```

```powershell
# Windows
git clone https://github.com/Jaydenlk/HR
cd HR/career-skills-marketplace
.\install.ps1
```

安装完成后，在 Claude Code 对话框直接输入你的求职问题即可。

详细安装说明见 [docs/installation.md](docs/installation.md)。

---

## 使用示例

### 场景 1：应届生匹配字节后端岗位

> **你**：我是 CS 本科应届，有两段 Go 实习，投了字节飞书后端，帮我看看匹配度。
>
> **主理人**：好的，我会依次分析 JD、构建你的画像，然后输出匹配诊断。请把 JD 链接或文本发给我。
>
> ——（你粘贴 JD）——
>
> **主理人**：[match-diagnosis 结果] 核心技能匹配度 72%，主要差距在分布式系统设计经验。建议在简历中突出你实习中处理并发请求的具体数字。置信度：中（字节在知识图谱中有记录，JD 解析完整）。

### 场景 2：双非文科背景转产品

> **你**：我是双非学校中文系大三，想转互联网产品，现实吗？
>
> **主理人**：转行可行，但路径选择很重要。我来分析一下你当前画像与产品岗的能力要求差距。你有没有做过任何产品相关的项目或实习？

### 场景 3：运营岗小红书面经准备

> **你**：我在准备小红书内容运营的面试，帮我了解一下这个岗位和公司。
>
> **主理人**：小红书在我的知识图谱中有基础记录（数据截至知识图谱构建时，不保证当前状态）。我可以提供行业背景和岗位特征分析，但最新面经数据我没有——建议同步参考牛客、脉脉的近期帖子。

### 场景 4：Offer 北京 vs 上海对比

> **你**：我拿了两个 offer，北京一家 AI 独角兽 base 28k，上海一家外资银行 base 30k，怎么选？
>
> **主理人**：我来做一个结构化对比。薪资层面需要考虑两城生活成本差异，还有个人发展方向的权重。我会列出各维度的分析框架，但最终权重由你来打分。

---

## 知识图谱概览

知识图谱是系统做出有依据判断的基础，不在图谱中的内容系统会明确说明。

| 维度 | 规模 | 阶段 |
|------|------|------|
| 企业数据 | 600 家 | Tier 1 (50 深度) + Tier 2 (250 标准) + Tier 3 (300 轻量) |
| 岗位类别 | 12 个 | 30 子岗位 |
| 求职黑话术语 | 30 个 | — |
| 面试题型分类 | 8 类 | — |
| Offer 对比因子 | 15 个 | — |
| 城市行业适配映射 | 20 个 | — |
| 职业路径模板 | 10 条 | — |
| 市场数据来源 | 12 个 | — |

**12 个岗位类别**：技术研发、产品管理、运营、市场营销、人力资源与行政、数据与分析、设计、财务与金融、咨询与策略、管培生、销售与商务、内容与媒体。

**18 个求职术语**示例：泡池子、开奖、HC、base、背调、OD、外包、大小周、期权、股票期权、PUA、白名单、压薪、对赌、末位淘汰、返校日、SP offer、日常实习转暑期。

---

## 局限

- **不是 Web App**：需要 Claude Code 环境，不提供网页界面。
- **不联网**：市场情报类 skill（Layer 4）需要适配器注入实时数据，无适配器时系统降级并明确告知置信度不足。
- **知识图谱覆盖有限**：目前 600 家企业（50 Tier 1 深度画像 + 250 Tier 2 标准画像 + 300 Tier 3 轻量标注）。Tier 2/3 标注 `needs_verification: true`，数据持续补充中。冷门公司可能没有记录，系统会明确告知并降低置信度。
- **不编造事实**：当输入信息不足或置信度过低时，系统拒绝输出高置信判断，而非猜测。这是硬性约束，不可关闭。

---

## 贡献

欢迎贡献企业数据、岗位信息、评测用例或改进 skill 实现。请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

---

## 许可证

- 代码（skills/、install 脚本）：[MIT License](LICENSE)
- 知识数据（skills/_career-skills-shared/knowledge/）：[CC BY 4.0](LICENSE-KNOWLEDGE)
