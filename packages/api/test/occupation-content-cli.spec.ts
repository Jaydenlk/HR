/**
 * 职业维基 · 回归/经济批/量产三阶段共用内容校验 CLI 单测
 * 依据 docs/refactor2/t3-regression5-plan.md Leader 裁决第4/6条。
 *
 * 覆盖两块:
 *  1) UUIDv7 生成辅助(scripts/uuid-v7.ts):1000 连发全部匹配 occupation-coverage-gate.ts
 *     的 UUID_V7 正则(直接从该模块导出的 isValidClaimId 复用同一正则断言,不在测试里
 *     重新手抄一份正则字符串——避免"测试用的正则"和"生产判定用的正则"日后各自漂移),
 *     并抽验时间戳前缀的单调性(每次生成用当前 Date.now(),故排序后应基本非降)。
 *  2) CLI 主逻辑(scripts/validate-occupation-content.ts):对一组临时 fixture 目录跑
 *     validateContentDir,分别验证"全部合规→0/validated"与"混入一个坏词条(evidence
 *     缺失)→1/draft"两种退出码与 JSON 报告形状。
 *
 * 调用方式选择:直接 import 并调用导出的 main()/validateContentDir() 函数,不用
 * child_process.spawn 起子进程——理由:(a) ts-node 起子进程在 CI/Windows 环境下的
 * 启动开销和路径转义都比直接函数调用脆弱,(b) main()/validateContentDir() 本身就是
 * 为可测试性单独导出的纯函数入口(见 scripts/validate-occupation-content.ts 头注),
 * 覆盖到这两个导出等价于覆盖了 CLI 的全部判定逻辑,唯一没覆盖到的是"process.exit
 * 真的被调用"这一行为,但该行为只在 `require.main === module` 分支触发,属于外壳而
 * 非判定逻辑,不需要子进程即可对判定逻辑做充分验证。
 *
 * 既有测试零改动:本文件复用 test/fixtures/occupations/importer-valid 与
 * importer-missing-evidence 两组既有 fixture(不新增/不修改这两组 fixture 内容)。
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { generateUuidV7 } from '../scripts/uuid-v7';
import { isValidClaimId } from '../src/occupations/occupation-coverage-gate';
import { validateContentDir, main } from '../scripts/validate-occupation-content';

const FIXTURES_ROOT = path.join(__dirname, 'fixtures', 'occupations');

describe('generateUuidV7', () => {
  it('1000 连发全部匹配 occupation-coverage-gate.ts 的 UUID_V7 正则(通过 isValidClaimId 复用同一判定)', () => {
    const ids = Array.from({ length: 1000 }, () => generateUuidV7());
    for (const id of ids) {
      expect(isValidClaimId(id)).toBe(true);
    }
  });

  it('1000 个生成值互不重复', () => {
    const ids = Array.from({ length: 1000 }, () => generateUuidV7());
    expect(new Set(ids).size).toBe(1000);
  });

  it('时间戳前缀具有单调性:生成顺序与前缀(前 12 位十六进制=48bit 时间戳)排序基本一致抽验', () => {
    const ids: string[] = [];
    for (let i = 0; i < 50; i++) {
      ids.push(generateUuidV7());
    }
    const prefixes = ids.map((id) => id.replace(/-/g, '').slice(0, 12));
    const sorted = [...prefixes].sort();
    // 48bit 毫秒时间戳按生成顺序应非严格递减(允许同毫秒内相等,不允许整体逆序)。
    expect(prefixes).toEqual(sorted);
  });
});

describe('validateContentDir / main (CLI)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'occ-content-cli-'));
    fs.mkdirSync(path.join(tmpDir, 'occupations'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'evidence'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('合规 fixture(复用 importer-valid)→ 全部 validated,退出码 0', () => {
    const validOccPath = path.join(FIXTURES_ROOT, 'importer-valid', 'occupations', 'content-importer-fixture-a.json');
    const validEvidencePath = path.join(FIXTURES_ROOT, 'importer-valid', 'evidence', 'content-importer-fixture-a.json');
    fs.copyFileSync(validOccPath, path.join(tmpDir, 'occupations', 'content-importer-fixture-a.json'));
    fs.copyFileSync(validEvidencePath, path.join(tmpDir, 'evidence', 'content-importer-fixture-a.json'));

    const summary = validateContentDir(tmpDir);

    expect(summary.total).toBe(1);
    expect(summary.validatedCount).toBe(1);
    expect(summary.failedSlugs).toEqual([]);
    expect(summary.reports).toHaveLength(1);
    expect(summary.reports[0]).toMatchObject({ slug: 'content-importer-fixture-a', valid: true, status: 'validated', errors: [] });

    const exitCode = main(['--content-dir', tmpDir]);
    expect(exitCode).toBe(0);
  });

  it('坏词条(复用 importer-missing-evidence:evidence 文件缺失)→ 失败,退出码 1,报告形状正确', () => {
    const brokenOccPath = path.join(
      FIXTURES_ROOT,
      'importer-missing-evidence',
      'occupations',
      'content-importer-fixture-missing-evidence.json',
    );
    fs.copyFileSync(brokenOccPath, path.join(tmpDir, 'occupations', 'content-importer-fixture-missing-evidence.json'));
    // 刻意不放 evidence 文件,复现 importer-missing-evidence fixture 的原始意图。

    const summary = validateContentDir(tmpDir);

    expect(summary.total).toBe(1);
    expect(summary.validatedCount).toBe(0);
    expect(summary.failedSlugs).toEqual(['content-importer-fixture-missing-evidence']);
    expect(summary.reports).toHaveLength(1);
    const report = summary.reports[0];
    expect(report.slug).toBe('content-importer-fixture-missing-evidence');
    expect(report.valid).toBe(false);
    expect(report.status).toBe('draft');
    expect(report.errors.some((e) => e.includes('证据文件缺失'))).toBe(true);

    const exitCode = main(['--content-dir', tmpDir]);
    expect(exitCode).toBe(1);
  });

  it('混合目录(1 条合规 + 1 条坏词条)→ 退出码 1,汇总数字与失败清单精确对应', () => {
    const validOccPath = path.join(FIXTURES_ROOT, 'importer-valid', 'occupations', 'content-importer-fixture-a.json');
    const validEvidencePath = path.join(FIXTURES_ROOT, 'importer-valid', 'evidence', 'content-importer-fixture-a.json');
    fs.copyFileSync(validOccPath, path.join(tmpDir, 'occupations', 'content-importer-fixture-a.json'));
    fs.copyFileSync(validEvidencePath, path.join(tmpDir, 'evidence', 'content-importer-fixture-a.json'));

    const brokenOccPath = path.join(
      FIXTURES_ROOT,
      'importer-missing-evidence',
      'occupations',
      'content-importer-fixture-missing-evidence.json',
    );
    fs.copyFileSync(brokenOccPath, path.join(tmpDir, 'occupations', 'content-importer-fixture-missing-evidence.json'));

    const summary = validateContentDir(tmpDir);

    expect(summary.total).toBe(2);
    expect(summary.validatedCount).toBe(1);
    expect(summary.failedSlugs).toEqual(['content-importer-fixture-missing-evidence']);

    const exitCode = main(['--content-dir', tmpDir]);
    expect(exitCode).toBe(1);
  });

  it('内容文件混入注册表字段(如 name)→ 报错拒绝(OccupationSeedFile 契约不含注册表字段)', () => {
    const validOccPath = path.join(FIXTURES_ROOT, 'importer-valid', 'occupations', 'content-importer-fixture-a.json');
    const validEvidencePath = path.join(FIXTURES_ROOT, 'importer-valid', 'evidence', 'content-importer-fixture-a.json');
    const occContent = JSON.parse(fs.readFileSync(validOccPath, 'utf-8'));
    occContent.name = '不应该出现在内容文件里的注册表名称';
    fs.writeFileSync(path.join(tmpDir, 'occupations', 'content-importer-fixture-a.json'), JSON.stringify(occContent));
    fs.copyFileSync(validEvidencePath, path.join(tmpDir, 'evidence', 'content-importer-fixture-a.json'));

    const summary = validateContentDir(tmpDir);

    expect(summary.validatedCount).toBe(0);
    expect(summary.reports[0].errors.some((e) => e.includes('注册表字段') && e.includes('name'))).toBe(true);
  });

  it('occupations 目录不存在时优雅返回空汇总(不抛错)', () => {
    const summary = validateContentDir(path.join(tmpDir, 'does-not-exist'));
    expect(summary.total).toBe(0);
    expect(summary.validatedCount).toBe(0);
    expect(summary.failedSlugs).toEqual([]);
    expect(summary.reports).toEqual([]);
  });

  it('--gen-ids N 模式:打印 N 个 UUIDv7,退出码 0,不做内容校验', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const exitCode = main(['--gen-ids', '5']);
    expect(exitCode).toBe(0);
    expect(logSpy).toHaveBeenCalledTimes(5);
    for (const call of logSpy.mock.calls) {
      expect(isValidClaimId(call[0] as string)).toBe(true);
    }
    logSpy.mockRestore();
  });
});
