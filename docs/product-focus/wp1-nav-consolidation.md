# WP-1：入口收编施工卡——职业地图隐藏 / 求职信并入投递 / 机会中心冻结

> **文档性质：施工卡，用户已裁决，可直接执行**（区别于 WP-0 的"待批方案"）。
> 裁决来源：`docs/product-focus/00-master-plan.md` §1 用户裁决记录（2026-07-10）——职业地图隐藏、求职信并入投递、机会中心冻结 ✅ 采纳；**模拟面试/月刊/ASR 复盘 ❌ 否决冻结，保持现状一个字不动**。
> 勘察日期：2026-07-11，全部 file:line 已实读代码核实。
> **T1 教训**（见 `00-master-plan.md` §6"现状坐标"历史记录引用）：删除导航入口曾导致新手导览锚点失效——本卡已逐条核对导览依赖，见 §4。

---

## 0. 一句话结论

三项处置的落地面都比想象中小：**求职信↔投递的关联 UI 已经在投递详情页做好了**（`application-detail.tsx:590-624`），本次真正要做的收编工作主要是"从主导航移除三个入口"+"把求职信生成入口收口到投递详情页"+"确认路由页面保留可直达"；新手导览完全不依赖这三个入口，无需改导览。

---

## 1. 导航项处置（file:line 为证）

### 1.1 主导航结构

`packages/web/src/app/(main)/layout.tsx`，导航由 `buildNavGroups()` 函数产出（`:64-126`），分 5 组：顶部常驻组（无标题）+ 面试前/面试中/面试后/其他 四个标题分组。

**本次要处置的三项**：

| 导航项 | 文件:行 | 当前代码 |
|---|---|---|
| 求职信 | `layout.tsx:81` | `{ id: 'cover-letter', label: '求职信', href: '/cover-letter', icon: <Send size={16} /> },` |
| 机会中心 | `layout.tsx:82` | `{ id: 'opportunities', label: '机会中心', href: '/opportunities', icon: <Target size={16} /> },` |
| 职业地图 | `layout.tsx:122`（"其他"分组内） | `{ id: 'career', label: '职业地图', href: '/career', icon: <MapIcon size={16} /> },` |

**files_forbidden 三项（用户明确否决冻结，禁止触碰，包括不小心的连带改动）**：

| 导航项 | 文件:行 | 当前代码 |
|---|---|---|
| 月刊·面经 | `layout.tsx:72`（顶部常驻组） | `{ id: 'monthly', label: '月刊·面经', href: '/newspaper', icon: <BookOpen size={16} /> },` |
| 模拟面试 | `layout.tsx:98`（"面试中"分组） | `{ id: 'mock', label: '模拟面试', href: '/mock', icon: <Play size={16} /> },` |
| 面试复盘(ASR) | `layout.tsx:108-113`（"面试后"分组，含 badge 逻辑） | 见下方原文 |

`layout.tsx:107-113`（面试复盘项，含动态 badge，禁止改动）：
```ts
{
  id: 'debrief',
  label: '面试复盘',
  href: '/debrief',
  icon: <Mic size={16} />,
  ...(interviewCount > 0 ? { badge: String(interviewCount) } : {}),
},
```

### 1.2 处置方式建议 + 待用户确认的细节

**"其他"分组结构说明**：`layout.tsx:117-124` 目前"其他"分组只有职业地图一项：
```ts
{
  id: 'other',
  title: '其他',
  items: [
    // 今天/月刊已提到顶部常驻组;求职总览已并入「今天」页并删除独立页(见 today/page.tsx)。
    { id: 'career', label: '职业地图', href: '/career', icon: <MapIcon size={16} /> },
  ],
},
```
移除职业地图这一项后，"其他"分组会变成空分组——**建议连同 `NavGroup`（`layout.tsx:117-124` 整个对象）一并从 `buildNavGroups()` 返回数组中移除**，避免渲染出一个空标题的分组（具体渲染逻辑是否会自动跳过空 `items` 数组未在本次勘察范围内确认——**待核实：渲染 `NavGroup` 的组件是否对 `items.length === 0` 做了防御性判断，如果有则保留分组对象也不影响 UI，如果没有则必须删除整个分组对象，执行时请先搜索 `items.map` 渲染处确认**）。

**导航项移除 vs 路由保留可直达 —— 建议 + 待用户确认**：
- 建议：**导航移除，路由保留（不加 302 跳转）**。理由：机会中心用户裁决是"冻结"（保留页面维护级），职业地图用户裁决是"隐藏"（`00-master-plan.md` §1 原文"隐藏或下线"，用户选择了"纳入导航「其他」处置"这一更轻的处理，而非直接下线路由）——两者都不是"下线"，直达 URL 应该继续可用（例如用户历史书签、分享链接、或运营需要临时引流到机会中心页面时）。
- **待用户确认的细节**：职业地图（`/career`）和机会中心（`/opportunities`）从导航移除后，是否需要在页面本身加一条"提示条"告知用户"该功能已从主导航移除，如有需要可通过此链接访问"？还是完全静默保留、不做任何页面内提示？这属于产品体验细节，建议按最省事的"不加提示，静默保留路由"处理，但施工前请用户一句话确认即可（不构成阻塞级未裁决点，只是提醒执行者别自作主张加复杂提示 UI）。

### 1.3 相关路由/页面文件确认

| 功能 | 主页面 | 子路由/详情页 |
|---|---|---|
| 职业地图 | `packages/web/src/app/(main)/career/page.tsx`（1047 行） | 无 `[id]` 动态路由；历史快照通过查询参数驱动的弹窗加载（`career/page.tsx:554-584` 通过 API `/career/history/{id}` 加载，非独立页面路由） |
| 机会中心 | `packages/web/src/app/(main)/opportunities/page.tsx`（580 行） | `opportunities/[id]/page.tsx`（详情页）、`opportunities/new/page.tsx`（新建评估） |
| 求职信 | `packages/web/src/app/(main)/cover-letter/page.tsx`（870 行） | 另有 `cover-letter/_referral/index.tsx`（下划线前缀，Next.js 约定非路由文件）——已核实 **非死代码**：`page.tsx:8` `import { ReferralPanel } from './_referral';` 正常引入使用，本次改动不涉及它，原样保留 |

### 1.4 求职信 → 投递追踪 关联现状（关键：大部分已经做好）

**后端已有外键关联**：`packages/api/src/cover-letters/entities/cover-letter.entity.ts:26-31`
```ts
@Column({ nullable: true })
application_id: string;

@ManyToOne(() => Application, { nullable: true, onDelete: 'SET NULL' })
@JoinColumn({ name: 'application_id' })
application: Application;
```
（`Application` 实体本身无反向引用回 `CoverLetter`，是单向关联：CoverLetter → Application。`cover-letters/entities/cover-letter.entity.ts:33-34` 另有 `resume_id: string`字段，是普通列，非外键约束，未声明 `@ManyToOne` 到 `Resume` 实体。）

**前端投递详情页已有完整的求职信聚合区块**：`packages/web/src/app/(main)/applications/[id]/application-detail.tsx:590-624`
```tsx
{/* 聚合区块:求职信 */}
<div className="lg" style={cardStyle}>
  <h2 style={sectionTitleStyle}>求职信</h2>
  {related && related.cover_letters.length > 0 ? (
    related.cover_letters.map((c) => (
      <div key={c.id} style={rowItemStyle}>
        <Link href="/cover-letter" style={{ minWidth: 0, textDecoration: 'none' }}>
          <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-ink)' }}>
            {c.company ?? '未填公司'} · v{c.version}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-ink-4)', marginTop: '2px' }}>{fmtDate(c.created_at)}</div>
        </Link>
        <button style={smallBtnStyle} onClick={() => void handleUnlink('cover_letter', c.id)}>
          <Unlink size={12} />
          取消关联
        </button>
      </div>
    ))
  ) : (
    <p style={emptyStateStyle}>暂无关联记录</p>
  )}
  <ManualLinkPicker
    options={unlinkedCoverLetters.map((c) => ({ id: c.id, label: `${c.company ?? '未填公司'} · v${c.version}` }))}
    placeholder="选择一封已有求职信"
    onLink={(targetId) => handleLink('cover_letter', targetId)}
  />
  <div style={{ marginTop: '10px' }}>
    <Link
      href={`/cover-letter?applicationId=${id}&company=${encodeURIComponent(application.company)}&role=${encodeURIComponent(application.role)}`}
      style={{ fontSize: '11.5px', color: 'var(--color-brand)', fontWeight: 600, textDecoration: 'none' }}
    >
      为这条投递生成新的求职信 →
    </Link>
  </div>
</div>
```
这个区块已经支持：①展示该投递已关联的求职信列表 ②手动关联已有求职信（`ManualLinkPicker`）③取消关联 ④跳转到 `/cover-letter` 页面并带上 `applicationId`/`company`/`role` 查询参数预填生成新求职信。

`cover-letter/page.tsx:79`：`const applicationId = searchParams.get('applicationId');` 已二次核实无误。`cover-letter/page.tsx:155-163` POST `/cover-letters` 时带上 `application_id: applicationId || undefined`：
```ts
const letter = await api.post<CoverLetter>('/cover-letters', {
  company, role, tone, length_words: lengthWords,
  jd_text: jdText.trim(),
  resume_id: selectedResumeId || undefined,
  application_id: applicationId || undefined,   // line 162
});
```
`cover-letter/page.tsx:81-94` 另有一段"从投递详情页跳转过来时预填公司/岗位"的 `useEffect`，读取 `company`/`role` 查询参数一次性预填表单——与 `application-detail.tsx:618` 的跳转链接参数完全对应，链路验证完整闭环。

**"并入投递"实际需要做的事**（重新定位工作量）：
1. 主导航移除 `/cover-letter` 独立入口（`layout.tsx:81`）——用户不再能从左侧导航直接进求职信列表页。
2. `/cover-letter` 路由页面本身**保留**（它仍然是"生成/编辑求职信"的实际工作页面，只是不再作为独立导航目的地，而是通过投递详情页的"为这条投递生成新的求职信 →"链接进入，或未来考虑内嵌到详情页——**待用户确认**：是否要把 `/cover-letter` 的编辑器整体内嵌进投递详情页（更彻底的"并入"），还是维持现状"投递详情页只做列表聚合+跳转，编辑器留在独立页面"（改动量小得多，且现有代码已经这样做）？**建议按现状（跳转式）验收，因为 Codex 评审原文只要求"求职信合并进具体投递版本"这一目标，现有的关联+跳转机制已经满足"从投递视角能看到/管理求职信"的诉求，不强制要求编辑器物理内嵌。**
3. 检查是否有其他页面/组件独立链接到 `/cover-letter` 作为"求职信列表入口"（导航之外的地方，比如"今天"页卡片）——**待核实，本次勘察未覆盖，执行时请先全局搜索 `href="/cover-letter"` 或 `href='/cover-letter'` 确认所有跳转来源，不能只改导航一处就假设万事大吉**。

---

## 2. 机会中心冻结 = 移除入口 + 页面保留

- 移除 `layout.tsx:82` 这一项。
- `packages/web/src/app/(main)/opportunities/**` 全部页面文件（`page.tsx`/`[id]/page.tsx`/`new/page.tsx`）**不改动、不删除**——路由继续可直达。
- 后端模块已核实：`packages/api/src/opportunity/`（单数，注意不叫 `opportunities`），在 `app.module.ts:25` 以 `OpportunityModule` 注册（`app.module.ts:102`）——**不做任何改动**，冻结只发生在前端导航层。

---

## 3. 职业地图隐藏 = 移除导航入口

- 移除 `layout.tsx:122` 这一项，连带处理 §1.2 提到的"其他"空分组问题。
- `packages/web/src/app/(main)/career/page.tsx` 页面文件不改动、不删除，路由保留可直达。
- `career/page.tsx:554-584` 的历史快照加载逻辑（依赖 `/career/history/{id}` API）不受导航层改动影响，无需处理。

---

## 4. 新手导览（onboarding-tour）依赖核查

`packages/web/src/components/onboarding/onboarding-tour.tsx`（1125 行，STEPS 数组定义在 `:93-319`）。

**逐一核查结果：STEPS 数组中没有任何步骤引用 `/career`、`/cover-letter`、`/opportunities` 三个路由，也没有对应的 `data-tour` 选择器锚定在这三个入口上。**

具体确认过的步骤锚点（均安全，不涉及本次改动的三项）：
- `:95` 欢迎步骤 `activeHref: '/resumes'`
- `:103/116/129` 校招诊断相关步骤 `/diagnoses/campus`
- `:145/158` AI 改写相关步骤 `/resumes`
- `:176/188` 问 Coach 相关步骤 `/chat`
- `:203` 模拟面试步骤 `/mock`（**files_forbidden，不涉及本次改动但顺带确认导览引用它，改动模拟面试时才需留意**）
- `:220` 面试复盘步骤 `/debrief`（**files_forbidden，同上**）
- `:238` 投递追踪步骤 `/applications`（安全，本次改动会加强这个页面的求职信聚合区块可见度，属于正面影响不是风险）

**结论：本次导航收编改动完全不需要修改 `onboarding-tour.tsx`。** 这与 T1 教训（删入口导致导览锚点失效）不同——T1 出问题是因为当时删除的入口**恰好**被导览引用；这次三个目标入口经核查均未被引用，风险不成立，但仍建议施工完成后跑一次导览的 Playwright 走查作为回归确认（见 §7 验收清单）。

**待核实**：`onboarding-tour.tsx:331-342` 定义了 `FEATURE_TOURS`（`asr-recording` 小型专项导览），本次勘察未逐条排查是否还有其他 `FEATURE_TOURS` 条目——执行时请全局搜索 `FEATURE_TOURS` 确认没有条目引用职业地图/求职信/机会中心。

---

## 5. Badge / 通知点逻辑核查

`layout.tsx:44-53`（`NavItem` 接口定义，含 `badge?: string`/`dot?: boolean`）：
```ts
interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  dot?: boolean;
  /** 新手导览锚点:渲染为 data-tour 属性,供 OnboardingTour 聚光灯定位 */
  tourId?: string;
}
```

**当前有 badge/dot 的导航项**（均不在本次改动范围内，files_forbidden 或维持现状）：
- `layout.tsx:71`：`today` 项 `dot: true`（蓝点常驻提示）
- `layout.tsx:83-89`：`tracker`（投递追踪）项，`applicationCount > 0` 时显示数字 badge
- `layout.tsx:107-113`：`debrief`（面试复盘，files_forbidden）项，`interviewCount > 0` 时显示数字 badge

**本次要移除的三项（求职信/机会中心/职业地图）当前均无 badge/dot 定义**——移除这三个 `NavItem` 对象不涉及任何 badge 逻辑改动，是纯粹的数组元素删除，无连带副作用需要处理。

---

## 6. files_forbidden 汇总（禁止触碰的文件/路径）

```
packages/api/**                              — 本卡是纯前端导航层改动，后端零改动
packages/web/src/app/(main)/mock/**           — 模拟面试，用户否决冻结
packages/web/src/app/(main)/newspaper/**      — 月刊·面经，用户否决冻结
packages/web/src/app/(main)/debrief/**        — 面试复盘/ASR，用户否决冻结
packages/web/src/app/(main)/interview-prep/** — 面试备战，不在本次处置范围
packages/web/src/app/(main)/offer-comparator/** — Offer比对，不在本次处置范围
packages/web/src/app/(main)/applications/**   — 投递追踪页面本身不改动，只是被求职信关联；
                                                  如需改动必须先确认是否真的需要（见 §1.4 第2点的
                                                  "内嵌 vs 跳转"待确认项，默认按"不改动"处理）
packages/web/src/components/diagnosis/**      — 与 WP-1 无关
packages/web/src/components/onboarding/**     — 已核查无需改动，禁止顺手"优化"导览内容
```

`layout.tsx:72`（月刊）、`:98`（模拟面试）、`:107-113`（面试复盘）三处 `NavItem` 对象本身也是 files_forbidden 级别的禁碰区域——即便在同一个 `buildNavGroups()` 函数内，也只能动 `:81`/`:82`/`:122` 三处，其余原样保留，包括代码顺序、注释、缩进。

---

## 7. Playwright 验收清单

```
1. 导航渲染检查：登录后查看左侧导航，确认"求职信""机会中心""职业地图"三个入口不再出现；
   "月刊·面经""模拟面试""面试复盘"三项仍然原样出现（文案/图标/位置不变）
   → verify: Playwright snapshot 对比，三项消失 + 三项不变

2. 路由直达检查：浏览器直接访问 /cover-letter、/opportunities、/career 三个 URL
   → verify: 均正常渲染页面（非 404/非 302 跳转），确认"路由保留可直达"生效

3. 求职信关联回归：进入任意一条投递详情页，确认"求职信"聚合区块（application-detail.tsx:590-624）
   仍正常展示"暂无关联记录"或已关联列表，"为这条投递生成新的求职信 →"链接可点击并正确跳转到
   /cover-letter?applicationId=xxx&company=xxx&role=xxx
   → verify: 点击后 URL 参数正确，/cover-letter 页面能读取 applicationId 并预填

4. 新手导览回归：以新用户身份触发一次完整导览流程
   → verify: 导览全程正常播放完成，无锚点找不到导致的卡死/报错（对应本文档 §4 结论的实测验证）

5. "其他"分组处理验证：确认移除职业地图后，导航侧栏不出现空标题的"其他"分组残留
   → verify: 视觉走查 + DOM 检查，无空分组渲染

6. ESLint + build 门禁
   → verify: `npx eslint src` 0 错；`next build` 成功

7. 全局跳转来源复核（对应 §1.4 第3点"待核实"）：
   grep 全仓库 `href="/cover-letter"` `href='/cover-letter'` `href="/opportunities"` `href="/career"`
   确认改动后所有引用点行为符合预期（导航外的入口如果存在，需要一并评估是否也要移除或保留）
   → verify: 搜索结果逐条过一遍，记录在验证结果里，不能漏项
```

---

## 8. 未裁决点 / 待用户确认细节（非阻塞级，建议施工前一次性问清楚，避免二次返工）

1. "其他"导航分组移除职业地图后，是整个分组对象删除，还是保留空分组交给渲染层自动跳过？——技术上建议直接删除整个分组对象最保险（见 §1.2）。
2. 职业地图/机会中心的路由页面本身，是否需要加任何"已从主导航移除"的页内提示？——建议不加，静默保留。
3. 求职信"并入投递"是否要更彻底地把编辑器内嵌进投递详情页，还是维持现有"关联+跳转"机制？——建议维持现状（改动量小，且已满足 Codex 评审的核心诉求）。

以上三点均为"建议已给出、影响小"级别，不是 `00-master-plan.md` §1 末段列出的五条"未裁决(遇到即停)"红线范畴，执行者可按建议直接执行，若用户在阅读本卡时有不同意见可随时打断调整。

---

## 附：勘察方法说明（供后续执行者信任本文档）

本文档所有导航结构、组件、实体字段的 file:line 引用均通过 Read 工具实读源码确认，其中 `cover-letter/page.tsx:79/155-163`、`opportunity` 后端模块实际目录名与注册方式、`cover-letter/_referral/index.tsx` 用途三项已由主代理二次独立验证并订正（原背景勘察 agent 初稿中"opportunities 模块路径待查"/"_referral 用途待查"已解决）。仍标注为"待核实"的仅剩：`buildNavGroups()` 空分组渲染防御性判断、导航之外其他页面对三个路由的引用来源、`FEATURE_TOURS` 完整条目排查——这三项本轮未做二次验证，执行者施工前请自行核实，不要假设已验证。
