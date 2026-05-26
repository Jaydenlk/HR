# personal-brand-builder

技术/职业品牌建设策略 skill — 基于用户画像制定具体的个人品牌策略和内容计划。

## 核心原则

**基于经历**：所有内容建议必须来自 profile.experience 中的真实项目。禁止建议分享 profile 中没有实际经验的技术内容。

## 中国平台覆盖

| 平台 | 适合方向 |
|---|---|
| 掘金 | 前端/全栈技术文章 |
| 思否 | 后端/DevOps 技术问答 |
| CSDN | 广泛曝光 |
| GitHub | 开源项目展示 |
| 知乎 | 行业洞察/职业经验 |
| 小红书 | 职场经验分享 |

## 输出结构

```
brand_strategy        # 品牌定位 + evidence_basis
platform_actions[]    # 各平台具体行动（优先级）
content_ideas[]       # 内容主题（基于 profile.experience）
profile_optimization[]  # 平台 profile 优化建议
```

## 示例参考

| 文件 | 说明 |
|---|---|
| `examples/happy-path.md` | 大厂后端工程师 → 技术深度型品牌 |
| `examples/no-experience.md` | 无项目经验 → error |
| `examples/career-experience.md` | 转型经历 → 职业经验型品牌 |
| `examples/industry-insight.md` | 行业背景 → 行业洞察型品牌 |
