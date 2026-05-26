# 安装指南

## 前提条件

在开始之前，请确认你的环境满足以下要求：

- **Claude Code**（推荐）或任何兼容 SKILL.md 协议的 agent 环境（如 Codex）
- **Git** 已安装并可在命令行使用
- **网络连接**：仅在 clone 时需要，安装完成后系统离线运行

---

## 方式 1：macOS / Linux（install.sh）

### 步骤

```bash
# 1. 克隆仓库到本地任意位置
git clone https://github.com/your-org/career-skills-marketplace.git

# 2. 进入项目目录
cd career-skills-marketplace

# 3. 运行安装脚本
bash install.sh
```

脚本将把 skill 文件复制到 `~/.claude/skills/career-skills-marketplace/`，并验证目录结构完整。

### 验证安装

安装完成后，运行以下命令确认文件已就位：

```bash
ls ~/.claude/skills/career-skills-marketplace/
```

预期输出应包含：`skills/`、`knowledge/`、`shared/`、`marketplace.yaml`。

---

## 方式 2：Windows（install.ps1）

### 步骤

在 PowerShell 中运行：

```powershell
# 1. 克隆仓库
git clone https://github.com/your-org/career-skills-marketplace.git

# 2. 进入项目目录
cd career-skills-marketplace

# 3. 运行安装脚本（如提示执行策略，选择允许）
.\install.ps1
```

脚本将把 skill 文件复制到 `$env:USERPROFILE\.claude\skills\career-skills-marketplace\`。

### 验证安装

```powershell
ls "$env:USERPROFILE\.claude\skills\career-skills-marketplace"
```

预期输出应包含：`skills`、`knowledge`、`shared`、`marketplace.yaml`。

---

## 故障排除

### 目标目录已存在

如果 `~/.claude/skills/career-skills-marketplace/`（或 Windows 对应路径）已存在，脚本会报错停止，不会覆盖已有文件。

处理方式：

```bash
# 删除旧版本后重新安装（macOS/Linux）
rm -rf ~/.claude/skills/career-skills-marketplace
bash install.sh
```

```powershell
# Windows
Remove-Item -Recurse -Force "$env:USERPROFILE\.claude\skills\career-skills-marketplace"
.\install.ps1
```

### SKILL.md 缺失

如果 Claude Code 提示某个 skill 无法加载，通常原因是对应 skill 目录下缺少 `SKILL.md` 文件。

检查方式：

```bash
ls ~/.claude/skills/career-skills-marketplace/skills/career-principal/
```

预期应包含：`SKILL.md`、`contract.yaml`、`input_schema.json`、`output_schema.json`、`examples/`。

如果缺失，重新执行安装脚本。如果问题持续，在仓库 Issues 中提报，附上缺失的文件路径。

### Claude Code 未识别新 skill

安装后重启 Claude Code，然后在对话中尝试触发任意求职相关问题。如果 career-principal 未被自动加载，检查 `~/.claude/settings.json` 中是否正确配置了 skills 目录路径。

---

## 卸载

```bash
# macOS / Linux
rm -rf ~/.claude/skills/career-skills-marketplace
```

```powershell
# Windows
Remove-Item -Recurse -Force "$env:USERPROFILE\.claude\skills\career-skills-marketplace"
```

卸载不会删除 `.evidence/` 目录中的本地求职数据（如有），需手动清除。
