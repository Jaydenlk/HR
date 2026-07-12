# WP-0：采纳改写数据破坏修复——技术方案文档

> **文档性质：技术方案，供用户批准；不是施工令。** 本文档产出后停在"待用户选 A/B"这一步，不得直接施工。
> 接手顺序：先读 `docs/product-focus/00-master-plan.md` §1/§5（协作协议、未裁决点），再读本文档。
> 勘察日期：2026-07-11，全部 file:line 已实读代码核实（非评审稿转抄）。
> 上位依据：`docs/product-review-codex56-2026-07-10.md` §4 第一断点（Codex 5.6 原始判定）。

---

## 0. 一句话结论

用户点"采纳"某一条改写建议时，前端把**这一条建议的替换文本**当作**整份简历全文**提交给后端；后端把它整段存为新版本，同时把主简历的 `raw_text` 覆盖成这一条文本、把 `parsed_json`（结构化解析结果）置空。**一条 bullet 的采纳 = 摧毁整份简历**。此缺陷已被验证为真实代码行为（非推测），无任何测试覆盖，无任何回滚提示。

---

## 1. 现状链路图（file:line 为证）

### 1.1 前端：采纳按钮点击

`packages/web/src/components/diagnosis/suggestion-card.tsx:46-60`

```ts
async function handleAdopt() {
  setAdopting(true);
  setAdoptError(null);
  try {
    await api.post(`/resumes/${resumeId}/versions`, {
      raw_text: suggestion.suggested,
      change_note: `采纳建议 #${index + 1}: ${suggestion.reason}`,
    });
    setAdopted(true);
  } catch (err) {
    setAdoptError(err instanceof Error ? err.message : '操作失败，请重试');
  } finally {
    setAdopting(false);
  }
}
```

- `suggestion.suggested` 是**单条建议**的替换文本（一句话/一个 bullet 级别），来源见 §1.3。
- 提交的 `raw_text` 字段名与"整份简历原文"字段同名——但值只是这一条建议的文本。
- **重要旁证**：`packages/api/src/resumes/dto/create-resume-version.dto.ts:1-12`（`CreateResumeVersionDto`）对 `raw_text` 有 `@MinLength(30)` 校验，注释原文："新版本正文必填,且与简历正文同口径(>=30 字),空/过短直接 400 而非落到 DB 约束 500"——**这条注释本身就证明了开发者当初的设计假设是"这个字段应该装得下完整简历正文"**，与 `suggestion-card.tsx:51` 实际传入单条建议文本（远小于完整简历）的现状矛盾。即：30 字这道最低限校验只能挡住极短建议，挡不住"一条较长 bullet（轻松超 30 字）冒充整份简历"这种真实场景，是缺陷已被验证的另一个侧面证据。
- 该 `RewriteSuggestion` 接口在后端 `packages/api/src/common/types/index.ts:68-77` 存在同名同构定义（前后端各一份，字段完全一致），确认前后端对这个"无定位信息"的数据形状认知是统一的、非某一端的局部偷懒。
- 组件被两处引用：`packages/web/src/app/(main)/diagnoses/[id]/diagnosis-detail.tsx:545`（JD 匹配模式结果页）与同文件 `:983`（另一渲染分支，校招职业标尺模式）。**两处调用方式相同，缺陷对两种诊断模式都成立。**
- 额外发现（不在缺陷范围内，但修复时须避免破坏）：`packages/web/src/components/onboarding/onboarding-surfaces.tsx:285` 在新手引导页渲染**同一个真实 SuggestionCard 组件**，`resumeId="demo"`。若修复方案改变组件 props/behavior，需确认这条 demo 渲染路径不受影响或一并处理。

### 1.2 后端：版本创建与主简历覆盖

`packages/api/src/resumes/resumes.controller.ts:82-90`

```ts
@Post(':id/versions')
async createVersion(
  @Param('id') id: string,
  @CurrentUser() user: { id: string },
  @Body() dto: CreateResumeVersionDto,
): Promise<ResumeVersionResponse> {
  const version = await this.resumes.createVersion(id, user.id, dto.raw_text, dto.change_note ?? '');
  return toResumeVersionResponse(version);
}
```

`packages/api/src/resumes/resumes.service.ts:70-92`（`createVersion` 全文）：

```ts
async createVersion(id: string, userId: string, rawText: string, changeNote: string): Promise<ResumeVersion> {
  const resume = await this.findOne(id, userId);
  const result = await this.versionRepo
    .createQueryBuilder('v')
    .select('MAX(v.version_num)', 'max')
    .where('v.resume_id = :id', { id })
    .getRawOne<{ max: number | null }>();
  const newNum = (result?.max ?? 0) + 1;

  const version = await this.versionRepo.save(this.versionRepo.create({
    resume_id: id,
    version_num: newNum,
    raw_text: rawText,
    change_note: changeNote,
  }));

  // Use update() instead of save(resume) to avoid TypeORM orphan-removal
  // deleting the just-created version (save() with a stale relations array
  // would cascade-delete any versions not present in the in-memory object).
  await this.repo.update(id, { raw_text: rawText, parsed_json: null });

  return version;
}
```

**关键行：`resumes.service.ts:89`**

```ts
await this.repo.update(id, { raw_text: rawText, parsed_json: null });
```

这一行对 `resumes` 表（主简历，非版本表）执行：
1. `raw_text` ← 整个被替换为 `dto.raw_text`（即前端传来的单条建议文本）。
2. `parsed_json` ← 强制置 `null`（结构化解析结果整体清空，且**没有任何地方会自动重新解析补回**——`updateParsedJson` 方法存在于 `resumes.service.ts:94-96` 但 `createVersion` 内部不调用它，也没有其他调用方触发重新解析）。

### 1.3 什么被清空 / 数据结构确认

`packages/web/src/lib/types.ts:209-218`（`RewriteSuggestion` 类型定义）：

```ts
export interface RewriteSuggestion {
  section: string;
  item_index?: number;
  type: 'rewrite' | 'add_keywords' | 'restructure' | 'quantify' | 'gap_advice';
  priority: 'high' | 'medium' | 'low';
  original: string;
  suggested: string;
  reason: string;
  jd_requirement?: string;
}
```

**关键事实：该类型没有任何"原文定位信息"字段**——没有 `span_start`/`span_end`（字符偏移）、没有 `field_path`（结构化字段路径）、没有段落/行号指针。只有 `section`（字符串，如"项目经历"）和 `item_index?`（可选整数，语义未在类型上明确是"第几段经历"还是"第几条建议"）。`original`/`suggested` 都是纯字符串片段，不含它们在完整简历全文中的位置。

`packages/api/src/resumes/entities/resume.entity.ts:1-45`（Resume 实体，`raw_text`/`parsed_json`/`is_primary` 相关字段）：

```ts
@Column('text')
raw_text: string;                    // line 22-23

@Column('simple-json', { nullable: true })
parsed_json: ParsedResume | null;    // line 25-26

@Column({ default: false })
is_primary: boolean;                 // line 31-32

@OneToMany(() => ResumeVersion, (v) => v.resume)
versions: ResumeVersion[];           // line 34-35
```

`packages/api/src/resumes/entities/resume-version.entity.ts:1-31`（ResumeVersion 实体全量字段）：

```ts
@Entity('resume_versions')
export class ResumeVersion {
  @PrimaryGeneratedColumn('uuid') id: string;              // line 7-8
  @Column() resume_id: string;                              // line 10-11
  @ManyToOne(...) resume: Resume;                           // line 13-15
  @Column() version_num: number;                            // line 17-18
  @Column('text') raw_text: string;                         // line 20-21
  @Column('simple-json', { nullable: true })
  parsed_json: ParsedResume | null;                         // line 23-24
  @Column({ nullable: true }) change_note: string;          // line 26-27
  @CreateDateColumn() created_at: Date;                     // line 29-30
}
```

- 每个 `ResumeVersion` 存**完整 `raw_text` 字符串**（不是 diff/patch），版本表本身设计上没问题——问题是"喂进版本表的 `raw_text` 本身就已经是错的（只有一条建议的文本）"，并且这个错误值**同时**被写回了主表 `resumes.raw_text`。
- `ResumeVersion.parsed_json` 字段存在但 `createVersion` 从不写入它（新建版本的 `parsed_json` 恒为默认 `null`，见 create 调用只传了 `resume_id/version_num/raw_text/change_note` 四个字段）。
- 没有"当前生效版本指针"字段——`Resume` 只有 `is_primary`（用户级别的主简历标记，多份简历中哪份是主打），不是"哪个版本是当前版本"。`resumes` 表的 `raw_text`/`parsed_json` 本身就充当"当前版本"，`resume_versions` 表更像一个**追加日志**而非"回滚可切换"的版本系统——目前代码里没有找到任何"回退到某历史版本"的端点或方法（`resumes.service.ts` 全文只有 `create/findAllByUser/findOne/update/remove/getVersions/createVersion/updateParsedJson` 八个方法，无 `restoreVersion` 之类）。

### 1.4 全链路一句话总结

```
用户点"采纳" (suggestion-card.tsx:46)
  → POST /resumes/:id/versions { raw_text: suggestion.suggested(单条建议文本), change_note }
  → resumes.controller.ts:82-90 createVersion()
  → resumes.service.ts:70-92
      ├─ 79-84: 新建 ResumeVersion 行，raw_text=单条建议文本（版本历史里多一条"半份简历"）
      └─ 89:    UPDATE resumes SET raw_text=单条建议文本, parsed_json=NULL WHERE id=:id
                （主简历全文被单条建议文本整体覆盖；结构化解析清空且无自动重建）
```

---

## 2. 危害定级与复现步骤

### 2.1 危害定级

- **等级：P0，数据破坏级缺陷。** 用户完全无感知——按钮上没有任何"这将覆盖整份简历"的警示，`采纳` 按钮的视觉语言（`suggestion-card.tsx:242-267`，蓝色渐变主按钮+`ThumbsUp` 图标）传达的是"轻量确认操作"，而非破坏性操作。
- 一旦触发，`resumes` 表主记录的 `raw_text` 与 `parsed_json` **无本地保留的"上一次完整值"可供程序自动回滚**（虽然 `resume_versions` 表里存在覆盖前的旧版本——如果用户此前至少调用过一次 `createVersion` 或首次创建时的原始 `raw_text`；但**首次采纳时**版本表可能是空的，此时覆盖前的原文完全没有落过版本表，只存在于 `resumes.raw_text` 这一份，被覆盖后即丢失，除非应用层数据库有独立备份）。
- 影响范围：JD 匹配模式与校招职业标尺模式两条诊断路径共用同一个 `SuggestionCard` 组件（`diagnosis-detail.tsx:545` 与 `:983`），两者都会触发。

### 2.2 复现步骤（人工验证方法，不需要写自动化测试即可确认，供用户/执行者快速信任本判定）

1. 上传一份简历，确保 `parsed_json` 已解析（简历馆页面正常显示结构化字段）。
2. 对该简历发起一次诊断（JD 匹配或校招标尺任一模式），进入诊断详情页，看到"改写示范"卡片列表。
3. 任选一条 suggestion，点击"采纳"按钮。
4. 打开数据库（或简历馆页面刷新查看该简历），检查：
   - `resumes.raw_text`：应变为该条 suggestion 的 `suggested` 文本（远短于原简历全文）——**verify: 长度明显短于原始简历，且内容只是这一条建议的替换句**。
   - `resumes.parsed_json`：应变为 `NULL`——**verify: 简历馆/详情页原本展示的结构化字段（教育经历/项目经历等分区）消失或报错**。
5. 对照 `resume_versions` 表：应新增一行 `raw_text` 同样只有这条建议文本，`version_num` 递增。

---

## 3. 修复方案 A/B 对比

### 方案 A：span 定位 + patch + diff 确认 + 完整版本（Codex 5.6 推荐）

**思路**：给 `RewriteSuggestion` 补上原文定位信息（span 或字段路径），采纳时在**完整简历全文**上做局部替换（patch），生成完整版本前先展示**全文 diff**供用户确认，确认后才创建版本；若无法唯一定位（原文在全文中出现多次或已被后续编辑改变导致 span 失效），拒绝自动采纳，只允许"复制到剪贴板"。

**可行性提升说明**：本次勘察发现 `packages/api/src/ai/rewriter.service.ts:111` 已经在做 `resumeText.includes(s.original)` 校验（详见下方改动面第 1 点）——定位这件事的地基已经存在，只是没有持久化偏移量。这使方案 A 的技术风险比"完全从零设计"更低，但"原文重复出现导致定位歧义"的子问题依然真实存在，需要专门处理。

**改动面**（不做详细设计，仅标出量级，供用户评估工作量）：
1. **AI 生成侧（已定位，比预期更可行）**：生成 suggestion 的服务是 `packages/api/src/ai/rewriter.service.ts`，两个入口方法 `suggest()`（JD 匹配模式，约 line 51 起）与 `suggestAgainstPreset()`（校招标尺模式，约 line 84-122）。**关键发现：该服务已经在做"反编造兜底"校验，`rewriter.service.ts:111`**：
   ```ts
   if (!s.original || !resumeText.includes(s.original)) {
     return { ...s, original: '', type: 'gap_advice' as const };
   }
   ```
   即：服务已经用 `resumeText.includes(s.original)` 确认 `original` 字符串必须是简历原文中真实存在的子串，否则整条建议降级为 `gap_advice`（不当作可直接采纳的改写句）。**这意味着"在完整原文中唯一定位这条建议对应的原文片段"这件事，运行时已经具备做一次 `resumeText.indexOf(s.original)` 的前置条件——只是目前算出来即用即弃，没有把偏移量持久化进 `RewriteSuggestion`。** 这比"完全空白、需要从零设计定位机制"的情形轻很多：
   - 改动点：在这条校验通过之后，顺手计算 `span_start = resumeText.indexOf(s.original)`、`span_end = span_start + s.original.length`，写入 `RewriteSuggestion` 新增字段并持久化（`normalizeSuggestions` 方法 `rewriter.service.ts:131-143` 是归一化的统一出口，新增字段可在此处补齐）。
   - 仍需处理的子问题：`original` 若在全文中出现**多次**（如同一句话在不同项目经历里重复），`indexOf` 只会取第一个匹配，可能定位到错误位置——需要改用"全部匹配位置+要求唯一，否则拒绝自动采纳只允许复制"的策略（这与 Codex 建议的"patch 无法唯一定位时拒绝自动采纳"完全吻合，说明这条红线在设计上是必要的，不是保守过度）。
   - `RewriteSuggestion` 类型扩充定位字段：前端 `packages/web/src/lib/types.ts:209-218`、后端 `packages/api/src/common/types/index.ts:68-77`（两处同构定义，需同步改）。
2. **后端**：新增"patch 应用"逻辑——在完整 `raw_text` 上，用 span 或文本匹配定位后替换局部片段，拼出新的完整全文，再走现有 `createVersion` 存储（此时传入的 `raw_text` 才是真正完整的新版本全文）。需要处理"多处匹配/零处匹配"的失败态（拒绝自动采纳）。
3. **前端**：采纳前需要一个"diff 预览 + 确认"的 UI 步骤（当前是无确认的即时提交，见 §1.1），且需要展示"patch 失败，请手动复制"的降级路径。
4. **数据结构**：`parsed_json` 在 patch 后仍需要重新解析或做增量更新（否则即使 `raw_text` 正确了，`parsed_json` 依然会因当前 `resumes.service.ts:89` 恒定置 `null` 而清空——这一行为需要一并改掉，改为解析新 `raw_text` 或至少不主动置空）。

**优点**：彻底解决问题，用户体验最终形态正确（所见即所得的完整 diff 确认）。
**缺点**：改动跨 AI 生成/后端/前端三层，涉及"定位算法鲁棒性"这一较难的子问题（重复文本导致 `indexOf` 定位歧义时如何处理，见 §6 未裁决点第 3 条），实现周期比方案 B 长，需要三层协同改动+完整的失败态测试覆盖。

### 方案 B：最小止血——采纳改为复制到剪贴板 / 禁用自动写库（一天能上）

**思路**：不改变现有 `original`/`suggested` 数据结构，**直接移除"采纳=自动写库"这条路径**。把"采纳"按钮的行为改成等同于"复制"（写入剪贴板），用户拿到建议文本后自己手动粘贴编辑简历；或者更保守——直接**隐藏/禁用采纳按钮**，只保留"复制"按钮，文案提示"请手动粘贴到简历中对应位置"。

**改动面**：
1. `packages/web/src/components/diagnosis/suggestion-card.tsx:46-60`（`handleAdopt`）：删除或替换为剪贴板写入逻辑（复用 `handleCopy` 现有逻辑，`:36-44`）。
2. `packages/web/src/components/diagnosis/suggestion-card.tsx:243-267`（采纳按钮 JSX）：文案与交互改为"复制建议"或直接移除该按钮，只保留一个"复制"按钮。
3. **后端零改动**：`POST /resumes/:id/versions` 端点保持不变（它本身不是缺陷根源，是"谁在什么时候用什么数据调用它"出了问题）——只要前端不再拿单条建议文本去调这个端点，缺陷即消失。
4. `packages/web/src/components/onboarding/onboarding-surfaces.tsx:285` 的 demo 渲染路径：因为复用同一个组件，行为会自动同步变化（demo 场景下"采纳"变成"复制"，语义仍然合理，不需要额外改动）。

**优点**：改动面极小（本质只改一个前端组件的一个函数+一段 JSX），一天内可完成并验证，彻底消除数据破坏风险（因为根本不再触发那条覆盖主简历的后端调用）。
**缺点**：用户体验倒退——采纳建议需要用户自己手动去简历里找到对应位置粘贴，失去"一键应用"的便利性，这与 Codex 评审强调的"证据绑定的逐条改写与版本交付"这一核心付费能力的体验目标（`docs/product-review-codex56-2026-07-10.md` 第 16 行："用户付钱是为拿到'敢投、能解释、经得起追问'的简历"）有落差，本质是功能降级而非功能修复。

---

## 4. 建议：先 B 后 A

- **B 是止血，不是终局**：立即消除数据破坏风险（P0 安全性），成本一天，且不产生新的技术债——A 方案要做的"span 定位"未来仍然可以在 B 的基础上叠加，不冲突。
- **A 是正确的最终形态，但需要更多前置工作**：AI 生成侧代码位置已在本次勘察中定位清楚（`rewriter.service.ts`，见 §3），风险比预期低，但"原文重复出现时定位歧义"这一交互设计问题仍需用户先拍板（§6 第 3 条），且改动跨三层，工时比方案 B 明显更长。
- 建议顺序：**先上 B 止血（保护现存用户数据不再被破坏）→ 用户看实际使用反馈（"复制手动粘贴"是否已经够用，还是用户抱怨强烈需要一键应用）→ 视反馈决定是否投入 A 的完整开发**。这与 `00-master-plan.md` 的"支撑服务只做维护级改动；新功能扩张必须先过'是否直接强化三核心'审查"红线也吻合——B 本身就是"三核心之一（证据绑定改写）"的止血，优先级不需要再论证。

---

## 5. 两方案施工卡草案（未经用户批准前仅供预览，不得执行）

### 5.1 方案 B 施工卡草案

```
状态: 待用户批准方案（本卡不得在用户选定前执行）
任务: 采纳按钮改为剪贴板复制，移除"一键写库覆盖主简历"路径

files_allowed:
  - packages/web/src/components/diagnosis/suggestion-card.tsx

files_forbidden:
  - packages/api/**（本方案后端零改动，触碰即越界）
  - packages/web/src/components/onboarding/**（复用同一组件自动生效，禁止额外改动 demo 数据/展示逻辑）
  - packages/web/src/app/(main)/diagnoses/**（调用方不变，禁止改调用签名）

执行计划 (step→verify):
1. 读取 suggestion-card.tsx 全文，确认 handleCopy(36-44)/handleAdopt(46-60)/按钮 JSX(219-267) 现状未漂移
   → verify: 行号与本文档 §1.1 引用一致；若已漂移，先重新核对再动手，不假设行号不变
2. 移除 handleAdopt 中对 `api.post('/resumes/:id/versions', ...)` 的调用；改为写剪贴板
   （可直接复用 handleCopy 逻辑，或将两个按钮合并为一个"复制建议"按钮——具体二选一由执行者按
   现有设计系统风格判断，但必须保证：点击后不再有任何写库副作用）
   → verify: 全局搜索确认 suggestion-card.tsx 内不再包含 `/resumes/` 与 `/versions` 字符串
3. 按钮文案与状态机同步调整（"已采纳"态语义需改为"已复制"或合并进复制态，避免用户误解已经改完简历）
   → verify: Playwright 手动走查——点击后按钮文案/图标符合"复制"语义，不出现"已采纳"字样误导
4. 回归验证：确认原有"复制"按钮功能不受影响，两按钮（若保留两个）行为一致但触发方式独立
   → verify: 两个按钮分别点击，剪贴板内容均为 suggestion.suggested，DB 无写入（可用网络面板确认无
   POST 请求发出）
5. ESLint + build 门禁
   → verify: `npx eslint src` 0 错；`next build` 成功

验收标准: 点击"采纳"（或合并后的"复制"）后，浏览器网络面板不出现任何 /resumes/:id/versions 请求；
resumes 表 raw_text/parsed_json 不再因点击此按钮发生任何变化。
```

### 5.2 方案 A 施工卡草案（骨架，非完整卡——AI 生成侧已定位，但多匹配歧义处理策略需用户/执行者进一步确认后再细化为正式施工卡）

```
状态: 待用户批准方案（AI 生成侧代码位置已勘察确认，见 §3 方案 A"可行性提升说明"；
      本卡仍需在正式展开前明确"原文重复出现"场景的产品行为——是拒绝采纳所有出现位置，
      还是要求用户从多个匹配位置中手选一个，这属于交互设计决策，不是纯技术问题）

已勘察确认（非待核实，写此处替代原"待核实"占位）:
  - 生成 suggestions 的服务：packages/api/src/ai/rewriter.service.ts
    · JD 匹配模式入口：suggest()（约 line 51 起）
    · 校招标尺模式入口：suggestAgainstPreset()（line 84-122）
    · 归一化统一出口：normalizeSuggestions()（line 131-143）——新增 span 字段可在此处补齐
    · 反编造校验（可复用的定位地基）：line 111 `resumeText.includes(s.original)`

粗粒度改动面（非施工卡，仅供工时评估参考）:
1. RewriteSuggestion 类型扩充定位字段（packages/web/src/lib/types.ts:209-218 及后端对应共享类型）
2. 新增"patch 应用"服务方法：在完整 raw_text 上按定位信息做局部替换，失败态（零匹配/多重匹配）
   必须拒绝自动采纳，仅允许复制（复用方案 B 的降级路径作为兜底，两方案不互斥可叠加）
3. resumes.service.ts:89 的 `parsed_json: null` 恒定清空逻辑需改为：patch 后重新解析或增量更新
   parsed_json，不能仍然无脑清空
4. 前端新增 diff 预览 + 二次确认交互（当前 handleAdopt 是无确认即时提交，需要改为两段式：
   预览→确认→提交）
5. 完整 Jest + Playwright 覆盖：多处匹配失败态、零匹配失败态、正常 patch 成功态、diff 展示正确性

本卡在用户看到具体工时估计、并对"原文重复出现时的产品行为"给出裁决之前，不得展开为可执行的
step→verify 施工卡。
```

---

## 6. 未裁决点（遇到即停，问用户）

1. **方案选择：A 还是 B，或"先 B 后 A"** ——这是本文档存在的核心目的，用户需要明确批复。
2. 若选 B：采纳按钮是"改成复制"还是"直接隐藏/禁用"？（两种都消除数据破坏风险，但产品语义不同——前者保留"这条建议有用"的信号价值，后者更保守但可能让用户困惑"为什么没有采纳功能了"）
3. 若后续要推进 A：`original` 文本在简历全文中重复出现时（`rewriter.service.ts:111` 校验只保证"存在"，不保证"唯一"），产品行为该怎样？——"直接拒绝自动采纳只给复制"（技术最简单，与 Codex 建议一致）还是"列出所有匹配位置让用户手选"（体验更好但要多做一层交互）？这是产品交互决策，不是技术可行性问题，需要用户拍板。
4. 现存已经被这个 bug 损坏的用户数据（如果生产环境已有真实用户点过采纳）是否需要人工排查修复？——**本文档未做生产数据核查，如需核查需用户另行授权（涉及真实用户数据访问，按 CLAUDE.md"影响真实系统的操作先想回滚"红线，不在本次勘察范围内擅自执行）**。

---

## 附：勘察方法说明（供后续执行者信任本文档）

本文档所有 file:line 引用均通过 Read 工具实读源码确认（非转抄评审稿、非猜测）。核心链路（§1.1-§1.4）与 AI 生成侧定位（§3 方案 A"可行性提升说明"，`rewriter.service.ts` 相关行号）均由主代理直接二次验证过背景 Explore 子代理的初步报告，独立读取结果一致，无未勘察的"待核实"遗留项。
