# WP-2：效果闭环埋点施工卡（纯后台，运营层面收集）

> **文档性质：施工卡，用户已裁决"运营层面后台收集，不做用户可见 UI"，可执行；但内含一处交互设计未裁决点（拒绝原因收集，见 §2）需先问用户再定案。**
> 裁决来源：`docs/product-focus/00-master-plan.md` §1（效果闭环数据飞轮 ✅ 采纳，定位=运营层面）+ §4（埋点规格摘要）。
> 勘察日期：2026-07-11，全部 file:line 已实读代码核实。

---

## 0. 一句话结论

现状是"一条完整的转化链路数据分散在四张表里，彼此之间的外键关联链其实已经搭了大半"：`applications.resume_version_id` 已经把"投递用了哪个简历版本"记下来了，`application_events` 已经在记录阶段变化流水。**真正缺的只有链路最上游一环——"用户对哪条诊断建议做了什么动作"完全没有落库**，以及一张能把"建议→版本→投递→结果"串起来的关联字段。不需要推倒重来，是往现有骨架上补一根新柱子+一根连接筋。

---

## 1. 诊断建议现有前后端结构 & 采纳/拒绝动作现状

### 1.1 前端动作处理

`packages/web/src/components/diagnosis/suggestion-card.tsx`：
- **复制**：`:36-44`（`handleCopy`）——写剪贴板，`copied` state 2 秒后复位，**无任何埋点/网络请求**。
- **采纳**：`:46-60`（`handleAdopt`）——`POST /resumes/:id/versions`（详见 `docs/product-focus/wp0-adopt-fix.md`，该端点当前有数据破坏缺陷，WP-2 埋点设计需与 WP-0 修复方案协调，见 §7 遗留问题），**无任何独立埋点事件**，仅这一次版本创建请求本身。
- **展开/查看**：卡片本身默认展开渲染（无"点击展开"的折叠交互——`suggestion-card.tsx` 全文没有 `useState` 控制展开态），即"用户看到这条建议"这个动作本身**没有一个明确的用户交互事件可挂**，只能挂在"诊断详情页渲染时该条 suggestion 出现在 DOM 里"这个粒度，比"用户真的读了"要粗。
- **拒绝/忽略**：**当前完全不存在拒绝按钮或忽略交互**。用户看到建议后不采纳、不复制，就是"什么都不做"，代码里没有任何"拒绝"路径可挂载事件——这是 WP-2 唯一需要**新增用户可交互面**的地方（见 §2 的两案讨论，是否要加"拒绝原因"浮层，这本身是否越界"不做用户可见功能"的裁决，需用户定夺）。

**结论：当前没有任何 "event"/"analytics"/"suggestion_action" 命名的表或实体。** 全仓库唯一的通用事件表是 `OpsEvent`（见 §4），语义是系统运维事件，非业务漏斗事件，不适合复用（详见 §4 结论）。

### 1.2 Diagnosis 与 Suggestion 的数据形态

`packages/api/src/diagnoses/entities/diagnosis.entity.ts:1-90`（全量字段，关键行）：
```ts
@Column() resume_id: string;                                    // line 24-25
@Column('simple-json', { nullable: true })
suggestions: RewriteSuggestion[];                                // line 69-70
@Column({ type: 'varchar', nullable: true })
status?: 'running' | 'success' | 'failed' | 'partial';          // line 76-77
```
`suggestions` 是一个 JSON 数组整体存在 `diagnoses` 表的一列里（`simple-json` 类型），**不是独立的子表**——即每条 suggestion 没有自己的主键/行标识，只有数组下标（`suggestion-card.tsx` 组件 props 里的 `index`，`diagnosis-detail.tsx:544-546`：`{(diagnosis.suggestions ?? []).map((s, i) => <SuggestionCard key={i} suggestion={s} resumeId={diagnosis.resume_id} index={i} />)}`）。**这意味着要精确记录"用户对第几条 suggestion 做了什么"，事件表需要存 `diagnosis_id + suggestion_index` 这个组合键，而不是一个独立的 `suggestion_id`（因为根本不存在这样的 ID）。**

---

## 2. Resume Version ↔ Diagnosis 关联现状与缺口

`packages/api/src/resumes/entities/resume-version.entity.ts:1-31`（全量字段）：
```ts
@Entity('resume_versions')
export class ResumeVersion {
  id: string;                                    // line 7-8, UUID PK
  resume_id: string;                              // line 10-11, FK → Resume
  version_num: number;                            // line 17-18
  raw_text: string;                               // line 20-21
  parsed_json: ParsedResume | null;                // line 23-24
  change_note: string;                             // line 26-27, nullable
  created_at: Date;                                // line 29-30
}
```

**确认缺口：`ResumeVersion` 没有任何字段指回 `Diagnosis` 或具体的 suggestion。** `change_note` 目前只存一段自由格式字符串（如 `"采纳建议 #1: ${suggestion.reason}"`，见 `suggestion-card.tsx:52`），是给人看的文案，不是可查询的结构化外键——无法用它做聚合统计（除非解析字符串，不推荐）。

**本卡建议方案**：不改 `ResumeVersion` 实体本身（改动面留给 WP-0，因为 WP-0 本身就要重新设计"采纳"这条链路的数据形状，`ResumeVersion` 该不该加 `diagnosis_id` 取决于 WP-0 选 A 还是 B——如果选 B，采纳变成纯复制，`ResumeVersion` 根本不会因这个动作被创建，`diagnosis_id` 加不加意义不大；如果选 A，`ResumeVersion` 创建时天然知道来自哪个 `diagnosis_id + suggestion_index`，届时顺手加上即可）。**WP-2 的新事件表自己独立存 `diagnosis_id + suggestion_index + resume_version_id（nullable）`，不依赖 `ResumeVersion` 反向补字段，两个 WP 解耦，谁先谁后都不阻塞对方。**

---

## 3. Applications 表结构与阶段字段（现状与缺口）

`packages/api/src/applications/entities/application.entity.ts:1-77`（全量字段）：

| 字段 | 类型/行号 | 说明 |
|---|---|---|
| `id` | UUID PK，`:18-19` | |
| `user_id` | FK→User，`:21-26` | |
| `company` | string 必填，`:28-29` | |
| `role` | string 必填，`:31-32` | |
| `location` | string 可空，`:34-35` | |
| `stage` | `ApplicationStage` 枚举，默认 `'wishlist'`，`:37-38` | 见下方枚举定义 |
| `salary_range` | 可空，`:40-41` | |
| `deadline` | 可空，`:43-44` | |
| `referrer` | 可空，`:46-47` | |
| `notes` | text 可空，`:49-50` | **隐私敏感，见 §7** |
| `resume_id` | 可空软引用，`:52-53` | 简历级（非版本级） |
| `diagnosis_id` | 可空软引用，`:55-56` | **已存在！投递本身已经能反查用了哪个诊断** |
| `resume_version_id` | `uuid \| null`，`:62-63` | **已存在！由迁移 `1782700000000-AddApplicationDetailLinks.ts` 加入，版本级软引用**，注释明确写"发送的是哪一版简历"，link/unlink 端点会真的置回 null |
| `company_research_id` | `uuid \| null`，`:66-67` | 软引用公司背景调查（T6，与本卡无关） |
| `events` | `OneToMany → ApplicationEvent`，`:69-70` | 阶段变化流水，见下方 |
| `created_at`/`updated_at` | `:72-76` | |

`ApplicationStage` 枚举（`application.entity.ts:14`）：
```ts
export type ApplicationStage = 'wishlist' | 'applied' | 'interview' | 'final' | 'offer' | 'rejected';
```
**六个状态**：心愿单/已投递/面试中/终面/offer/被拒。**注意**：`00-master-plan.md` §4 埋点规格摘要原文写"是否获笔试/面试/终面"，但实际枚举**没有单独区分"笔试"这一阶段**——`written-test`/`screening` 不存在，"面试中"可能已经隐含包含了笔试环节，或者笔试目前不被系统追踪。**这是一个规格与实现之间的落差，需要在设计事件模型时决定：是复用现有 6 态枚举（不新增笔试区分），还是这次顺便给 `ApplicationStage` 加一个笔试态？——建议复用现有 6 态，不新增枚举值（红线："支撑服务只做维护级改动"，改枚举值属于改动投递追踪模块本体，超出"纯埋点"范围，若确有需要应作为独立小任务单独走用户确认，不夹带在 WP-2 里）。**

`packages/api/src/applications/entities/application-event.entity.ts:1-33`（全量字段）：
```ts
@Entity('application_events')
export class ApplicationEvent {
  id: string;                          // line 12-13, UUID PK
  application_id: string;              // line 15-16, FK → Application
  from_stage: string | null;           // line 22-23
  to_stage: string;                    // line 25-26
  note: string;                        // line 28-29, nullable
  created_at: Date;                    // line 31-32
}
```
**已存在阶段变化流水表**——用户在投递追踪里更新 `stage` 时，`from_stage`→`to_stage` 已经被记录一条流水。`00-master-plan.md` §4 提到的"该投递是否获笔试/面试/终面（用户在投递追踪中更新状态即为采集点）"这条埋点需求，**技术上已经 100% 被 `application_events` 表满足，不需要新建表**，只需要 admin 聚合查询端点去读它（见 §5）。

---

## 4. 现有 Admin 后台端点风格 & OpsEvent 可复用性判定

### 4.1 Admin 模块端点全量列表

`packages/api/src/admin/admin.controller.ts:1-221`（`@Controller('admin')` + `@UseGuards(JwtAuthGuard, AdminGuard)` 控制器级守卫，`:32-34`）：

| 路由 | 方法 | 行号 |
|---|---|---|
| `users` | GET | `:40-43` |
| `users/:id` | GET | `:47-50` |
| `users/:id/credit-history` | GET | `:53-59` |
| `users/:id` | PATCH | `:61-68` |
| `users/:id/credits` | POST | `:71-78` |
| `invites` | GET/POST | `:80-88` |
| `invites/:id` | PATCH | `:90-93` |
| `usage` | GET | `:95-98` |
| `ops-events` | GET | `:103-106` |
| `ops-stats` | GET | `:109-112` |
| `health-snapshot` | GET | `:115-118` |
| `concurrency/reset` | POST | `:122-125` |
| `user-activity` | GET | `:128-131` |
| `error-stream` | GET | `:134-137` |
| `recent-failures` | GET | `:140-143` |
| `success-stats` | GET | `:146-149` |
| `diagnosis-stats` | GET | `:153-156`（**风格范本，见下**） |
| `ai-providers` 系列 | GET/POST/PATCH/DELETE | `:161-205` |
| `perf-reports` 系列 | GET | `:210-220` |

### 4.2 聚合查询风格范本（新端点应仿照此风格）

`admin.service.ts:479-527`（`diagnosisStats` 方法全文，已在本文档验证读取）——核心模式：
1. `countByUtcDateAndKey()` 辅助方法（`admin.service.ts:726` 起）：按 `(日期, 二级键)` 做 DB 端 dialect-aware `GROUP BY`（Postgres 用 `to_char`，SQLite 用 `strftime`，与生产/e2e 双端兼容）。
2. 时间窗口用 UTC 对齐（`since.setUTCDate/setUTCHours`），逐日补零值天，便于前端画趋势图不用处理"某天没数据"的空洞。
3. 出站响应做白名单字段过滤（不回原始实体，只回统计聚合结果）。
4. 分页安全：`admin.service.ts:266` `MAX_PAGE_SIZE = 200`，`:645-650` `clampPageSize()`，`:653-658` `clampOffset()`。
5. 隐私打码：`admin.service.ts:415-429`（`recentFailures` 方法内）把用户邮箱打码成 `ab***@x.com` 格式再返回，绝不回明文邮箱。

**新的"效果闭环聚合"端点应该完全复用这一整套模式**（`countByUtcDateAndKey` 辅助方法可直接复用或仿写一个"按职业/按 rubric 维度"版本）。

### 4.3 OpsEvent 是否可复用——结论：不复用，新建独立表

`packages/api/src/ops/entities/ops-event.entity.ts:1-36`（全量）：
```ts
export type OpsEventType =
  | 'AI_FAILOVER' | 'AI_BOTH_DOWN' | 'QUEUE_FULL'
  | 'AI_CALL_FAILED' | 'CREDIT_CONSUME_FAILED'
  | 'ADMIN_ACTION' | 'LIMITER_RESET';

@Entity('ops_events')
@Index(['type', 'created_at'])
export class OpsEvent {
  id: string;                                      // line 23-24
  type: OpsEventType;                               // line 26-27
  detail: Record<string, unknown> | null;           // line 31-32, simple-json
  created_at: Date;                                 // line 34-35
}
```
头注原文（`:18-19`）："运维事件流水:记录 AI 降级/两通道皆败/并发队列满三类异常事件。供管理后台(T3)展示系统健康状态,不对主业务流程造成任何影响。"

**判定：技术上可以塞（`detail` 是自由 JSON），但语义上不应该塞。** 理由：
1. `OpsEventType` 枚举语义严格是"系统健康/异常事件"，混入业务漏斗事件（用户对建议的操作）会污染这张表的查询语义，`admin.service.ts` 里已有多处按 `OpsEventType` 白名单过滤的逻辑（如 `:269-276` `ERROR_STREAM_TYPES`、`:286` `AI_FAILURE_TYPES`），新业务事件类型混进同一个枚举/同一张表会让这些既有过滤逻辑的维护者困惑"这是不是也算错误事件"。
2. `OpsEvent` 没有 `user_id` 字段——它记录的是系统级事件，不是用户级行为，缺少支撑"按用户/按诊断/按职业聚合"查询所需的外键。补这些外键等于把它改造成另一张表，不如新建。
3. 另注意：勘察中发现一张名字相近但完全无关的表 `recruit_events`（`packages/api/src/database/migrations/1782800000000-CreateRecruitEvents.ts`）——这是 T2 月刊校招情报摄入管线用的表（sheet/wechat 解析出的招聘信息事件，如"某公司 x 月 x 日开放校招"），**与本卡"用户对诊断建议的操作事件"完全是两回事，命名相似但不可混淆、不可复用**，特此强调避免执行者搜索"event"关键字时张冠李戴。

**结论：新建独立表 `diagnosis_suggestion_events`（或语义等价命名，最终定名不强制，但需体现"这是诊断建议维度的用户行为事件"，不要复用 ops/recruit 前缀）。**

---

## 5. 事件模型设计

### 5.1 新表：`diagnosis_suggestion_events`

字段清单：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid，FK→users，`onDelete: CASCADE` | 用户级归属，供聚合与打码展示 |
| `diagnosis_id` | uuid，FK→diagnoses，`onDelete: CASCADE` | 对应 `Diagnosis.id` |
| `suggestion_index` | integer | 对应 `diagnosis.suggestions` 数组下标（见 §1.2，无独立 suggestion 主键，只能用下标定位） |
| `event_type` | varchar | 枚举：`'view'` \| `'copy'` \| `'adopt'` \| `'reject'`（`view` 语义受限，见 §1.1"展开"讨论——建议：若前端无法可靠区分"渲染到 DOM"与"用户真的看到"，可以先只埋 `copy`/`adopt`/`reject` 三种明确的用户主动交互，`view` 留空或延后，避免埋一个自己都不确定语义的事件类型） |
| `reject_reason` | varchar，nullable | 仅 `event_type='reject'` 时有值，见 §2 两案讨论 |
| `resume_version_id` | uuid，nullable | 仅 `event_type='adopt'` 且 WP-0 已确定采纳会创建版本时有值；若 WP-0 选方案 B（采纳变复制），这个字段在新设计下可能恒为 null，见 §2 末尾"与 WP-0 协调"说明 |
| `application_id` | uuid，nullable | 事后补充关联：当用户在投递追踪里把某条投递关联到用了这份改写的简历版本时，可选择性回填这个字段用于加速查询（也可以不回填，改为查询时通过 `resume_version_id → applications.resume_version_id` 反查，两种做法都可行，**建议不冗余存储，查询时 JOIN 反查**，除非性能实测有必要再考虑冗余，遵循"做减法"红线，不做投机性字段） |
| `created_at` | timestamp | |

索引建议：`(diagnosis_id, suggestion_index)` 复合索引（按诊断/建议聚合最常用）、`(user_id, created_at)`（按用户时间线查询）。

### 5.2 前端埋点点位

`packages/web/src/components/diagnosis/suggestion-card.tsx`：
1. `handleCopy()`（`:36-44`）：成功写剪贴板后，fire-and-forget 发一条 `event_type='copy'` 埋点请求（不阻塞 UI，不处理失败——埋点失败不应影响用户体验）。
2. `handleAdopt()`（`:46-60`）：现有 `POST /resumes/:id/versions` 调用成功后，追加发一条 `event_type='adopt'` 埋点（可以是同一次请求内后端顺带记一条，也可以是前端追加一次独立埋点 POST——**建议后端顺带记录**，即在 `resumes.service.ts` 的 `createVersion` 方法或其调用方那一层写事件行，避免前端网络请求数翻倍，且更可靠不受前端网络失败影响；但 `createVersion` 目前的签名不包含 `diagnosis_id`/`suggestion_index` 这些上下文——**这意味着 `suggestion-card.tsx:50-53` 的 API 调用需要在 payload 里补充这两个字段，或者改走一个新的专用端点，这是本卡与 WP-0 唯一有真实耦合的地方，需要协调**，见 §7）。
3. **拒绝**：当前无 UI 交互点可挂（见 §1.1），取决于 §2 的裁决。

### 5.3 版本→投递→获面关联链路现状与缺口

```
diagnosis_suggestion_events(新)  --diagnosis_id+suggestion_index-->  diagnoses.suggestions[i]
        |
        | resume_version_id（adopt 时，若 WP-0 方案 A 落地）
        v
resumes_versions.id  <--resume_version_id(已存在,entity.ts:62-63)--  applications
                                                                          |
                                                                          | events(OneToMany,已存在)
                                                                          v
                                                                  application_events
                                                                  (from_stage/to_stage 流水,已存在)
```
**现状**：`applications.resume_version_id`（已存在）+ `application_events`（已存在）已经能回答"这条投递用的哪个版本、经历了哪些阶段变化"。**缺口只在最上游**：`resume_version` 不知道自己是不是从某条 `diagnosis_suggestion` 采纳来的（除非 WP-0 顺带补上这个字段，见 §2）。**在 WP-0 未落地前，WP-2 的新事件表可以独立先跑起来**（先记录 copy/adopt/reject 行为本身，即使暂时无法把 `adopt` 事件精确关联到具体生成的 `resume_version_id`），链路打通的最后一环等 WP-0 定案后再补。

### 5.4 Admin 聚合查询端点设计

新增 `GET /admin/suggestion-funnel-stats`（命名可调整，风格对齐现有 `diagnosis-stats`/`success-stats`）：
- Query DTO 仿照 `packages/api/src/admin/dto/stats-query.dto.ts` 风格（`days` 参数，见 `admin.controller.ts:153-156` 调用方式）。
- Service 方法仿照 `admin.service.ts:479-527`（`diagnosisStats`）的结构：按日聚合 `event_type` 计数（复用或仿写 `countByUtcDateAndKey`），额外可选按 `diagnosis.profession`/`diagnosis.preset_id`（职业维度，`diagnosis.entity.ts:37-41`）分组，呼应 `00-master-plan.md` §4"产出:admin 后台聚合查询(按职业/按 rubric 维度的采纳率、版本→获面转化)"的规格。
- 获面转化率查询：`JOIN applications ON applications.resume_version_id = resume_versions.id`，再 `JOIN application_events WHERE to_stage IN ('interview','final','offer')`，按"是否出现过这些阶段"聚合——这条查询建议写成独立子方法，不要和"事件计数"揉在一起，保持单一职责。
- **红线重申**：不宣称"提高 offer 率"，输出只是原始转化率数字，文案/前端展示层不做任何因果性宣称（`00-master-plan.md` §4 原文："不宣称'提高 offer 率'直到有样本"）。

### 5.5 手写迁移草案

**命名冲突风险提示**：`packages/api/src/database/migrations/` 目录当前最新迁移是 `1783000000000-CreateOccupationWikiTables.ts`。根据 `docs/refactor2/t3-gate-a-taskcards-2026-07-10.md` TC-04 卡片，**T3 门 A 任务已预定占用时间戳 `1783100000000`**（`migrations/1783100000000-HardenOccupationGateA.ts`，该分支/任务当前暂停未合并）。**WP-2 施工时必须先检查 `1783100000000` 这个时间戳是否已被占用（检查 dev 分支当前是否已合并该文件），若已占用需要选择更大的时间戳（如 `1783200000000` 起），不得盲目递增导致时间戳冲突。**

迁移草案骨架（命名待执行时按上述冲突检查结果确定实际时间戳）：
```ts
export class CreateDiagnosisSuggestionEvents{TIMESTAMP} implements MigrationInterface {
  name = 'CreateDiagnosisSuggestionEvents{TIMESTAMP}';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "diagnosis_suggestion_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "diagnosis_id" uuid NOT NULL,
        "suggestion_index" integer NOT NULL,
        "event_type" character varying NOT NULL,
        "reject_reason" character varying,
        "resume_version_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_diagnosis_suggestion_events" PRIMARY KEY ("id"),
        CONSTRAINT "FK_dse_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_dse_diagnosis" FOREIGN KEY ("diagnosis_id") REFERENCES "diagnoses"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_dse_diagnosis_suggestion" ON "diagnosis_suggestion_events" ("diagnosis_id", "suggestion_index")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dse_user_created" ON "diagnosis_suggestion_events" ("user_id", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_dse_user_created"`);
    await queryRunner.query(`DROP INDEX "IDX_dse_diagnosis_suggestion"`);
    await queryRunner.query(`DROP TABLE "diagnosis_suggestion_events"`);
  }
}
```
（字段类型/约束写法仿照 `1782800000000-CreateRecruitEvents.ts` 的头注惯例风格：双端说明、生产 Postgres-only、e2e 走 SQLite in-memory synchronize 不执行本迁移。）

---

## 6. step→verify 施工卡

```
状态: READY_FOR_IMPL（前提：§2 拒绝原因两案裁决已获用户确认，见下方"未裁决点"）

files_allowed:
  - packages/api/src/database/migrations/{new-timestamp}-CreateDiagnosisSuggestionEvents.ts（新）
  - packages/api/src/events/（新目录，或按现有模块划分惯例放置，entity + service）
  - packages/api/src/admin/admin.controller.ts（新增一个端点）
  - packages/api/src/admin/admin.service.ts（新增聚合查询方法）
  - packages/api/src/admin/dto/（新增/复用 stats-query.dto.ts 风格 DTO）
  - packages/web/src/components/diagnosis/suggestion-card.tsx（埋点调用点）
  - packages/api/test/（新增对应 e2e/spec 测试）

files_forbidden:
  - packages/api/src/resumes/**（除非 WP-0 已定案且本卡需要读取其新增字段，禁止越权改动 WP-0 范围）
  - packages/api/src/ops/**（不复用/不改造 OpsEvent，见 §4.3 结论）
  - packages/api/src/occupations/** 及 data/**（T3 范围，与本卡无关，且时间戳冲突需避让）
  - packages/web/src/app/(main)/**（除 suggestion-card 所在 diagnoses 详情页调用方无需改动外，
    不涉及导航/其他页面）

执行计划 (step→verify):
1. 检查迁移时间戳冲突（见 §5.5），确定本卡实际使用的时间戳
   → verify: `ls packages/api/src/database/migrations/` 确认 1783100000000 是否已被占用，
     记录最终选定的时间戳到验证结果里
2. 新建 diagnosis_suggestion_events 迁移文件 + 对应 entity
   → verify: `migration:run` 成功；`\d diagnosis_suggestion_events`（或等价查询）确认表结构与
     字段清单一致；`migration:revert` 后表消失，再次 `migration:run` 恢复，确认可逆
3. 新建事件写入 service 方法（如 SuggestionEventsService.record()）+ 对应 e2e 测试：
   写入 copy/adopt/reject 三种事件类型各一条，读取验证落库正确
   → verify: `npx jest --config ./test/jest-e2e.json --forceExit` 目标测试文件全绿，附原始输出
4. 前端 suggestion-card.tsx 埋点调用点接入（copy 埋点先行，adopt 埋点视 WP-0 协调结果决定
   payload 是否需要 diagnosis_id/suggestion_index）
   → verify: Playwright 走查——点击复制按钮后网络面板出现埋点请求；埋点请求失败不阻断复制/
   采纳的原有功能（断网模拟测试埋点接口 500 时，复制按钮依然正常写剪贴板）
5. Admin 聚合端点 GET /admin/suggestion-funnel-stats 实现 + 单测
   → verify: 手动调用端点（走 JwtAuthGuard+AdminGuard 认证），返回结构符合设计；
   `npx jest` 对应 controller/service 单测全绿
6. 全量门禁
   → verify: api 单测+e2e+build 全绿；web `npx eslint src` 0 错+build 成功

验收标准: 用户在诊断详情页点击"复制"或"采纳"后，diagnosis_suggestion_events 表新增对应行；
管理员调用新端点能看到按日聚合的事件计数与（若 WP-0 已定案）版本→投递→获面转化率；
全程无用户可见的新 UI 元素（拒绝原因浮层除外，取决于 §2 裁决）。
```

---

## 7. 隐私红线

- `users.email`（`packages/api/src/users/entities/user.entity.ts:10-11`）、`users.name`（`:13-14`）、`users.last_login_ip`/`last_login_province`/`last_login_city`（`:44-52`）均为 PII，**新事件表不得存邮箱/姓名/IP 明文**，只存 `user_id`（UUID）。Admin 查询端点展示用户维度数据时，必须复用 `admin.service.ts:415-429` 的邮箱打码模式（如需要展示"谁"的话，一般不需要，因为本卡是聚合统计，不是个案追踪）。
- `applications.company`（`:28-29`）、`applications.role`（`:31-32`）、`applications.notes`（`:49-50`）：公司名/岗位名/备注可能包含用户主观信息，**新表设计中不冗余存储这些字段**（§5.1 已明确不冗余存 `application_id` 关联的业务字段，只存外键，查询时 JOIN），避免埋点表本身变成又一份需要保护的敏感数据副本。
- 数据留存位置：与 `00-master-plan.md` §4 一致，"用户数据留本库不出境"——新表就是本地 Postgres 的普通表，不涉及任何第三方上报/出境，天然满足。
- **不采集企业未授权信息**：本卡涉及的字段（诊断建议行为、投递阶段变化）都是用户自己在系统内产生的行为数据，不涉及爬取/存储企业侧数据，与该红线无冲突。

---

## 8. 未裁决点（遇到即停，问用户）

1. **拒绝原因收集是否越界"不做用户可见功能"**——用户裁决原文是"运营层面后台收集，不做用户可见 UI"（`00-master-plan.md` §1）。收集"拒绝原因"本身需要一个交互面（哪怕极简）：
   - **方案一：静默埋点，无拒绝原因**——不新增任何 UI，只能推断"用户看到建议但既没复制也没采纳"=隐式拒绝信号，不追问具体原因（"不真实/表达不自然/没帮助/已经有"这四个分类无法采集）。完全不触碰"用户可见"红线，但数据颗粒度粗，损失 `00-master-plan.md` §4 提到的拒绝原因枚举这一维度。
   - **方案二：轻量原因浮层**——在建议卡片上加一个极简的"不采纳"按钮，点击后弹出一个只有 4 个选项的极简选择浮层（不真实/表达不自然/没帮助/已经有），选完即关闭，无需二次确认。这是一个新增的、用户能看到并与之交互的 UI 元素，技术上属于"用户可见功能"，与用户原话字面冲突，但如果不加，`00-master-plan.md` §4 规格里明确写的"拒绝原因枚举"这个数据维度就完全采不到。
   - **本文档不擅自选择**，两案技术上都可执行（施工卡里的 `reject_reason` 字段两案都用得上，只是方案一恒为 null），需要用户看到这个矛盾后拍板：是接受方案一的数据颗粒度损失以严格遵守"零新增 UI"，还是接受方案二这一处最小必要的新增交互换取更完整的数据。
2. WP-0 若最终选方案 B（采纳变复制），`resume_version_id` 关联链路在"采纳"这个事件类型下会长期为空——这是否需要重新设计"采纳"事件的定义（比如把"复制建议后用户手动创建了新版本"这个后续动作也算作某种意义上的"采纳完成"）？建议：**不强行拼接**，WP-2 先按现状（`adopt` 事件类型对应现有 `POST /resumes/:id/versions` 调用）落地，等 WP-0 定案后再评估是否需要调整事件定义，两个 WP 不互相阻塞但需要一次同步确认。

---

## 附：勘察方法说明（供后续执行者信任本文档）

本文档所有 file:line 引用均通过 Read 工具实读源码确认，其中 Application/ApplicationEvent/Diagnosis/ResumeVersion/OpsEvent 五个实体、admin.controller.ts 全量端点列表、admin.service.ts 聚合查询范本方法、迁移目录最新文件均由主代理直接二次验证过背景 Explore 子代理的初步报告，独立读取结果一致。`recruit_events` 表用途经核实确认与本卡无关，已在正文明确排除，避免误用。
