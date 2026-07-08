#!/usr/bin/env node
// run-gates.mjs — 六门验收一键跑门(确定性脚本,零 npm 依赖)。
//
// 背景:六门验收说明此前靠 prompt 里复制粘贴,出过漂移事故(裸 jest 当全量、从仓库根跑 jest
// 踩 babel-jest、e2e 用错命令静默 0 匹配报假绿)。本脚本把判据和环境坑固化成代码,调用者只管
// 读 JSON 结果,不需要记忆坑位。
//
// 用法:
//   node scripts/run-gates.mjs [--repo <仓库根路径>] [--skip <门名,逗号分隔>] [--json <输出文件路径>]
//
// 六门(固定顺序,固定 cwd,固定命令 —— 这是唯一真相源,不接受调用者覆盖):
//   1. api-tsc       cwd=packages/api   npx tsc --noEmit
//   2. api-unit      cwd=packages/api   npx jest --runInBand
//   3. api-e2e       cwd=packages/api   npx jest --config ./test/jest-e2e.json --forceExit
//   4. api-build     cwd=packages/api   npm run build
//   5. web-lint      cwd=packages/web   npx eslint src/
//   6. web-build     cwd=packages/web   npm run build
//
// 退出码:overall_pass ? 0 : 1

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------- 参数解析 ----------

function parseArgs(argv) {
  const args = { repo: null, skip: [], json: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--repo') {
      args.repo = argv[++i];
    } else if (a === '--skip') {
      args.skip = (argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean);
    } else if (a === '--json') {
      args.json = argv[++i];
    } else {
      throw new Error(`未知参数: ${a}`);
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

// 默认仓库根 = 本脚本所在仓库的根(scripts/ 的上一级),这样在任意 worktree 内都能直接用。
const repoRoot = resolve(args.repo || join(__dirname, '..'));

if (!existsSync(repoRoot)) {
  console.error(`仓库根不存在: ${repoRoot}`);
  process.exit(1);
}

const apiDir = join(repoRoot, 'packages', 'api');
const webDir = join(repoRoot, 'packages', 'web');

// ---------- 六门定义(顺序、cwd、命令固定,不接受外部覆盖) ----------

const GATE_DEFS = [
  {
    name: 'api-tsc',
    label: '① api tsc --noEmit(编译探针,不是 lint 不是测试)',
    cwd: apiDir,
    cmd: 'npx',
    cmdArgs: ['tsc', '--noEmit'],
    kind: 'compile',
  },
  {
    name: 'api-unit',
    label: '② api 单测(裸 jest,只覆盖 *.spec.ts,不含 e2e)',
    cwd: apiDir,
    cmd: 'npx',
    cmdArgs: ['jest', '--runInBand'],
    kind: 'test',
  },
  {
    name: 'api-e2e',
    label: '③ api e2e(*-e2e-spec.ts,必须带 --config,裸 jest 会 0 匹配静默漏跑)',
    cwd: apiDir,
    cmd: 'npx',
    cmdArgs: ['jest', '--config', './test/jest-e2e.json', '--forceExit'],
    kind: 'test',
  },
  {
    name: 'api-build',
    label: '④ api build',
    cwd: apiDir,
    cmd: 'npm',
    cmdArgs: ['run', 'build'],
    kind: 'build',
  },
  {
    name: 'web-lint',
    label: '⑤ web eslint(0 错误才算过,tsc --noEmit 不算)',
    cwd: webDir,
    cmd: 'npx',
    cmdArgs: ['eslint', 'src/'],
    kind: 'lint',
  },
  {
    name: 'web-build',
    label: '⑥ web build',
    cwd: webDir,
    cmd: 'npm',
    cmdArgs: ['run', 'build'],
    kind: 'build',
  },
];

const VALID_GATE_NAMES = new Set(GATE_DEFS.map((g) => g.name));
for (const s of args.skip) {
  if (!VALID_GATE_NAMES.has(s)) {
    console.error(`--skip 里出现未知门名: ${s}(合法值: ${[...VALID_GATE_NAMES].join(', ')})`);
    process.exit(1);
  }
}

// ---------- 工具函数 ----------

function tail(str, maxLines = 40) {
  if (!str) return '';
  const lines = str.split(/\r?\n/);
  return lines.slice(Math.max(0, lines.length - maxLines)).join('\n');
}

// 测试门必须抓到统计行,抓不到 = 该门 FAIL(防止 0 匹配静默通过被误判为绿)。
// jest 统计行形如: "Tests:       12 passed, 12 total"
function extractStatsLine(output) {
  if (!output) return null;
  const m = output.match(/Tests:\s+.*total/);
  return m ? m[0].trim() : null;
}

function runGate(def) {
  const cmdText = `${def.cmd} ${def.cmdArgs.join(' ')}`;
  if (!existsSync(def.cwd)) {
    return {
      name: def.name,
      label: def.label,
      cmd: cmdText,
      cwd: def.cwd,
      pass: false,
      exit_code: null,
      stats_line: null,
      evidence_tail: `cwd 不存在: ${def.cwd}`,
    };
  }

  const result = spawnSync(def.cmd, def.cmdArgs, {
    cwd: def.cwd,
    shell: true, // Windows 上 npx/npm 是 .cmd,必须 shell:true 才能被 spawnSync 找到
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 64,
  });

  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  const combined = stdout + (stderr ? `\n[stderr]\n${stderr}` : '');
  const exitCode = result.status === null ? (result.error ? -1 : null) : result.status;

  let pass = exitCode === 0;
  let statsLine = null;

  if (def.kind === 'test') {
    // 测试门额外要求:必须抓到 "Tests: X passed, Y total" 统计行。
    // 抓不到统计行 = 该门 FAIL,防止 testRegex 0 匹配却因退出码 0 被误判为绿灯(裸 jest 当全量的事故复现)。
    statsLine = extractStatsLine(combined);
    if (!statsLine) {
      pass = false;
    }
  }

  const evidenceTail = tail(combined, 40) +
    (result.error ? `\n[spawn error] ${result.error.message}` : '');

  return {
    name: def.name,
    label: def.label,
    cmd: cmdText,
    cwd: def.cwd,
    pass,
    exit_code: exitCode,
    stats_line: statsLine,
    evidence_tail: evidenceTail,
  };
}

// ---------- git 元信息(实读,防幻影提交) ----------

function gitInfo(repo) {
  const rev = spawnSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { encoding: 'utf8', shell: true });
  const branch = spawnSync('git', ['-C', repo, 'rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8', shell: true });
  return {
    head_commit: (rev.stdout || '').trim() || null,
    branch: (branch.stdout || '').trim() || null,
  };
}

// ---------- 主流程 ----------

const startedAt = new Date().toISOString();
const { head_commit, branch } = gitInfo(repoRoot);

const gates = [];
const skippedRecords = [];

for (const def of GATE_DEFS) {
  if (args.skip.includes(def.name)) {
    skippedRecords.push({ name: def.name, label: def.label, reason: '调用者通过 --skip 显式跳过' });
    console.log(`\n[跳过] ${def.label}`);
    continue;
  }
  console.log(`\n[运行] ${def.label}`);
  console.log(`       cwd=${def.cwd}`);
  console.log(`       cmd=${def.cmd} ${def.cmdArgs.join(' ')}`);
  const gate = runGate(def);
  gates.push(gate);
  console.log(`       exit_code=${gate.exit_code} pass=${gate.pass}${gate.stats_line ? ` stats="${gate.stats_line}"` : ''}`);
  if (!gate.pass) {
    console.log('       --- evidence tail ---');
    console.log(gate.evidence_tail);
  }
}

const overallPass = gates.length > 0 && gates.every((g) => g.pass);

const report = {
  repo: repoRoot,
  branch,
  head_commit,
  started_at: startedAt,
  finished_at: new Date().toISOString(),
  gates,
  overall_pass: overallPass,
  skipped: skippedRecords,
  playwright: 'manual', // 硬门但不进本脚本,需起服务与场景设计,保持人/代理走查(见 verify-coach-change skill)
};

// ---------- 输出 ----------

console.log('\n========== 六门验收摘要 ==========');
console.log(`repo:        ${report.repo}`);
console.log(`branch:      ${report.branch}`);
console.log(`head_commit: ${report.head_commit}`);
for (const g of gates) {
  const mark = g.pass ? 'PASS' : 'FAIL';
  const statsPart = g.stats_line ? ` | ${g.stats_line}` : '';
  console.log(`  [${mark}] ${g.name.padEnd(10)} exit=${String(g.exit_code).padEnd(4)}${statsPart}`);
}
if (skippedRecords.length > 0) {
  console.log('跳过的门(显式声明):');
  for (const s of skippedRecords) {
    console.log(`  - ${s.name}: ${s.reason}`);
  }
}
console.log(`playwright:  manual(硬门,不在本脚本内,需真跑真过,见 verify-coach-change skill)`);
console.log(`overall_pass: ${report.overall_pass}`);
console.log('===================================');

if (args.json) {
  const jsonPath = resolve(args.json);
  mkdirSync(dirname(jsonPath), { recursive: true });
  writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\nJSON 已写入: ${jsonPath}`);
}

process.exit(report.overall_pass ? 0 : 1);
