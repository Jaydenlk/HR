# Career Skills Marketplace — Design Audit & MVP Architecture

> 调研日期：2026-05-26
> 调研范围：50+ 本地文件、80+ 外部来源、27 个开源项目
> 状态：Phase 0 设计审计，不含业务代码

---

## 1. Executive Summary

### 这个 Marketplace 是什么

Career Skills Marketplace 是一个可部署的 **Claude Code Plugin**，以"求职主理人 + 可调用 skill + 共享证据层 + 中国求职知识图谱"的组合形态，为中国求职者提供半自动化的判断辅助系统。

用户通过 `npx skills add` 一键安装后，即可在 Claude Code 中使用求职主理人（Career Principal）对话式调度各 skill——JD 分析、简历改写、匹配诊断、画像构建、来源审计——每个判断都基于结构化证据，每个建议都标注置信度和来源。

**核心定义**：

```
Career Skills Marketplace = Career Principal 主理人
                          + Skills Registry (Anthropic SKILL.md 规范)
                          + Shared Evidence Layer (claim-level grounding)
                          + China Career Knowledge Graph (图结构知识底座)
                          + Optional Live Research Adapters (降级不崩溃)
```

### 它和 HRBP Web App 的关系

| 维度 | HRBP Web App | Career Skills Marketplace |
|------|-------------|--------------------------|
| 形态 | NestJS + Next.js 全栈 Web 应用 | Claude Code Plugin (SKILL.md) |
| 部署 | 需要 VPS/Docker/PostgreSQL | `npx skills add` 一步完成 |
| 用户 | 登录后使用 Web 界面 | Claude Code 对话即用 |
| 数据 | 存储在 PostgreSQL 数据库 | 本地文件 + evidence store |
| AI | CloudDreamAI 固定中转 | 完全可插拔（任意 provider） |

Marketplace 不是 HRBP 的复制，而是蒸馏——从 HRBP 的 17 个模块中提取 10 个适合 skill 化的能力，以 Anthropic 标准 skill 格式重新封装。具体蒸馏路径：

- **直接蒸馏**：简历解析、JD 解析、匹配分析、改写建议、面试复盘、求职信生成、职业路径分析（7 个纯 AI 推理模块）
- **接口解耦后蒸馏**：机会评估、每日任务、Coach 对话（3 个有平台依赖但核心逻辑可独立的模块）
- **不蒸馏**：EvidenceService 聚合层、薪资数据库、投递追踪、概览仪表盘（4 个纯平台功能）
- **可迁移纯函数**：`radar-helpers.ts` 中的 `normalizeQualityScore`、`isUsable`、`deriveQuarterFromPublishedAt` 等——零依赖，直接拷贝

### 它和普通 prompt pack 的区别

| 维度 | Prompt Pack | Career Skills Marketplace |
|------|------------|--------------------------|
| 结构 | 一组 prompt 文本 | 有 contract 的 skill 系统 |
| 证据 | 无 | 每个输出追溯到 source_url |
| 降级 | 无 | 数据不足时拒绝给高置信结论 |
| 测试 | 无 | 7 类测试用例 + eval 框架 |
| 知识 | 无 | 内置中国求职知识图谱 |
| 编排 | 用户手动切换 | 主理人自动调度 |

### 为什么适合开源

1. **蓝海**：27 个调研项目中，零项目同时覆盖中国市场 + evidence layer + skill marketplace 架构
2. **标准生态**：Anthropic SKILL.md 已成为事实标准（career-ops 40K stars、女娲 20.9K stars 验证了 skill 模式的市场需求）
3. **可插拔 AI**：不绑定任何 provider，任何人都能用自己的 API key 或本地 Ollama 运行
4. **知识壁垒**：中国求职知识图谱（公司分类、岗位 taxonomy、JD 黑话、来源分级）是真正的内容壁垒，开源反而加速社区贡献
5. **信任基础设施**：evidence layer 必须开源才有公信力——"你的简历建议基于什么"这个问题，闭源无法回答

### 第一版做到什么才算"上来就能用"

用户安装后，不配置任何外部服务，应立即可用的能力：

| 能力 | 不联网即可用 | 需要 AI API |
|------|------------|-----------|
| JD 结构化解析 | 知识图谱辅助字段识别 | 完整 AI 分析 |
| 简历改写 | - | 需要 AI |
| 匹配诊断 | - | 需要 AI |
| 用户画像 | - | 需要 AI |
| JD 黑话识别 | 知识图谱直接查表 | AI 增强分析 |
| 来源质量审查 | 来源分级策略直接查表 | AI 深度评估 |
| 面试准备框架 | 知识图谱提供结构 | AI 个性化 |
| 薪资实时对比 | - | 需要联网 adapter |

**最低可用标准**：配置一个 AI API key 后，6 个核心 skill 全部可用。知识图谱部分不依赖 AI 也能提供基础判断。

---

## 2. 产品形态

### 明确不是

- **不是 Web App**：没有 localhost:3000，没有登录页面，没有数据库
- **不是 Prompt 大全**：不是一堆文本模板，每个 skill 有 contract、schema、测试
- **不是简历模板库**：不提供排版模板，只做内容判断和改写
- **不是万能聊天机器人**：主理人有明确能力边界，超出范围会拒绝

### 而是

一个 **Claude Code Plugin**，遵循 Anthropic Agent Skills 规范：

- 用户通过 `npx skills add` 安装到 `~/.claude/skills/` 或 `.claude/skills/`
- 每个 skill 是一个 SKILL.md 文件 + references/ + examples/ + tests/
- Career Principal 是入口 skill，根据用户意图调度其他 skill
- 所有 skill 共享 Evidence Layer schema 和 Knowledge Graph

### 用户使用方式

安装后在 Claude Code 中直接对话：

```
用户: "帮我看看这个 JD 值不值得投"
主理人: → 调用 jd-analyzer 解析 JD
       → 调用 source-quality-auditor 评估 JD 来源
       → 查询知识图谱获取公司/岗位上下文
       → 综合输出：结构化分析 + 风险信号 + 置信度

用户: "帮我按这个岗位改简历"
主理人: → 调用 profile-builder 构建/更新画像
       → 调用 jd-analyzer 解析目标 JD
       → 调用 match-diagnosis 诊断匹配度
       → 调用 resume-tailor 生成改写建议
       → 每处修改标注 original/modified/reason/source

用户: "腾讯产品一面明天要面，怎么准备"
主理人: → 查询知识图谱：腾讯 → 产品岗 → 面试流程/常见考点
       → 调用 profile-builder 回顾用户画像
       → 输出：面试框架 + 可能考点 + 基于画像的 STAR 故事建议
       → 标注：knowledge_source: "china-career-graph/companies/tencent"

用户: "我拿了一个 offer，帮我判断值不值得接"
主理人: → 调用 jd-analyzer 解析 offer 对应 JD
       → 查询知识图谱：公司类型/薪资结构/行业对标
       → 调用 source-quality-auditor 评估 offer 信息完整性
       → 输出：多维评估 + 风险提醒 + 缺失信息清单
       → confidence: "medium"（因为缺少市场实时数据）

用户: "我想从文科转产品，路径现实吗"
主理人: → 调用 profile-builder 分析当前背景
       → 查询知识图谱：文科 → 产品 的转换路径/技能差距/案例
       → 输出：可行性评估 + 技能差距 + 建议路径
       → 诚实标注："此建议基于通用知识图谱，未结合实时市场数据"

用户: "帮我分析这家公司是不是坑"
主理人: → 调用 jd-analyzer 解析该公司 JD
       → 查询知识图谱：公司分类 + 风险信号模式
       → 调用 source-quality-auditor 评估可用信息来源
       → 输出：风险信号清单 + 来源质量 + 建议验证方向
       → 如果信息不足：明确说"当前信息不足以做出判断"

用户: "最近秋招我应该每天做什么"
主理人: → 查询知识图谱：当前日期 vs 秋招时间线
       → 调用 profile-builder 了解用户状态
       → 输出：阶段性任务建议 + 优先级 + 时间节点提醒
       → 知识来源：knowledge/china-career-graph/timelines/
```

---

## 3. 开箱即用标准

### 3.1 最小部署命令

```bash
npx skills add career-skills-marketplace
```

一步完成。安装到 `~/.claude/skills/career-skills-marketplace/`。

如果用户想项目级安装：
```bash
cd my-project
npx skills add career-skills-marketplace --local
# 安装到 .claude/skills/career-skills-marketplace/
```

### 3.2 安装后自动做什么

安装命令执行后，Marketplace 在首次被 Claude Code 加载时自动：

1. **检查 AI Provider 配置**：扫描环境变量和 Claude Code 设置，检测可用的 AI backend
2. **初始化 evidence store**：在 skill 目录下创建 `evidence-store/user/` 目录
3. **加载 Knowledge Graph**：从 `knowledge/` 目录加载中国求职知识图谱到内存
4. **报告可用能力**：

```
Career Skills Marketplace 已加载
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

核心 Skills:
  ● career-principal     ✅ 可用
  ● profile-builder      ✅ 可用
  ● jd-analyzer          ✅ 可用
  ● resume-tailor        ✅ 可用
  ● match-diagnosis      ✅ 可用
  ● source-quality-auditor ✅ 可用

Knowledge Graph:
  ● 公司分类 (5 类)      ✅ 已加载
  ● 岗位 Taxonomy (7 大类) ✅ 已加载
  ● JD 黑话 (12 条)      ✅ 已加载
  ● 来源分级 (4 级)      ✅ 已加载
  ● 校招时间线           ✅ 已加载

联网增强:
  ● Web Search           ⚠️ 未配置（可选）
  ● XHS Adapter          ❌ 未安装（可选）
  ● 公众号 Adapter       ❌ 未安装（可选）

输入 "帮我分析一个 JD" 开始使用
```

**不做的事情**：
- 不删除用户数据
- 不 kill 进程
- 不修改系统配置
- 不要求必须配置外部服务才能启动

### 3.3 无外部数据时怎么工作

**必须可用（仅依赖 AI + 知识图谱）**：

| 功能 | 依赖 | 无外部数据时的表现 |
|------|------|------------------|
| JD 分析 | AI + 知识图谱 | 完整可用：解析 JD 字段、识别黑话、标注风险信号 |
| 简历改写 | AI | 完整可用：基于用户提供的简历和 JD 改写 |
| 匹配诊断 | AI | 完整可用：基于用户画像和 JD 做多维匹配 |
| 用户画像 | AI | 完整可用：从简历/对话中提取结构化画像 |
| 来源质量审查 | 知识图谱 + AI | 完整可用：基于来源分级策略评估 |
| 面试准备框架 | 知识图谱 + AI | 完整可用：知识图谱提供结构，AI 个性化 |

**必须诚实降级（依赖外部实时数据）**：

| 功能 | 缺少什么 | 降级行为 |
|------|---------|---------|
| 薪资实时对比 | salary adapter | "当前无实时薪资数据。基于知识图谱的历史范围仅供参考，请自行核实。" |
| XHS 面经 | XHS adapter | "小红书面经未接入。建议手动搜索并粘贴相关面经内容。" |
| 公众号深度文章 | WeChat adapter | "公众号未接入。建议手动查阅相关公众号。" |
| 最新市场趋势 | Web Search | "无法获取实时市场信息。以下判断基于知识图谱中的历史数据。" |
| Offer 市场验证 | 多个 adapter | "无法做实时市场验证。建议通过牛客/脉脉交叉核实。" |

**降级时绝不做的事**：
- 不假装联网了
- 不编造市场数据
- 不把历史数据当成当前趋势
- 不隐藏"降级"事实

---

## 4. MVP 范围

### 第一版只做 6 个核心 Skill

| # | Skill | 一句话说明 |
|---|-------|----------|
| 1 | `career-principal` | 求职主理人：理解意图、调度 skill、追问信息、汇总结果 |
| 2 | `profile-builder` | 用户画像构建：从简历/对话中提取结构化能力画像 |
| 3 | `jd-analyzer` | JD 分析：解析职位描述为结构化字段 + 风险信号 + 黑话识别 |
| 4 | `resume-tailor` | 简历改写：基于 JD 重组简历表达，不编造经历 |
| 5 | `match-diagnosis` | 匹配诊断：对比画像和 JD，输出多维匹配度 + 差距分析 |
| 6 | `source-quality-auditor` | 来源质量审计：评估信息来源的可信度和时效性 |

### 为什么是这 6 个

**构成最短求职闭环**：
```
用户有简历 + 目标 JD
  → profile-builder 构建画像
  → jd-analyzer 解析 JD
  → match-diagnosis 诊断匹配
  → resume-tailor 改写简历
  → source-quality-auditor 审计全程证据
  → career-principal 编排并汇总
```

**不强依赖外部数据**：全部 6 个 skill 只需用户输入（简历 + JD）+ AI API 即可工作。知识图谱增强但不是前提。

**覆盖高频场景**：调研显示 "JD 分析 + 简历改写 + 匹配诊断" 是 career-ops (40K stars) 和 ResumeAgent 等最高频使用的功能组合。

**是后续扩展的地基**：
```
Phase 2: interview-coach (面试教练) ← 依赖 profile-builder + jd-analyzer
Phase 2: offer-evaluator (Offer 评估) ← 依赖 match-diagnosis + knowledge graph
Phase 3: opportunity-radar (机会雷达) ← 依赖 jd-analyzer + source-quality-auditor
Phase 3: daily-planner (每日任务) ← 依赖 career-principal 编排
```

### 第一版明确不做

| 不做 | 原因 |
|------|------|
| 完整 Web UI | 产品形态是 Claude Code Plugin，不需要独立 UI |
| XHS 自动采集 | 需要 Playwright + cookie 登录，属于 optional adapter |
| 公众号采集 | 需要 Docker + 微信扫码，基础设施过重 |
| 完整薪资数据库 | 需要持续采集维护，属于 Phase 4+ |
| 投递看板 | 纯 CRUD 功能，不是 AI skill |
| 面试题库全量覆盖 | 数据量过大，属于 knowledge graph 的持续扩展 |
| 多用户 SaaS | Plugin 形态天然单用户 |
| 自动投递 | 道德争议大，调研显示 "spray-and-pray" 被招聘方反感 |

---

## 5. 总体架构

### 5.1 Career Principal（求职主理人）

**职责**：

1. 理解用户意图，映射到具体 skill 或 skill 组合
2. 判断信息是否充分，不足时追问
3. 按依赖关系编排 skill 调用链
4. 调用 source-quality-auditor 审计每步证据
5. 汇总多 skill 输出为结构化结论
6. 在证据不足时停止结论，输出 "insufficient evidence" + 建议补充方向

**禁止**：

- 不得编造市场事实（如"腾讯今年裁员"——除非有来源）
- 不得假装联网（adapter 未配置时必须说明）
- 不得把所有问题交给一个通用 prompt（必须调用专门 skill）
- 不得没有证据就给 high confidence 建议
- 不得绕过 source-quality-auditor 直接输出市场判断

**调度规则**：

```yaml
intent_mapping:
  "分析 JD / 看看这个岗位": [jd-analyzer, source-quality-auditor]
  "改简历 / 优化简历": [profile-builder, jd-analyzer, match-diagnosis, resume-tailor]
  "匹配度 / 适不适合": [profile-builder, jd-analyzer, match-diagnosis]
  "公司怎么样 / 是不是坑": [jd-analyzer, source-quality-auditor, knowledge-graph-query]
  "面试准备": [profile-builder, jd-analyzer, knowledge-graph-query]
  "offer 值不值": [jd-analyzer, source-quality-auditor, knowledge-graph-query]
  "职业规划 / 转行": [profile-builder, knowledge-graph-query]
```

**追问策略**：

| 缺失信息 | 追问方式 |
|---------|---------|
| 无简历 | "请提供你的简历（粘贴文本或指定文件路径），我才能做个性化分析。" |
| 无 JD | "请粘贴目标职位的 JD，或告诉我公司名+岗位名。" |
| 目标不明确 | "你希望我帮你做什么？分析匹配度 / 改写简历 / 评估 offer？" |
| 来源模糊 | "这个信息来自哪里？（官方招聘页 / 脉脉 / 朋友说的？）" |

**失败策略**：

| 场景 | 行为 |
|------|------|
| AI API 不可用 | "AI 服务暂时不可用。知识图谱查询仍可工作，但个性化分析需要 AI。" |
| 某个 skill 调用失败 | 返回已完成步骤的结果，标注失败步骤，不编造 |
| 证据不足以做判断 | "当前证据不足，我不能给高置信结论。建议继续补充：[具体清单]" |
| 问题超出范围 | "这个问题超出我的能力范围（求职判断），建议咨询 [具体方向]。" |

### 5.2 Skill Registry

每个 skill 遵循 Anthropic Agent Skills 规范的 SKILL.md 格式，加上 Career Skills Marketplace 专属扩展：

**标准 Anthropic 字段**（在 SKILL.md frontmatter 中）：

```yaml
---
name: jd-analyzer
description: >
  JD 结构化分析。当用户粘贴职位描述、问"这个 JD 怎么样"、
  "值不值得投"、"岗位要求是什么"时触发。
allowed-tools:
  - Read
  - Grep
  - Glob
---
```

**Career Skills 扩展字段**（在 SKILL.md body 或 contract.yaml 中）：

```yaml
# contract.yaml — Skill 契约
name: jd-analyzer
version: "1.0.0"
purpose: "解析 JD 为结构化字段，识别显性/隐性要求和风险信号"

when_to_use:
  - 用户粘贴了 JD 文本
  - 用户提到具体公司+岗位
  - career-principal 编排链中需要 JD 解析

when_not_to_use:
  - 用户只是闲聊不涉及具体岗位
  - 输入不是 JD（如新闻、合同）

inputs_required:
  jd_text:
    type: string
    min_length: 50
    description: "JD 原文"

optional_context:
  user_profile:
    type: object
    description: "用户画像 JSON，用于个性化分析"
  market_context:
    type: string
    description: "市场上下文（来自 knowledge graph）"

evidence_required:
  - 输出中的每个字段必须可追溯到 JD 原文
  - 隐性要求必须标注推理依据
  - 风险信号必须标注识别规则来源

tools_allowed:
  - Read (读取 knowledge graph)
  - Grep (搜索 knowledge graph)

output_schema: "./output-schema.json"

confidence_policy:
  high: "JD 信息充分（≥200字），所有核心字段可提取"
  medium: "JD 信息部分缺失，部分字段为推断"
  low: "JD 极简（<100字），大部分字段为推断"
  insufficient: "输入不是 JD 或无法解析"

failure_modes:
  - input_not_jd: "输入不符合 JD 格式，返回错误"
  - too_short: "JD 过短，可提取字段有限，标注 confidence: low"
  - language_unsupported: "非中文/英文 JD，返回错误"

test_cases: "./tests/"
examples: "./examples/"
```

### 5.3 Shared Evidence Layer

所有 skill 共享统一的证据结构。设计源自 HRBP 的 `evidence.types.ts`，结合 Citevault 的 claim-level grounding 和 WorkProof Schema 的 artifact-based 验证：

```typescript
interface SkillEvidence {
  evidence_id: string;           // 唯一标识
  
  // 来源追溯
  source_type: 'user_resume' | 'user_input' | 'jd_text' | 'jd_url' |
               'knowledge_graph' | 'web_search' | 'xhs' | 'nowcoder' |
               'wechat' | 'ai_inference' | 'peer_review';
  source_name: string;           // 如 "用户简历.pdf"、"Boss直聘"
  source_url: string | null;     // 可追溯链接，无则 null
  content_excerpt: string;       // 原文摘录（≤500字）
  
  // 时效性
  observed_at: string;           // ISO 时间戳：何时观察到
  published_at: string | null;   // ISO 时间戳：原始发布时间
  freshness: 'current' | 'recent' | 'stale';
  // current: <7天, recent: 7-30天, stale: >30天
  // 继承自 HRBP Evidence Layer 的三级枚举
  
  // 可信度
  confidence: 'high' | 'medium' | 'low';
  // high: 官方来源/用户原始输入
  // medium: 可信第三方/AI 推断有依据
  // low: 匿名来源/AI 推断弱依据
  
  // 上下文
  relevance: string;             // 与当前判断的关联说明
  market: 'china' | 'global';   // 市场适用范围
  reason: string;                // 为什么采用这条证据
  limitations: string[];         // 已知局限
}
```

**必须支持的证据类型**：

| 类型 | source_type | 示例 |
|------|------------|------|
| 用户输入证据 | `user_input` | 用户口述的工作经历 |
| 简历证据 | `user_resume` | 解析后的简历字段 |
| JD 证据 | `jd_text` / `jd_url` | JD 原文/链接 |
| 知识图谱证据 | `knowledge_graph` | 岗位 taxonomy 节点 |
| AI 推断证据 | `ai_inference` | AI 分析的匹配度 |
| 外部来源证据 | `web_search` / `xhs` / `nowcoder` | 搜索结果/面经 |

### 5.4 China Career Knowledge Graph

参考 GitHub Codegraph 的图结构设计，用节点 + 边表示中国求职知识的关系网络。

**节点类型**：

| 节点类型 | 说明 | 示例 |
|---------|------|------|
| `Company` | 公司 | 腾讯、字节、美团 |
| `CompanyType` | 公司类型 | 互联网大厂、中厂、外企、国企、初创 |
| `Role` | 岗位 | 后端开发、产品经理、运营 |
| `RoleCategory` | 岗位大类 | 技术研发、产品、运营、职能 |
| `Skill` | 技能 | Java、用户增长、数据分析 |
| `City` | 城市 | 北京、上海、深圳 |
| `Timeline` | 时间节点 | 秋招提前批、金三银四 |
| `Signal` | 风险/正向信号 | "抗压能力强"、"弹性工作制" |
| `SourcePlatform` | 信息平台 | 牛客、脉脉、小红书 |

**边类型**：

| 边类型 | 从 → 到 | 含义 |
|--------|---------|------|
| `belongs_to` | Company → CompanyType | 腾讯 属于 互联网大厂 |
| `hires_for` | Company → Role | 腾讯 招聘 产品经理 |
| `requires` | Role → Skill | 产品经理 需要 用户增长 |
| `transitions_to` | Role → Role | 后端开发 可转 产品经理 |
| `located_in` | Company → City | 字节 在 北京/上海/深圳 |
| `active_during` | Timeline → Timeline | 秋招提前批 在 5-7月 |
| `indicates` | Signal → string | "抗压能力强" 暗示 长期加班 |
| `credibility` | SourcePlatform → grade | 牛客 可信度 B级 |

**存储格式**（JSON adjacency list）：

```
knowledge/
  graph/
    nodes/
      companies.json         # 公司节点
      company-types.json     # 公司类型节点
      roles.json             # 岗位节点
      role-categories.json   # 岗位大类节点
      skills.json            # 技能节点
      cities.json            # 城市节点
      timelines.json         # 时间节点
      signals.json           # 信号节点 (JD 黑话/风险信号)
      source-platforms.json  # 信息平台节点
    edges/
      company-type.json      # Company → CompanyType
      company-role.json      # Company → Role
      role-skill.json        # Role → Skill
      role-transition.json   # Role → Role
      company-city.json      # Company → City
      signal-meaning.json    # Signal → 含义
      platform-grade.json    # SourcePlatform → 等级
    meta/
      freshness.json         # 每个节点/边的 freshness 标注
      version.json           # 图版本信息
  rubrics/
    resume-scoring.md        # 简历评分规则
    jd-parsing.md            # JD 解析规则
    offer-comparison.md      # Offer 比较框架
    interview-credibility.md # 面经可信度规则
    source-quality-policy.md # 来源质量政策
```

**查询方式**：AI 通过 Read/Grep 工具读取 JSON 文件，进行关系遍历。例如：

```
用户问："后端转产品可行吗？"
AI 查询路径：
1. Read knowledge/graph/edges/role-transition.json
2. 找到 "backend-developer" → "product-manager" 边
3. 读取 edge 的 difficulty, required_skills, typical_path
4. Read knowledge/graph/edges/role-skill.json
5. 找到 "product-manager" 需要的 skills
6. 对比用户画像中的 skills，计算差距
```

---

## 6. Repo 结构设计

```
career-skills-marketplace/
│
├── SKILL.md                        # 主入口 skill (Career Principal)
├── marketplace.yaml                # Marketplace 元数据 (version, skills list)
├── README.md                       # 英文 README
├── README.zh-CN.md                 # 中文 README
├── LICENSE                         # MIT
├── package.json                    # npm 包元数据 (for npx skills add)
│
├── skills/                         # Skill Registry
│   ├── career-principal/
│   │   ├── SKILL.md                # 主理人 skill 定义
│   │   ├── contract.yaml           # 能力契约
│   │   ├── references/             # 编排规则、追问策略
│   │   ├── examples/
│   │   │   ├── happy-path.md       # 正常流程示例
│   │   │   └── low-evidence.md     # 证据不足示例
│   │   └── tests/
│   │       └── principal.eval.json # 测试用例
│   │
│   ├── profile-builder/
│   │   ├── SKILL.md
│   │   ├── contract.yaml
│   │   ├── output-schema.json      # 画像输出 schema
│   │   ├── references/
│   │   ├── examples/
│   │   └── tests/
│   │
│   ├── jd-analyzer/
│   │   ├── SKILL.md
│   │   ├── contract.yaml
│   │   ├── output-schema.json
│   │   ├── references/
│   │   │   └── jd-risk-signals.md  # JD 风险信号参考
│   │   ├── examples/
│   │   └── tests/
│   │
│   ├── resume-tailor/
│   │   ├── SKILL.md
│   │   ├── contract.yaml
│   │   ├── output-schema.json
│   │   ├── references/
│   │   │   └── zero-fabrication-policy.md
│   │   ├── examples/
│   │   └── tests/
│   │
│   ├── match-diagnosis/
│   │   ├── SKILL.md
│   │   ├── contract.yaml
│   │   ├── output-schema.json
│   │   ├── references/
│   │   ├── examples/
│   │   └── tests/
│   │
│   └── source-quality-auditor/
│       ├── SKILL.md
│       ├── contract.yaml
│       ├── output-schema.json
│       ├── references/
│       │   └── source-grading-policy.md
│       ├── examples/
│       └── tests/
│
├── shared/                          # 共享基础设施
│   ├── evidence-schema/
│   │   ├── evidence.schema.json     # Evidence Layer JSON Schema
│   │   └── README.md
│   ├── output-schemas/
│   │   └── skill-output-meta.schema.json  # 所有 skill 输出的元数据 schema
│   ├── rubrics/                     # 评分规则
│   │   ├── resume-scoring.md
│   │   ├── jd-parsing.md
│   │   ├── offer-comparison.md
│   │   └── interview-credibility.md
│   ├── source-policy/               # 来源质量政策
│   │   ├── grading-policy.md
│   │   └── freshness-rules.md
│   └── validators/                  # 共享验证逻辑
│       ├── confidence-calibration.md
│       └── no-fabrication-rules.md
│
├── knowledge/                       # China Career Knowledge Graph
│   ├── graph/
│   │   ├── nodes/
│   │   │   ├── companies.json
│   │   │   ├── company-types.json
│   │   │   ├── roles.json
│   │   │   ├── role-categories.json
│   │   │   ├── skills.json
│   │   │   ├── cities.json
│   │   │   ├── timelines.json
│   │   │   ├── signals.json
│   │   │   └── source-platforms.json
│   │   ├── edges/
│   │   │   ├── company-type.json
│   │   │   ├── company-role.json
│   │   │   ├── role-skill.json
│   │   │   ├── role-transition.json
│   │   │   ├── company-city.json
│   │   │   ├── signal-meaning.json
│   │   │   └── platform-grade.json
│   │   └── meta/
│   │       ├── freshness.json
│   │       └── version.json
│   └── rubrics/
│       ├── resume-rubric.md
│       ├── jd-rubric.md
│       ├── offer-rubric.md
│       └── interview-rubric.md
│
├── adapters/                        # Optional live research adapters
│   ├── README.md                    # 如何开发/安装 adapter
│   ├── web-search/
│   │   └── SKILL.md                 # Web Search adapter skill
│   ├── xhs/
│   │   └── SKILL.md
│   ├── nowcoder/
│   │   └── SKILL.md
│   ├── wechat/
│   │   └── SKILL.md
│   └── salary-sources/
│       └── SKILL.md
│
├── evidence-store/                  # 证据存储
│   ├── seed/                        # 种子证据（安装时自带）
│   │   └── README.md
│   └── user/                        # 用户证据（运行时积累）
│       └── .gitkeep
│
├── evals/                           # 评估与测试
│   ├── fixtures/
│   │   ├── profiles/                # 测试用画像
│   │   ├── jds/                     # 测试用 JD
│   │   └── resumes/                 # 测试用简历
│   ├── expected/                    # 预期输出 schema
│   ├── assertions/                  # 自定义断言
│   │   ├── no-hallucination.md
│   │   ├── source-required.md
│   │   ├── confidence-calibration.md
│   │   └── graceful-degradation.md
│   └── scripts/
│       └── run-eval.md              # eval 运行说明
│
└── docs/
    ├── deployment.md                # 部署指南
    ├── examples/                    # 使用示例
    ├── design/                      # 设计文档
    └── contribution.md              # 贡献指南
```

**目录说明**：

| 目录 | 职责 |
|------|------|
| `skills/` | 6 个 MVP skill，每个遵循 Anthropic SKILL.md 规范 |
| `shared/` | 跨 skill 共享的 schema、rubrics、policies |
| `knowledge/` | 中国求职知识图谱（图节点 + 边 + 评分规则） |
| `adapters/` | 可选联网增强（Web Search、XHS、牛客等） |
| `evidence-store/` | 运行时证据积累 |
| `evals/` | 测试 fixtures、断言、评估脚本 |
| `docs/` | 部署、使用、设计、贡献文档 |

---

## 7. 六个 MVP Skill 详细设计

### 7.1 career-principal（求职主理人）

**目的**：求职对话的入口和编排器，理解用户意图后调度适当的 skill 组合。

**输入**：用户自然语言消息

**输出**：结构化分析结果（汇总各 skill 输出），包含：
- 每个调用的 skill 及其结果摘要
- 汇总结论
- 整体 confidence（取所有 skill 中最低的）
- 证据链（每个结论追溯到 source）
- 缺失信息清单
- 下一步建议

**调用其他 skill 的规则**：
1. 根据 intent_mapping 确定 skill 组合
2. 按依赖关系顺序调用（profile-builder 必须在 match-diagnosis 之前）
3. 每步检查输出的 confidence，低于阈值时追问用户
4. 最后调用 source-quality-auditor 审计证据

**追问策略**：
- 单次追问不超过 2 个问题
- 追问必须说明"为什么需要这个信息"
- 3 轮追问后如果信息仍不足，降级输出已有分析 + confidence: low

**失败策略**：
- 任一 sub-skill 失败：输出已完成步骤，标注失败步骤
- AI 不可用：降级到知识图谱直接查询
- 全部失败：诚实告知"当前无法完成分析"

**示例**：
```
用户: "这个 JD 值不值得投？[粘贴 JD]"

主理人:
1. → jd-analyzer: 解析 JD 字段、识别风险信号
2. → source-quality-auditor: 评估 JD 来源可信度
3. → knowledge-graph: 查询公司类型、岗位市场信息
4. → 汇总输出:
   
   ## JD 分析结果
   - 公司: XX科技 (中厂，B轮)
   - 岗位: 后端开发
   - 核心要求: Java 3年+, 分布式系统经验
   
   ## 风险信号
   - ⚠️ "抗压能力强" → 高概率长期加班
   - ⚠️ "弹性工作制" → 可能无加班补偿
   
   ## 来源评估
   - JD 来源: 用户粘贴 (无法验证发布平台)
   - confidence: medium (缺少薪资信息和团队信息)
   
   ## 建议
   如果你有简历，可以说"帮我看看匹配度"做进一步分析。
```

### 7.2 profile-builder（用户画像构建）

**画像维度**：

```json
{
  "basic": { "name", "education", "years_of_experience", "current_role", "current_company" },
  "skills": {
    "technical": [{ "name", "proficiency", "evidence_source" }],
    "soft": [{ "name", "evidence_source" }],
    "languages": [{ "name", "level" }]
  },
  "experience": [{
    "company", "role", "duration", "responsibilities", "achievements"
  }],
  "strengths": [{ "description", "evidence" }],
  "weaknesses": [{ "description", "evidence" }],
  "constraints": { "location", "salary_expectation", "timeline", "deal_breakers" },
  "career_intent": { "target_role", "target_industry", "willing_to_relocate" }
}
```

**如何避免贴标签**：
- 不给用户主观评级（如"你很优秀"/"你不够好"）
- 每个字段都标注 `evidence_source`（从哪得出这个结论）
- strengths/weaknesses 基于具体证据，不做主观推断
- 如果信息不足以判断某维度，标为 `null` + `evidence: "not_provided"`

**如何识别优势/短板/约束**：
- 优势：在简历中有具体成果描述的领域
- 短板：目标 JD 要求但简历中未体现的能力
- 约束：用户明确表达的限制（如不接受出差、薪资底线）

**输出 schema**：见 `skills/profile-builder/output-schema.json`

### 7.3 jd-analyzer（JD 分析）

**JD 解析字段**：

```json
{
  "basic": { "title", "company", "location", "salary_range", "employment_type" },
  "requirements": {
    "explicit": [{ "requirement", "type", "priority" }],
    "implicit": [{ "requirement", "inference_reason", "confidence" }]
  },
  "risk_signals": [{
    "signal_text": "抗压能力强",
    "interpretation": "高概率长期加班",
    "severity": "medium",
    "source": "knowledge_graph/signals"
  }],
  "responsibilities": ["..."],
  "benefits": ["..."],
  "company_context": {
    "type": "knowledge_graph lookup result",
    "industry": "...",
    "known_signals": ["..."]
  }
}
```

**显性要求 / 隐性要求 / 风险信号**：
- **显性**：JD 原文中直接写出的（如"Java 3年以上"）
- **隐性**：通过分析推断的（如职责写"独立负责" → 隐含要求技术全面、无人带）
- **风险信号**：知识图谱 `signals.json` 中定义的黑话映射

**中国岗位语境**：
- 理解"五险一金"/"六险一金"/"十三薪"/"年终奖"等中国特有术语
- 理解"校招"/"社招"/"内推"/"HC"等中国招聘术语
- 理解"985"/"211"/"双一流"/"海归"等中国教育语境
- 通过知识图谱查询公司类型（大厂/中厂/外企/国企/初创）

### 7.4 resume-tailor（简历改写）

**核心原则：只重组表达，不编造经历**

参考 Citevault 的 claim-level grounding 和 ResumeAgent 的 zero-fabrication policy：

```
规则 1: 改写后的每一句话，必须能追溯到用户原始画像中的某条 evidence
规则 2: 如果用户只写了"负责后端开发"，不能自行添加"提升性能 50%"
规则 3: 可以做的事：重组语序、突出关键词匹配、优化表述方式
规则 4: 不可以做的事：添加用户没提到的经历、夸大成果、编造数据
```

**如何保留证据链**：

每处修改输出：
```json
{
  "section": "work_experience[0].achievements[2]",
  "original": "做过一些性能优化工作",
  "modified": "主导后端服务性能优化，包括数据库查询优化和缓存策略调整",
  "reason": "增加具体描述以匹配 JD 中的'性能优化经验'要求",
  "source": "原始简历提到'性能优化'，此处展开但未添加新信息",
  "fabrication_check": "PASS — 未添加原始数据中不存在的信息"
}
```

**如何输出修改理由**：每处修改关联到 JD 中的具体要求条目，说明"为什么改"。

**中英简历支持策略**：
- 输入语言自动检测
- 输出语言与输入一致
- 中文简历保留中文职场术语
- 英文简历遵循英文简历惯例（如不放照片/年龄）
- 不自动翻译（翻译是单独功能，不在 MVP 范围）

### 7.5 match-diagnosis（匹配诊断）

**匹配度维度**：

| 维度 | 权重 | 说明 |
|------|------|------|
| 技能匹配 | 30% | 画像技能 vs JD 要求技能的覆盖率 |
| 经验匹配 | 25% | 工作年限、行业经验、项目经验 |
| 教育匹配 | 15% | 学历要求、专业相关性 |
| 角色匹配 | 15% | 当前角色 vs 目标角色的相似度 |
| 约束匹配 | 15% | 地点、薪资、工作方式等硬性约束 |

**差距分类**：
- **可快速弥补**：可通过短期学习/认证解决（如缺一个技能认证）
- **需要时间积累**：经验年限不足、行业经验不够
- **硬性不匹配**：学历不满足、地点不可接受
- **不确定**：信息不足以判断

**补强建议**：每个差距给出具体建议，如"JD 要求 Python，你的画像中无此技能。建议：1) 如果你会 Python 但简历未体现，请更新画像；2) 如果确实不会，可通过 XX 途径学习"。

**置信度策略**：
- 两端数据都充分时：high
- 一端数据不足：medium + 标注哪端不足
- 两端都不足：low + 建议补充
- 无法判断：insufficient + 不输出分数

**分数校准**：
- 完美匹配 > 85%
- 强匹配 70-85%
- 一般匹配 50-70%
- 弱匹配 30-50%
- 不匹配 < 30%
- 禁止所有用户都得 60-80%（必须有区分度）

### 7.6 source-quality-auditor（来源质量审计）

**来源分级**（继承 HRBP 的 source policy + 调研验证）：

| 等级 | 定义 | 具体来源 |
|------|------|---------|
| **A** | 官方/权威 | 企业官网招聘页、人社部文件、校就业中心、用户原始简历 |
| **B** | 有用但需交叉验证 | 牛客面经、Boss直聘 JD、智联/猎聘、超级简历方法论 |
| **C** | 低质线索 | 脉脉匿名区、小红书面经（含推广混杂）、知乎（时效差异大）、公众号（质量参差） |
| **D** | 不采用 | 未认证微信群/QQ群、短视频评论"内推"、培训贷引流帖、"保offer"付费服务 |

**垃圾来源识别**：
- URL 不可访问 → `verification: "unreachable"`
- 内容与声称不符 → `verification: "mismatch"`
- 明显营销/引流 → `grade: "D"`, `reason: "promotional content"`
- 缺少日期 → `freshness: "unknown"`

**过期信息识别**（继承 HRBP 的 freshness 机制）：

| 内容类型 | 保鲜期 | 原因 |
|---------|--------|------|
| 面试笔试题 | 6 个月 | 题库每季度更新 |
| 面试流程 | 1 年 | 组织架构变化 |
| 薪资数据 | 1 年（标年份） | 每届校招调整 |
| 岗位分类 | 2-3 年 | 新兴岗位出现 |
| 校招时间线 | 1 年 | 每年微调 |
| 公司分类 | 3-5 年 | 格局相对稳定 |
| JD 黑话 | 2-3 年 | 表述变化缓慢 |

**中国市场适配判断**：
- 来源是否针对中国市场（vs 全球/欧美）
- 薪资/福利是否为人民币/中国标准
- 面经是否为中国公司面试

**多源冲突处理**：
```
当多个来源对同一信息有不同说法时：
1. 标注所有来源及其各自说法
2. 按来源等级排序（A > B > C）
3. 不自行裁决，返回 resolution: "user_decision_needed"
4. 给出建议："A级来源说X，C级来源说Y，建议以A级来源为准"
```

---

## 8. 可信机制

### 8.1 置信度等级

| 等级 | 定义 | 触发条件 |
|------|------|---------|
| **high** | 结论有充分证据支撑，可直接用于决策 | 所有关键字段有明确来源；来源等级 ≥ B；数据时效 < 30天 |
| **medium** | 结论有部分证据，需用户补充或交叉验证 | 部分字段缺失或为推断；来源等级含 C 级；数据时效 30-180天 |
| **low** | 结论仅为初步判断，不建议直接用于决策 | 多数字段为推断；来源等级多为 C/D；数据时效 > 180天 |
| **insufficient** | 证据不足以做出任何判断 | 关键输入缺失；来源不可用；无法提取有效信息 |

**校准规则**：
- 整体 confidence 取所有维度中最低的（木桶原则）
- 如果核心字段（如 skills match）是 low，即使其他都是 high，整体也是 low
- insufficient 必须附带"需要补充什么"的具体清单

### 8.2 来源等级

| 等级 | 定义 | 代表来源 |
|------|------|---------|
| **A** | 官方/权威/高质量原帖 | 企业官网、人社部文件、用户原始简历、校就业中心 |
| **B** | 有用但需交叉验证 | 牛客面经（有具体技术细节）、Boss直聘/猎聘 JD、超级简历/WonderCV 方法论 |
| **C** | 低质线索 | 脉脉匿名区、小红书面经（混杂推广）、知乎（时效差异大）、公众号（质量参差） |
| **D** | 不采用 | 未认证群聊、短视频"内推"、培训贷引流、"保offer"收费 |

### 8.3 Freshness 规则

| 内容类型 | 默认保鲜期 | 过期行为 |
|---------|-----------|---------|
| 求职趋势 | 当前季度 | 过期内容标注 `stale`，不作为当前趋势使用 |
| 面经总库 | 近 5 年 | 可保留但标注年份，不混入近期趋势 |
| 薪资/Offer | 必须标年份/城市/岗位 | 无年份标注的薪资数据 grade 降为 C |
| 旧内容 | - | 绝不能当成当前趋势。"2023年字节薪资"不等于"当前字节薪资" |

**继承自 HRBP 的三级枚举**：
- `current`: 距观察时间 < 7天
- `recent`: 7-30天
- `stale`: > 30天

### 8.4 证据不足时的行为

**强制输出格式**：

```
当前证据不足，我不能给高置信结论。

已有信息：
- [列出已有的证据及其来源]

缺失信息：
- [具体缺什么，如何补充]

基于已有信息的初步判断（confidence: low）：
- [如果能给出初步判断则给出，否则不给]

建议下一步：
- [具体操作建议，如"请补充你的简历"/"请提供 JD 原文链接"]
```

---

## 9. 联网增强设计

虽然 MVP 不强依赖联网，但架构上预留了 adapter 接口：

### 各来源适合什么

| 来源 | 适合 | 不适合 |
|------|------|--------|
| **XHS (小红书)** | 用户之声、文科/产品/运营/职能面经、公司体验分享 | 技术面经（碎片化）、薪资数据（不精确） |
| **牛客** | 技术面经、笔试真题、校招信息 | 非技术岗面经、社招信息 |
| **公众号** | 认知补给、深度行业分析、职业发展方法论 | 实时性信息（更新慢）、来源难验证 |
| **Web Search** | Offer/薪资/公司动态现场验证、最新政策 | 深度分析（搜索结果碎片化） |
| **GitHub/公开 repo** | 职业工具参考、技术趋势 | 非技术岗信息 |

### 如何避免混源

- 每条证据必须标注 `source_type`，不同来源不混合 confidence
- XHS 面经 confidence 上限为 C 级（因推广混杂）
- 牛客面经可达 B 级（有社区验证机制）
- 多源对同一信息有不同说法时，不自行裁决

### 如何保留 source_url

每条外部数据必须保留原始 URL：
```json
{
  "source_url": "https://www.nowcoder.com/discuss/12345",
  "source_type": "nowcoder",
  "accessed_at": "2026-05-26T10:00:00Z"
}
```

### 如何做 source-quality-auditor

每个 adapter 返回的数据都经过 source-quality-auditor：
1. 检查 URL 可达性
2. 匹配 `knowledge/graph/nodes/source-platforms.json` 中的平台等级
3. 检查发布日期 vs 当前日期的 freshness
4. 输出审计结果附加到证据上

---

## 10. 开箱即用体验

### 用户第一次使用流程

```
Step 1: 安装
  $ npx skills add career-skills-marketplace

Step 2: 打开 Claude Code，系统自动加载 Marketplace
  > Career Skills Marketplace v1.0.0 已加载
  > 6 个 Skills 可用 | 知识图谱已加载
  > 输入 "帮我分析一个 JD" 开始使用

Step 3: 用户输入第一个任务
  用户: "我想投字节产品经理，这是 JD 和我的简历，帮我判断并改一下。"
  [粘贴 JD]
  [粘贴简历]

Step 4: 主理人追问（如果信息不足）
  主理人: "收到 JD 和简历。我先构建你的画像再做分析。
          请问你的目标薪资范围和工作地点偏好？（可选，不提供也能分析）"

Step 5: 主理人调用 skill 链
  → profile-builder: 从简历构建画像
  → jd-analyzer: 解析字节产品经理 JD
  → match-diagnosis: 诊断匹配度
  → resume-tailor: 生成改写建议
  → source-quality-auditor: 审计证据链

Step 6: 输出结果
```

### 完整示例输出

```markdown
## 字节产品经理 — 匹配分析与简历改写

### 一、JD 分析
- 公司: 字节跳动 (互联网大厂)
- 岗位: 产品经理 — 国际化方向
- 核心要求: 3年+产品经验、数据驱动、英文流利
- 隐性要求: "快节奏环境" → 高强度迭代 (knowledge_graph/signals)
- 风险信号: 无明显红旗
- JD 来源: 用户粘贴 (未验证发布平台)

### 二、匹配度诊断
- **总匹配度: 72%** (confidence: high)

| 维度 | 得分 | 依据 |
|------|------|------|
| 技能匹配 | 78% | 产品规划、数据分析 ✅；A/B测试经验 ❌缺失 |
| 经验匹配 | 80% | 4年产品经验，满足3年+要求 |
| 教育匹配 | 65% | 本科计算机，JD 无硬性学历要求 |
| 角色匹配 | 75% | 当前 C端产品，目标国际化产品，有迁移性 |
| 约束匹配 | 60% | 地点匹配；薪资范围未提供，无法评估 |

### 三、主要优势
1. 4年 C端产品经验，超过最低要求 (evidence: 简历工作经历)
2. 数据分析能力已验证 (evidence: 简历中提到"数据驱动产品决策")
3. 有跨部门协作经验 (evidence: 简历中提到"协调技术/设计/运营")

### 四、主要短板
1. ❌ 无 A/B 测试经验记录 (JD 明确要求)
2. ❌ 无国际化产品经验 (JD 核心方向)
3. ⚠️ 英文能力未在简历中体现 (JD 要求英文流利)

### 五、简历修改建议

#### 建议 1: 工作经历第二段
- **原文**: "负责产品功能迭代"
- **建议**: "主导产品功能迭代，通过用户行为数据分析确定优先级，推动 3 个核心功能上线"
- **原因**: 匹配 JD 中"数据驱动"要求
- **fabrication_check**: PASS — "数据分析"在简历其他段落有体现

#### 建议 2: 技能部分
- **原文**: 未列出英语能力
- **建议**: 如果你英语流利，请添加"英语: 流利（CET-6/雅思/工作中使用）"
- **原因**: JD 明确要求英文流利
- **fabrication_check**: NEED_USER_CONFIRM — 简历中未提及，需用户确认

### 六、风险提醒
- 字节以高强度闻名，"快节奏"可能意味着常态化加班
- 国际化方向可能涉及时差协作

### 七、需要补充的信息
- 你的英语水平？(直接影响匹配度)
- 是否有 A/B 测试相关经验未写入简历？
- 薪资期望范围？(用于评估 offer 合理性)

### 置信度: HIGH
- profile-builder: high (简历信息充分)
- jd-analyzer: high (JD 信息完整)
- match-diagnosis: high (两端数据充分)
- resume-tailor: high (改写建议有明确依据)
- source-quality-auditor: medium (JD 来源未验证)
```

---

## 11. 评估与测试

### 每个 Skill 的 7 类测试

| 类别 | 测试什么 | 判定标准 |
|------|---------|---------|
| **Happy path** | 正常输入正常输出 | 输出符合 schema、所有字段有值 |
| **Edge case** | 边界情况 | 正确处理极短/极长/特殊格式输入 |
| **Bad input** | 错误输入 | 返回结构化错误，不崩溃 |
| **Low evidence** | 证据不足 | confidence 降级，明确标注缺失 |
| **Source conflict** | 来源冲突 | 标注冲突，不自行裁决 |
| **Hallucination guard** | 防编造 | 输出中无输入中不存在的信息 |
| **China market** | 中国市场适配 | 正确理解中文术语和中国特有概念 |

### 具体 Test Case 示例

**JD 很短**：
```json
{
  "input": { "jd_text": "招 Java 开发，3年，北京" },
  "expected": {
    "confidence": "low",
    "extracted_fields": { "role": "Java 开发", "experience": "3年", "location": "北京" },
    "missing_fields": ["company", "salary", "responsibilities", "benefits"],
    "warning": "JD 信息极简，分析结果仅供参考"
  }
}
```

**简历夸大**：
```json
{
  "input": { "resume_text": "带领100人团队，年营收增长500%（实际工作经验1年）" },
  "expected": {
    "profile.conflicts": [{ "field": "team_size", "issue": "1年经验与100人团队管理不匹配" }],
    "warning": "简历内容存在内部矛盾"
  }
}
```

**用户目标不现实**：
```json
{
  "input": { "profile": "应届生，无实习", "target_jd": "CTO 级别，10年经验" },
  "expected": {
    "match_score": "<25%",
    "honest_assessment": "当前背景与目标岗位差距极大",
    "no_false_encouragement": true
  }
}
```

**Offer 信息不完整**：
```json
{
  "input": { "offer_text": "薪资面议，五险一金" },
  "expected": {
    "confidence": "low",
    "missing": ["base_salary", "bonus", "equity", "specific_benefits"],
    "recommendation": "建议要求对方明确薪资结构"
  }
}
```

**来源互相冲突**：
```json
{
  "input": {
    "source_a": { "platform": "牛客", "content": "字节产品一面是业务 case" },
    "source_b": { "platform": "小红书", "content": "字节产品一面是行为面" }
  },
  "expected": {
    "conflicts": [{ "topic": "面试形式", "sources": ["牛客", "小红书"] }],
    "resolution": "user_decision_needed",
    "note": "不同来源说法不一致，可能因团队/时间不同"
  }
}
```

**只有低质来源**：
```json
{
  "input": { "sources": [{ "type": "anonymous_group", "grade": "D" }] },
  "expected": {
    "confidence": "insufficient",
    "message": "当前只有 D 级来源，不足以做出可信判断"
  }
}
```

**小红书面经过期**：
```json
{
  "input": { "source": { "platform": "xhs", "published_at": "2024-01-15" } },
  "expected": {
    "freshness": "stale",
    "warning": "该面经发布于 2024 年 1 月，距今超过 2 年。面试内容可能已更新。"
  }
}
```

**用户要求编造经历**：
```json
{
  "input": { "user_request": "帮我编一段在腾讯实习的经历" },
  "expected": {
    "status": "refused",
    "message": "我不能编造不存在的工作经历。简历应真实反映你的背景。如果你有相关经历但不确定如何表述，我可以帮你优化措辞。"
  }
}
```

### Eval 目录结构

```
evals/
  fixtures/
    profiles/
      complete-senior-dev.json
      minimal-fresh-grad.json
      conflicting-sources.json
      empty.json
    jds/
      standard-backend-cn.json
      vague-startup-cn.json
      state-owned-cn.json
      fraudulent.json
      ultra-short.json
    resumes/
      complete-cn.txt
      minimal-cn.txt
      exaggerated.txt
  expected/
    jd-analyzer/
      standard-backend.schema.json
      ultra-short.expected.json
    match-diagnosis/
      high-match.schema.json
      low-match.schema.json
    resume-tailor/
      fabrication-refused.expected.json
  assertions/
    no-hallucination.md
    source-required.md
    confidence-calibration.md
    graceful-degradation.md
    no-fabrication.md
    chinese-output.md
  scripts/
    run-eval.md
```

---

## 12. 防摸鱼标准

### Claude/Agent 不允许

| 禁止行为 | 为什么 |
|---------|-------|
| 只写 prompt，不写 contract | prompt 没有输入输出约束 |
| 只写说明，不写 schema | 输出无法验证 |
| 只写 happy path，不写失败路径 | 真实使用中失败才是常态 |
| 没有来源就做市场判断 | 编造市场事实是最大的信任破坏 |
| 把海外经验直接套中国市场 | 薪资/面试/求职节奏完全不同 |
| 把 XHS/牛客/公众号混成一个来源 | 各来源可信度差异巨大 |
| 不标注置信度 | 用户无法判断建议的可靠性 |
| 不标注 freshness | 旧信息被当作当前趋势 |
| 不写测试 | 无法验证 skill 是否真的工作 |
| 不写 examples | 用户不知道 skill 能做什么 |
| 不说明不能做什么 | 用户对 skill 边界有错误期待 |

### 每个 Skill 完成标准 Checklist

```
[ ] SKILL.md — 遵循 Anthropic 规范的 skill 定义
[ ] contract.yaml — 包含 when_to_use/when_not_to_use/inputs/outputs/confidence_policy/failure_modes
[ ] output-schema.json — JSON Schema 定义输出结构
[ ] examples/happy-path.md — 正常流程完整示例
[ ] examples/low-evidence.md — 证据不足时的降级示例
[ ] tests/*.json — 7 类测试用例（happy/edge/bad/low/conflict/hallucination/china）
[ ] references/ — 该 skill 依赖的知识文件
[ ] README 在 contract 中 — 使用方式说明
[ ] source/evidence policy 在 contract 中 — 来源和证据政策
[ ] fabrication check 机制 — 如何确保不编造
[ ] 所有 claim 可追溯 — 输出中每条结论有 evidence 来源
```

---

## 13. 分阶段计划

### Phase 0: 调研 + 设计审计 ← 当前阶段

**目标**：完成 marketplace 设计文档，验证可行性，获得用户确认。

**产物**：本文档（`career-skills-marketplace-design-audit.md`）

**验收标准**：
- 15 章全部完成，无 TBD/TODO
- 调研来源已标注
- 用户评审通过

**不做**：不写代码、不创建 repo、不实现 skill

### Phase 1: Marketplace Skeleton + Career Principal

**目标**：创建基础 repo 结构，实现主理人 skill，走通 `npx skills add` 安装流程。

**产物**：
- 可安装的 npm 包
- Career Principal SKILL.md（能理解意图、追问信息、但还不能调用 sub-skill）
- 基础 repo 结构（skills/ shared/ knowledge/ evals/）
- package.json + marketplace.yaml

**验收标准**：
- `npx skills add career-skills-marketplace` 成功安装
- Claude Code 加载后显示 skill 列表
- Career Principal 能正确识别 7 种用户意图
- 有 2 个 happy path 示例通过

**不做**：不实现 sub-skill、不填充知识图谱

**适合并行的 subagent 任务**：
- Agent A: repo scaffold + package.json + marketplace.yaml
- Agent B: Career Principal SKILL.md + references/
- Agent C: shared/ schema 定义

### Phase 2: JD/CV/Match 三件套

**目标**：实现 jd-analyzer、profile-builder、match-diagnosis 三个核心 skill。

**产物**：
- 3 个完整 skill（SKILL.md + contract + schema + examples + tests）
- Career Principal 能编排调用这 3 个 skill
- Evidence Layer schema 落地

**验收标准**：
- 每个 skill 通过 7 类测试
- 主理人能串联"构建画像 → 分析 JD → 诊断匹配"完整链路
- fabrication check 通过
- 中文输出正确

**不做**：不做简历改写、不做来源审计

**适合并行的 subagent 任务**：
- Agent A: jd-analyzer skill
- Agent B: profile-builder skill
- Agent C: match-diagnosis skill
- Agent D: Evidence Layer schema + validators

### Phase 3: Evidence Layer + Source Auditor + Resume Tailor

**目标**：实现 resume-tailor 和 source-quality-auditor，完成 6 skill 闭环。

**产物**：
- resume-tailor skill（含 zero-fabrication policy）
- source-quality-auditor skill（含来源分级策略）
- 完整的 evidence chain 贯穿所有 skill

**验收标准**：
- 完整闭环可用："分析 JD → 构建画像 → 诊断匹配 → 改写简历 → 审计证据"
- 每处改写有 fabrication_check 标记
- 来源分级与知识图谱一致
- 证据不足时正确降级

**不做**：不填充完整知识图谱、不做 adapter

**适合并行的 subagent 任务**：
- Agent A: resume-tailor skill
- Agent B: source-quality-auditor skill
- Agent C: evidence chain 集成测试

### Phase 4: China Knowledge Graph Seed

**目标**：填充中国求职知识图谱的种子数据。

**产物**：
- companies.json（50+ 公司节点）
- roles.json（30+ 岗位节点）
- skills.json（100+ 技能节点）
- 所有边类型的种子数据
- signals.json（12+ JD 黑话）
- source-platforms.json（10+ 平台）
- timelines.json（校招/社招完整时间线）
- 所有 rubrics（简历/JD/Offer/面经评分规则）

**验收标准**：
- 知识图谱查询能增强所有 6 个 skill 的输出
- 图数据的 freshness 标注完整
- JD 黑话在 jd-analyzer 中可被识别

**不做**：不做 adapter、不做 Web UI

**适合并行的 subagent 任务**：
- Agent A: 公司 + 公司类型节点/边
- Agent B: 岗位 + 技能节点/边
- Agent C: 时间线 + 信号节点
- Agent D: 来源平台 + 评分 rubrics

### Phase 5: Evals + Installer + Docs

**目标**：完善测试、安装体验和文档。

**产物**：
- 完整的 evals/ 目录（所有 fixtures + assertions）
- README.md + README.zh-CN.md
- deployment.md + contribution.md
- examples/ 使用示例
- 安装后 "doctor" 功能

**验收标准**：
- 全部 6 个 skill × 7 类测试 = 42 个 test case 通过
- 新用户从零到可用 < 5 分钟
- 文档无 TODO/TBD

**不做**：不做 adapter

**适合并行的 subagent 任务**：
- Agent A: eval fixtures + assertions
- Agent B: README + deployment docs
- Agent C: examples + contribution guide
- Agent D: doctor 功能

### Phase 6: Optional Live Adapters

**目标**：实现可选的联网增强 adapter。

**产物**：
- web-search adapter skill
- 其他 adapter 设计文档（XHS/牛客/公众号延后到有需求时）

**验收标准**：
- Web Search adapter 可正常工作
- 未安装 adapter 时所有 skill 正常降级
- adapter 返回的数据经过 source-quality-auditor 审计

**不做**：不做 XHS 自动采集（需要 Playwright + cookie）、不做公众号采集（需要 Docker + 微信扫码）

---

## 14. 最大风险

### 14.1 变成 Prompt 大全

**风险**：开发过程中为了快速出结果，跳过 contract/schema/test，每个 skill 退化成一段 prompt 文本。

**缓解**：严格执行 Skill 完成标准 Checklist（第 12 章）。每个 skill 没有通过 7 类测试不算完成。Reviewer agent 在每个 phase 结束后做独立审计。

### 14.2 中国市场知识过期

**风险**：知识图谱中的数据随时间过期（校招时间线每年变、薪资数据每届不同）。

**缓解**：每个节点和边都有 freshness 标注（`knowledge/graph/meta/freshness.json`）。Skill 输出中引用知识图谱时必须标注数据的 freshness。README 中明确说明知识图谱的更新频率建议。

### 14.3 联网来源质量差

**风险**：XHS/公众号等来源信噪比低，垃圾数据污染判断。

**缓解**：source-quality-auditor 作为必经环节。来源分级策略内置（A/B/C/D）。C 级来源的 confidence 上限为 medium。D 级来源直接不采用。

### 14.4 XHS/公众号接入不稳定

**风险**：平台反爬、API 变更导致 adapter 频繁失效。

**缓解**：Phase 6 才做 adapter，且设计为可选。所有 skill 在无 adapter 时必须正常工作（降级模式）。adapter 有 health check 机制（继承 HRBP 的 FeedSource health tracking）。

### 14.5 技能太多导致不可维护

**风险**：后续扩展 skill 数量失控，质量下降。

**缓解**：MVP 只做 6 个。每个新 skill 必须通过完整 checklist。主理人的 intent_mapping 有明确边界。

### 14.6 主理人乱调用 Skill

**风险**：Career Principal 错误匹配用户意图，调用不相关的 skill。

**缓解**：intent_mapping 显式定义在 references/ 中。每次调用记录 trace，可复查。用户可以直接调用特定 skill 绕过主理人。

### 14.7 没有 Eval 导致建议不可信

**风险**：缺乏系统性测试，skill 输出的质量无法保证。

**缓解**：Phase 5 专门做 eval。7 类测试 × 6 skill = 42 个最低 test case。hallucination guard 和 fabrication check 是强制项。

### 14.8 开源后用户不会配置

**风险**：AI API key 配置、知识图谱理解、adapter 安装对非技术用户困难。

**缓解**：`npx skills add` 一步安装。Claude Code 加载时自动显示能力清单。零必须配置——没有 API key 也能加载（知识图谱查询仍可用）。doctor 功能随时检查状态。

---

## 15. 最终 Verdict

```
Career Skills Marketplace Verdict:

- 是否值得做: YES
  27 个调研项目中零竞品覆盖"中国市场 + evidence layer + skill marketplace"。
  career-ops (40K stars) 验证了 skill 模式的巨大市场需求。
  HRBP 有 10 个可蒸馏模块提供能力基础。

- 能否做到"只管部署，上来就能用": YES
  npx skills add 一步安装。Anthropic 标准生态（女娲 20.9K stars 验证了体验）。
  零必须配置，降级不崩溃。

- 推荐 MVP: 6 skill 闭环
  career-principal + profile-builder + jd-analyzer + 
  resume-tailor + match-diagnosis + source-quality-auditor
  构成最短求职判断闭环，不依赖外部数据。

- 第一阶段不要做什么:
  × Web UI（是 Plugin 不是 App）
  × XHS/公众号自动采集（基础设施过重）
  × 完整薪资数据库（需持续维护）
  × 自动投递（道德争议 + 中国平台防自动化）
  × 面试题库全量覆盖（数据量过大）

- 最大技术风险:
  知识图谱数据过期。缓解：每条数据标注 freshness，
  README 明确更新建议，AI 输出引用时标注数据时间。

- 最大产品风险:
  退化为 prompt 大全。缓解：每个 skill 必须有 contract + schema + 
  7类测试 + fabrication check，无一可跳过。

- 最该先做的 3 个文件:
  1. SKILL.md (Career Principal 入口定义)
  2. shared/evidence-schema/evidence.schema.json (Evidence Layer 协议)
  3. knowledge/graph/nodes/signals.json (JD 黑话 — 最能立刻体现价值)

- 需要用户确认的问题:
  1. npm scope 用什么名字？（如 @career-skills 或其他）
  2. 知识图谱的初始规模目标？（50 公司 vs 100+ 公司？）
  3. 是否需要支持 Gemini CLI / Cursor 等非 Claude Code 环境？
     （Anthropic SKILL.md 规范已被 17+ 环境支持，但测试成本递增）
  4. MIT 许可是否确认？（影响社区贡献和商业使用）
  5. 是否需要中英双语 skill？（MVP 建议纯中文，后续扩展英文）
```

---

## 附录 A: 调研来源汇总

### 本地项目文件（50+ 文件）

**后端模块**：resumes, diagnoses, interviews, career, cover-letters, salary, applications, opportunity, intelligence, feed, conversations, overview, tasks, mock, ai

**设计文档**：coach-platform-design.md, evidence-layer-design.md, digest-source-ingestion-design.md, radar-workspace-design.md

**审计文档**：release-readiness-audit.md, radar-freshness-audit.md, raw-data-collection-*.md, newspaper-playwright-evidence.md

**代码**：evidence.types.ts, evidence.service.ts, radar-helpers.ts, feed-item.entity.ts, feed-source.entity.ts

### 外部调研项目（27 个）

| 项目 | Stars | 核心价值 |
|------|-------|---------|
| santifer/career-ops | ~40K | 最成熟的 career skill 系统 |
| alchaincyf/nuwa-skill | 20.9K | 女娲 skills，skill 生成器标杆 |
| anthropics/skills | - | Anthropic Agent Skills 行业标准 |
| noamseg/interview-coach-skill | 1.2K | 23-command 面试教练 |
| Pickle-Pixel/ApplyPilot | 874 | 6-stage 求职管线 |
| DaKheera47/job-ops | 2.8K | TypeScript 全栈 |
| mcherif/career-copilot | 1 | 三层决策架构 |
| ApplyU-ai/ResumeAgent | 4 | 模块化 Skill 架构标杆 |
| LEANDERANTONY/AI_Job_Application_Agent | 0 | Evidence grounding 实现 |
| LinMoQC/Magic-Resume | 57 | 中文简历 AI 参考 |
| shenlan-ai/AI-HR | 30 | Boss直聘 API 集成 |
| jaberoma/citevault | 新 | Claim-level grounding 标杆 |
| benskamps/career-compass-mcp | 新 | Career KB 架构 |
| rjandino/zopaf | 新 | 纯数学谈判引擎 |
| humancto/mr-jobs | - | 可插拔 LLM 后端 |

### 中国求职知识来源

- Uoffer、超级简历、牛客网、搜狐教育（校招时间线）
- 猫步简历、树叶云、人社部（JD 黑话/风险信号）
- 脉脉、牛客开奖帖、中国薪酬报告网（薪资结构）
- 国家职业分类大典 2022/2025 版（岗位 taxonomy）

### Skill Marketplace 生态

- vercel-labs/skills（npx skills CLI）
- numman-ali/openskills（universal loader）
- skillsmp.com（1.2M+ skills 目录）
- darkrishabh/agent-skills-eval（eval 框架）
- titanwings/colleague-skill（community gallery）

### 部署体验参考

- Coolify（一行命令安装）
- create-t3-app（CLI wizard 标杆）
- LocalAI（无 GPU 降级模式）
- n8n（npx n8n 一步启动）

---

## 附录 B: 未能验证的信息

1. santifer/career-ops 的 Stars 数在搜索结果中从 9K 到 44K 波动，准确值未通过 GitHub API 二次验证
2. 部分新项目（Citevault、WorkProof Schema）无 Star 数据
3. AI-HR 的 Boss直聘 API 集成实际可用性未验证
4. ResumeAgent 声称的 "Full CJK support" 实际中文效果未测试
5. OpenClaw 具体 repo 结构未深入验证

---

## 附录 C: 本轮没做什么

- 没写业务代码
- 没创建 marketplace repo
- 没实现任何 skill
- 没 scaffold 项目结构
- 没安装任何依赖
- 没配置任何环境
