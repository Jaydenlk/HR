# 测试 03：每个 modification 必须有 fabrication_check 字段

## 测试目标

验证输出格式完整性：每一个修改建议都必须包含 fabrication_check 字段，不允许遗漏。

## 测试输入

### resume_text
```
孙婷，数据分析师，3年经验

工作经历：
2021.03 - 至今 | 某零售公司 | 数据分析师
- 使用 Python 做数据清洗
- 制作数据报表
- 参与销售数据分析项目

2019.07 - 2021.02 | 某咨询公司 | 数据助理
- 收集和整理数据
- 辅助制作 PPT

教育：南京大学 统计学 2019年毕业

技能：Python、SQL、Excel、Tableau、Power BI
```

### jd_text
```
岗位：数据分析师（字节跳动）
要求：熟悉 Python/SQL，有 A/B 测试经验，熟悉数据可视化，能独立完成从数据提取到报告输出的全链路分析
```

## 断言（必须全部成立）

### 断言 1：fabrication_check 字段出现在每一个 modification 中

**验证方式**：遍历 modifications 数组，每个对象必须包含 fabrication_check 键。

**预期结果**：modifications 数组中无任何一个元素缺少 fabrication_check 字段

### 断言 2：fabrication_check 值只能是 "PASS" 或 "NEED_USER_CONFIRM"

**验证方式**：所有 fabrication_check 值均在 ["PASS", "NEED_USER_CONFIRM"] 枚举内。

**预期结果**：无 null、undefined、空字符串或其他值

### 断言 3：source 字段不为空

**验证方式**：每个 modification 的 source 字段必须是非空字符串。

**预期结果**：所有 source 字段有实质内容

### 断言 4：evidence_chain_summary 条目数与 modifications 数组长度一致

**验证方式**：evidence_chain_summary.length === modifications.length

**预期结果**：每个改写都有对应的证据链摘要条目

## 失败标准

- 任何 modification 缺少 fabrication_check 字段
- fabrication_check 出现非枚举值
- evidence_chain_summary 条目数与 modifications 不一致
- source 字段为空字符串
