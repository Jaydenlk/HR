#!/bin/bash
set -e

# 推荐安装方式 = Claude Code 插件(一次装好、归一组):
#   /plugin marketplace add Jaydenlk/HR
#   /plugin install career-principal@career-skills
# 本脚本是 loose 备选:把 skills/ 下所有目录拷进 ~/.claude/skills/。
# 仅 career-principal 含 SKILL.md(唯一自动触发入口);37 个 worker 为 PLAYBOOK.md,
# 由主理人读取执行;_career-skills-shared/ 为共享资源。三者都需就位。

MARKETPLACE_DIR="$(cd "$(dirname "$0")" && pwd)"

SKILLS_ROOT="${HOME}/.claude/skills"
if [ "$1" = "--target" ]; then
  case "$2" in
    claude)
      SKILLS_ROOT="${HOME}/.claude/skills"
      ;;
    codex)
      # 注:Codex 端需独立适配(.agents/ + openai.yaml),此处仅复制文件。
      if [ -n "$CODEX_HOME" ]; then
        SKILLS_ROOT="${CODEX_HOME}/skills"
      else
        SKILLS_ROOT="${HOME}/.codex/skills"
      fi
      ;;
    *)
      echo "Usage: install.sh [--target claude|codex]"
      exit 1
      ;;
  esac
fi

echo "Career Skills Marketplace — loose install (fallback)"
echo "推荐改用插件: /plugin marketplace add Jaydenlk/HR  然后  /plugin install career-principal@career-skills"
echo "===================================="
echo "Target: ${SKILLS_ROOT}"
echo ""

mkdir -p "$SKILLS_ROOT"

# Copy every subdir of skills/ (career-principal + 37 worker playbooks + _career-skills-shared).
for dir in "$MARKETPLACE_DIR/skills"/*/; do
  name="$(basename "$dir")"
  dest="${SKILLS_ROOT}/${name}"
  if [ -e "$dest" ]; then
    echo "ERROR: ${dest} already exists."
    echo "This installer never deletes or overwrites. Remove it manually for a clean reinstall."
    exit 1
  fi
  cp -R "$dir" "$dest"
  echo "  ✓ ${name}/"
done

echo ""
echo "Installed to: ${SKILLS_ROOT}/"
echo "Next: open Claude Code and say \"帮我看看我的简历\" — 求职主理人(career-principal)会接管。"
