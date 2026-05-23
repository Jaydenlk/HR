# Coach Platform — 完整设计规格

> 应届生求职操作系统 · 20 人 SaaS · 产品化品质

---

## 1. 产品定位

Coach 是一个给 20 名应届生使用的求职操作系统。不是工具集合，是围绕"从准备到拿 offer"整条链路的系统性陪伴。

**核心理念：** 把秋招拆成每天能完成的小步骤，让用户做完今天的事就可以休息。

**用户画像：** 2026 届应届毕业生，投互联网大厂技术岗，正在经历 3-6 个月的秋招。

---

## 2. 功能全景

### 2.1 四个视角

| 视角 | 模块 | 核心价值 | 更新频率 |
|------|------|----------|----------|
| 日 | Today | 今天该做什么 — 5 步任务 + streak | 每天 |
| 期 | Monthly | 市场在发生什么 — 面经 + 热点 + 编辑精选 | 实时 |
| 场 | Interview | 这场面试怎么样 — 录音→转写→逐题评估→预测 | 每场面试后 |
| 面 | Overview | 整个秋招什么位置 — funnel + 薪资 + 能力 | 每周 |

### 2.2 Coach 对话

贯穿所有功能的 AI 中枢。独立入口 + 上下文入口（从任意功能进入带上下文）。

### 2.3 六个工具

| 工具 | 核心价值 |
|------|----------|
| 简历馆 | 一份简历一个岗位，JD 匹配 + 改写 |
| 模拟面试 | 语音/文字练习 + 实时评分 |
| 求职信 | 三种语气 + 定长 + 一键生成 |
| 薪资雷达 | 分位定位 + 同岗对比 |
| 投递追踪 | 看板 + 节点提醒 |
| 职业地图 | 路径推荐 + 技能 gap |

### 2.4 Landing

营销首页，最后做。

---

## 3. 开发顺序

```
Phase 1: 简历馆（简历库 + JD 匹配 + 改写建议）
Phase 2: Coach 对话 + 小红书 MCP 趋势发现
Phase 3: 投递追踪
Phase 4: 面试复盘
Phase 5: 模拟面试
Phase 6: Today
Phase 7: Overview
Phase 8: 薪资雷达 / 求职信 / 职业地图 / 月刊
Phase 9: Landing
```

---

## 4. 技术架构

### 4.1 技术栈

```
前端：Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui
后端：NestJS + TypeORM + PostgreSQL
缓存：Node 内存缓存（node-cache）— 不用 Redis，省内存
文件：阿里云 OSS
AI：  Claude / OpenAI API（分层调用）
部署：阿里云 ECS（2C2G）
```

### 4.2 2C2G 内存规划

| 组件 | 预估内存 | 说明 |
|------|----------|------|
| 系统 + nginx | ~200MB | OS + 静态文件服务 |
| PostgreSQL | ~300MB | shared_buffers=128MB，调优低内存配置 |
| NestJS API | ~300MB | 含 node-cache 内存缓存 |
| Next.js（静态导出） | ~0MB | 编译为静态文件，nginx 直接托管 |
| 预留 | ~200MB | 峰值 + AI 请求并发 |
| **合计** | **~1,000MB** | 2GB 内安全余量 |

**关键决策：**
- Next.js 使用 `output: 'export'` 静态导出，不跑 Node SSR 进程
- 不用 Redis，用 node-cache（进程内缓存，20 人够用）
- PostgreSQL 调低 shared_buffers / work_mem / effective_cache_size
- 不用 Docker，直接 systemd 管理进程

### 4.3 部署架构

```
阿里云 ECS (2C2G)
├── nginx
│   ├── 静态文件（Next.js export）  → port 80/443
│   └── 反向代理 /api/*           → NestJS :3000
├── NestJS API                    → port 3000
│   └── node-cache（JD 解析缓存）
├── PostgreSQL 16                 → port 5432
└── 阿里云 OSS（外部）             → 简历文件存储
```

### 4.4 后端模块拆分（NestJS）

```
src/
├── auth/          ← 邀请码登录 + JWT
├── users/         ← 用户 CRUD
├── resumes/       ← 简历库 + 版本管理
├── diagnoses/     ← 诊断引擎
├── conversations/ ← Coach 对话
├── applications/  ← 投递追踪
├── interviews/    ← 面试复盘
├── mock/          ← 模拟面试
├── tasks/         ← 每日任务
├── feed/          ← 月刊内容管道
├── ai/            ← AI 调用封装
│   ├── parser.service.ts     ← 简历/JD 解析（Haiku）
│   ├── analyzer.service.ts   ← 匹配分析（Sonnet）
│   ├── rewriter.service.ts   ← 改写建议（Sonnet）
│   └── chat.service.ts       ← 对话管理
├── files/         ← OSS 上传/下载
└── common/        ← Guards, Pipes, Filters, DTOs
```

---

## 5. 数据模型

### 5.1 核心实体

```sql
-- 用户
users (
  id            UUID PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  name          VARCHAR(100) NOT NULL,
  avatar_url    TEXT,
  invite_code   VARCHAR(20) NOT NULL,
  locale        VARCHAR(5) DEFAULT 'zh',
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
)

-- 简历
resumes (
  id            UUID PRIMARY KEY,
  user_id       UUID REFERENCES users(id),
  title         VARCHAR(200) NOT NULL,
  raw_text      TEXT NOT NULL,
  parsed_json   JSONB,
  file_url      TEXT,
  file_type     VARCHAR(10),  -- pdf / docx / txt
  is_primary    BOOLEAN DEFAULT false,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
)

-- 简历版本
resume_versions (
  id            UUID PRIMARY KEY,
  resume_id     UUID REFERENCES resumes(id),
  version_num   INTEGER NOT NULL,
  raw_text      TEXT NOT NULL,
  parsed_json   JSONB,
  change_note   VARCHAR(500),
  created_at    TIMESTAMP DEFAULT NOW()
)

-- 诊断记录
diagnoses (
  id            UUID PRIMARY KEY,
  user_id       UUID REFERENCES users(id),
  resume_id     UUID REFERENCES resumes(id),
  jd_text       TEXT NOT NULL,
  jd_parsed     JSONB,
  jd_company    VARCHAR(200),
  jd_role       VARCHAR(200),
  score         INTEGER,  -- 0-100
  dimensions    JSONB,    -- { skills: 22, experience: 20, ... }
  keywords_hit  JSONB,    -- ["React", "TypeScript", ...]
  keywords_miss JSONB,    -- ["Next.js", "Monorepo", ...]
  suggestions   JSONB,    -- [{ original, suggested, reason, priority, section }, ...]
  created_at    TIMESTAMP DEFAULT NOW()
)

-- 对话
conversations (
  id            UUID PRIMARY KEY,
  user_id       UUID REFERENCES users(id),
  title         VARCHAR(200),
  context_type  VARCHAR(20),  -- diagnosis / interview / application / free
  context_id    UUID,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
)

-- 消息
messages (
  id            UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id),
  role          VARCHAR(10) NOT NULL,  -- user / assistant
  content       TEXT NOT NULL,
  rich_card     JSONB,      -- 富卡片数据（诊断结果卡、改写卡等）
  tool_used     VARCHAR(50), -- resume_studio / mock / etc.
  created_at    TIMESTAMP DEFAULT NOW()
)

-- 投递
applications (
  id            UUID PRIMARY KEY,
  user_id       UUID REFERENCES users(id),
  company       VARCHAR(200) NOT NULL,
  role          VARCHAR(200) NOT NULL,
  location      VARCHAR(100),
  stage         VARCHAR(20) NOT NULL,  -- wishlist / applied / interview / final / offer / rejected
  salary_range  VARCHAR(50),
  deadline      DATE,
  referrer      VARCHAR(100),
  notes         TEXT,
  resume_id     UUID REFERENCES resumes(id),
  diagnosis_id  UUID REFERENCES diagnoses(id),
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
)

-- 投递事件
application_events (
  id             UUID PRIMARY KEY,
  application_id UUID REFERENCES applications(id),
  from_stage     VARCHAR(20),
  to_stage       VARCHAR(20) NOT NULL,
  note           VARCHAR(500),
  created_at     TIMESTAMP DEFAULT NOW()
)

-- 面试记录
interviews (
  id             UUID PRIMARY KEY,
  user_id        UUID REFERENCES users(id),
  application_id UUID REFERENCES applications(id),
  round          VARCHAR(100) NOT NULL,
  interview_at   TIMESTAMP,
  duration_min   INTEGER,
  interviewer    VARCHAR(100),
  audio_url      TEXT,
  transcript     TEXT,
  overall_grade  VARCHAR(5),
  scores         JSONB,
  questions      JSONB,
  prediction     JSONB,
  created_at     TIMESTAMP DEFAULT NOW()
)

-- 模拟面试
mock_sessions (
  id             UUID PRIMARY KEY,
  user_id        UUID REFERENCES users(id),
  application_id UUID,
  jd_text        TEXT,
  mode           VARCHAR(10),  -- voice / text
  questions      JSONB,
  answers        JSONB,
  evaluation     JSONB,
  filler_count   INTEGER,
  created_at     TIMESTAMP DEFAULT NOW()
)

-- 每日任务
daily_tasks (
  id             UUID PRIMARY KEY,
  user_id        UUID REFERENCES users(id),
  task_date      DATE NOT NULL,
  title          VARCHAR(200) NOT NULL,
  duration_min   INTEGER,
  task_type      VARCHAR(20),  -- practice / apply / review / learn / resume
  reason         TEXT,
  status         VARCHAR(10) DEFAULT 'todo',  -- todo / done
  linked_type    VARCHAR(20),
  linked_id      UUID,
  created_at     TIMESTAMP DEFAULT NOW()
)

-- 求职信
cover_letters (
  id             UUID PRIMARY KEY,
  user_id        UUID REFERENCES users(id),
  application_id UUID,
  resume_id      UUID REFERENCES resumes(id),
  tone           VARCHAR(20),  -- professional / warm / direct
  length_words   INTEGER,
  content        TEXT NOT NULL,
  version        INTEGER DEFAULT 1,
  created_at     TIMESTAMP DEFAULT NOW()
)

-- 面经内容
feed_items (
  id             UUID PRIMARY KEY,
  source         VARCHAR(20) NOT NULL,  -- github / nowcoder / ugc / xhs_trend
  source_url     TEXT,
  category       VARCHAR(20),  -- interview_exp / hot / story / question_bank / editorial
  company        VARCHAR(200),
  role           VARCHAR(200),
  title          VARCHAR(500) NOT NULL,
  excerpt        TEXT,
  content        TEXT,
  author         VARCHAR(100),
  tags           JSONB,
  likes          INTEGER DEFAULT 0,
  quality_score  FLOAT,
  published_at   TIMESTAMP,
  created_at     TIMESTAMP DEFAULT NOW()
)
```

---

## 6. AI 链路设计

### 6.1 分层模型策略

| 任务 | 模型 | 输入 token | 输出 token | 单次成本 |
|------|------|-----------|-----------|---------|
| 简历解析（文本→JSON） | Haiku 3.5 | ~3,000 | ~1,500 | $0.004 |
| JD 解析（文本→JSON） | Haiku 3.5 | ~1,800 | ~800 | $0.002 |
| 匹配分析 | Sonnet 4 | ~3,800 | ~2,000 | $0.041 |
| 改写建议 | Sonnet 4 | ~3,500 | ~2,500 | $0.049 |
| **单次诊断合计** | | ~12,100 | ~6,800 | **~$0.096** |

月成本（20人×4次/周×4.3周）= 344 次 × $0.096 ≈ **$33/月**

### 6.2 输出格式控制

所有 AI 调用使用 **tool use / function calling** 保证输出为结构化 JSON。不依赖自由文本解析。

### 6.3 缓存策略

- JD 解析结果缓存到 node-cache（key = JD 文本 hash，TTL = 7 天）
- 同一份 JD 多人诊断只解析一次
- 简历解析结果存 DB（parsed_json 字段），不重复解析

---

## 7. Phase 1 详细设计：简历馆

### 7.1 用户流程

```
首次使用：
  登录 → 空状态 → [上传简历] → 粘贴/上传 PDF/Word
    → AI 解析 → 结构化预览 → 确认保存为主版本

诊断流程：
  [新建诊断] → 选简历（从库/新上传） → 贴 JD（文本/文件）
    → [开始诊断] → 加载动画（~5-10s）
    → 结果页：
      ├── 总分（0-100）+ 5 维度评分条
      ├── 关键词：命中（绿）vs 缺失（红）
      ├── 5 条改写建议（before → after + 理由 + 优先级）
      ├── [采纳] → 生成简历新版本
      ├── [复制] → 剪贴板
      ├── [导出 PDF] → 下载
      └── [问 Coach] → 带上下文进入对话

简历管理：
  简历列表 → 主版本标记 → 每份简历的诊断历史
    → 版本对比 → 导出任意版本
```

### 7.2 页面清单

| # | 页面 | 路由 | 说明 |
|---|------|------|------|
| 1 | 登录 | `/login` | 邀请码 + 邮箱 |
| 2 | 首页 | `/` | 简历库入口 + 最近诊断 |
| 3 | 简历库 | `/resumes` | 列表 + 上传 + 主版本标记 |
| 4 | 简历详情 | `/resumes/[id]` | 结构化预览 + 版本历史 + 诊断历史 |
| 5 | 新建诊断 | `/diagnoses/new` | 选简历 + 贴 JD |
| 6 | 诊断结果 | `/diagnoses/[id]` | 分数 + 维度 + 关键词 + 改写建议 |

### 7.3 API 端点

```
POST   /api/auth/login              ← 邀请码登录
GET    /api/auth/me                 ← 当前用户

POST   /api/resumes                 ← 上传简历（文件或文本）
GET    /api/resumes                 ← 简历列表
GET    /api/resumes/:id             ← 简历详情
PATCH  /api/resumes/:id             ← 更新简历（设主版本等）
DELETE /api/resumes/:id             ← 删除简历
GET    /api/resumes/:id/versions    ← 版本历史
POST   /api/resumes/:id/versions    ← 创建新版本（采纳改写）

POST   /api/diagnoses               ← 创建诊断（触发 AI 分析）
GET    /api/diagnoses               ← 诊断历史列表
GET    /api/diagnoses/:id           ← 诊断详情
POST   /api/diagnoses/:id/adopt     ← 采纳某条建议到简历库
POST   /api/diagnoses/:id/export    ← 导出诊断报告 PDF

POST   /api/files/upload            ← 上传文件到 OSS
```

### 7.4 前端组件结构

```
app/
├── (auth)/
│   └── login/page.tsx
├── (main)/
│   ├── layout.tsx          ← 壳：侧边栏 + 顶栏
│   ├── page.tsx            ← 首页/仪表盘
│   ├── resumes/
│   │   ├── page.tsx        ← 简历库列表
│   │   └── [id]/page.tsx   ← 简历详情
│   └── diagnoses/
│       ├── new/page.tsx    ← 新建诊断
│       └── [id]/page.tsx   ← 诊断结果
└── components/
    ├── shell/              ← 侧边栏、顶栏、导航
    ├── resume/             ← 简历卡片、上传器、版本列表
    ├── diagnosis/          ← 分数环、维度条、关键词云、建议卡
    └── ui/                 ← shadcn/ui 组件
```

### 7.5 设计系统

基于原型 v4 的 Apple 风格：

```
背景：    #fbfbfd
表面：    #ffffff / #f5f5f7 / #eeeef0
文字：    #1d1d1f / #424245 / #6e6e73 / #a1a1a6
线条：    #e5e5e7 / #d2d2d7
品牌色：  #0a84ff（蓝，克制使用）
成功：    #34c759
警告：    #ff9500
危险：    #ff3b30
圆角：    14px / 20px / 28px
字体：    Plus Jakarta Sans + PingFang SC + Noto Sans SC
等宽：    JetBrains Mono
```

---

## 8. 数据源策略

### 8.1 面经数据

```
Phase 1（冷启动）:
  ├── GitHub 面经仓库批量导入（0voice 等）
  ├── 牛客网 RSSHub 订阅
  └── 20 人 UGC

Phase 2（内容管道）:
  ├── RSSHub 多源聚合（牛客 + GitHub + V2EX + 公众号）
  ├── 小红书 MCP 趋势发现（不搬运原文）
  ├── AI 周刊自动生成
  └── 浏览器插件（用户一键导入）

Phase 3（规模化）:
  ├── Apify 按需补充
  └── 面经社区生态
```

### 8.2 薪资数据

- 牛客 offer 晒薪（公开页面）
- 公开薪资报告（猎聘、BOSS 年报）
- 用户自己录入的 offer 数据
- 不爬 OfferShow（明确禁止第三方使用）

---

## 9. 非功能需求

### 9.1 安全

- 邀请码注册（20 人白名单）
- JWT 认证（access + refresh token）
- 对话端到端不用于训练（AI 调用不留日志到第三方）
- 简历文件 OSS 私有 bucket + 签名 URL 访问

### 9.2 性能

- 诊断响应时间 < 15s（AI 调用主要瓶颈）
- 页面首屏 < 2s（静态导出 + CDN）
- 20 人并发无压力

### 9.3 可用性

- 中英双语切换（i18n）
- 桌面端优先，移动端适配
- 深色模式（可选，后期加）

---

## 10. 验收标准

遵循用户定义的开发标准：

### 前端验收
- Playwright 端到端测试，桌面 + 移动端
- 完整用户流程交互（每个按钮、每段输入、每个跳转）
- 正常流程 + 边界情况
- UI + UX 双重检查
- 找茬思维：验证是否有错，不是验证是否对

### 后端验收
- 非 AI 接口：正常结果 + 异常结果测试
- AI 接口：复杂场景测试（决策能力 + 执行能力）
- 完整链路测试

### 代码质量
- 单一职责、最简代码、类型严格、KISS、文档置信度
- 严禁胶水代码和打补丁
- 最终代码必须简洁且完整
