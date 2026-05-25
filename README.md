<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/NestJS-11-e0234e?logo=nestjs" alt="NestJS" />
  <img src="https://img.shields.io/badge/React-19-61dafb?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/AI-CloudDreamAI-blueviolet" alt="AI" />
</p>

# Coach - AI 求职教练

> 把秋招拆成每天能完成的小步骤。

Coach 是一个面向应届生和早期技术岗求职者的 AI 求职操作系统。它基于**真实用户数据**给出个性化建议——读取简历、投递记录、机会评估、诊断历史、任务进度、面经情报和薪资参考（面试复盘、模拟面试、求职信证据接入中）。

---

## 核心能力

### 求职全链路覆盖

| 模块 | 功能 | AI 能力 |
|------|------|--------|
| **今天** | 每日个性化任务清单 | AI 根据求职进度生成 5 个行动项 |
| **机会中心** | JD 评估 + 投递决策 | 三维评分（匹配/价值/可信度）+ 风险检测 |
| **简历馆** | 多版本简历管理 | AI 解析 + JD 匹配诊断 + 改写建议 |
| **投递追踪** | 看板式申请管理 | 状态流转 + 漏斗统计 |
| **面试复盘** | 面试记录分析 | AI 逐题评估 + 维度评分 |
| **模拟面试** | AI 面试官练习 | 题目生成 + 实时评分 + 综合报告 |
| **月刊/面经** | 市场情报聚合 | 多源采集 + AI 分类（小红书/牛客/公众号）|
| **问 Coach** | AI 对话教练 | 读取 7 个模块数据的个性化建议（Evidence Layer） |
| **求职信** | 针对性求职信 | 基于简历 + JD 生成，无数据不编造 |
| **薪资雷达** | 市场薪资参考 | 公司/岗位/城市维度统计 |
| **职业地图** | 发展路径分析 | 基于简历的方向建议 |
| **求职总览** | 数据仪表盘 | 多源聚合的求职进度概览 |

### AI 不是噱头，是真的在用

- **EvidenceService** — 聚合简历/诊断/投递/机会/任务/面经情报/薪资参考 7 个模块的结构化证据（面试复盘/模拟面试/求职信接入中）
- **输入不够就拒绝** — JD 太短、没简历、岗位不明确时直接 400，不让 AI 编造
- **证据链** — 机会评估的每个判断都标注来源和置信度
- **风险检测** — 识别 OD/外包、培训引流、薪资虚高、公司信息冲突
- **不编造** — 没有数据时诚实说"你还没有上传简历"，不凭空生成

### 情报来源

| 来源 | 方式 | 状态 |
|------|------|------|
| 牛客面经 | RSSHub RSS 订阅 | 已接入 |
| 小红书面经 | RedNote-MCP + Playwright | 已接入 |
| 微信公众号 | We-MP-RSS Docker | 已接入 |
| 用户投稿 | 平台内写面经 | 已上线 |

---

## 技术架构

```
┌─────────────────────────────────────────────┐
│  Next.js 16 + React 19                      │
│  Tailwind CSS + lucide-react                │
│  12 个页面路由                                │
├─────────────────────────────────────────────┤
│  NestJS 11 + TypeORM                        │
│  18 个后端模块                                │
│  JWT 认证 + 用户隔离                          │
├─────────────────────────────────────────────┤
│  CloudDreamAI (auto-v2)                     │
│  结构化输出 (tool_use)                        │
│  17 个 AI 调用点，全部有输入校验               │
├─────────────────────────────────────────────┤
│  SQLite (dev) / PostgreSQL (prod)           │
│  TypeORM 自动同步                             │
└─────────────────────────────────────────────┘
```

---

## 快速开始

### 环境要求

- Node.js >= 20
- pnpm

### 安装

```bash
git clone git@github.com:Jaydenlk/hrbp.git
cd hrbp
pnpm install
```

### 配置

```bash
cp packages/api/.env.example packages/api/.env
# 编辑 .env，填入 CLOUDDREAM_API_KEY
```

### 启动开发服务器

```powershell
.\start-dev.ps1
# API: http://localhost:3002
# Web: http://localhost:3001
# 邀请码: COACH2026
```

### 运行测试

```bash
# 后端 E2E
cd packages/api
npx jest --config ./test/jest-e2e.json --runInBand --forceExit

# 前端 Lint + Build
cd packages/web
npx eslint src/
npx next build
```

---

## 项目结构

```
packages/
├── api/                    # NestJS 后端
│   ├── src/
│   │   ├── ai/            # AI 服务（CloudDreamAI 集成）
│   │   ├── auth/           # JWT 认证
│   │   ├── conversations/  # Chat + CoachContextService
│   │   ├── diagnoses/      # 简历-JD 匹配诊断
│   │   ├── feed/           # 月刊/面经（多源采集 + AI 分类）
│   │   ├── opportunity/    # 机会中心（评估 + 风险检测）
│   │   ├── resumes/        # 简历管理
│   │   ├── applications/   # 投递追踪
│   │   ├── interviews/     # 面试复盘
│   │   ├── mock/           # 模拟面试
│   │   ├── tasks/          # 每日任务
│   │   ├── cover-letters/  # 求职信
│   │   ├── salary/         # 薪资数据
│   │   ├── career/         # 职业地图
│   │   └── overview/       # 数据仪表盘
│   └── test/               # E2E 测试（36 mock + 6 AI 场景）
├── web/                    # Next.js 前端
│   └── src/app/(main)/
│       ├── today/          # 今日任务
│       ├── opportunities/  # 机会中心
│       ├── chat/           # Coach 对话
│       ├── digest/         # 月刊/面经
│       ├── resumes/        # 简历馆
│       ├── applications/   # 投递追踪
│       └── ...
└── docs/
    ├── codex-handoff/      # 交接文档 + 审计日志
    └── superpowers/        # 设计 spec + 实施计划
```

---

## 质量保障

| 检查 | 标准 |
|------|------|
| 后端类型 | `tsc --noEmit` 0 errors，禁止 `any` |
| 后端构建 | `nest build` PASS |
| 前端 Lint | `eslint src/` 0 errors（不是 tsc 冒充）|
| 前端构建 | `next build` PASS |
| 后端测试 | 36 mock E2E + 6 真实 AI 场景 |
| AI 校验 | 17 个调用点全部有输入校验 |
| 不编造 | 缺数据时 400 拒绝，不让 AI 凭空生成 |

---

## 开发原则

1. **单一职责** — 每个 service 只管一件事
2. **最简代码** — 不做向后兼容，宁愿破坏性更新
3. **类型严格** — 不用 `any`，不用 `as unknown as`
4. **KISS** — 需要解释就是太复杂
5. **文档置信度** — 不基于推测写关键逻辑

---

## License

[MIT](LICENSE)
