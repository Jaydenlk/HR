# match-diagnosis

简历与 JD 匹配诊断技能。输出多维评分、差距分类和改进建议。

评分有真实区分度：完美匹配 85+，不匹配 < 25，不允许趋中打分。

---

## 快速开始

```
/match-diagnosis
```

需同时提供：
1. 用户画像（user_profile）
2. JD 分析结果（jd_analysis）

两者缺一不可，否则返回置信度 insufficient。

---

## 五维评分

| 维度 | 权重 | 说明 |
|------|------|------|
| 技能匹配 | 30% | 技术技能与 JD 逐项对比 |
| 经验相关度 | 25% | 行业、职责、年限匹配程度 |
| 教育背景 | 15% | 学历层次、专业相关性 |
| 岗位目标 | 15% | 职业发展轨迹一致性 |
| 隐性约束 | 15% | 地点、工作性质等实际约束 |

---

## 评分区间

| 区间 | 标签 | 建议 |
|------|------|------|
| 85-100% | perfect_fit | 直接投递 |
| 70-84% | strong_match | 建议投递 |
| 50-69% | moderate_match | 有针对性准备再投 |
| 30-49% | weak_match | 补强后再投 |
| 0-29% | no_match | 不建议投递此岗位 |

---

## 文件结构

```
match-diagnosis/
├── PLAYBOOK.md                     # 技能主文件（由 career-principal 读取后执行，非自动加载点）
├── contract.yaml                   # 输入输出契约
├── input.schema.yaml               # 输入 JSON Schema
├── output.schema.yaml              # 输出 JSON Schema（扩展 base_output）
├── examples/
│   ├── 01-high-match-85-plus.md    # 高匹配：资深前端投字节
│   ├── 02-low-match-under-25.md    # 低匹配：护士投游戏工程师
│   ├── 03-partial-data-medium-confidence.md  # 数据不完整时的中等置信度
│   └── 04-one-sided-data-insufficient.md     # 只有用户画像时的 insufficient
└── tests/
    ├── 01-hallucination-guard-no-python-score.md  # 无 Python 不能给 Python 正分
    ├── 02-required-missing-score-cap.md           # required 缺失总分 <= 50
    ├── 03-five-dimensions-always-present.md       # 必须有五维评分
    ├── 04-missing-jd-returns-insufficient.md      # 无 JD 返回 insufficient
    └── 05-score-discrimination-no-clustering.md   # 分数必须有区分度
```

---

## 置信度规则

| 条件 | 置信度 |
|------|------|
| 两份数据均充分 | high |
| 一份信息不足 | medium |
| 两份均不足但可评 | low |
| 关键数据缺失无法评分 | insufficient（不产生评分） |
