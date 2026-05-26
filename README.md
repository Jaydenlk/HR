<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/NestJS-11-e0234e?logo=nestjs" alt="NestJS" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/AI-Pluggable-blueviolet" alt="AI" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

# HR - AI Career Intelligence Platform

> 让每一个求职判断都可追溯、可测试、可降级。

HR 包含两个产品层：

| 层 | 产品 | 形态 | 状态 |
|----|------|------|------|
| **Coach Web App** | AI 求职教练 | NestJS + Next.js 全栈 Web 应用 | Production |
| **Career Skills Marketplace** | 求职主理人 + 可调用 skill | Claude Code / Codex Plugin | Phase 1 Complete |

---

## Career Skills Marketplace

**开箱即用的求职判断系统。** 安装后在 Claude Code / Codex 中直接对话使用。

### 6 个 MVP Skills

| Skill | 作用 |
|-------|------|
| `career-principal` | 求职主理人：识别意图，编排下游 skill，汇总输出 |
| `profile-builder` | 从简历或对话中提取结构化能力画像 |
| `jd-analyzer` | 解析 JD 为结构化字段，标注风险信号和中国求职黑话 |
| `match-diagnosis` | 对比画像与 JD，输出多维匹配度评分（分数有区分度，不全是 60-80%） |
| `resume-tailor` | 基于 JD 重组简历表达，不编造经历（zero-fabrication policy） |
| `source-quality-auditor` | 评估信息来源的可信度和时效性（A/B/C/D 四级分级） |

### 内置中国求职知识

- **50 家公司** seed（大厂/中厂/外企/国企/AI初创/出海/金融等 12 类）
- **12 岗位大类**，30 个子岗位（技术/产品/运营/设计/数据等）
- **18 条求职黑话**（泡池子/开奖/HC/OD/三方协议/SP/SSP 等）
- **评分 Rubrics**（简历/JD/匹配/Offer/来源质量）

### 安装

```bash
# Claude Code
git clone https://github.com/Jaydenlk/HR.git
cd HR/career-skills-marketplace
bash install.sh

# Codex
bash install.sh --target codex
```

安装后在 Claude Code 中说：「帮我分析一个 JD」

详细文档：[career-skills-marketplace/README.zh-CN.md](career-skills-marketplace/README.zh-CN.md)

---

## Coach Web App

面向应届生和早期求职者的 AI 求职操作系统。基于**真实用户数据**给出个性化建议。

### 核心能力

| 模块 | 功能 | AI 能力 |
|------|------|--------|
| **今天** | 每日个性化任务清单 | AI 根据求职进度生成 5 个行动项 |
| **机会中心** | JD 评估 + 投递决策 | 三维评分（匹配/价值/可信度）+ 风险检测 |
| **简历馆** | 多版本简历管理 | AI 解析 + JD 匹配诊断 + 改写建议 |
| **投递追踪** | 看板式申请管理 | 状态流转 + 漏斗统计 |
| **面试复盘** | 面试记录分析 | AI 逐题评估 + 维度评分 |
| **模拟面试** | AI 面试官练习 | 题目生成 + 实时评分 + 综合报告 |
| **月刊/面经** | 市场情报聚合 | 多源采集 + AI 分类（小红书/牛客/公众号）|
| **问 Coach** | AI 对话教练 | 读取 10 个核心数据模块的个性化建议 |
| **求职信** | 针对性求职信 | 基于简历 + JD 生成，无数据不编造 |
| **薪资雷达** | 市场薪资参考 | 公司/岗位/城市维度统计 |

### AI 设计原则

- **Evidence Layer** — 聚合 10 个数据模块的结构化证据，每个判断标注来源和置信度
- **不编造** — 缺数据时拒绝生成，不凭空编造简历经历/薪资数据/面经内容
- **风险检测** — 识别 OD/外包、培训引流、薪资虚高、公司信息冲突
- **来源分级** — 小红书/牛客/公众号/脉脉各有不同可信度等级

### 技术栈

```
Next.js 16 + React 19 (前端)
NestJS 11 + TypeORM (后端)
SQLite (dev) / PostgreSQL (prod)
AI Provider: 可插拔 (CloudDreamAI / DeepSeek / OpenAI / Ollama)
```

### 快速开始

```bash
git clone https://github.com/Jaydenlk/HR.git
cd HR
pnpm install

cp packages/api/.env.example packages/api/.env
# 编辑 .env，填入 AI API Key

.\start-dev.ps1
# API: http://localhost:3002
# Web: http://localhost:3001
# 邀请码: COACH2026
```

### 运行测试

```bash
cd packages/api
npx jest --config ./test/jest-e2e.json --runInBand --forceExit
```

---

## 项目结构

```
HR/
├── packages/
│   ├── api/                        # NestJS 后端 (18 个模块)
│   └── web/                        # Next.js 前端 (26 个页面)
├── career-skills-marketplace/      # Claude Code / Codex Plugin
│   ├── skills/                     # 6 个 MVP skills
│   ├── shared/                     # 证据 schema + 来源策略 + rubrics
│   ├── knowledge/                  # 中国求职知识图谱 (50 公司 seed)
│   ├── evals/                      # 40 个测试 fixtures
│   ├── install.sh / install.ps1    # 安装脚本
│   └── docs/                       # 安装/使用/隐私/贡献文档
└── docs/
    ├── codex-handoff/              # 交接文档 + 审计日志 + 设计审计
    └── superpowers/                # 设计 spec + 实施计划
```

---

## 质量标准

| 层 | 检查 | 标准 |
|----|------|------|
| Coach 后端 | 类型检查 | `tsc --noEmit` 0 errors |
| Coach 后端 | 测试 | 36 mock + 6 AI 场景 E2E |
| Coach 前端 | Lint | `eslint src/` 0 errors |
| Coach 前端 | 构建 | `next build` PASS |
| Marketplace | 文件完整性 | 6 skill x 14 required files |
| Marketplace | Schema 合规 | 54 JSON + 20 YAML 全部可解析 |
| Marketplace | 输出统一 | 6 skill 统一 10 个 base required fields |
| Marketplace | 不编造 | 每个 skill 有 hallucination-guard 测试 |

---

## 开发原则

1. **单一职责** — 每个 service/skill 只管一件事
2. **最简代码** — 不做向后兼容，宁愿破坏性更新
3. **类型严格** — 不用 `any`，不用 `as unknown as`
4. **证据优先** — 没有来源就没有高置信结论
5. **诚实降级** — 缺数据时说"我不能判断"，不编造

---

## Roadmap

```
Phase 1  ✅  Skills Marketplace skeleton + 6 MVP skills
Phase 2  ⏳  Local evidence store + interview skills
Phase 3  ⏳  CLI / npm packaging + market intelligence
Phase 4  ⏳  Offer/salary + career strategy skills
Phase 5  ⏳  Knowledge graph expansion (300 → 600 companies)
Phase 6  ⏳  Multi-environment adapters
Phase 7  ⏳  Evaluation benchmark
```

---

## License

- **Code**: [MIT](LICENSE)
- **Knowledge Data**: [CC BY 4.0](career-skills-marketplace/LICENSE-KNOWLEDGE)
