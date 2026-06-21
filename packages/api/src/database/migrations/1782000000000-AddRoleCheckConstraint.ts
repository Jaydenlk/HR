import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 给 users.role 加一条 CHECK 约束,只接受 'user' / 'admin'(纯加法,不碰其它表/列)。
 *
 * 用途:纵深防御。应用层已在 DTO(@IsIn(['user','admin']))+ AdminGuard 双重约束 role,
 * 但绕过应用层的直接 SQL / 裸 ORM 写入仍可能塞进非法值。本约束让 DB 自身只接受 user/admin,
 * 把"角色只有这两种"这条不变量钉死在数据层。
 *
 * 安全性:现有数据只有 'user' / 'admin' 两种值(user.entity.ts 注释 + users.service.ts 只写这两值),
 * 加约束不会拒绝任何已有合法行,故无需先清洗数据。
 *
 * 双端说明:e2e 走 better-sqlite3 in-memory,靠 TypeORM synchronize 从实体自动建表,不执行本迁移,
 * 且 sqlite synchronize 不带此 CHECK——本约束仅在生产 Postgres 上生效。
 *
 * 回滚(down):DROP 这条约束。
 */
export class AddRoleCheckConstraint1782000000000 implements MigrationInterface {
  name = 'AddRoleCheckConstraint1782000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "check_user_role" CHECK (role IN ('user', 'admin'))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "check_user_role"`,
    );
  }
}
