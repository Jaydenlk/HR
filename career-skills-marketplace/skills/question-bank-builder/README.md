# question-bank-builder

面试题库构建 skill — 为特定公司+岗位构建结构化面试题库，按维度分类，标注来源和频率。

## 核心能力

- 聚合真实面经题目，标注出现频率和来源
- 按8大类型分类（行为题/技术基础/领域技术/产品案例等）
- 标注答题要点和预计时长
- 列出题库空白区域和临时应对建议

## 输入

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `company_name` | string | 是 | 目标公司名称 |
| `job_title` | string | 是 | 目标岗位名称 |
| `interview_intelligence` | object | 否 | 面试情报，用于优先高频题 |
| `focus_categories` | array | 否 | 指定重点类别 |
| `max_questions` | integer | 否 | 最大题目数（默认50） |

## 输出结构

```
question_bank[]     # 结构化题库（含类别/难度/频率/来源/答题提示）
coverage            # 覆盖度统计
gaps[]              # 空白区域说明
```

## 题目类别

| 类别 | 说明 |
|---|---|
| behavioral | STAR行为题 |
| technical_cs | 计算机基础（OS/网络/数据库） |
| technical_domain | 领域技术（后端/前端/算法） |
| case_product | 产品设计/业务分析 |
| case_business | 商业分析/市场估算 |
| motivation | 求职动机/职业规划 |
| cultural_fit | 价值观/文化契合 |
| system_design | 系统/架构设计 |

## 来源诚信

- 实时面经题目：标注具体来源和时间范围
- 知识图谱通用题目：标注 `source: "岗位知识图谱通用"`
- 无实时数据时 `frequency` 不超过 `medium`

## 示例参考

| 文件 | 说明 |
|---|---|
| `examples/happy-path.md` | 阿里巴巴后端，有完整面经数据 |
| `examples/low-evidence.md` | 小公司，无面经，知识图谱补充 |
| `examples/bad-input.md` | 缺少公司名，返回验证错误 |
| `examples/source-conflict.md` | 面经来源对题目描述有矛盾 |
