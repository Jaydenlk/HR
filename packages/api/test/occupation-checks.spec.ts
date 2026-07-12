/**
 * 确定性检查脚本(dim1/dim3/edges + smoke)单测。
 *
 * ⚠️ dim6(字段完整度)已删除(docs/refactor2/t3-gate-a-taskcards-2026-07-10.md TC-01 step7):
 * 结构完整度改由 occupation.schema.ts 唯一 JSON Schema 经 Ajv 单一执行(见
 * occupation-schema-validator.spec.ts),不再需要与 Ajv 并存的手写完整度检查脚本。
 *
 * checks/*.mjs 是原生 ESM 脚本(改造自 p2lib,函数签名 checkXxx(occupation) 返回
 * {pass, failures, details} 风格)。本仓库 unit jest.config.json 的 transform 只覆盖
 * `.ts$`,不支持 .mjs 的 ESM 转译;直接 `import` .mjs 到 ts-jest 的 CommonJS 运行时
 * 会因模块系统不兼容而失败。改走 child_process 以独立 node 进程调用(item 8 允许的
 * "或直接以 node 子进程...调用" 路径),既规避了这个环境限制,又是脚本本身真实的
 * CLI 调用方式(未来量产 workflow 也是这样 shell 出去跑的),覆盖面比 import 更贴近实况。
 */
import { execFileSync } from 'child_process';
import * as path from 'path';

const CHECKS_DIR = path.join(__dirname, '..', 'src', 'occupations', 'checks');
const FIXTURES_ROOT = path.join(__dirname, 'fixtures', 'occupations');

function runCheck(script: string, fixtureRelPath: string): { pass: boolean; failures: string[]; metrics: Record<string, unknown> } {
  const out = execFileSync('node', [path.join(CHECKS_DIR, script), path.join(FIXTURES_ROOT, fixtureRelPath)], {
    encoding: 'utf-8',
  });
  return JSON.parse(out) as { pass: boolean; failures: string[]; metrics: Record<string, unknown> };
}

describe('smoke.mjs(自带 SAMPLE_PASS/SAMPLE_FAIL,验证四个检查脚本联动)', () => {
  it('以子进程运行,退出码 0,输出包含全部通过字样', () => {
    const out = execFileSync('node', [path.join(CHECKS_DIR, 'smoke.mjs')], { encoding: 'utf-8' });
    expect(out).toContain('所有 smoke 断言通过');
    expect(out).not.toContain('[FAIL]');
  });
});

describe('dim1(专业词汇密度)对真实 fixture 文件的表现', () => {
  it('合规样例(structural-engineer-building)密度达标', () => {
    const r = runCheck('dim1-vocab-density.mjs', 'valid/occupations/structural-engineer-building.json');
    expect(r.pass).toBe(true);
  });
});

describe('dim3(套话黑名单)对真实 fixture 文件的表现', () => {
  it('合规样例无套话命中', () => {
    const r = runCheck('dim3-boilerplate-blacklist.mjs', 'valid/occupations/structural-engineer-building.json');
    expect(r.pass).toBe(true);
    expect(r.metrics.total_hit_count).toBe(0);
  });
});

describe('edges-referential-integrity.mjs 对真实注册表快照的表现', () => {
  it('全部引用有效时通过', () => {
    const out = execFileSync(
      'node',
      [path.join(CHECKS_DIR, 'edges-referential-integrity.mjs')],
      {
        input: JSON.stringify({
          slugs: ['structural-engineer-building', 'geotechnical-engineer-fixture'],
          edges: [{ from_slug: 'structural-engineer-building', to_slug: 'geotechnical-engineer-fixture', type: 'adjacent' }],
        }),
        encoding: 'utf-8',
      },
    );
    const result = JSON.parse(out) as { pass: boolean };
    expect(result.pass).toBe(true);
  });

  it('悬空引用时失败(来自 broken-dangling-edge fixture 的 edges)', () => {
    const out = execFileSync(
      'node',
      [path.join(CHECKS_DIR, 'edges-referential-integrity.mjs')],
      {
        input: JSON.stringify({
          slugs: ['broken-dangling-edge'],
          edges: [{ from_slug: 'broken-dangling-edge', to_slug: 'ghost-slug-not-registered', type: 'adjacent' }],
        }),
        encoding: 'utf-8',
      },
    );
    const result = JSON.parse(out) as { pass: boolean; failures: string[] };
    expect(result.pass).toBe(false);
    expect(result.failures.some((f) => f.includes('悬空引用'))).toBe(true);
  });
});
