# Monthly Newspaper Playwright 验收证据

> 日期：2026-05-25
> 分支：feature/monthly-newspaper

## 代码修复（Codex 审计后）

| Issue | 修复 | Commit |
|-------|------|--------|
| RadarResult 重复定义 | 删除 types.ts 512-517 行重复接口 | `bf06e21` |
| Radar 混入 ugc/coach 内容 | applyRadarFilters 加 source_kind IN (xhs,nowcoder,wechat) + source_url 非空 | `bf06e21` |
| "加载更多"替换而非追加 | 用函数式 setResult append prev.items + data.items | `bf06e21` |

## Playwright 桌面端 (1280x800)

### 链路 1：登录 → Newspaper → Radar

| 步骤 | 结果 |
|------|------|
| 打开 /login | 200 ✓ |
| 填写邮箱+姓名+邀请码 COACH2026 | 表单正常 ✓ |
| 点击"进入 Coach" | 跳转到产品内页 ✓ |
| 导航到 /newspaper | 页面加载 ✓ |
| 检查 Header | "月刊·面经" + "24h 内新增 0 篇" ✓ |
| 检查 Hero 三栏 | 编辑精选（空状态）+ 24H热点（空状态）+ Coach 建议（"上传简历"）✓ |
| 检查分类 Tabs | 全部/面经/热点/故事/题库/编辑精选 ✓ |
| 检查排序控制 | 最新发布 / 仅校招 ✓ |
| 检查内容区 | "当前筛选下暂无内容" 空状态 ✓ |
| 检查 Coach 行动建议 | "上传简历"+"开始投递"，诚实标注数据缺失 ✓ |
| 点击"搜面经" → /newspaper/radar | 跳转成功 ✓ |
| Radar Header | "面经雷达" + "← 月刊" 返回链接 ✓ |
| Radar 筛选栏 | 公司搜索 + 关键词 + 岗位 tabs + 来源 tabs + 季度 tabs ✓ |
| Radar 空状态 | "没有找到匹配的面经" ✓ |

### 链路 2：筛选交互

| 步骤 | 结果 |
|------|------|
| 岗位 tabs (后端/前端/算法/产品/运营/设计) | 可点击 ✓ |
| 来源 tabs (小红书/牛客/公众号) | 可点击 ✓ |
| 季度 tabs (本季度/上季度) | 可点击 ✓ |

## Playwright 移动端 (390x844)

### Newspaper 页面

| 检查项 | 结果 |
|--------|------|
| 侧边栏有汉堡菜单 | "切换侧边栏" 按钮 ✓ |
| Header 标题可见 | "月刊·面经" ✓ |
| Hero 三栏改为堆叠 | 编辑精选 / 热点 / Coach 建议垂直排列 ✓ |
| Tabs 可见可交互 | 全部/面经/热点/故事/题库/编辑精选 ✓ |
| 排序控制可见 | 最新发布/仅校招 ✓ |
| Coach 行动建议 | 两张卡片垂直排列 ✓ |
| 按钮可点 | "搜面经"/"写一篇" 链接可交互 ✓ |
| 文字不重叠 | ✓ |

### Radar 页面

| 检查项 | 结果 |
|--------|------|
| Header 可见 | "面经雷达" + "← 月刊" ✓ |
| 搜索框 | 公司+关键词 两个输入框可见可输入 ✓ |
| 岗位 tabs | 7 个 tab 可见可点 ✓ |
| 来源 tabs | 4 个 tab 可见可点 ✓ |
| 季度 tabs | 3 个 tab 可见可点 ✓ |
| 空状态 | "没有找到匹配的面经" ✓ |
| 文字不重叠 | ✓ |

## 未测试项（诚实声明）

| 项 | 原因 |
|---|------|
| 有数据时的内容卡片渲染 | 当前干净数据库无 feed items |
| 原帖跳转 (source_url) | 需要有真实 feed items |
| 低置信度弱展示 | 需要有 confidence=low 的 items |
| "加载更多" 追加行为 | 需要 >20 条结果 |
| 个性化排序验证 | 需要用户有投递+机会数据 |

这些项需要在导入真实 XHS/牛客数据后补测。

## PJR 最终验证

| 检查 | 结果 |
|------|------|
| BE tsc --noEmit | PASS |
| BE nest build | PASS |
| BE Newspaper E2E | 26/26 PASS |
| BE Feed E2E | 23/23 PASS |
| FE eslint src/ | 0 errors 0 warnings |
| FE next build | PASS |
