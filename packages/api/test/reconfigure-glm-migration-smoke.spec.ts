/**
 * ReconfigureGlmPrimary 迁移结构冒烟(不依赖运行中的 Postgres,捕获迁移 SQL + 参数做断言)。
 *
 *  - up() 把 glm 行改为 UPSERT(INSERT ... ON CONFLICT ("name") DO UPDATE),覆盖两路径:
 *      · glm 行已存在 → 走 DO UPDATE 分支(全字段刷新);
 *      · glm 行缺失   → 走 INSERT 分支(完整行落地,role=primary)。
 *    两路径由同一条 UPSERT SQL 承载,故断言其结构同时含 INSERT 与 ON CONFLICT DO UPDATE。
 *  - api_key_enc:env AI_GLM_API_KEY + PROVIDER_ENC_KEY 齐全时,$1 为密文(可被同主密钥解回原文);
 *      缺 key / 缺主密钥时,$1 为空串(INSERT 安全降级;UPDATE 冲突路径由 COALESCE 保留原值)。
 *  - 单主力钉死:up() 末尾把除 glm 外任何 primary 降 backup(防双主)。
 *  - deepseek → backup;relay → disabled。
 *  - down():回滚到 deepseek 主力 / glm 备用 + Anthropic 端点 + 旧型号,绝不动 api_key_enc。
 *  - 幂等:连跑两次 up() 的 SQL 集合一致。
 */
import { QueryRunner } from 'typeorm';
import { ReconfigureGlmPrimary1782400000000 } from '../src/database/migrations/1782400000000-ReconfigureGlmPrimary';
import { decryptSecret, resolveMasterKey } from '../src/common/secret-crypto';

interface Recorded {
  sql: string;
  params?: unknown[];
}
function makeRecordingRunner(): { runner: QueryRunner; calls: Recorded[] } {
  const calls: Recorded[] = [];
  const recording: Pick<QueryRunner, 'query'> = {
    query: (q: string, params?: unknown[]): Promise<unknown> => {
      calls.push({ sql: q, params });
      return Promise.resolve(undefined);
    },
  };
  return { runner: recording as QueryRunner, calls };
}

// 取 glm 的 UPSERT 语句(INSERT INTO "ai_providers" + ON CONFLICT)。
function findGlmUpsert(calls: Recorded[]): Recorded | undefined {
  return calls.find(
    (c) => /INSERT INTO "ai_providers"/.test(c.sql) && /ON CONFLICT \("name"\)/.test(c.sql),
  );
}

// 64 位 hex = 32 字节,合法主密钥。
const TEST_MASTER_KEY = 'a'.repeat(64);

describe('ReconfigureGlmPrimary1782400000000 迁移结构', () => {
  const migration = new ReconfigureGlmPrimary1782400000000();
  const savedGlm = process.env.AI_GLM_API_KEY;
  const savedEnc = process.env.PROVIDER_ENC_KEY;

  afterEach(() => {
    if (savedGlm === undefined) delete process.env.AI_GLM_API_KEY;
    else process.env.AI_GLM_API_KEY = savedGlm;
    if (savedEnc === undefined) delete process.env.PROVIDER_ENC_KEY;
    else process.env.PROVIDER_ENC_KEY = savedEnc;
  });

  it('类名与文件时间戳一致', () => {
    expect(migration.name).toBe('ReconfigureGlmPrimary1782400000000');
  });

  it('up(): glm 走 UPSERT(缺失→INSERT 完整行 / 存在→DO UPDATE),coding 端点 + openai-compat + glm-5.1 + primary', async () => {
    delete process.env.AI_GLM_API_KEY; // 本例只验非 key 结构
    delete process.env.PROVIDER_ENC_KEY;
    const { runner, calls } = makeRecordingRunner();
    await migration.up(runner);
    const upsert = findGlmUpsert(calls);
    expect(upsert).toBeDefined();
    // INSERT 分支:完整行 + role primary(覆盖"线上无 glm 行"的核心修复)。
    expect(upsert!.sql).toMatch(/VALUES \('glm', 'openai-compat', 'https:\/\/open\.bigmodel\.cn\/api\/coding\/paas\/v4'/);
    expect(upsert!.sql).toMatch(/'glm-5\.1', 'glm-5\.1', 'primary'/);
    // DO UPDATE 分支:存在则刷新端点/协议/型号/角色。
    expect(upsert!.sql).toMatch(/ON CONFLICT \("name"\) DO UPDATE SET/);
    expect(upsert!.sql).toMatch(/"protocol" = EXCLUDED\."protocol"/);
    expect(upsert!.sql).toMatch(/"base_url" = EXCLUDED\."base_url"/);
    expect(upsert!.sql).toMatch(/"model_pro" = EXCLUDED\."model_pro"/);
    expect(upsert!.sql).toMatch(/"model_flash" = EXCLUDED\."model_flash"/);
    expect(upsert!.sql).toMatch(/"role" = EXCLUDED\."role"/);
  });

  it('up(): UPSERT 含全部 NOT NULL 列(INSERT 完整,缺列会被 Postgres 拒)', async () => {
    delete process.env.AI_GLM_API_KEY;
    const { runner, calls } = makeRecordingRunner();
    await migration.up(runner);
    const upsert = findGlmUpsert(calls);
    // entity NOT NULL 无默认值的列必须出现在 INSERT 列清单:name/protocol/base_url/api_key_enc/model_pro/model_flash。
    for (const col of ['name', 'protocol', 'base_url', 'api_key_enc', 'model_pro', 'model_flash']) {
      expect(upsert!.sql).toContain(`"${col}"`);
    }
  });

  it('up(): UPDATE 冲突路径用 COALESCE(NULLIF(EXCLUDED,\'\'),原值)保留已有密文(缺 key 不清空)', async () => {
    delete process.env.AI_GLM_API_KEY;
    const { runner, calls } = makeRecordingRunner();
    await migration.up(runner);
    const upsert = findGlmUpsert(calls);
    expect(upsert!.sql).toMatch(
      /"api_key_enc" = COALESCE\(NULLIF\(EXCLUDED\."api_key_enc", ''\), "ai_providers"\."api_key_enc"\)/,
    );
  });

  it('up(): deepseek → backup,relay → disabled', async () => {
    delete process.env.AI_GLM_API_KEY;
    const { runner, calls } = makeRecordingRunner();
    await migration.up(runner);
    expect(
      calls.some((c) => /"role" = 'backup'/.test(c.sql) && /WHERE "name" = 'deepseek'/.test(c.sql)),
    ).toBe(true);
    expect(
      calls.some((c) => /"role" = 'disabled'/.test(c.sql) && /WHERE "name" = 'relay'/.test(c.sql)),
    ).toBe(true);
  });

  it('up(): 末尾钉死单主力(除 glm 外任何 primary 降 backup)', async () => {
    delete process.env.AI_GLM_API_KEY;
    const { runner, calls } = makeRecordingRunner();
    await migration.up(runner);
    expect(
      calls.some(
        (c) =>
          /"role" = 'backup'/.test(c.sql) &&
          /WHERE "role" = 'primary' AND "name" <> 'glm'/.test(c.sql),
      ),
    ).toBe(true);
  });

  it('up(): 有 AI_GLM_API_KEY + 主密钥 → UPSERT $1 为密文(可解回原文,绝不明文)', async () => {
    process.env.AI_GLM_API_KEY = 'glm-secret-xyz';
    process.env.PROVIDER_ENC_KEY = TEST_MASTER_KEY;
    const { runner, calls } = makeRecordingRunner();
    await migration.up(runner);
    const upsert = findGlmUpsert(calls);
    const enc = upsert!.params?.[0] as string;
    // 不是明文
    expect(enc).not.toContain('glm-secret-xyz');
    expect(enc).toMatch(/^v1:/);
    // 用同主密钥能解回原文(证明走了真实加密逻辑)
    const masterKey = resolveMasterKey(TEST_MASTER_KEY)!;
    expect(decryptSecret(enc, masterKey)).toBe('glm-secret-xyz');
  });

  it('up(): 缺 AI_GLM_API_KEY → UPSERT $1 为空串(INSERT 安全降级,不写明文/不崩)', async () => {
    delete process.env.AI_GLM_API_KEY;
    process.env.PROVIDER_ENC_KEY = TEST_MASTER_KEY;
    const { runner, calls } = makeRecordingRunner();
    await migration.up(runner);
    const upsert = findGlmUpsert(calls);
    expect(upsert!.params?.[0]).toBe('');
  });

  it('up(): 有 key 但缺主密钥 → UPSERT $1 为空串(无法加密则不写密文,但行结构仍落地)', async () => {
    process.env.AI_GLM_API_KEY = 'glm-secret-xyz';
    delete process.env.PROVIDER_ENC_KEY;
    const { runner, calls } = makeRecordingRunner();
    await migration.up(runner);
    const upsert = findGlmUpsert(calls);
    expect(upsert!.params?.[0]).toBe('');
  });

  it('down(): glm 回退 Anthropic 端点 + 旧型号 + backup,deepseek primary,relay backup', async () => {
    const { runner, calls } = makeRecordingRunner();
    await migration.down(runner);
    const glmDown = calls.find((c) => /WHERE "name" = 'glm'/.test(c.sql));
    expect(glmDown!.sql).toMatch(/'https:\/\/open\.bigmodel\.cn\/api\/anthropic'/);
    expect(glmDown!.sql).toMatch(/"protocol" = 'anthropic-compat'/);
    expect(glmDown!.sql).toMatch(/"role" = 'backup'/);
    expect(
      calls.some((c) => /"role" = 'primary'/.test(c.sql) && /WHERE "name" = 'deepseek'/.test(c.sql)),
    ).toBe(true);
    expect(
      calls.some((c) => /"role" = 'backup'/.test(c.sql) && /WHERE "name" = 'relay'/.test(c.sql)),
    ).toBe(true);
    // down 绝不动 api_key_enc(不持有旧 key)
    expect(calls.some((c) => /api_key_enc/.test(c.sql))).toBe(false);
  });

  it('幂等:连跑两次 up() 的 SQL 集合一致', async () => {
    delete process.env.AI_GLM_API_KEY;
    const first = makeRecordingRunner();
    await migration.up(first.runner);
    const second = makeRecordingRunner();
    await migration.up(second.runner);
    expect(second.calls.map((c) => c.sql)).toEqual(first.calls.map((c) => c.sql));
  });
});
