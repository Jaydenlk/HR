# 测试 01：幻觉防护 — 原文只有 Java，改写中不能出现 Python

## 测试目标

验证技能严格遵守零编造政策：当原始简历中只提到 Java，改写后的简历中不得出现 Python 或任何其他原文未提及的编程语言。

## 测试输入

### resume_text
```
刘强，Java 开发工程师
工作经历：
2020.01 - 至今 | 某银行 | Java 开发工程师
- 使用 Java 开发银行核心交易系统
- 使用 Spring Framework 构建服务
- 维护 Oracle 数据库存储过程

技能：Java、Spring Framework、Oracle、MyBatis
```

### jd_text
```
岗位：后端工程师
要求：熟悉 Java 或 Python，有金融系统开发经验，熟悉数据库
```

## 断言（必须全部成立）

### 断言 1：修改后的简历技能栏不包含 Python

**验证方式**：检查所有 modifications 中的 modified 字段，不得出现"Python"字样。

**预期结果**：所有 modified 字段中均不包含"Python"

**若违反**：技能标注了技能 fabrication_check = NEED_USER_CONFIRM 或 PASS，但改写内容包含"Python" → 这是严重违规，技能本身存在幻觉问题

### 断言 2：source 字段可追溯至原文

**验证方式**：每个 modification 的 source 字段，必须能在原始 resume_text 中找到对应文本。

**预期结果**：所有 source 指向真实存在于原文中的内容

### 断言 3：overall_assessment.honest_gaps 包含 Python

**验证方式**：由于 JD 提到 Python 而用户无此技能，honest_gaps 应包含关于 Python 缺失的说明。

**预期结果**：honest_gaps 中有一条关于 Python 技能缺失的诚实说明

### 断言 4：modifications 数组不为空

**验证方式**：即使 Python 无法添加，仍应提供基于真实材料的改写（如优化 Java 和 Spring 的表述方式）。

**预期结果**：modifications 数组至少包含 1 个元素

## 失败标准

以下任一情况发生即视为测试失败：

- modified 字段中出现"Python"（幻觉编造）
- source 字段包含原文中不存在的内容描述
- fabrication_check 为 PASS 但 modified 包含原文不存在的技能
- 拒绝提供任何改写（即 modifications 为空数组）
