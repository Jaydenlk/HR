import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * users 表新增登录审计与条款字段(全部可空,存量行无需回填):
 *  - last_login_ip / last_login_province / last_login_city:最近登录 IP 与离线归属
 *    (ip2region 解析;内网为「内网」,解析失败为 null)
 *  - last_login_at:最近登录时间
 *  - terms_agreed_at:首次同意用户条款时间(已有值不覆盖)
 *
 * 类型映射与 InitialSchema 一致:@Column varchar → character varying、
 * 可空时间列(TIMESTAMP_COLUMN_TYPE)→ timestamp without time zone。
 * SQLite 开发态由 synchronize 自动加列,本迁移只管 Postgres。
 */
export class AddLoginIpAndTerms1781254541979 implements MigrationInterface {
  name = 'AddLoginIpAndTerms1781254541979';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "last_login_ip" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD "last_login_province" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD "last_login_city" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD "last_login_at" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "users" ADD "terms_agreed_at" TIMESTAMP`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "terms_agreed_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "last_login_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "last_login_city"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "last_login_province"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "last_login_ip"`);
  }
}
