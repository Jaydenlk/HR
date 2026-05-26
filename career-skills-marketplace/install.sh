#!/bin/bash
set -e

MARKETPLACE_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET_DIR="${HOME}/.claude/skills/career-skills-marketplace"

echo "Career Skills Marketplace Installer"
echo "===================================="
echo ""

if [ -d "$TARGET_DIR" ]; then
  echo "ERROR: $TARGET_DIR already exists."
  echo "This installer never deletes or overwrites an existing skills directory."
  echo "Move the existing directory yourself if you want a clean reinstall."
  exit 1
fi

mkdir -p "$TARGET_DIR"

cp -R "$MARKETPLACE_DIR/skills" "$TARGET_DIR/"
cp -R "$MARKETPLACE_DIR/shared" "$TARGET_DIR/"
cp -R "$MARKETPLACE_DIR/knowledge" "$TARGET_DIR/"
cp "$MARKETPLACE_DIR/marketplace.yaml" "$TARGET_DIR/"

SKILLS=("career-principal" "profile-builder" "jd-analyzer" "resume-tailor" "match-diagnosis" "source-quality-auditor")
ALL_OK=true
for skill in "${SKILLS[@]}"; do
  if [ -f "$TARGET_DIR/skills/$skill/SKILL.md" ]; then
    echo "  ✓ $skill/SKILL.md"
  else
    echo "  ✗ $skill/SKILL.md MISSING"
    ALL_OK=false
  fi
done

echo ""
if [ "$ALL_OK" = true ]; then
  echo "Installed to: $TARGET_DIR"
  echo ""
  echo "Next: Open Claude Code and say \"帮我分析一个 JD\""
else
  echo "ERROR: Some skills are missing. Installation may be incomplete."
  exit 1
fi
