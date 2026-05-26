# 隐私政策

Career Skills Marketplace 是一个在你本地 Claude Code 环境中运行的工具。以下说明数据如何存储、传输和清除。

---

## 数据本地存储

所有你输入的求职数据——包括简历、职位描述、面试记录、对话历史——均存储在你本地机器上，不经过任何远程服务器。

具体存储位置：
- 各 skill 文件：`~/.claude/skills/<skill-name>/`（如 `career-principal/`、`jd-analyzer/` 等）
- 共享资源和知识图谱：`~/.claude/skills/_career-skills-shared/`（随安装附带，不含个人数据）
- 证据文件（如工具生成了本地记录）：`~/.claude/skills/_career-skills-shared/.evidence/`

---

## 不上传的内容

以下内容不会被上传或传输至任何外部系统：

- 你的简历原文
- 你与系统的对话记录
- 面试准备笔记
- 你填写的能力画像数据
- 任何 `.evidence/` 目录下生成的文件

---

## API Key 安全

如果你的 Claude Code 环境配置了 API Key（如 Anthropic API Key），该密钥由 Claude Code 本身管理，不由本插件读取或传递。

**硬性约束**：`.env` 文件和任何包含 API Key 的配置文件均已列入 `.gitignore`，不会出现在 git 历史中。如果你 fork 或 clone 了本仓库并修改了本地配置，请在 push 前确认敏感信息未被加入 staged 区域。

---

## .evidence/ 目录与 .gitignore

`.evidence/` 目录（如 skill 在运行过程中写入了本地证据文件）已在 `.gitignore` 中排除。

这意味着：
- 你的本地求职记录不会被意外提交到公共仓库
- 如果你 fork 本仓库，`.evidence/` 不会被包含在 push 的内容中

---

## 如何清除本地数据

如需清除本地证据数据，请手动确认目录路径后删除：

1. 确认目录存在：`ls ~/.claude/skills/_career-skills-shared/.evidence/`
2. 确认路径无误后，手动删除该目录

不要盲目复制粘贴删除命令。请先确认路径指向的确实是你要删除的内容。

如需完全卸载（含知识图谱和 skill 文件），参见 [docs/installation.md](installation.md) 的卸载章节。

---

## 外部内容处理方式

当你向系统粘贴外部内容（如 JD 原文、公司介绍）时，系统仅在当前对话上下文中处理该内容，不持久化存储。如有生成的本地证据文件，仅存储摘要或链接，不存储外部原文全文。

---

## 联系方式

如有数据安全相关疑问，请通过仓库 Issues 提报，维护者会在 5 个工作日内回复。
