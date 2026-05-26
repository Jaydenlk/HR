# xhs-interview-miner

小红书面经提取 skill — 从小红书实时搜索结构化面试经验，供其他 skill 使用。

## 核心能力

- 实时搜索小红书面试经验帖
- 识别并过滤推广笔记
- 结构化提取面试轮次和关键问题
- 生成质量报告

## 可靠性声明

**小红书内容可靠性上限为 C 级。** 原因：平台混杂推广笔记和真实面经，用户身份无法验证，不适合作为高可靠性数据源。使用本 skill 输出时必须交叉验证。

## 输入

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `company` | string | 是 | 目标公司名称 |
| `role` | string | 否 | 岗位方向 |
| `max_posts` | integer | 否 | 最多返回帖子数（默认 10） |

## 输出结构

```
mined_posts[]         # 提取的面经帖子（无数据时为空）
quality_report        # 整体质量统计
credibility_ceiling   # 固定为 C
```

## 降级行为

无法访问小红书时：
- `mined_posts` 返回空数组
- `confidence` 为 `insufficient`
- 引导用户手动搜索小红书

## 与其他 skill 的关系

| 场景 | 推荐 |
|------|------|
| 需要高可靠技术面试题 | nowcoder-tech-miner（上限 B 级） |
| 了解公司文化/氛围 | xhs-interview-miner（C 级，仅供参考） |

## 示例

| 文件 | 说明 |
|------|------|
| `examples/happy-path.md` | 成功提取面经的输出 |
| `examples/degradation.md` | 无实时数据的降级输出 |
