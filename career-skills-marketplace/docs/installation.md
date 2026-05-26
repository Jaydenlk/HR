# 安装指南

## 前提条件

- **Claude Code**（推荐）或任何兼容 SKILL.md 协议的 agent 环境（如 Codex）
- **Git** 已安装并可在命令行使用
- **网络连接**：仅在 clone 时需要，安装完成后系统离线运行

---

## 方式 1：macOS / Linux（install.sh）

```bash
git clone https://github.com/career-skills/career-skills-marketplace.git
cd career-skills-marketplace
bash install.sh
```

安装脚本会将每个 skill 安装为独立的顶层目录：

```
~/.claude/skills/
  career-principal/SKILL.md
  profile-builder/SKILL.md
  jd-analyzer/SKILL.md
  resume-tailor/SKILL.md
  match-diagnosis/SKILL.md
  source-quality-auditor/SKILL.md
  _career-skills-shared/          # 共享 schema、策略、知识图谱
```

### 验证安装

```bash
ls ~/.claude/skills/career-principal/SKILL.md
ls ~/.claude/skills/_career-skills-shared/marketplace.yaml
```

---

## 方式 2：Windows（install.ps1）

### 推荐方式：Git Bash 或 WSL

如果已安装 Git for Windows，可以直接用 Git Bash 运行 install.sh：

```bash
git clone https://github.com/career-skills/career-skills-marketplace.git
cd career-skills-marketplace
bash install.sh
```

### PowerShell 方式

如果使用 PowerShell，可能需要临时调整执行策略：

```powershell
git clone https://github.com/career-skills/career-skills-marketplace.git
cd career-skills-marketplace

# 如果提示执行策略错误，运行以下命令（仅对当前终端生效）：
# Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

.\install.ps1
```

安装路径同 macOS/Linux，但位于 `$env:USERPROFILE\.claude\skills\`。

### 验证安装

```powershell
Test-Path "$env:USERPROFILE\.claude\skills\career-principal\SKILL.md"
Test-Path "$env:USERPROFILE\.claude\skills\_career-skills-shared\marketplace.yaml"
```

---

## Codex 手动安装

如果使用 Codex 而非 Claude Code，skill 目录位置可能不同。请将 `skills/` 下的 6 个 skill 目录手动复制到 Codex 的 skills 目录，并将 `shared/` 和 `knowledge/` 复制为 `_career-skills-shared/`。

具体路径请参考 Codex 文档中关于自定义 skill 的说明。

---

## 故障排除

### 目标目录已存在

脚本会在检测到已有安装时中止，不会覆盖或删除任何已有文件。

如需重装：
1. **备份**你可能修改过的文件（如自定义 rubric 或知识图谱扩展）
2. **手动移动或重命名**已有目录（不要使用自动化批量删除命令）
3. 重新运行 `bash install.sh` 或 `.\install.ps1`

### SKILL.md 缺失

如果 Claude Code 提示某个 skill 无法加载，检查对应目录：

```bash
ls ~/.claude/skills/career-principal/SKILL.md
```

如果文件不存在，重新运行安装脚本。

### Windows 执行策略错误

PowerShell 默认可能禁止运行本地脚本。解决方式：
- 使用 Git Bash 运行 `bash install.sh`（推荐）
- 或在 PowerShell 中运行 `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`（仅当前终端生效）
- 或使用 WSL

---

## 卸载

手动删除安装的目录。建议先确认路径正确：

```bash
# 确认路径
ls ~/.claude/skills/career-principal/
ls ~/.claude/skills/_career-skills-shared/

# 确认无误后手动删除
# （请自行确认路径，不要盲目复制粘贴删除命令）
```

安装脚本不提供自动卸载功能。
