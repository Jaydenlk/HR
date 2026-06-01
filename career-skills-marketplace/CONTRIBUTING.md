# 贡献指南

感谢你考虑为 Career Skills Marketplace 做出贡献。本指南说明如何提交 Pull Request、需要遵守的数据规范，以及代码审查流程。

---

## 可以贡献的内容

| 类型 | 目标路径 | 说明 |
|------|----------|------|
| Skill 实现 | `skills/<skill-name>/` | 新增或改进求职相关 skill |
| 企业数据 | `skills/_career-skills-shared/knowledge/company-taxonomy/` | 企业信息、阶段、融资轮次等 |
| 评分 Rubric | `skills/_career-skills-shared/rubrics/` | 匹配度、质量评分标准 |
| 评测用例 | `skills/<skill-name>/tests/` | 用于验证 skill 行为的输入/输出样例 |

---

## 提交 PR 的流程

1. **Fork 本仓库**，在自己的分支上修改，分支命名格式：`feat/<topic>` 或 `fix/<topic>`。
2. **在本地完整测试**：确保所有相关 schema 验证通过，YAML 文件可被解析。
3. **填写 PR 描述**：说明修改目的、影响范围、测试方式。
4. **提交 PR** 到 `main` 分支，等待维护者审查。
5. 审查通过后由维护者合并，不接受 force push 到 main。

---

## Skill 贡献清单

每一个新增或修改的 skill，必须包含以下全部文件，缺一不可：

- 若新增 **worker 工具**：主文件为 `PLAYBOOK.md`（由 career-principal 读取后执行，不自动触发）；若新增或修改 career-principal 主理人本身，主文件为 `SKILL.md`（唯一自动触发入口）
- `contract.yaml` — skill 接口契约：触发条件、参数类型、返回格式
- `schemas/input.schema.json` — 输入数据 JSON Schema
- `schemas/output.schema.json` — 输出数据 JSON Schema
- `examples/` — 至少 2 个完整的输入/输出示例（正常路径 + 边界情况各一个）
- `tests/` — 至少 1 个可运行的评测用例，格式参考 `skills/_career-skills-shared/output-schema/`

---

## 数据红线（违反将导致 PR 被拒）

以下内容**不得**出现在任何提交中：

1. **真实个人简历** — 不得包含任何真实求职者的简历全文或可识别的个人信息（姓名、手机、邮箱、学校+姓名组合等）。示例数据须明确标注为虚构。
2. **受版权保护的完整文本** — 职位描述、公司介绍、新闻报道只能以摘录形式（不超过原文 10%）或外链形式引用，不得全文复制。
3. **无来源的薪资数据** — 所有薪资区间数据必须在同一文件内标注数据来源（网站名称 + 采集时间），禁止凭印象填写。
4. **无来源的企业信息** — 企业融资轮次、规模、业务描述必须附带可核实的来源字段（`source_url` 或 `source_note`），不得凭记忆或推测填写。
5. **争议性信息未标置信度** — 对市场行情、岗位前景等存在合理争议的判断，必须在数据字段中标注 `confidence: low/medium/high` 及依据说明，禁止以确定性语气呈现不确定信息。

---

## 审查标准

PR 被合并前，维护者将检查以下项目：

- YAML / JSON 文件语法有效，通过 schema 校验
- Skill 贡献包含上述清单中的全部文件
- 数据红线无违反
- 示例文件中无真实个人信息
- 有来源字段的数据其来源字段已填写且格式正确
- `SKILL.md` 描述与 `contract.yaml` 接口定义一致
- 新增 skill 的 `marketplace.yaml` 中已添加对应条目

如有任何疑问，请在 PR 中留言，维护者会在 5 个工作日内回复。
