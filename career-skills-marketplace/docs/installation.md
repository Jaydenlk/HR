# 安装指南

## 前提条件

- **Claude Code** 已安装并可在命令行使用
- **网络连接**：仅在安装时需要

---

## 推荐方式：Claude Code 插件安装

```
/plugin marketplace add Jaydenlk/HR
/plugin install career-principal@career-skills
```

安装完成，无需 clone 仓库。

---

## 备选方式：clone 后运行安装脚本

适用于离线环境或需要修改 skill 源码的场景。插件在仓库子目录 `career-skills-marketplace/` 中。

**macOS / Linux**

```bash
git clone https://github.com/Jaydenlk/HR
cd HR/career-skills-marketplace
bash install.sh
```

**Windows**

```powershell
git clone https://github.com/Jaydenlk/HR
cd HR/career-skills-marketplace
.\install.ps1
```

install 脚本会把 `skills/` 下所有子目录（career-principal、37 个 worker、\_career-skills-shared）复制到 `~/.claude/skills/`，无需手动合并任何目录。

---

## 安装后目录结构

```
~/.claude/skills/
  career-principal/
    SKILL.md              ← 唯一自动触发入口
    contract.yaml
    ...
  profile-builder/
    PLAYBOOK.md           ← worker：由 career-principal 读取后执行，不自动触发
    contract.yaml
    ...
  jd-analyzer/PLAYBOOK.md
  resume-tailor/PLAYBOOK.md
  match-diagnosis/PLAYBOOK.md
  ... (共 37 个 worker 目录)
  _career-skills-shared/
    knowledge/
    rubrics/
    ...
```

---

## 验证安装

**插件安装**：在 Claude Code 中运行 `/plugin`，确认列表中出现 `career-principal`。

**脚本安装**：

```bash
# 确认主理人入口存在
ls ~/.claude/skills/career-principal/SKILL.md

# 确认共享知识库存在
ls ~/.claude/skills/_career-skills-shared/knowledge/interview-focus.yaml
```

两条命令均有输出即为安装成功。

---

## 故障排除

### 目标目录已存在

脚本检测到已有安装时会中止，不会覆盖或删除任何已有文件。

如需重装：
1. **备份**你可能修改过的文件
2. **手动移动或重命名**已有目录（不要使用自动化批量删除命令）
3. 重新运行安装脚本

### Windows 执行策略错误

PowerShell 默认可能禁止运行本地脚本。解决方式：
- 使用 Git Bash 运行 `bash install.sh`（推荐）
- 或在 PowerShell 中运行 `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`（仅当前终端生效）
- 或使用 WSL

### 主理人未出现

检查 `~/.claude/skills/career-principal/SKILL.md` 是否存在，不存在则重新运行安装脚本。

---

## 卸载

手动删除 `~/.claude/skills/` 下由安装脚本创建的目录。安装脚本不提供自动卸载功能。
