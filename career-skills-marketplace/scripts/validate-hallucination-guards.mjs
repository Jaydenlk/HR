import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { listSkillDirs } from './skills-dir.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillsDir = join(__dirname, '..', 'skills');
const skills = listSkillDirs(skillsDir);

let failures = 0;
let checked = 0;

for (const skill of skills) {
  const schemaPath = join(skillsDir, skill, 'output_schema.json');
  const guardPath = join(skillsDir, skill, 'tests', 'hallucination-guard.json');

  let schema, guard;
  try {
    schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
    guard = JSON.parse(readFileSync(guardPath, 'utf-8'));
  } catch (e) {
    console.log(`SKIP: ${skill} — ${e.message}`);
    continue;
  }

  const schemaProps = new Set(Object.keys(schema.properties || {}));
  checked++;

  const assertions = guard.assertions || [];

  // Check top-level: assertions must be an array (not an object like critical_assertions)
  if (!Array.isArray(assertions)) {
    console.log(`FAIL: ${skill} — "assertions" must be an array, got ${typeof assertions}`);
    failures++;
    continue;
  }

  for (let i = 0; i < assertions.length; i++) {
    const assertion = assertions[i];
    const idx = `assertions[${i}]`;

    // Each item must be an object (not a string or primitive)
    if (typeof assertion !== 'object' || assertion === null || Array.isArray(assertion)) {
      console.log(`FAIL: ${skill} — ${idx} must be an object, got ${Array.isArray(assertion) ? 'array' : typeof assertion}`);
      failures++;
      continue;
    }

    // Each item must have "path" key (not "field", not "check")
    if (!('path' in assertion)) {
      const badKey = 'field' in assertion ? '"field"' : 'check' in assertion ? '"check"' : 'no recognized path-like key';
      console.log(`FAIL: ${skill} — ${idx} missing "path" key (found ${badKey} instead)`);
      failures++;
    }

    // Root field of path must exist in schema properties
    const path = assertion.path || '';
    const rootField = path.split(/[.\[]/)[0];
    if (rootField && !schemaProps.has(rootField)) {
      console.log(`FAIL: ${skill} — ${idx} path "${path}" root field "${rootField}" not in output_schema.properties`);
      failures++;
    }
  }
}

console.log(`\nChecked: ${checked}/37 skills`);
console.log(failures === 0 ? 'ALL PASS' : `${failures} FAILURES — fix required`);
process.exit(failures > 0 ? 1 : 0);
