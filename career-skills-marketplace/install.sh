#!/bin/bash
set -e

MARKETPLACE_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLS=("career-principal" "profile-builder" "jd-analyzer" "resume-tailor" "match-diagnosis" "source-quality-auditor")

# Default: Claude Code
SKILLS_ROOT="${HOME}/.claude/skills"

# Parse --target flag
if [ "$1" = "--target" ]; then
  case "$2" in
    claude)
      SKILLS_ROOT="${HOME}/.claude/skills"
      ;;
    codex)
      if [ -n "$CODEX_HOME" ]; then
        SKILLS_ROOT="${CODEX_HOME}/skills"
      else
        SKILLS_ROOT="${HOME}/.codex/skills"
      fi
      ;;
    *)
      echo "Usage: install.sh [--target claude|codex]"
      echo "  claude (default): install to ~/.claude/skills/"
      echo "  codex: install to \$CODEX_HOME/skills/ or ~/.codex/skills/"
      exit 1
      ;;
  esac
fi

SHARED_DIR="${SKILLS_ROOT}/_career-skills-shared"

echo "Career Skills Marketplace Installer"
echo "===================================="
echo "Target: ${SKILLS_ROOT}"
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
  for skill in "${SKILLS[@]}"; do
    echo "  ${SKILLS_ROOT}/${skill}/"
  done
  echo "  ${SHARED_DIR}/"
  echo ""
  echo "Next: Open your agent environment and say \"帮我分析一个 JD\""
else
  echo "ERROR: Some skills are missing. Installation may be incomplete."
  exit 1
fi
