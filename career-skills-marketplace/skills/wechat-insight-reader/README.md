# wechat-insight-reader

微信公众号洞察提取 skill — 从公众号实时搜索行业洞察和职场方法论。

## 输入

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `topic` | string | 是 | 查询主题（>= 2 字） |
| `industry` | string | 否 | 行业过滤 |
| `max_insights` | integer | 否 | 最多返回条数（默认 10） |

## 输出结构

```
insights[]   # 行业洞察条目（无数据时为空）
```

## 降级行为

无法访问公众号时：
- `insights` 返回空数组
- `confidence` 为 `insufficient`
- 引导用户自行查阅公众号

## 示例

| 文件 | 说明 |
|------|------|
| `examples/happy-path.md` | 成功提取公众号洞察的输出 |
| `examples/degradation.md` | 无实时数据的降级输出 |
