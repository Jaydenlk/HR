#!/usr/bin/env node
// Validates that SKILL.md + contract.yaml reference shared resources only via the
// runtime convention `../_career-skills-shared/...`. Bare `knowledge/` or bare
// `shared/<schema-dir>/` paths break after install (everything gets flattened into
// `_career-skills-shared/`), so they are violations. See spec §3.1 / §4 batch1 step 2.
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillsDir = join(__dirname, '..', 'skills');

// Bare resource paths that must be prefixed with `../_career-skills-shared/`.
//  - `knowledge/...`
//  - `shared/<policies|evidence-schema|output-schema|rubrics|confidence-policy|source-policy>/...`
// The negative lookbehind skips any path already in the correct runtime form
// `../_career-skills-shared/...`:
//  - `knowledge/`: the correct form is `_career-skills-shared/knowledge/`, so guard against
//    a preceding `_career-skills-shared/`.
//  - `shared/`: the correct form is `_career-skills-shared/` itself — the literal substring
//    `shared/` there is the tail of the prefix, immediately preceded by `_career-skills-`.
//    So guard against a preceding `_career-skills-`.
// skill-local `scripts/` and `references/` paths are not matched at all (they ride along with
// the skill dir and stay bare on purpose).
const BARE_KNOWLEDGE = /(?<!_career-skills-shared\/)\bknowledge\//g;
const BARE_SHARED = /(?<!_career-skills-)\bshared\/(policies|evidence-schema|output-schema|rubrics|confidence-policy|source-policy)\//g;

const CORRECT_PREFIX = '_career-skills-shared/';

function scanFile(path) {
  const hits = [];
  const lines = readFileSync(path, 'utf-8').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Whole-line skip: if the line already uses the correct shared prefix it is fine.
    // (A line that mixes a correct ref and a bare ref is rare; the per-match lookbehind
    //  below still anchors each individual hit, so we only skip when there is no bare hit.)
    for (const re of [BARE_KNOWLEDGE, BARE_SHARED]) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line)) !== null) {
        hits.push({ line: i + 1, snippet: extractSnippet(line, m.index) });
      }
    }
  }
  return hits;
}

// Pull a short window around the match so the report shows the offending fragment.
function extractSnippet(line, idx) {
  const start = Math.max(0, idx - 20);
  const end = Math.min(line.length, idx + 60);
  return (start > 0 ? '…' : '') + line.slice(start, end).trim() + (end < line.length ? '…' : '');
}

function collectTargets() {
  const targets = [];
  for (const e of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const skillDir = join(skillsDir, e.name);
    for (const f of ['SKILL.md', 'contract.yaml']) {
      const p = join(skillDir, f);
      try {
        readFileSync(p, 'utf-8');
        targets.push(p);
      } catch {
        // skill may legitimately lack one of the two files
      }
    }
  }
  return targets;
}

// --- self-test (Standard: verify, leave no residue) ---
function selfTest() {
  const probe = (text, re) => { re.lastIndex = 0; return re.test(text); };
  const cases = [
    ['knowledge/foo', BARE_KNOWLEDGE, true],
    ['../_career-skills-shared/knowledge/foo', BARE_KNOWLEDGE, false],
    ['shared/policies/x.md', BARE_SHARED, true],
    ['../_career-skills-shared/policies/x.md', BARE_SHARED, false],
    ['scripts/check_fabrication.mjs', BARE_KNOWLEDGE, false],
    ['references/coverage.md', BARE_SHARED, false],
  ];
  for (const [text, re, expected] of cases) {
    if (probe(text, re) !== expected) {
      console.error(`SELF-TEST FAIL: "${text}" expected ${expected}`);
      process.exit(2);
    }
  }
}

function main() {
  if (process.argv.includes('--self-test')) {
    selfTest();
    console.log('SELF-TEST PASS');
    process.exit(0);
  }

  const targets = collectTargets();
  console.log(`Scanning ${targets.length} files (SKILL.md + contract.yaml)`);

  let violations = 0;
  for (const path of targets) {
    for (const hit of scanFile(path)) {
      console.log(`  VIOLATION: ${path}:${hit.line}  ${hit.snippet}`);
      violations++;
    }
  }

  if (violations === 0) {
    console.log('  PASS: no bare resource paths');
  } else {
    console.log(`  FAIL: ${violations} bare resource path(s) — prefix with ../${CORRECT_PREFIX}`);
  }
  process.exit(violations > 0 ? 1 : 0);
}

main();
