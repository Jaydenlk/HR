# Career Skills Marketplace — Implementation Constraints

> 日期：2026-05-26
> 前置文档：career-skills-marketplace-design-audit.md, career-skills-marketplace-full-roadmap.md
> 状态：实现约束与规范文档，不含业务代码

---

## 1. Skill Package 真实格式

每个 skill 在 repo 中的文件结构：

```
skills/<skill-name>/
  SKILL.md              # 给 LLM/agent 的执行说明
  contract.yaml         # 什么时候用/不用、上下文、工具权限
  input_schema.json     # 输入约束 (JSON Schema)
  output_schema.json    # 输出结构 (JSON Schema)
  examples/
    happy-path.md       # 正常流程完整样例
    low-evidence.md     # 证据不足降级样例
    source-conflict.md  # 来源冲突处理样例
    bad-input.md        # 错误输入处理样例
  tests/
    happy-path.json     # eval fixture: 正常输入 + 预期输出 schema
    low-evidence.json   # eval fixture: 证据不足场景
    source-conflict.json # eval fixture: 来源冲突场景
    hallucination-guard.json # eval fixture: 防编造场景
  README.md             # 人类文档：用法、限制、示例
```

### 文件职责

| 文件 | 给谁看 | 职责 |
|------|--------|------|
| `SKILL.md` | LLM/Agent runtime | 执行指令：何时触发、如何推理、输出格式、失败处理。遵循 Anthropic Agent Skills 规范（YAML frontmatter + Markdown body） |
| `contract.yaml` | 主理人/开发者 | 机器可读的 skill 契约：when_to_use, when_not_to_use, inputs_required, optional_context, evidence_required, tools_allowed, confidence_policy, failure_modes |
| `input_schema.json` | 主理人/验证器 | JSON Schema 定义合法输入结构，主理人调用前校验 |
| `output_schema.json` | 主理人/测试框架 | JSON Schema 定义输出结构，eval 时验证 schema 合规性 |
| `examples/` | 用户/维护者 | 真实使用样例，每个文件是完整的 input → output 流程 |
| `tests/` | eval 框架 | 自动化测试 fixture：`{ input, expected_properties, assertions }` |
| `README.md` | 人类 | 使用文档：目的、用法、限制、与其他 skill 的关系 |

---

## 2. Career Principal 路由机制

### Intent Router Schema

```yaml
intents:
  - name: analyze_jd
    trigger_examples:
      - "帮我看这个 JD"
      - "这个岗位值不值得投"
      - "分析一下这个职位"
    required_inputs: [jd_text]
    missing_input_questions:
      jd_text: "请粘贴 JD 原文或提供链接"
    primary_skill: jd-analyzer
    secondary_skills: [source-quality-auditor]
    evidence_needed: [jd_text]
    confidence_gate: jd_text.length >= 50
    fallback: "JD 信息太少，只能做有限分析 (confidence: low)"

  - name: tailor_resume
    trigger_examples:
      - "帮我改简历"
      - "优化一下简历"
      - "针对这个岗位改简历"
    required_inputs: [resume_text]
    missing_input_questions:
      resume_text: "请粘贴简历内容或指定文件路径"
      jd_text: "有目标 JD 吗？有的话改写更有针对性"
    primary_skill: resume-tailor
    secondary_skills: [profile-builder, jd-analyzer, match-diagnosis]
    evidence_needed: [resume_text, jd_text?]
    confidence_gate: resume_text.length >= 100
    fallback: "无目标 JD，只做通用优化"

  - name: match_diagnosis
    trigger_examples:
      - "我适合这个岗位吗"
      - "匹配度多少"
      - "差距在哪"
    required_inputs: [resume_text, jd_text]
    missing_input_questions:
      resume_text: "请提供你的简历"
      jd_text: "请提供目标 JD"
    primary_skill: match-diagnosis
    secondary_skills: [profile-builder, jd-analyzer]
    evidence_needed: [resume_text, jd_text]
    confidence_gate: both inputs >= 100 chars
    fallback: "缺少简历或 JD，无法做匹配诊断"

  - name: career_direction
    trigger_examples:
      - "我不知道适合什么岗位"
      - "职业方向迷茫"
      - "我该做什么工作"
    required_inputs: [some_background]
    missing_input_questions:
      some_background: "请告诉我你的教育背景和工作经历，或者粘贴简历"
    primary_skill: profile-builder
    secondary_skills: [knowledge-graph-query]
    evidence_needed: [user_background]
    confidence_gate: has education OR experience info
    fallback: "信息不足，只能给通用方向建议"

  - name: interview_prep
    trigger_examples:
      - "我明天要面试"
      - "怎么准备面试"
      - "XX公司面试考什么"
    required_inputs: [company, role]
    missing_input_questions:
      company: "面试哪家公司？"
      role: "面试什么岗位？"
    primary_skill: interview-intelligence
    secondary_skills: [knowledge-graph-query, profile-builder]
    evidence_needed: [company, role]
    confidence_gate: company in knowledge_graph
    fallback: "该公司不在知识库中，提供通用面试框架"

  - name: interview_debrief
    trigger_examples:
      - "我面完了"
      - "帮我复盘面试"
      - "面试表现怎么样"
    required_inputs: [interview_notes]
    missing_input_questions:
      interview_notes: "请描述面试过程：问了什么问题、你怎么回答的"
    primary_skill: interview-debrief
    secondary_skills: [profile-builder]
    evidence_needed: [interview_notes]
    confidence_gate: interview_notes.length >= 50
    fallback: "描述太简短，请补充更多细节"

  - name: offer_evaluation
    trigger_examples:
      - "这个 offer 值不值得接"
      - "帮我比较 offer"
      - "薪资合理吗"
    required_inputs: [offer_details]
    missing_input_questions:
      offer_details: "请提供 offer 详情：公司、岗位、薪资结构、福利"
    primary_skill: offer-comparator
    secondary_skills: [knowledge-graph-query, source-quality-auditor]
    evidence_needed: [offer_details]
    confidence_gate: has company + salary
    fallback: "信息不完整，列出缺失项"

  - name: company_check
    trigger_examples:
      - "这家公司怎么样"
      - "是不是坑"
      - "公司靠谱吗"
    required_inputs: [company_name]
    missing_input_questions:
      company_name: "哪家公司？"
    primary_skill: source-quality-auditor
    secondary_skills: [knowledge-graph-query]
    evidence_needed: [company_name]
    confidence_gate: company in knowledge_graph
    fallback: "该公司不在知识库中，无法做出可靠判断"

  - name: salary_check
    trigger_examples:
      - "这个薪资合理吗"
      - "XX岗位一般多少钱"
      - "查薪资"
    required_inputs: [role, company?]
    missing_input_questions:
      role: "什么岗位？"
    primary_skill: salary-radar
    secondary_skills: [knowledge-graph-query]
    evidence_needed: [role]
    confidence_gate: role in knowledge_graph
    fallback: "降级到知识图谱历史数据，标注非实时"

  - name: find_interview_experience
    trigger_examples:
      - "帮我找面经"
      - "XX公司面经"
      - "面试经验"
    required_inputs: [company, role?]
    missing_input_questions:
      company: "哪家公司的面经？"
    primary_skill: interview-intelligence
    secondary_skills: [source-quality-auditor]
    evidence_needed: [company]
    confidence_gate: has interview data in knowledge_graph or adapters
    fallback: "无面经数据，建议手动搜索牛客/小红书"

  - name: write_message
    trigger_examples:
      - "帮我写求职信"
      - "写内推消息"
      - "写感谢信"
    required_inputs: [purpose, target]
    missing_input_questions:
      purpose: "写什么类型的消息？（求职信/内推/感谢信/跟进）"
      target: "发给谁？（公司名/岗位/联系人）"
    primary_skill: networking-message-writer
    secondary_skills: [profile-builder]
    evidence_needed: [purpose, target]
    confidence_gate: true
    fallback: "降级到通用模板 + AI 个性化"

  - name: daily_planning
    trigger_examples:
      - "今天该做什么"
      - "每日计划"
      - "秋招计划"
    required_inputs: []
    missing_input_questions: {}
    primary_skill: daily-plan-generator
    secondary_skills: [knowledge-graph-query, profile-builder]
    evidence_needed: [current_date]
    confidence_gate: true
    fallback: "基于知识图谱时间线给出通用建议"
```

### 路由规则

1. **一句话可能触发多个 skill**：主理人根据 intent 的 secondary_skills 自动编排调用链
2. **先判断是否缺信息**：检查 required_inputs 是否齐全，缺则追问
3. **缺信息时先追问**：使用 missing_input_questions 中的问题，不硬调用
4. **涉及市场事实必须审计**：如果输出中包含公司评价/薪资/市场判断，必须调用 source-quality-auditor
5. **confidence_gate 决定降级**：gate 不通过时使用 fallback 行为

---

## 3. Evidence Store 具体设计

### Local JSONL Mode（MVP 默认）

```
.evidence/
  user_profile.json           # 当前用户画像
  resumes/
    resume_2026-05-26.json    # 带时间戳的简历解析结果
  jds/
    jd_bytedance_be.json      # 按公司+岗位命名的 JD 解析结果
  skill_runs/
    2026-05-26T10-30-00_jd-analyzer.jsonl  # 每次 skill 运行记录
  sources.jsonl               # 所有来源审计记录（追加写）
```

每条 evidence 记录（JSONL 中每行一条）：

```json
{
  "id": "ev_20260526_001",
  "source_type": "user_resume",
  "source_name": "张三_简历_2026.pdf",
  "source_url": null,
  "content_excerpt": "4年后端开发经验，熟悉Java/Go...",
  "created_at": "2026-05-26T10:30:00Z",
  "observed_at": "2026-05-26T10:30:00Z",
  "published_at": null,
  "freshness": "current",
  "confidence": "high",
  "used_by_skill": "profile-builder",
  "user_private": true,
  "retention_policy": "until_user_deletes"
}
```

### SQLite Mode（Phase 2+）

```sql
-- 核心表
CREATE TABLE evidence_items (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT,
  content_excerpt TEXT,
  created_at TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  published_at TEXT,
  freshness TEXT CHECK(freshness IN ('current','recent','stale')),
  confidence TEXT CHECK(confidence IN ('high','medium','low')),
  used_by_skill TEXT,
  user_private INTEGER DEFAULT 1,
  retention_policy TEXT DEFAULT 'until_user_deletes'
);

CREATE TABLE user_profile (
  id TEXT PRIMARY KEY,
  profile_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER DEFAULT 1
);

CREATE TABLE skill_runs (
  id TEXT PRIMARY KEY,
  skill_name TEXT NOT NULL,
  input_hash TEXT,
  output_json TEXT,
  evidence_ids TEXT,  -- comma-separated evidence IDs used
  confidence TEXT,
  ran_at TEXT NOT NULL
);

CREATE TABLE source_records (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  grade TEXT CHECK(grade IN ('A','B','C','D')),
  url TEXT,
  verified_at TEXT,
  verification_status TEXT
);

CREATE TABLE confidence_audits (
  id TEXT PRIMARY KEY,
  skill_run_id TEXT REFERENCES skill_runs(id),
  overall_confidence TEXT,
  dimension_scores TEXT,  -- JSON
  audited_at TEXT NOT NULL
);
```

---

## 4. 默认知识库格式

```
knowledge/
  graph/
    nodes/
      companies.seed.yaml       # Stage A: 50 家公司种子数据
      company-types.yaml        # 公司类型枚举
      roles.yaml                # 岗位节点 (12-15 大类)
      role-categories.yaml      # 岗位大类枚举
      skills.yaml               # 技能节点
      cities.yaml               # 城市节点
      timelines.yaml            # 校招/社招时间线
      signals.yaml              # JD 黑话/风险信号
      source-platforms.yaml     # 信息平台 + 等级
    edges/
      company-type.yaml         # Company → CompanyType
      company-role.yaml         # Company → Role
      role-skill.yaml           # Role → Skill
      role-transition.yaml      # Role → Role 转换路径
      signal-meaning.yaml       # Signal → 含义
    meta/
      freshness.yaml            # 每个节点的 freshness 标注
      version.yaml              # 图版本信息
    aliases.yaml                # 公司别名去重表
  rubrics/
    resume-rubric.yaml          # 简历评分规则
    jd-rubric.yaml              # JD 解析规则
    match-rubric.yaml           # 匹配评分维度和权重
    source-quality-rubric.yaml  # 来源质量分级规则
    offer-comparison-rubric.yaml # Offer 比较框架
  market-vocabulary/
    china-job-search-terms.yaml # 中国求职黑话完整表
  examples/
    company-profile-example.yaml # 公司节点示例
    role-profile-example.yaml    # 岗位节点示例
```

每个知识条目必须有：

```yaml
# 以公司节点为例
- id: tencent
  name: 腾讯
  description: "中国头部互联网公司，业务覆盖社交/游戏/云/金融"
  source: "企业官网 + 牛客面经 + 公开财报"
  confidence: high
  last_reviewed_at: "2026-05-26"
  applies_to: ["校招", "社招", "实习"]
  limitations: ["不同BG差异大，以上为通用信息"]
```

---

## 5. Installer / Setup 具体设计

### 安装方式

```bash
# 方式 1: Claude Code plugin (推荐)
npx skills add @career-skills/marketplace

# 方式 2: 手动 clone
git clone https://github.com/career-skills/marketplace.git
cd marketplace
npm run setup
```

### setup 脚本做什么

```
Step 1: 检查 Node.js >= 18
Step 2: 检查 npm/pnpm
Step 3: 创建 .evidence/ 目录（JSONL mode）
Step 4: 导入 seed knowledge（复制 knowledge/ 到工作目录）
Step 5: 检测 AI provider 配置（扫描环境变量）
Step 6: 跑 smoke tests（验证 skill 文件完整性）
Step 7: 输出可用能力清单
```

### 不做的事

- 不删除用户数据
- 不 kill 全部 node 进程
- 不修改系统 PATH
- 不要求 sudo/管理员权限
- 不自动安装 Python/Docker

### setup 输出示例

```
Career Skills Marketplace v1.0.0 Ready
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Core Skills:
  ✓ career-principal
  ✓ profile-builder
  ✓ jd-analyzer
  ✓ resume-tailor
  ✓ match-diagnosis
  ✓ source-quality-auditor

Knowledge Graph:
  ✓ 50 companies loaded (Stage A seed)
  ✓ 12 role categories loaded
  ✓ 18 market vocabulary terms loaded
  ✓ 4 rubrics loaded

Evidence Store:
  ✓ .evidence/ initialized (JSONL mode)

Optional (not configured):
  - XHS adapter: not installed
  - Nowcoder adapter: not installed
  - Web search: no API key

Next steps:
  career ask "帮我分析一个 JD"
  career run jd-analyzer --file jd.txt
```

---

## 6. Runtime 形态

### MVP 支持：CLI + Skill Files

```bash
# 对话模式（通过 Career Principal）
career ask "帮我看这个 JD 值不值得投"

# 直接调用特定 skill
career run jd-analyzer --file jd.txt
career run resume-tailor --resume resume.md --jd jd.txt
career run match-diagnosis --resume resume.md --jd jd.txt

# 查看状态
career doctor          # 检查配置和可用能力
career skills          # 列出所有可用 skill
career evidence list   # 列出本地证据
```

### Agent Skill Runtime（同步支持）

Claude Code / Codex / Gemini CLI 加载 SKILL.md 后直接在对话中使用：

```
用户在 Claude Code 中: "帮我分析这个 JD [粘贴内容]"
→ Career Principal SKILL.md 被触发
→ 调度 jd-analyzer
→ 输出结构化分析
```

### Local API（Phase 3+，当前不做）

```
POST /skills/jd-analyzer/run
POST /principal/ask
GET  /evidence/list
GET  /skills
GET  /doctor
```

### 优先级

| Runtime | 支持阶段 | 原因 |
|---------|---------|------|
| CLI (`career` 命令) | Phase 1 MVP | 最轻量，跨平台 |
| Skill Files (SKILL.md) | Phase 1 MVP | Anthropic 标准，被 17+ 环境支持 |
| Local API | Phase 3+ | 需要 HTTP server，增加复杂度 |
| Web UI | 不做 | 产品形态是 plugin，不是 app |

---

## 7. 输出格式统一

所有 skill 输出必须包含的基础字段：

```json
{
  "skill_name": "jd-analyzer",
  "skill_version": "1.0.0",
  "summary": "字节后端开发 JD 分析：核心要求 Java 3年+，存在加班风险信号",
  "confidence": "high",
  "evidence_used": [
    {
      "evidence_id": "ev_001",
      "source_type": "jd_text",
      "confidence": "high",
      "freshness": "current"
    }
  ],
  "recommendations": ["补充分布式经验描述", "确认英语水平"],
  "risks": ["JD 含加班信号"],
  "next_actions": ["上传简历做匹配诊断"],
  "follow_up_questions": ["你的分布式经验有多深？"],
  "cannot_determine": ["薪资范围（JD 未提供）"],

  "_meta": {
    "ran_at": "2026-05-26T10:30:00Z",
    "duration_ms": 3200,
    "knowledge_graph_version": "1.0.0"
  }
}
```

每个 skill 在此基础上扩展自己的业务字段（如 jd-analyzer 添加 `parsed_fields`、`risk_signals` 等），但基础字段不可省略。

主理人汇总多 skill 输出时，按以下规则：
- `confidence` = 所有 skill 中最低的（木桶原则）
- `evidence_used` = 所有 skill 的 evidence 合并去重
- `cannot_determine` = 所有 skill 的合并
- `risks` = 所有 skill 的合并去重

---

## 8. 降级策略

| 缺失条件 | 影响 | 降级行为 |
|---------|------|---------|
| 没有 AI API key | 所有 AI skill 不可用 | 只提供知识图谱查询（JD 黑话/时间线/公司信息）；提示配置 API key |
| 没有 XHS adapter | 无小红书面经 | 不提供用户之声类信息；提示"建议手动搜索小红书" |
| 没有 Web Search | 无实时市场数据 | 降级到知识图谱历史数据；所有市场判断标注"非实时" |
| 没有简历 | 无法构建画像 | 追问用户提供简历或口述背景；不做个性化分析 |
| 没有 JD | 无法做 JD 匹配 | 只能做通用职业规划和画像分析 |
| 证据冲突 | 多来源矛盾 | 输出所有来源各自说法 + conflict 标记；不强行合并 |
| 证据不足 | 数据太少 | 输出 `confidence: "insufficient"` + 需要补充什么 |
| Skill 调用失败 | 某个 sub-skill 报错 | 返回已完成步骤 + 标注失败步骤 + 不编造 |
| 知识图谱无数据 | 公司/岗位不在图谱中 | 标注"该公司/岗位不在知识库中"；不编造 |

---

## 9. 评估集最低要求

### Per-Skill Eval（每个 MVP skill 至少 5 个）

| Eval 类型 | 说明 | 每 skill |
|----------|------|---------|
| Happy path | 完整正常输入 | 1 |
| Low evidence | 证据不足降级 | 1 |
| Conflicting evidence | 来源冲突 | 1 |
| Bad input | 非法/空/无关输入 | 1 |
| Hallucination guard | 防编造 | 1 |

**6 skill × 5 eval = 30 个 skill-level eval（最低要求）**

### Workflow Eval（10 个端到端场景）

| # | 场景 | 测试什么 |
|---|------|---------|
| 1 | JD → match → resume 完整闭环 | 多 skill 串联正确性 |
| 2 | profile → career path 建议 | 画像到规划链路 |
| 3 | JD 太短（<30字） | 链路中某步降级 |
| 4 | 简历要求编造经历 | 全链路拒绝 |
| 5 | 来源冲突（牛客 vs 小红书） | 冲突传播和标注 |
| 6 | 低质量市场来源 | source-quality-auditor 过滤 |
| 7 | 无外部 adapter | 全链路降级 |
| 8 | 中国市场特有场景（秋招/五险一金） | 知识图谱正确引用 |
| 9 | 英文 JD + 中文简历 | 跨语言处理 |
| 10 | 用户要求违法/不道德建议 | 拒绝 + 引导 |

**总计最低要求：30 + 10 = 40 个 eval**

---

## 10. 开源贡献规范

### 必须创建的文件

| 文件 | 职责 |
|------|------|
| `CONTRIBUTING.md` | 贡献指南：如何提交 PR、代码风格、审核流程 |
| `CODE_OF_CONDUCT.md` | 行为准则 |
| `SECURITY.md` | 安全漏洞报告流程 |
| `.github/PULL_REQUEST_TEMPLATE.md` | PR 模板：checklist + 变更说明 |
| `.github/ISSUE_TEMPLATE/` | Issue 模板：bug report / feature request / data correction |

### 数据贡献红线

| 红线 | 说明 |
|------|------|
| 不能提交真实个人简历 | 所有 examples 必须为虚构或已脱敏 |
| 不能提交真实用户聊天 | 对话 examples 必须虚构 |
| 不能提交盗版全文内容 | 公众号/付费面经只能存链接+摘要 |
| 不能提交无来源薪资数据 | 每条薪资必须标注来源+年份 |
| 公司画像必须带来源 | source 字段不能为空 |
| 争议信息必须标注 confidence | 如"裁员传闻"标注 confidence: low |
| 外企中国岗位和海外岗位分开 | 不能把全球薪资当中国参考 |
| 未上市公司标注 needs_verification | 融资/规模不确定就打标 |

---

## 11. 许可证和数据版权

### 分层许可

| 内容 | 许可 | 原因 |
|------|------|------|
| 代码（skills, CLI, validators） | MIT | 最大化社区采用 |
| 知识库种子数据（knowledge/） | CC BY 4.0 | 允许使用和修改，但要求署名 |
| 用户数据（.evidence/） | Never collected | 永不上传、永不入 Git |
| 外部内容 | 仅存摘要/元数据/链接 | 避免版权风险 |

### 外部内容引用规则

```
小红书/牛客/公众号内容：
  ✓ 可以存储：source_url, 发布日期, 作者名, 100字以内摘要
  ✗ 不可以存储：全文内容、原文截图、付费内容
  ✓ 可以在输出中引用："根据[来源](url)，..."
  ✗ 不可以打包进 repo 的 knowledge/ 目录
```

---

## 12. 安全和隐私

| 规则 | 实现 |
|------|------|
| API key 不进 git | .gitignore 包含 .env / .env.local / *.key |
| .env 不提交 | 只提交 .env.example（无真实值） |
| evidence store 默认本地 | .evidence/ 在 .gitignore 中 |
| 用户简历默认 private | evidence 记录 user_private: true |
| 支持清除本地数据 | `career evidence clear` 命令 |
| 输出不含隐藏敏感信息 | 输出中不包含 API key / 文件绝对路径 |
| 日志不写完整简历/密钥 | skill_runs 中 input_hash 代替原文 |

---

## 13. Examples 必须真实

### 6 个核心 Examples

#### Example 1: 应届生投字节后端

```yaml
input:
  user: "我是25届计算机本科，想投字节后端开发，这是 JD 和简历"
  resume: "[虚构的应届生简历：2个实习+3个项目+Java/Go]"
  jd: "[字节后端开发 JD：3年经验优先/分布式/Go]"
invoked_skills: [profile-builder, jd-analyzer, match-diagnosis, resume-tailor]
output:
  match_score: 58
  key_finding: "经验年限不达标（JD 写3年优先），但技术栈匹配"
  resume_changes: 3 处修改建议
evidence: [resume 解析, JD 解析, 知识图谱公司数据]
confidence: medium
why_trustworthy: "匹配度基于简历+JD 双端数据；低于 JD 要求的部分诚实标出"
```

#### Example 2: 双非文科转产品

```yaml
input:
  user: "我是双非中文系毕业，工作2年做编辑，想转产品经理"
invoked_skills: [profile-builder, knowledge-graph-query]
output:
  feasibility: "challenging"
  skill_gap: ["数据分析", "PRD撰写", "用户研究方法论"]
  transition_path: "编辑→内容运营→产品运营→产品经理"
evidence: [画像, 知识图谱 role-transition 路径]
confidence: medium
why_trustworthy: "路径基于知识图谱中的真实转型案例模式，非 AI 编造"
```

#### Example 3: 运营岗小红书面经准备

```yaml
input:
  user: "美团运营岗明天面试，有没有面经"
invoked_skills: [knowledge-graph-query, source-quality-auditor]
output:
  interview_info: "美团运营面试通常3-4轮，重数据思维和案例分析"
  available_data: "知识图谱中有通用信息，无近期面经"
  suggestion: "建议在小红书搜索'美团 运营 面经'补充"
evidence: [知识图谱]
confidence: low
why_trustworthy: "诚实标注没有近期面经数据，不编造面试题"
```

#### Example 4: 英文 JD + 中文简历

```yaml
input:
  user: "这是微软的 JD（英文），这是我的简历（中文），帮我分析"
invoked_skills: [profile-builder, jd-analyzer, match-diagnosis, resume-tailor]
output:
  match_score: 72
  language_note: "JD 为英文，简历为中文，改写建议保持中文格式"
  key_changes: "增加英文关键词匹配"
evidence: [简历, JD, 知识图谱外企信息]
confidence: high
why_trustworthy: "两端数据充分；外企分析参考知识图谱中的微软数据"
```

#### Example 5: Offer 北京 vs 上海

```yaml
input:
  user: "拿了两个 offer，北京字节30W vs 上海腾讯28W，选哪个"
invoked_skills: [knowledge-graph-query, source-quality-auditor]
output:
  comparison: "字节总包高但加班强度大；腾讯 WLB 相对好"
  cost_of_living: "北京生活成本略高于上海"
  effective_hourly: "字节约172/时 vs 腾讯约195/时（估算）"
  missing_info: ["具体加班时长", "团队文化", "五险一金比例"]
evidence: [用户提供的 offer 数据, 知识图谱]
confidence: medium
why_trustworthy: "基于用户提供的 offer 数据 + 知识图谱通用信息；加班时长为估算"
```

#### Example 6: 证据不足，拒绝高置信判断

```yaml
input:
  user: "XX科技这家公司怎么样"（XX科技不在知识图谱中）
invoked_skills: [knowledge-graph-query, source-quality-auditor]
output:
  status: "insufficient_data"
  message: "XX科技不在知识库中，我无法做出可靠判断"
  suggestion: "建议通过以下方式验证：1)天眼查查工商信息 2)脉脉搜索员工评价 3)Boss直聘看JD数量"
evidence: []
confidence: insufficient
why_trustworthy: "诚实拒绝而非编造——这正是 evidence layer 的核心价值"
```

---

## 14. Phase 1 Implementation Plan 前置条件

在进入 writing-plans 前，以下决策已确认：

| 决策项 | 确认值 | 来源 |
|--------|--------|------|
| npm scope | `@career-skills` | 用户确认 |
| repo name | `career-skills-marketplace` | Codex 建议，用户认可 |
| MVP 语言 | 中文输出，schema 英文字段 | 用户确认 |
| License | Code: MIT, Knowledge: CC BY 4.0 | Codex 建议，用户认可 |
| Runtime target | CLI + Skill Files first | Codex 建议，用户认可 |
| Evidence store | MVP 先 JSONL，SQLite Phase 2 | Codex 建议，用户认可 |
| Initial companies | 50 家 (Stage A seed) | 用户确认 |
| Initial roles | 12-15 大类 | Codex 建议 |
| CLI in MVP | Yes (`career` 命令) | Codex 建议 |
| AI Provider | 完全可插拔，无默认 | 用户确认 |

### 仍需确认

| 问题 | 影响 | 建议 |
|------|------|------|
| 初始 50 家公司的具体名单 | Phase 1 知识图谱种子 | 见 roadmap 中的分类表，按类别配额选取 |
| CLI 工具名 `career` 是否确认 | package.json bin 字段 | 建议 `career`，简短好记 |
| 是否包含 `career doctor` 命令 | Phase 1 scope | 建议包含，是开箱即用体验的关键 |
| Eval 框架选型 | 测试基础设施 | 建议 JSON fixture + 自定义 assertion，不引入重框架 |

---

## 15. 文档交叉引用

| 文档 | 路径 | 覆盖内容 |
|------|------|---------|
| Phase 0 设计审计 | `docs/codex-handoff/career-skills-marketplace-design-audit.md` | MVP 6 skill 详细设计 + evidence layer + 可信机制 + 15 章完整审计 |
| 完整 Roadmap | `docs/codex-handoff/career-skills-marketplace-full-roadmap.md` | 5 层 35 skill + 12 intent 路由 + 知识图谱 + 7 Phase |
| 实现约束（本文） | `docs/codex-handoff/career-skills-marketplace-implementation-constraints.md` | skill 文件格式 + router + evidence store + 降级 + eval + 贡献规范 + 安全 |
