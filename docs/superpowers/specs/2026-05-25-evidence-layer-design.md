# User Intelligence + Evidence Layer — 设计规格

> 状态：设计完成，待 Codex/用户审阅
> 分支：design/evidence-layer
> 日期：2026-05-25

---

## 一、问题

当前三个 service 各自注入 5-7 个跨模块 Repository 做同样的事——读用户数据拼上下文：

| Service | 注入的跨模块 Repository | 目的 |
|---------|----------------------|------|
| CoachContextService | Resume, Diagnosis, Application, DailyTask, Opportunity, OpportunityEvaluation, FeedItem | 为 Chat 拼字符串上下文 |
| OpportunityEvaluatorService | Resume, Diagnosis, FeedItem, SalaryEntry | 为机会评估拼 AI 上下文 |
| NewspaperService | FeedItem, Application, Opportunity, Resume, Diagnosis | 为月刊个性化排序 |

**问题：**
1. 重复：三处各自查简历/投递/机会，逻辑重复
2. 脆弱：任何表结构变化要改三个 service
3. 字符串拼接：CoachContext 输出是大段文字，不可复用
4. 缺乏结构：没有统一的 Evidence 概念，每个 service 自己理解"什么算证据"

---

## 二、目标

创建 **EvidenceService**——唯一的"用户情报聚合点"。所有需要用户上下文的 service 都从它获取结构化 Evidence，而不是自己注入一堆 Repository。

```
Before:
  CoachContext → [Resume, Diagnosis, Application, Task, Opp, Eval, Feed]
  OpportunityEvaluator → [Resume, Diagnosis, Feed, Salary]
  NewspaperService → [Feed, Application, Opp, Resume, Diagnosis]

After:
  CoachContext → EvidenceService
  OpportunityEvaluator → EvidenceService  
  NewspaperService → EvidenceService
  EvidenceService → [Resume, Diagnosis, Application, Task, Opp, Eval, Feed, Salary]
```

---

## 三、Evidence 数据结构

```typescript
interface Evidence {
  source_type: 'resume' | 'diagnosis' | 'application' | 'interview' | 
               'opportunity' | 'task' | 'feed' | 'salary';
  source_id: string;           // 原始记录 ID
  confidence: 'high' | 'medium' | 'low';
  freshness: 'current' | 'recent' | 'stale';  // <7天/7-30天/>30天
  summary: string;             // 一句话摘要
  structured: Record<string, unknown>;  // 结构化数据（不同 source_type 不同结构）
  reason: string;              // 为什么这条证据被选中
}

interface UserIntelligence {
  user_id: string;
  gathered_at: string;  // ISO timestamp
  
  // 结构化 evidence 按类型分组
  resume: Evidence | null;     // 主简历
  skills: string[];            // 从简历提取的技能
  target_roles: string[];      // 推断的目标岗位类型
  
  applications: Evidence[];    // 活跃投递
  application_companies: string[];  // 投递公司列表（去重）
  
  opportunities: Evidence[];   // 已评估机会
  opportunity_companies: string[];
  
  diagnoses: Evidence[];       // 最近诊断
  diagnosis_patterns: { hit: string[]; miss: string[] };  // 聚合的关键词命中/缺失
  
  tasks: Evidence[];           // 今日任务
  
  feed_relevant: Evidence[];   // 与用户相关的面经
  
  salary_context: Evidence[];  // 相关薪资数据
  
  // 聚合信号
  companies_of_interest: string[];  // 合并 applications + opportunities + diagnoses 的公司
  has_resume: boolean;
  has_applications: boolean;
  has_opportunities: boolean;
}
```

---

## 四、EvidenceService 设计

### 4.1 文件位置

`packages/api/src/intelligence/evidence.service.ts` — 新建 intelligence 模块，不放在 conversations 或 feed 中。

### 4.2 核心方法

```typescript
@Injectable()
export class EvidenceService {
  constructor(
    @InjectRepository(Resume) private resumeRepo: Repository<Resume>,
    @InjectRepository(Diagnosis) private diagnosisRepo: Repository<Diagnosis>,
    @InjectRepository(Application) private appRepo: Repository<Application>,
    @InjectRepository(DailyTask) private taskRepo: Repository<DailyTask>,
    @InjectRepository(Opportunity) private oppRepo: Repository<Opportunity>,
    @InjectRepository(OpportunityEvaluation) private evalRepo: Repository<OpportunityEvaluation>,
    @InjectRepository(FeedItem) private feedRepo: Repository<FeedItem>,
    @InjectRepository(SalaryEntry) private salaryRepo: Repository<SalaryEntry>,
  ) {}

  /**
   * 聚合用户全量情报。每个 consumer 按需取子集。
   */
  async gather(userId: string): Promise<UserIntelligence>;

  /**
   * 只获取与某公司相关的 evidence。
   */
  async gatherForCompany(userId: string, company: string): Promise<Evidence[]>;

  /**
   * 只获取与某岗位类型相关的 evidence。
   */
  async gatherForRole(userId: string, roleCategory: string): Promise<Evidence[]>;

  /**
   * 将 UserIntelligence 格式化为 AI prompt 上下文字符串。
   * 这是 CoachContextService.buildContext 的替代品。
   */
  formatForAI(intelligence: UserIntelligence): string;

  /**
   * 返回用户关注的公司列表（用于 Newspaper 个性化排序）。
   */
  async getCompaniesOfInterest(userId: string): Promise<string[]>;
}
```

### 4.3 gather() 内部逻辑

每个数据源查询都是 try/catch 包裹，非致命：

```typescript
async gather(userId: string): Promise<UserIntelligence> {
  const [resume, diagnoses, applications, tasks, opportunities, feed, salary] =
    await Promise.allSettled([
      this.gatherResume(userId),
      this.gatherDiagnoses(userId),
      this.gatherApplications(userId),
      this.gatherTasks(userId),
      this.gatherOpportunities(userId),
      this.gatherRelevantFeed(userId),
      this.gatherSalary(userId),
    ]);
  
  // 组装 UserIntelligence，每个 source 的失败不影响其他
}
```

### 4.4 每个 gather 子方法输出 Evidence

```typescript
private async gatherResume(userId: string): Promise<Evidence | null> {
  const resume = await this.resumeRepo.findOne({
    where: { user_id: userId, is_primary: true },
  });
  if (!resume?.raw_text || resume.raw_text.length < 30) return null;
  
  return {
    source_type: 'resume',
    source_id: resume.id,
    confidence: 'high',
    freshness: this.calcFreshness(resume.updated_at),
    summary: `主简历：${resume.raw_text.slice(0, 100)}...`,
    structured: {
      skills: this.extractSkills(resume),
      experience_count: this.countExperiences(resume),
    },
    reason: '用户主简历',
  };
}
```

---

## 五、消费者迁移计划

### 5.1 CoachContextService

**现状：** 7 个 @InjectRepository，自己查数据，输出字符串。
**迁移：** 注入 EvidenceService，调用 `gather()` + `formatForAI()`。
**影响：** `buildContext(userId)` 内部实现全替换，接口不变。

```typescript
// Before
async buildContext(userId: string): Promise<string> {
  const resume = await this.resumeRepo.findOne(...);
  const apps = await this.appRepo.find(...);
  // ... 7 个查询 + 手动拼字符串
}

// After
async buildContext(userId: string): Promise<string> {
  const intelligence = await this.evidence.gather(userId);
  return this.evidence.formatForAI(intelligence);
}
```

### 5.2 OpportunityEvaluatorService

**现状：** 4 个 @InjectRepository，gatherUserContext() 方法。
**迁移：** 注入 EvidenceService，调用 `gather()` 获取结构化数据，替代自己拼的字符串。
**影响：** `gatherUserContext()` 删除，改为 `evidence.gather(userId)`。

### 5.3 NewspaperService

**现状：** 5 个 @InjectRepository，buildCoachActions() 和个性化排序各自查。
**迁移：** 
- `buildCoachActions()` → `evidence.gather(userId)` + 从 intelligence 读取
- 个性化排序 → `evidence.getCompaniesOfInterest(userId)` 替代自己查 applications + opportunities

### 5.4 迁移顺序

| 阶段 | 动作 | 风险 |
|------|------|------|
| E1 | 创建 EvidenceService + IntelligenceModule | 零风险（新增） |
| E2 | CoachContextService 迁移 | 低（接口不变，输出可能略有格式差异） |
| E3 | NewspaperService 迁移 | 低（个性化排序逻辑不变） |
| E4 | OpportunityEvaluatorService 迁移 | 中（AI prompt 上下文变化可能影响评分） |
| E5 | 删除各 service 中的跨模块 Repository 注入 | 低（只有 E2-E4 全完成后才删） |

每个阶段完成后跑 E2E 确认不回退。

---

## 六、源稳定性设计

### 6.1 FeedSource 扩展

在 `feed_sources` 表新增列：

```typescript
@Column({ type: 'integer', default: 0 })
fail_count: number;

@Column({ type: 'integer', default: 0 })
success_count: number;

@Column({ type: 'datetime', nullable: true })
last_success_at: Date | null;

@Column({ type: 'datetime', nullable: true })
last_error_at: Date | null;

@Column({ type: 'text', nullable: true })
last_error_message: string | null;

@Column({ type: 'varchar', default: 'unknown' })
health: 'healthy' | 'degraded' | 'down' | 'unknown';
```

### 6.2 健康计算规则

| 条件 | health |
|------|--------|
| 最近 3 次全成功 | healthy |
| 最近 3 次有 1 次失败 | degraded |
| 最近 3 次全失败 | down |
| 从未运行 | unknown |

### 6.3 前端展示

在 Newspaper 页面和 Radar 页面的来源状态区域：
- healthy: 绿色 ✓
- degraded: 黄色 ⚠（"最近有失败，数据可能不完整"）
- down: 红色 ✗（"来源不可用：{last_error_message}"）
- unknown: 灰色 ?（"尚未运行"）

### 6.4 Nowcoder 稳定性

**问题：** 依赖单一公共 RSSHub 实例，不稳定。

**方案：**
1. `RSS_FEED_URL` 支持多 URL（逗号分隔），importer 按顺序尝试
2. Fallback 列表：`rsshub.rssforever.com` → `rsshub.app` → 用户自建实例
3. 如果全部失败，source health 标为 down，前端展示原因

### 6.5 WeChat 配置可见性

**问题：** 用户不知道 Docker 没启动、授权过期。

**方案：**
- 启动时 SourceRegistryService 不仅检查 env var 是否存在，还尝试 ping 目标 URL
- 如果 ping 失败，status 设为 `needs_config`，description 更新为具体错误

---

## 七、不做什么

- ❌ 不新建 evidence 表（纯运行时聚合，不持久化）
- ❌ 不做图数据库（TypeORM FK + JOIN 够用）
- ❌ 不做 AI 自动生成 evidence（evidence 来自真实数据）
- ❌ 不改 API 接口（内部重构，外部无感知）

---

## 八、验收标准

- [ ] EvidenceService.gather() 返回结构化 UserIntelligence
- [ ] CoachContextService 改为调用 EvidenceService，Chat 回答质量不下降
- [ ] OpportunityEvaluator 改为调用 EvidenceService，评分结果一致
- [ ] NewspaperService 改为调用 EvidenceService，个性化排序一致
- [ ] 各 service 的跨模块 @InjectRepository 全部删除
- [ ] FeedSource 有 health/fail_count/last_error 字段
- [ ] Nowcoder RSS importer 支持多 URL fallback
- [ ] 前端来源状态显示 health badge
- [ ] PJR：tsc + build + eslint + next build + 全量 E2E
