#!/bin/bash
set -e

MARKETPLACE_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLS_ROOT="${HOME}/.claude/skills"
SHARED_DIR="${SKILLS_ROOT}/_career-skills-shared"

SKILLS=("career-principal" "profile-builder" "jd-analyzer" "resume-tailor" "match-diagnosis" "source-quality-auditor")

echo "Career Skills Marketplace Installer"
echo "===================================="
echo ""

# Check for existing installations — never overwrite
for skill in "${SKILLS[@]}"; do
  if [ -d "${SKILLS_ROOT}/${skill}" ]; then
    echo "ERROR: ${SKILLS_ROOT}/${skill} already exists."
    echo "This installer never deletes or overwrites existing skill directories."
    echo "Back up and remove existing directories manually if you want a clean reinstall."
    exit 1
  fi
done

if [ -d "$SHARED_DIR" ]; then
  echo "ERROR: ${SHARED_DIR} already exists."
  echo "Back up and remove it manually if you want a clean reinstall."
  exit 1
fi

# Install shared resources
mkdir -p "$SHARED_DIR"
cp -R "$MARKETPLACE_DIR/shared/"* "$SHARED_DIR/"
cp -R "$MARKETPLACE_DIR/knowledge" "$SHARED_DIR/"
cp "$MARKETPLACE_DIR/marketplace.yaml" "$SHARED_DIR/"
echo "  ✓ _career-skills-shared/"

# Install each skill as a top-level directory
ALL_OK=true
for skill in "${SKILLS[@]}"; do
  cp -R "$MARKETPLACE_DIR/skills/${skill}" "${SKILLS_ROOT}/${skill}"
  if [ -f "${SKILLS_ROOT}/${skill}/SKILL.md" ]; then
    echo "  ✓ ${skill}/SKILL.md"
  else
    echo "  ✗ ${skill}/SKILL.md MISSING"
    ALL_OK=false
  fi
done

echo ""
if [ "$ALL_OK" = true ]; then
  echo "Installed to: ${SKILLS_ROOT}/"
  echo ""
  echo "  Skills:  ~/.claude/skills/career-principal/"
  echo "           ~/.claude/skills/profile-builder/"
  echo "           ~/.claude/skills/jd-analyzer/"
  echo "           ~/.claude/skills/resume-tailor/"
  echo "           ~/.claude/skills/match-diagnosis/"
  echo "           ~/.claude/skills/source-quality-auditor/"
  echo "  Shared:  ~/.claude/skills/_career-skills-shared/"
  echo ""
  echo "Next: Open Claude Code and say \"帮我分析一个 JD\""
else
  echo "ERROR: Some skills are missing. Installation may be incomplete."
  exit 1
fi
