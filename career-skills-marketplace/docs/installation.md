# 安装指南

## 前提条件

- **Claude Code**（推荐，installer 全自动支持）或 **Codex**（installer 支持 `--target codex`）
- **Git** 已安装并可在命令行使用
- **网络连接**：仅在 clone 时需要，安装完成后系统离线运行

## 支持范围

| 环境 | Phase 1 支持 | 安装方式 |
|------|-------------|---------|
| Claude Code | ✅ 全自动 | `bash install.sh` 或 `.\install.ps1` |
| Codex | ✅ installer 支持 | `bash install.sh --target codex` 或 `.\install.ps1 -Target codex` |
| Gemini CLI / Cursor 等 | ⏳ Phase 6 | 手动复制 skill 目录（见下方手动安装） |

---

## 方式 1：Claude Code（默认）

### macOS / Linux

```bash
git clone https://github.com/career-skills/career-skills-marketplace.git
cd career-skills-marketplace
bash install.sh
```

### Windows

```powershell
git clone https://github.com/career-skills/career-skills-marketplace.git
cd career-skills-marketplace
.\install.ps1
```

安装后目录结构：

```
~/.claude/skills/
  career-principal/SKILL.md
  profile-builder/SKILL.md
  jd-analyzer/SKILL.md
  resume-tailor/SKILL.md
  match-diagnosis/SKILL.md
  source-quality-auditor/SKILL.md
  _career-skills-shared/
```

### 验证安装

```bash
ls ~/.claude/skills/career-principal/SKILL.md
ls ~/.claude/skills/_career-skills-shared/marketplace.yaml
```

---

## 方式 2：Codex

### macOS / Linux

```bash
git clone https://github.com/career-skills/career-skills-marketplace.git
cd career-skills-marketplace
bash install.sh --target codex
```

### Windows

```powershell
git clone https://github.com/career-skills/career-skills-marketplace.git
cd career-skills-marketplace
.\install.ps1 -Target codex
```

默认安装到 `~/.codex/skills/`。如果设置了 `CODEX_HOME` 环境变量，则安装到 `$CODEX_HOME/skills/`。

---

## 方式 3：手动安装（其他环境）

如果使用 Gemini CLI、Cursor 或其他兼容 SKILL.md 的环境：

1. 将 `skills/` 下的 6 个 skill 目录复制到你的 agent 的 skills 目录
2. 将 `shared/` 和 `knowledge/` 合并复制为 `_career-skills-shared/`
3. 确保 `_career-skills-shared/` 与 6 个 skill 目录位于同一父目录下

---

## 故障排除

### 目标目录已存在

脚本会在检测到已有安装时中止，不会覆盖或删除任何已有文件。

如需重装：
1. **备份**你可能修改过的文件
2. **手动移动或重命名**已有目录（不要使用自动化批量删除命令）
3. 重新运行安装脚本

### Windows 执行策略错误

PowerShell 默认可能禁止运行本地脚本。解决方式：
- 使用 Git Bash 运行 `bash install.sh`（推荐）
- 或在 PowerShell 中运行 `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`（仅当前终端生效）
- 或使用 WSL

### SKILL.md 缺失

```bash
ls ~/.claude/skills/career-principal/SKILL.md
```

如果文件不存在，重新运行安装脚本。

---

## 卸载

手动删除安装的目录。建议先确认路径正确，不要盲目复制粘贴删除命令。

安装脚本不提供自动卸载功能。
