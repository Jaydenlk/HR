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

// === 6b. Intent / Schema Consistency (spec §3.7) ===
// router 意图集 == career-principal output_schema.json intent_detected enum 集。
// `unknown` 是 schema 侧的兜底哨兵（非可路由意图），允许它作为 enum 额外项；
// 其余任何差集即不一致 → FAIL，并打印 router-only / enum-only 差集。
console.log('\n=== Intent / Schema Consistency ===');
const routerIntents = new Set(
  [...routerContent.matchAll(/^  - name:\s*(\S+)/gm)].map(m => m[1])
);
const cpSchema = JSON.parse(
  readFileSync(join(skillsDir, 'career-principal', 'output_schema.json'), 'utf-8')
);
const intentEnum = new Set(cpSchema.properties?.intent_detected?.enum || []);
const ENUM_SENTINELS = new Set(['unknown']); // 非可路由的兜底哨兵
const routerOnly = [...routerIntents].filter(i => !intentEnum.has(i));
const enumOnly = [...intentEnum].filter(i => !routerIntents.has(i) && !ENUM_SENTINELS.has(i));
const consistencyOk = routerOnly.length === 0 && enumOnly.length === 0;
console.log(`  Router intents: ${routerIntents.size}  |  enum: ${intentEnum.size} (含哨兵 ${[...intentEnum].filter(i => ENUM_SENTINELS.has(i)).join(',') || 'none'})`);
if (routerOnly.length > 0) console.log(`  ROUTER-ONLY (enum 缺): ${routerOnly.join(', ')}`);
if (enumOnly.length > 0) console.log(`  ENUM-ONLY (router 缺): ${enumOnly.join(', ')}`);
check('Intent set == intent_detected enum (sentinel `unknown` exempt)', consistencyOk);

// === 6c. Output Schema Structure (spec §3.7) ===
// career-principal output_schema.json 含合法 suggested_next；
// base schema 含 suggested_next 且 next_actions 进 required。
console.log('\n=== Output Schema Structure ===');
function suggestedNextOk(schema) {
  const sn = schema.properties?.suggested_next;
  if (!sn || sn.type !== 'array') return false;
  const item = sn.items;
  if (!item || item.type !== 'object') return false;
  const req = new Set(item.required || []);
  const props = new Set(Object.keys(item.properties || {}));
  const fields = ['next_intent', 'reason', 'ready_inputs', 'priority'];
  return fields.every(f => req.has(f) && props.has(f));
}
const cpSnOk = suggestedNextOk(cpSchema);
if (!cpSnOk) console.log('  CP FAIL: suggested_next missing/invalid (need next_intent/reason/ready_inputs/priority)');
check('career-principal: suggested_next 结构合法', cpSnOk);

const baseSchema = JSON.parse(
  readFileSync(join(root, 'shared', 'output-schema', 'skill-output-base.schema.json'), 'utf-8')
);
const baseReq = new Set(baseSchema.required || []);
const baseHasSn = !!baseSchema.properties?.suggested_next;
const baseNextActionsReq = baseReq.has('next_actions');
if (!baseHasSn) console.log('  BASE FAIL: suggested_next field missing');
if (!baseNextActionsReq) console.log('  BASE FAIL: next_actions not in required');
check('base schema: suggested_next 字段存在', baseHasSn);
check('base schema: next_actions ∈ required', baseNextActionsReq);

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

// === 9. Resource Paths ===
console.log('\n=== Resource Paths ===');
try {
  const out = execSync(`node "${join(__dirname, 'validate-resource-paths.mjs')}"`, { encoding: 'utf-8' });
  const summary = out.trim().split('\n').filter(l => l.trim()).pop() || '';
  console.log(`  ${summary.trim()}`);
  check('Resource paths: no bare knowledge//shared/ refs', true);
} catch (e) {
  // validate-resource-paths.mjs exits 1 on violations; stdout carries the per-file report.
  const report = (e.stdout || '').toString().trim();
  if (report) console.log(report);
  check('Resource paths: no bare knowledge//shared/ refs', false);
}

// === Summary ===
console.log(`\n${'='.repeat(40)}`);
console.log(totalFail === 0 ? 'OVERALL: PASS' : `OVERALL: FAIL (${totalFail} failures)`);
process.exit(totalFail > 0 ? 1 : 0);
