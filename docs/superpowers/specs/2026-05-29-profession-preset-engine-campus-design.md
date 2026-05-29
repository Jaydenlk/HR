# 设计:职业预设引擎 —— 校招简历诊断(MVP)

- 日期:2026-05-29
- 子项目:A · 职业预设引擎(首个垂直线:简历诊断)
- 状态:待用户评审

## 1. 背景与定位

- **中间产品定位**:高端职业咨询/简历服务继续由人工提供;我们用 AI 下场服务**校招/学生层**——人工服务覆盖不到、而 AI 能规模化做好的价位带。**先做校招。**
- **同一产品两种形态**:SaaS(GUI,给不会用 Claude Code 的人)与 Claude Code marketplace(给会用的人,"上来即用")。本子项目落在 **SaaS 后端 + 前端**;引擎设计为两形态共用。
- **差异化 = 职业预设**:按目标职业定制简历诊断。灵感源 [santifer/career-ops](https://github.com/santifer/career-ops)(~47k★,Claude Code 上的求职系统:贴 JD → 多维评分 + 定制简历)。
- **我们的楔子**:career-ops 是横向扫多 JD、全欧美公司、无简体中文。我们反过来——**中文原生 + 校招校准 + 单职业纵向深诊断**(给"这句改成这样 + 为什么"的示范,不止评分)。注:职业特化是被验证的好概念,非全球首创,我们的价值在中国校招特调。

## 2. 目标与非目标

### 目标(MVP)
1. 新增**职业标尺诊断模式**:简历 +(可选)JD + 目标职业 → 按该职业**校招胜任力标尺**输出分维度诊断,每条带"为什么",并给职业特化的改写示范。
2. 引擎可插拔:职业预设以强类型定义文件存在,**加职业 = 加文件**,无需改代码。
3. MVP 只填 1 个预设:**互联网产品经理 · 校招**。
4. 防编造红线:改写只能基于简历已有内容重组/强化,缺证据时输出"建议补充 X"而非虚构。

### 非目标(本期不做)
- **原有功能一律不动**:marketplace 形态及其它 SaaS 功能本期都不改;marketplace 待本设计在 SaaS 验证后**平行迁移开发**。
- **JD 匹配诊断**(已有 CV × 具体 JD 的契合度)是**独立功能**,本期**原样保留、不改其行为**。让它职业化属未来独立增强。
- 不做 社招/转行 阶段(预设 schema 留 `stage` 字段为其铺路,但本期不实现切换逻辑)。
- 不做多职业对比视图(本期单一目标职业)。
- 不引入 mock/假数据;不做计费。

## 3. 核心概念:两种诊断模式,共用一个引擎

| 模式 | 输入 | 语义 | 本期 |
|------|------|------|------|
| **职业标尺模式** | 简历 + 目标职业 +(可选)JD | 对照该职业**校招胜任力标尺**诊断 | ✅ MVP |
| **JD 匹配模式** | 已有 CV + 具体 JD | CV 与该 JD 的契合度 | 现有功能,保留不动 |

两模式共用**预设驱动的 Analyzer/Rewriter**。职业标尺模式新增;JD 匹配模式行为不变(扩展式重构,非破坏式合并)。

## 4. 架构

### 新增 `packages/api/src/profession-presets/`
- `ProfessionPresetService`:维护预设注册表,`resolve(profession) → ProfessionPreset`;职业无法解析/预设缺失时抛明确错误,**绝不 fallback 到通用诊断**。
- `presets/`:每个"校招·职业"一个强类型定义文件。MVP:`product-manager-campus.ts`。注册表自动收录目录下全部预设。
- 预设为**作者内容、git 版本化**,不进 DB。

### 扩展式重构现有服务(深度融合,禁补丁)
- `AnalyzerService`:新增**预设驱动的职业标尺分析**能力——提示词由 `preset.dimensions` 生成,输出每维 `{score, 命中证据, gap, why}`。保留原 JD 匹配分析路径。
- `RewriterService`:新增按 `preset.rewriteGuidance` 的职业特化改写,输出 `{原句, 改法, why}`。保留原路径。
- `DiagnosesService`:职业标尺模式下先 `ProfessionPresetService.resolve`,再贯穿 parser→analyzer→rewriter。

## 5. 预设 Schema(引擎接口)

```ts
interface ProfessionPreset {
  id: string                 // 'product-manager-campus'
  profession: string         // '互联网产品经理'
  stage: 'campus'            // 校招;留字段为社招/转行铺路,本期固定 campus
  displayName: string        // '产品经理 · 校招'
  dimensions: Array<{
    key: string
    name: string
    weight: number
    whatGoodLooksLike: string   // 应届水平"好"的样子
    campusEvidence: string      // 该维度在应届简历靠什么体现:实习/项目/竞赛/课程
    commonGaps: string          // 应届常见缺失
  }>
  explanationRubric: string     // 每维如何产出"为什么"
  rewriteGuidance: string       // 职业特化改写原则 + 示范模式 + 防编造约束
  resumeConventions: string     // 本土校招惯例:GPA/实习权重/竞赛/个人评价/无照片…
}
```

## 6. 数据流(职业标尺模式)

1. 前端:简历 + 目标职业(MVP 仅"产品经理·校招")+ JD 可选填。
2. `DiagnosesService.create(mode='profession_standard')` → `ProfessionPresetService.resolve(profession)` 得 preset。
3. parser 解析简历(已有);有 JD 则解析为辅助上下文(不做匹配语义)。
4. `AnalyzerService` 按 preset 输出分维度 `{score, 证据, gap, why}`。
5. `RewriterService` 按 preset + analysis 输出改写示范 `{原句, 改法, why}`。
6. 存 `diagnoses` 表。

## 7. 前端呈现要求(视觉布局留实现阶段)

**职业标尺模式拥有独立入口**(目标职业选择 + JD 可选填),**不与现有 JD 匹配入口/表单共用以避免混淆**;现有 JD 匹配流程保持不变。结果页 `/diagnoses/[id]` 按 `mode` 渲染对应内容,职业标尺模式须传达:
1. 职业镜头标识(产品经理·校招)
2. 总评 + 分维度评分(A-F 或分数)
3. **每条诊断必带"为什么"**
4. 改写示范:"这句 → 改成这样 + 理由"
5. 本土惯例校验提示(GPA/实习/竞赛/个人评价)

> 视觉布局、组件、响应式由**实现阶段**加载 `frontend-design` + `ui-ux-pro-max` 设计;PJR 阶段前端同样做完整 lint + build;Playwright 桌面 + 移动逐流程实测。

## 8. 错误处理 + 防编造红线

- 简历 < 30 字 → 拒绝(沿用)。
- 职业无法解析 / 预设缺失 → 明确报错,不 fallback 通用诊断。
- **改写防编造**:仅基于简历已有内容重组/强化,禁止虚构经历;无对应证据 → 输出"建议补充 X"。
- AI 返回沿用 `completeStructured` 的 tool_use 强结构校验。

## 9. 测试策略与验收标准

> 核心思想:**找茬**——不验证它对,而是找出它的错(布局 + 内容/文字是否符合当前场景)。涉及前端则测前端,涉及后端则测后端,模块级任务两端都测。

### 后端
- **非 AI 接口**(预设加载、诊断 CRUD):预期**正常结果**测试 + 预期**异常结果**测试(Jest e2e)。
- **AI 接口**(analyze / suggest):带入复杂场景,测 AI 能力极限的两个维度——
  - **决策能力**:提示词 + 上下文(preset)+ 约束条件,能否让 AI 完成复杂诊断/改写任务?(如:同一简历换不同预设 → 评分与建议**确有职业倾向差异**;低质简历 → 拒绝/低置信)
  - **执行能力**:工具执行后能否得到 AI 预期结果?(如 `completeStructured` 的 tool_use 是否稳定返回符合 schema 的结构;防编造 → 简历无某经历时确认不虚构、输出"建议补充")
- 正常 + 异常完整链路都要覆盖。

### 前端(Playwright E2E,桌面 + 移动 双端)
- **不只截图**:把完整业务链路带入具体复杂场景执行,完整交互(每个按钮、每段输入、每次跳转全走一遍),既查 UI 也查 UX。
- **场景一(正常)**:选职业 →(选填 JD)→ 发起诊断 → 浏览结果各区块(分维度评分 / 每条"为什么" / 改写示范 / 本土惯例提示)→ 改写示范交互,全流程走通。
- **场景二(边界/异常)**:简历过短、职业无法识别、预设缺失、超长输入、空提交等 → 验证是否如期出现异常并被**拦截**(明确报错,不静默、不 fallback 通用诊断)。
- **内容找茬**:文案是否符合校招·该职业场景(中文、无残留英文、无通用空话);诊断与改写是否真的职业特化、是否带"为什么"。

## 10. 数据模型变更

`diagnoses` 表新增:`profession`(string)、`preset_id`(string)、`mode`('profession_standard' | 'jd_match')。`dimensions` JSON 字段复用。JD 字段改为可空。

## 11. 验收标准(step → verify)

1. 加载 `product-manager-campus` 预设 → verify:`ProfessionPresetService.resolve('互联网产品经理')` 返回该预设,未知职业抛错。
2. 无 JD 发起诊断 → verify:返回按预设维度的分维度评分,每维含 why,无"必须有 JD"报错。
3. 同一简历切换(模拟)不同预设 → verify:维度与建议随职业变化(职业倾向可见)。
4. 简历缺某经历 → verify:改写输出"建议补充",无虚构内容。
5. 现有 JD 匹配诊断 → verify:行为与重构前一致(回归不破坏)。
6. 前端 Playwright 桌面+移动 → verify:选职业→诊断→结果各区块→改写交互全流程通过。

## 12. 遗留 / 未来(全面铺开)

- 扩展更多校招职业预设(技术研发、运营、数据、市场…)。
- 让 JD 匹配模式也变 preset-aware(独立增强)。
- 引入 社招/转行 stage。
- 外溢到 Claude marketplace 形态(同一预设内容复用)。
