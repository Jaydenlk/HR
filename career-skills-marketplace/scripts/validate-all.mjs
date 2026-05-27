#!/usr/bin/env node
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const skillsDir = join(root, 'skills');
const skills = readdirSync(skillsDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);

let totalFail = 0;
function check(label, pass) {
  const tag = pass ? 'PASS' : 'FAIL';
  console.log(`  ${tag}: ${label}`);
  if (!pass) totalFail++;
  return pass;
}

function globJson(dir) {
  const results = [];
  function walk(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.json')) results.push(p);
    }
  }
  walk(dir);
  return results;
}

function globYaml(dir) {
  const results = [];
  function walk(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.yaml')) results.push(p);
    }
  }
  walk(dir);
  return results;
}

// === 1. JSON Parse ===
console.log('\n=== Schema Validation ===');
const jsonFiles = globJson(root);
let jsonOk = 0, jsonFail = 0;
for (const f of jsonFiles) {
  try { JSON.parse(readFileSync(f, 'utf-8')); jsonOk++; }
  catch { jsonFail++; console.log(`  JSON ERROR: ${f}`); }
}
check(`JSON: ${jsonOk}/${jsonOk + jsonFail}`, jsonFail === 0);

// === 2. YAML Parse (via python) ===
const yamlFiles = globYaml(root);
let yamlErrors = 0;
for (const f of yamlFiles) {
  try {
    execSync(`python -c "import yaml; yaml.safe_load(open(r'${f}', encoding='utf-8'))"`, { stdio: 'pipe' });
  } catch { yamlErrors++; console.log(`  YAML ERROR: ${f}`); }
}
check(`YAML: ${yamlFiles.length - yamlErrors}/${yamlFiles.length}`, yamlErrors === 0);

// === 3. Base Required Fields ===
const BASE = ['skill_name','skill_version','summary','confidence','evidence_used','recommendations','risks','next_actions','follow_up_questions','cannot_determine'];
let baseOk = 0;
for (const s of skills) {
  const schema = JSON.parse(readFileSync(join(skillsDir, s, 'output_schema.json'), 'utf-8'));
  const req = new Set(schema.required || []);
  const props = new Set(Object.keys(schema.properties || {}));
  const conf = (schema.properties?.confidence?.enum) || [];
  const allBase = BASE.every(f => req.has(f) && props.has(f));
  const hasInsuff = conf.includes('insufficient');
  if (allBase && hasInsuff) baseOk++;
  else console.log(`  BASE FAIL: ${s}`);
}
check(`Base fields: ${baseOk}/${skills.length}`, baseOk === skills.length);

// === 4. Manifest ===
const manifest = readFileSync(join(root, 'marketplace.yaml'), 'utf-8');
const manifestCount = (manifest.match(/^  - name:/gm) || []).length;
check(`Manifest: ${manifestCount} skills`, manifestCount === skills.length);

// === 5. Fixtures ===
console.log('\n=== Fixture Validation ===');
let skillTests = 0, proseCount = 0;
for (const s of skills) {
  const testsDir = join(skillsDir, s, 'tests');
  if (!existsSync(testsDir)) continue;
  for (const f of readdirSync(testsDir).filter(f => f.endsWith('.json'))) {
    const data = JSON.parse(readFileSync(join(testsDir, f), 'utf-8'));
    skillTests++;
    const assertions = Array.isArray(data.assertions) ? data.assertions : [];
    for (const a of assertions) {
      if (typeof a === 'string') proseCount++;
    }
  }
}
check(`Skill tests: ${skillTests} (${proseCount} prose)`, proseCount === 0);

const wfDir = join(root, 'evals', 'workflow');
let wfTests = 0, wfProse = 0;
function countWf(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) countWf(p);
    else if (e.name.endsWith('.json')) {
      const data = JSON.parse(readFileSync(p, 'utf-8'));
      wfTests++;
      const wa = Array.isArray(data.assertions) ? data.assertions : [];
      for (const a of wa) { if (typeof a === 'string') wfProse++; }
    }
  }
}
if (existsSync(wfDir)) countWf(wfDir);
check(`Workflow evals: ${wfTests} (${wfProse} prose)`, wfProse === 0);

// === 6. Routing ===
console.log('\n=== Routing Validation ===');
const routerPath = join(skillsDir, 'career-principal', 'references', 'intent-router.yaml');
const routerContent = readFileSync(routerPath, 'utf-8');
const intentMatches = routerContent.match(/primary_skill:\s*(\S+)/g) || [];
const primarySkills = new Set(intentMatches.map(m => m.replace('primary_skill:', '').trim()));
const secondaryMatches = routerContent.match(/- (\S+)/g) || [];

const allRoutedSkills = new Set();
for (const m of routerContent.matchAll(/primary_skill:\s*(\S+)/g)) allRoutedSkills.add(m[1]);
for (const m of routerContent.matchAll(/^\s+-\s+(\S+)/gm)) {
  const v = m[1].replace(/^-\s*/, '');
  if (skills.includes(v)) allRoutedSkills.add(v);
}
const unrouted = skills.filter(s => s !== 'career-principal' && !allRoutedSkills.has(s));
check(`Unrouted skills: ${unrouted.length}`, unrouted.length === 0);
if (unrouted.length > 0) console.log(`  Unrouted: ${unrouted.join(', ')}`);

const intentCount = (routerContent.match(/^  - name:/gm) || []).length;
console.log(`  Intents: ${intentCount}`);

// === 7. Knowledge Graph ===
console.log('\n=== Knowledge Graph ===');
let t1 = 0, t2 = 0, t3 = 0;
try {
  const pyScript = `import yaml;t1=yaml.safe_load(open('knowledge/company-taxonomy/companies.seed.yaml',encoding='utf-8'));t2=yaml.safe_load(open('knowledge/company-taxonomy/tier_2_companies.yaml',encoding='utf-8'));t3=yaml.safe_load(open('knowledge/company-taxonomy/tier_3_extended.yaml',encoding='utf-8'));c1=t1.get('companies',[]);c2=t2.get('companies',[]);c3=t3.get('companies',[]);ids=[c['id'] for c in c1+c2+c3];dupes=len(ids)-len(set(ids));print(len(c1),len(c2),len(c3),dupes)`;
  const out = execSync(`python -c "${pyScript}"`, { encoding: 'utf-8', cwd: root }).trim();
  const [s1, s2, s3, dupes] = out.split(' ').map(Number);
  t1 = s1; t2 = s2; t3 = s3;
  console.log(`  T1: ${t1}  T2: ${t2}  T3: ${t3}  Total: ${t1+t2+t3}`);
  check(`Duplicates: ${dupes}`, dupes === 0);
} catch (e) {
  console.log(`  KG ERROR: ${e.message}`);
  totalFail++;
}

// === 8. Hallucination Guards ===
console.log('\n=== Hallucination Guards ===');
let guardFail = 0;
for (const s of skills) {
  const schemaPath = join(skillsDir, s, 'output_schema.json');
  const guardPath = join(skillsDir, s, 'tests', 'hallucination-guard.json');
  try {
    const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
    const guard = JSON.parse(readFileSync(guardPath, 'utf-8'));
    const props = new Set(Object.keys(schema.properties || {}));
    for (const a of (guard.assertions || [])) {
      const rf = (a.path || '').split(/[.\[]/)[0];
      if (rf && !props.has(rf)) { guardFail++; console.log(`  GUARD FAIL: ${s} "${a.path}"`); }
    }
  } catch {}
}
check(`Guards: ${skills.length - guardFail}/${skills.length}`, guardFail === 0);

// === Summary ===
console.log(`\n${'='.repeat(40)}`);
console.log(totalFail === 0 ? 'OVERALL: PASS' : `OVERALL: FAIL (${totalFail} failures)`);
process.exit(totalFail > 0 ? 1 : 0);
