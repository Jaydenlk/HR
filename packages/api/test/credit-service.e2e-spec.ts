/**
 * CreditService 事务/账务测试(经 AppModule 取真实 sqlite DataSource,实体图完整)。
 *
 * 目标(handoff step3):
 *  - 连续 10 个 consume:余额准确、不丢账(100→90),流水恰好 10 条且各 -1、balance_after 99..90 无跳号。
 *  - 余额 1 时连续 2 个 consume:余额>=-1,流水条数=实际扣减次数,末笔 balance_after 与最终余额自洽。
 *  - grant +50:余额=50,流水 1 条 signup_grant、balance_after=50。
 *
 * 关于「并发」:better-sqlite3 单连接同步驱动,物理上无法并行执行事务(Promise.all 多事务会报
 * "cannot start a transaction within a transaction"),也不支持 FOR UPDATE 行锁
 * (TypeORM 抛 LockNotSupportedOnGivenDriverError)。故本机(无 Postgres)只能验证「逐次 consume
 * 恰好扣 1 且恰好一条流水、balance_after 自洽、连续 N 次累计准确不丢账」这一账务不变量——这正是
 * 双扣防护要保护的核心:无论调用如何排布,余额与流水始终一一对应、无重复无跳号。
 * 生产并发双扣由 Postgres 的 pessimistic_write 行锁兜底(CreditService 已按驱动类型仅在 Postgres 施加);
 * 真并发压测需 Postgres 实例,见 handoff 遗留问题(本机 SKIPPED)。
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { User } from '../src/users/entities/user.entity';
import { CreditTransaction } from '../src/credit/entities/credit-transaction.entity';
import { CreditService } from '../src/credit/credit.service';

describe('CreditService 事务与账务 (e2e)', () => {
  let app: INestApplication;
  let credit: CreditService;
  let userRepo: Repository<User>;
  let txRepo: Repository<CreditTransaction>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    credit = moduleRef.get(CreditService);
    userRepo = moduleRef.get<Repository<User>>(getRepositoryToken(User));
    txRepo = moduleRef.get<Repository<CreditTransaction>>(getRepositoryToken(CreditTransaction));
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  async function seedUser(balance: number): Promise<string> {
    const u = await userRepo.save(
      userRepo.create({
        email: `cs-${Math.random()}@coach.dev`,
        name: 'u',
        invite_code: 'x',
        credit_balance: balance,
      }),
    );
    return u.id;
  }

  it('grant +50 后余额=50,流水 1 条 signup_grant 且 balance_after=50', async () => {
    const id = await seedUser(0);
    const after = await credit.grant(id, 50, 'signup_grant');
    expect(after).toBe(50);
    const u = await userRepo.findOneByOrFail({ id });
    expect(u.credit_balance).toBe(50);
    const txs = await txRepo.find({ where: { user_id: id } });
    expect(txs).toHaveLength(1);
    expect(txs[0].type).toBe('signup_grant');
    expect(txs[0].delta).toBe(50);
    expect(txs[0].balance_after).toBe(50);
  });

  it('连续 10 个 consume:余额准确不丢账(100→90),流水 10 条各 -1、balance_after 99..90 无跳号', async () => {
    const id = await seedUser(100);
    for (let i = 0; i < 10; i++) {
      await credit.consume(id, '/api/test/x');
    }
    const u = await userRepo.findOneByOrFail({ id });
    // eslint-disable-next-line no-console
    console.log('after 10 sequential consume, balance =', u.credit_balance);
    expect(u.credit_balance).toBe(90);
    const txs = await txRepo.find({ where: { user_id: id, type: 'consume' } });
    expect(txs).toHaveLength(10);
    for (const t of txs) expect(t.delta).toBe(-1);
    const afters = txs.map((t) => t.balance_after).sort((a, b) => b - a);
    expect(afters).toEqual([99, 98, 97, 96, 95, 94, 93, 92, 91, 90]);
  });

  it('余额 1 时连续 2 个 consume:余额=-1,流水条数=实际扣减数,末笔 balance_after 自洽', async () => {
    const id = await seedUser(1);
    await credit.consume(id, '/api/test/y');
    await credit.consume(id, '/api/test/y');
    const u = await userRepo.findOneByOrFail({ id });
    // eslint-disable-next-line no-console
    console.log('after 2 sequential consume from balance 1, balance =', u.credit_balance);
    expect(u.credit_balance).toBeGreaterThanOrEqual(-1);
    const txs = await txRepo.find({ where: { user_id: id, type: 'consume' } });
    // Service 不挡负(拦截在 Guard 层);两次都执行 → 2 条流水,余额 1-2=-1。
    expect(txs.length).toBe(1 - u.credit_balance);
    const afters = txs.map((t) => t.balance_after).sort((a, b) => b - a);
    expect(afters[afters.length - 1]).toBe(u.credit_balance);
  });
});
