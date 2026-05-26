# nowcoder-tech-miner

牛客网技术面经提取 skill — 从牛客网实时搜索结构化技术面试经验和笔试题。

## 核心能力

- 实时搜索牛客网面试经验
- 提取并分类技术笔试题
- 识别高频考题
- 无实时数据时主动降级

## 可靠性声明

**牛客网内容可靠性上限为 B 级。** 用户有技术背景，内容质量高于小红书，但仍无法验证身份真实性，使用时需交叉验证。

## 输入

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `company` | string | 是 | 目标公司名称 |
| `role` | string | 否 | 岗位方向 |
| `focus` | string | 否 | interview / online_test / both（默认 both） |
| `max_posts` | integer | 否 | 最多返回帖子数（默认 10） |

## 输出结构

```
mined_posts[]           # 面经帖子（无数据时为空）
technical_questions[]   # 技术题目（无数据时为空）
credibility_ceiling     # 固定为 B
```

## 降级行为

无法访问牛客网时：
- 所有数组字段返回空
- `confidence` 为 `insufficient`
- 引导用户手动搜索牛客网

## 示例

| 文件 | 说明 |
|------|------|
| `examples/happy-path.md` | 成功提取技术面经的输出 |
| `examples/degradation.md` | 无实时数据的降级输出 |
