# resume-tailor

简历定向改写技能。基于用户画像和目标 JD，重组简历表达以提高匹配度。

核心原则：只重组表达，不编造经历。

---

## 快速开始

```
/resume-tailor
```

然后提供：
1. 简历原文或用户画像
2. （可选）目标职位 JD

---

## 核心约束

本技能强制执行零编造政策。每处修改都会标注：

- 原文内容
- 改写内容
- 修改理由
- 原始证据位置
- `fabrication_check`：PASS 或 NEED_USER_CONFIRM

不会添加原始材料中不存在的技能、经历或数据。

---

## 文件结构

```
resume-tailor/
├── PLAYBOOK.md                     # 技能主文件（由 career-principal 读取后执行，非自动加载点）
├── contract.yaml                   # 输入输出契约
├── input.schema.yaml               # 输入 JSON Schema
├── output.schema.yaml              # 输出 JSON Schema
├── references/
│   └── zero-fabrication-policy.md  # 零编造政策详细说明
├── examples/
│   ├── 01-targeted-rewrite.md      # Java 工程师定向改写
│   ├── 02-background-mismatch.md   # 严重背景不匹配时的诚实评估
│   ├── 03-no-jd-generic-optimization.md  # 无 JD 时的通用优化
│   └── 04-fabrication-refused.md   # 编造请求被拒绝
└── tests/
    ├── 01-hallucination-guard-no-python.md  # 幻觉防护：只有 Java 不能添加 Python
    ├── 02-fabrication-request-must-refuse.md # 编造请求必须拒绝
    ├── 03-fabrication-check-all-modifications.md # 每个修改必须有 fabrication_check
    ├── 04-no-jd-still-produces-output.md    # 无 JD 时执行通用优化
    └── 05-severe-mismatch-honest-gap.md     # 严重不匹配时 honest_gaps 非空
```

---

## 拒绝执行的情形

| 情形 | 处理方式 |
|------|---------|
| 要求添加不存在的量化数据 | 明确拒绝，说明政策 |
| 要求添加未掌握的技术栈 | 明确拒绝，建议真实学习 |
| 要求虚构工作经历 | 明确拒绝 |
| 背景严重不匹配（< 20% 重叠） | 诚实评估，不强行改写 |
