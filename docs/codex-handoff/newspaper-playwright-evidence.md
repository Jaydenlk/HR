# Monthly Newspaper Playwright 验收证据

> 日期：2026-05-25
> 分支：feature/monthly-newspaper

## 代码修复（Codex 审计后）

| Issue | 修复 | Commit |
|-------|------|--------|
| RadarResult 重复定义 | 删除 types.ts 重复接口 | `bf06e21` |
| Radar 混入 ugc/coach | applyRadarFilters 限制 xhs/nowcoder/wechat + source_url 非空 | `bf06e21` |
| "加载更多"替换而非追加 | 函数式 setResult append | `bf06e21` |

## 真实数据导入

| 来源 | 导入方式 | 条数 | 结果 |
|------|---------|------|------|
| 小红书 XHS | POST /feed/import (source_id=xhs) | 4 条 | ✅ 成功入库 |
| 牛客 Nowcoder | POST /feed/import (source_id=nowcoder) | 0 | ❌ RSS 公共实例返回失败 |
| 公众号 WeChat | 未导入 | 0 | ❌ Docker Desktop 未运行 |

**XHS 入库内容：**
- "字节Agent面试题库" — company:字节跳动, role:Agent开发工程师, quality:4
- "中国人保二面过程" — company:中国人保, quality:2
- "推荐所有文科生转行AI产品" — company:百度, role:AI产品经理, quality:2
- "校招面试过程" — category:job_tips, quality:0

## Playwright 桌面端验证 (1280x800)

### /newspaper 有数据展示

| 检查项 | 结果 | 具体内容 |
|--------|------|---------|
| 24h 新增计数 | ✅ | "24h 内新增 4 篇" |
| 精选头条：编辑精选 | ✅ | "本周字节跳动面经活跃（1条），涉及algorithm" |
| 精选头条：24H 热点 | ✅ | "字节Agent面试题库" — 真实 XHS 内容 |
| 精选头条：Coach 建议 | ✅ | "上传简历" — 诚实标注缺数据 |
| 分类 Tabs 计数 | ✅ | 全部4 / 面经3 / 故事1 / 热点0 / 题库0 |
| 内容卡片：公司 | ✅ | 字节跳动 / 中国人保 / 百度 |
| 内容卡片：岗位 | ✅ | Agent开发工程师 / AI产品经理 |
| 内容卡片：来源 badge | ✅ | 全部显示"小红书" |
| 内容卡片：质量分 | ✅ | 4 / 2 / 2 |
| 内容卡片：作者 | ✅ | 转码加薪姐 / 食堂在逃干饭王 / 喜欢趴着睡 |
| 内容卡片：原文链接 | ✅ | 每张有 xiaohongshu.com "原文" 链接 |
| 内容卡片：摘要 | ✅ | AI 生成的中文摘要，未编造 |
| Coach 行动建议 | ✅ | "上传简历"+"开始投递"，数据来源标注清楚 |

### /newspaper/radar 有数据筛选

| 检查项 | 结果 | 具体内容 |
|--------|------|---------|
| 结果总数 | ✅ | "共 4 条结果" |
| 公司 stats pills | ✅ | 百度(1) / 字节跳动(1) / 中国人保(1) |
| 岗位 stats pills | ✅ | product(1) / embedded(1) / algorithm(1) |
| 公司筛选命中 | ✅ | 点击"字节跳动(1)" → "共 1 条结果" |
| 内容卡片：来源+时间 | ✅ | "小红书面经 · 05/25 21:31" |
| 原文跳转链接 | ✅ | 每张卡片有"原文"链接指向 xiaohongshu.com |
| 低置信度弱展示 | ✅ | 所有卡片显示"低置信"badge + "AI 分类置信度低，仅供参考" 灰色提示 |

## 移动端验证 (390x844) — 空状态

### /newspaper
- 侧边栏有汉堡菜单 ✓
- Hero 三栏垂直堆叠 ✓
- Tabs 可见可点 ✓
- Coach 行动建议可见 ✓
- 文字不重叠 ✓

### /newspaper/radar
- 搜索框可见可输入 ✓
- 岗位/来源/季度 tabs 可点 ✓
- 空状态正确显示 ✓
- 文字不重叠 ✓

## 未验证项（诚实声明）

| 项 | 原因 |
|---|------|
| 牛客技术面经展示 | RSS 公共实例导入失败（rsshub.rssforever.com 返回错误） |
| 公众号认知补给展示 | Docker Desktop 未运行，We-MP-RSS 不可用 |
| "加载更多" append | 当前只有 4 条，不足 20 条触发分页 |
| 移动端有数据展示 | 移动端测试时使用的是空数据库 |
| 个性化排序 | 用户无投递/机会数据 |

**牛客和公众号未导入不是代码问题，是外部服务依赖。** 代码链路已通过 XHS 验证完整：导入 → AI 分类 → 入库 → Newspaper 展示 → Radar 筛选 → 原文跳转。

## PJR 最终验证

| 检查 | 结果 |
|------|------|
| BE tsc --noEmit | PASS |
| BE nest build | PASS |
| BE Newspaper E2E | 26/26 PASS |
| BE Feed E2E | 23/23 PASS |
| FE eslint src/ | 0 errors 0 warnings |
| FE next build | PASS |
