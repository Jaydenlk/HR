import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * T3 门A additive 迁移(docs/refactor2/t3-gate-a-taskcards-2026-07-10.md TC-04,
 * 上位规格 docs/refactor2/t3-codex56-review-2026-07-10.md §R1)。
 *
 * 背景:TC-01 把 occupation_slugs.l2_scene 在应用层(entity)改为可空——registry-v1.csv
 * 369 行里 353 行 l2_scene 为空,需以 DB null 而非空串/占位文案表达「无该层场景」。
 * TC-02 把 occupation_evidence 定稿为 claim_id/verdict/推理链模型,新增
 * field_value_hash(防改写复用旧 hash)/span_start/span_end(claim 定位半开区间)/
 * reasoning_chain(仅 inference_supported 用,门B 前恒为 null)四个字段,此前只在
 * entity 类型层面声明,尚未落到数据库列——本迁移补齐。
 *
 * 纯加法/纯放宽,不碰任何既有迁移、不 DROP 表、不 DELETE 数据:
 *  - occupation_slugs.l2_scene:DROP NOT NULL(放宽约束,不改列类型/不改已有行的值)。
 *  - occupation_evidence:新增 4 列。field_value_hash/span_start/span_end 三列在
 *    TC-05(内容 importer)定稿前对已有证据行是必填语义,若库内已有旧 evidence 行,
 *    NOT NULL 会在 ADD COLUMN 时因缺省值而失败——这是有意的「fail loud」,不允许用假默认值
 *    (如空字符串/0/0)回填掩盖问题:本迁移只应在 evidence 表为空(即 TC-05 尚未导入过
 *    真实数据)或已完成对应字段回填的前提下执行。reasoning_chain 保持可空(仅
 *    inference_supported 才非 null,门B 前不加 freshness/source_document)。
 *
 * down() 是「有损收窄」操作(DROP COLUMN 会丢数据、l2_scene SET NOT NULL 在存在 NULL 行时
 * 会直接报错但仍可能已丢了列数据),因此在动手之前先做数据安全检查:
 *  - occupation_evidence 表内若已有任意行,回滚会丢失 field_value_hash/span_start/span_end/
 *    reasoning_chain 四列的数据 → RAISE EXCEPTION 拒绝回滚。
 *  - occupation_slugs 若已有 l2_scene 为 NULL 的行,SET NOT NULL 本身会失败,这里提前用
 *    可读的中文报错 RAISE 出来,而不是等 Postgres 抛出更难懂的约束错误。
 * 两个检查都通过后才执行对称的 DROP COLUMN ×4 + SET NOT NULL。绝不清洗/编造数据求回滚成功。
 *
 * 双端说明:e2e 走 better-sqlite3 in-memory + synchronize,不执行本迁移;
 * 本迁移仅在生产/本地 Postgres 上执行。
 */
export class HardenOccupationGateA1783100000000 implements MigrationInterface {
  name = 'HardenOccupationGateA1783100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "occupation_slugs" ALTER COLUMN "l2_scene" DROP NOT NULL`,
    );

    await queryRunner.query(`
      ALTER TABLE "occupation_evidence"
        ADD COLUMN "field_value_hash" varchar(64) NOT NULL,
        ADD COLUMN "span_start" integer NOT NULL,
        ADD COLUMN "span_end" integer NOT NULL,
        ADD COLUMN "reasoning_chain" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 数据安全检查:回滚是有损操作(DROP COLUMN 丢 evidence 4 列数据 / SET NOT NULL 会拒绝
    // 已有 NULL l2_scene 的行),两种情况都必须 fail closed,不允许清洗数据凑回滚成功。
    await queryRunner.query(`
      DO $$
      DECLARE
        evidence_row_count integer;
        null_l2_scene_count integer;
      BEGIN
        SELECT COUNT(*) INTO evidence_row_count FROM "occupation_evidence";
        IF evidence_row_count > 0 THEN
          RAISE EXCEPTION
            'HardenOccupationGateA1783100000000 down() 拒绝执行:occupation_evidence 表有 % 行数据,回滚会丢失 field_value_hash/span_start/span_end/reasoning_chain 四列数据。请改用空测试库验证回滚,不得清洗/删除数据求绿。',
            evidence_row_count;
        END IF;

        SELECT COUNT(*) INTO null_l2_scene_count FROM "occupation_slugs" WHERE "l2_scene" IS NULL;
        IF null_l2_scene_count > 0 THEN
          RAISE EXCEPTION
            'HardenOccupationGateA1783100000000 down() 拒绝执行:occupation_slugs 表有 % 行 l2_scene 为 NULL,SET NOT NULL 会失败。请改用空测试库验证回滚,不得编造占位值回填。',
            null_l2_scene_count;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "occupation_evidence"
        DROP COLUMN "field_value_hash",
        DROP COLUMN "span_start",
        DROP COLUMN "span_end",
        DROP COLUMN "reasoning_chain"
    `);

    await queryRunner.query(
      `ALTER TABLE "occupation_slugs" ALTER COLUMN "l2_scene" SET NOT NULL`,
    );
  }
}
