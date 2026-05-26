# graduate-school-vs-job-advisor

读研 vs 工作分析 skill — 覆盖中国特有场景（考研/保研/出国），给出基于数据的客观分析。

## 核心原则

**数据驱动**：每条利弊分析必须引用 profile 字段或用户提供的具体数据（GPA/薪资/经济压力）。禁止"读研总是有价值的"等无逻辑建议。

## 覆盖场景

| 场景 | 关键判断维度 |
|---|---|
| 保研 | GPA/排名是否满足条件 |
| 考研 | 备考状态、目标院校难度 |
| 出国读研 | GPA、语言成绩、经济承受力 |
| 直接工作（校招） | 是否有强SP offer、行业学历要求 |
| 先工作后在职读研 | 目标职位学历要求、公司是否支持 |

## 输出结构

```
analysis[]
├── path_name         # 读研路径名称
├── pros[]            # 优点（引用数据）
├── cons[]            # 缺点（引用数据）
├── feasibility_note  # 对用户的可行性
└── opportunity_cost

recommendation        # 综合建议
critical_factors[]    # 关键决策因素（supports_grad_school/work/neutral）
```

## 示例参考

| 文件 | 说明 |
|---|---|
| `examples/happy-path.md` | 双非本科 CS，GPA 3.6，考研 vs 直接工作 |
| `examples/baoyao-eligible.md` | 985本科，GPA 3.8，保研分析 |
| `examples/algorithm-job.md` | 目标算法岗，学历硬要求分析 |
| `examples/high-economic-pressure.md` | 经济压力高，读研成本是主要顾虑 |
