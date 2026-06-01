import { readdirSync, existsSync } from 'fs';
import { join } from 'path';

// Single source of truth for "what is a skill directory".
// A skill dir contains an entry file: SKILL.md (the career-principal orchestrator)
// or PLAYBOOK.md (a worker tool the orchestrator reads and executes). This
// content-based check automatically excludes shared-resource folders
// (`_career-skills-shared/`) and any non-skill dir (e.g. a stray `.claude/`)
// without relying on fragile name-prefix conventions.
export function listSkillDirs(skillsDir) {
  return readdirSync(skillsDir, { withFileTypes: true })
    .filter(
      (d) =>
        d.isDirectory() &&
        (existsSync(join(skillsDir, d.name, 'SKILL.md')) ||
          existsSync(join(skillsDir, d.name, 'PLAYBOOK.md'))),
    )
    .map((d) => d.name);
}
