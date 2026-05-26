# technical-interview-coach

技术面试备考教练 skill — 为算法/系统设计/编程实操制定个性化备考计划，结合目标公司考察重点。

## 核心能力

- 制定按优先级排序的备考计划（含时间估算）
- 推荐各方向练习题（类型题，非真题）
- 整理通用解题/设计模式框架
- 提取目标公司特有技术考察偏好

## 输入

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `job_title` | string | 是 | 目标技术岗位 |
| `company_name` | string | 否 | 目标公司 |
| `user_profile` | object | 否 | 用户画像 |
| `interview_intelligence` | object | 否 | 面试情报 |
| `available_weeks` | integer | 否 | 可用备考时间（周） |

## 输出结构

```
preparation_plan[]         # 备考计划（按 critical/high/medium 优先级）
practice_questions[]       # 练习题（含题型/难度/核心概念）
common_patterns[]          # 通用解题模式
company_specific_focus[]   # 公司专项重点（无数据时为空数组）
```

## 适用岗位

后端工程师 / 前端工程师 / 算法工程师 / 数据工程师 / 全栈工程师

## 示例参考

| 文件 | 说明 |
|---|---|
| `examples/happy-path.md` | 有4周时间备考字节跳动后端 |
| `examples/low-evidence.md` | 仅有岗位名，无公司和时间信息 |
| `examples/bad-input.md` | job_title 为空 |
| `examples/source-conflict.md` | 面经对考察重点描述矛盾 |
