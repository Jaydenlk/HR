import { MigrationInterface, QueryRunner } from 'typeorm';
import { encryptSecret, resolveMasterKey } from '../../common/secret-crypto';

/**
 * 把生产 ai_providers 通道池重配成「GLM-5.1 coding 端点主力 → DeepSeek 备份(relay 停用)」。
 *
 * 背景:GLM coding 端点(https://open.bigmodel.cn/api/coding/paas/v4)为 OpenAI Chat Completions 兼容,
 * glm-5.1 是推理模型(reasoning_content + content)。AiService 已补 openai-compat 运行时(原生 fetch),
 * 故该通道在库里 protocol=openai-compat。
 *
 * 关键修正(UPSERT,非纯 UPDATE):线上 ai_providers 极可能根本没有 glm 行——seedFromEnvIfEmpty 当初无
 * GLM key 会 skip 该通道(ai-provider.service.ts:`!seed.hasKey continue`)。若 up() 只 UPDATE WHERE name='glm',
 * 命中 0 行 → GLM 永不上位、deepseek 被降备 → 系统照跑 DeepSeek 还全绿无告警(上线即空转,最隐蔽)。
 * 故 glm 行改为 UPSERT:存在则全字段 UPDATE,缺失则 INSERT 一条完整 glm 行。
 * (表有 UQ_ai_providers_name 唯一约束,用 INSERT ... ON CONFLICT ("name") DO UPDATE 原子完成。)
 *
 * up:
 *   - glm     行 → UPSERT:coding 端点 + protocol openai-compat + model_pro/flash=glm-5.1 + role primary。
 *               api_key_enc:env AI_GLM_API_KEY 存在且 PROVIDER_ENC_KEY 可解析时,用现有 AES-256-GCM 逻辑
 *               加密后写入(与 admin 面板/种子同一套加密);env 缺 key 时安全降级——
 *                 · INSERT 路径写空密文(行结构齐全,loadPool 解密失败会优雅跳过该通道,不崩);
 *                 · UPDATE(冲突)路径用 COALESCE(NULLIF(EXCLUDED,''),原值)保留原有密文,绝不被空串清掉。
 *   - deepseek 行 → role backup(主挂自动降级,失败计费铁律由 AiService/CreditInterceptor 保证,本迁移不涉及)。
 *   - relay    行 → role disabled(不入池;中转 auto-v2 停用)。
 *   - 单主力钉死 → 末尾把除 glm 外的任何 primary 降为 backup(防运维曾手动把别的通道设 primary 造成双主)。
 *
 * 幂等:glm UPSERT 重复执行结果一致;非 key 字段 UPDATE 幂等;api_key_enc 每次随机 IV 重加密,解密结果不变,无害。
 * 安全:明文 key 只在迁移进程内存在于内存,加密后落库;迁移不打印任何明文/密文。
 *
 * down(可回滚):恢复到本迁移前的线上状态——deepseek 主力、glm/relay 备用,glm 回退 Anthropic 端点 + 旧型号。
 *   api_key_enc 不回滚(迁移不持有旧 key,贸然改密文会让通道失效);仅回滚角色/端点/型号/协议。
 *   (本迁移可能 INSERT 出 glm 行;down 仅按 name UPDATE,缺行时命中 0 行无副作用,不强行删除以免误伤运维后续配置。)
 *
 * SQLite(dev/test)走 synchronize 不跑迁移;本迁移面向 Postgres 生产。
 */
export class ReconfigureGlmPrimary1782400000000 implements MigrationInterface {
  name = 'ReconfigureGlmPrimary1782400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // glm 密钥:env 提供 + 主密钥可解析时加密;否则空串(INSERT 安全降级 / UPDATE 由 SQL 保留原值)。
    const glmKey = process.env.AI_GLM_API_KEY;
    const masterKey = resolveMasterKey(process.env.PROVIDER_ENC_KEY);
    const encKey =
      glmKey && glmKey.trim().length > 0 && masterKey ? encryptSecret(glmKey.trim(), masterKey) : '';

    // 1) glm 行 UPSERT(存在则全字段 UPDATE,缺失则 INSERT 完整行)。
    //    sort_order=0:primary 永远排第一(loadPool 按 role 优先,sort_order 仅决定 backup 内顺序);给 0 即可。
    //    api_key_enc 冲突处理:COALESCE(NULLIF(EXCLUDED.api_key_enc,''),原值)——env 有 key 用新密文,
    //    env 无 key 保留库里原有密文,绝不被空串清掉(否则会把已配好的 GLM 通道弄失效)。
    await queryRunner.query(
      `INSERT INTO "ai_providers" ` +
        `("name", "protocol", "base_url", "api_key_enc", "model_pro", "model_flash", "role", "sort_order", "timeout_ms", "max_retries") ` +
        `VALUES ('glm', 'openai-compat', 'https://open.bigmodel.cn/api/coding/paas/v4', $1, 'glm-5.1', 'glm-5.1', 'primary', 0, 120000, 3) ` +
        `ON CONFLICT ("name") DO UPDATE SET ` +
        `"protocol" = EXCLUDED."protocol", ` +
        `"base_url" = EXCLUDED."base_url", ` +
        `"api_key_enc" = COALESCE(NULLIF(EXCLUDED."api_key_enc", ''), "ai_providers"."api_key_enc"), ` +
        `"model_pro" = EXCLUDED."model_pro", ` +
        `"model_flash" = EXCLUDED."model_flash", ` +
        `"role" = EXCLUDED."role", ` +
        `"updated_at" = now()`,
      [encKey],
    );

    // 2) deepseek → backup;relay → disabled。
    await queryRunner.query(
      `UPDATE "ai_providers" SET "role" = 'backup', "updated_at" = now() WHERE "name" = 'deepseek'`,
    );
    await queryRunner.query(
      `UPDATE "ai_providers" SET "role" = 'disabled', "updated_at" = now() WHERE "name" = 'relay'`,
    );

    // 3) 单主力钉死:除 glm 外任何残留 primary 降为 backup(防双主——运维曾手动设别的通道为 primary)。
    await queryRunner.query(
      `UPDATE "ai_providers" SET "role" = 'backup', "updated_at" = now() WHERE "role" = 'primary' AND "name" <> 'glm'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 回滚到迁移前:deepseek 主力,glm/relay 备用,glm 回退 Anthropic 端点 + 旧型号。
    await queryRunner.query(
      `UPDATE "ai_providers" SET ` +
        `"base_url" = 'https://open.bigmodel.cn/api/anthropic', ` +
        `"protocol" = 'anthropic-compat', ` +
        `"model_pro" = 'glm-4.6', ` +
        `"model_flash" = 'glm-4.5-air', ` +
        `"role" = 'backup', ` +
        `"updated_at" = now() ` +
        `WHERE "name" = 'glm'`,
    );
    await queryRunner.query(
      `UPDATE "ai_providers" SET "role" = 'primary', "updated_at" = now() WHERE "name" = 'deepseek'`,
    );
    await queryRunner.query(
      `UPDATE "ai_providers" SET "role" = 'backup', "updated_at" = now() WHERE "name" = 'relay'`,
    );
  }
}
