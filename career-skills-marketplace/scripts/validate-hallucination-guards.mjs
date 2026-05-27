import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillsDir = join(__dirname, '..', 'skills');
const skills = readdirSync(skillsDir, { withFileTypes: true })
  .filter(d => d.isDirectory()).map(d => d.name);

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

  for (const assertion of (guard.assertions || [])) {
    const path = assertion.path || '';
    const rootField = path.split(/[.\[]/)[0];
    if (rootField && !schemaProps.has(rootField)) {
      console.log(`FAIL: ${skill} — assertion path "${path}" root field "${rootField}" not in output_schema.properties`);
      failures++;
    }
  }
}

console.log(`\nChecked: ${checked}/37 skills`);
console.log(failures === 0 ? 'ALL PASS' : `${failures} FAILURES — fix required`);
process.exit(failures > 0 ? 1 : 0);
