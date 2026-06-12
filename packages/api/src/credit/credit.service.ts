import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import {
  CreditTransaction,
  CreditTransactionType,
} from './entities/credit-transaction.entity';

// credit 账务核心:余额更新与流水写入恒在「同一事务 + 对 user 行行锁」内完成,杜绝并发双扣/双记。
// grant 用于注册赠送与管理员充值,consume 用于 AI 端点扣点。
@Injectable()
export class CreditService {
  // 生产用 Postgres,支持 SELECT ... FOR UPDATE 行锁(pessimistic_write);
  // 开发/测试用 better-sqlite3,单连接同步执行天然串行(无真并发),且其驱动不支持 FOR UPDATE
  // (TypeORM 会抛 LockNotSupportedOnGivenDriverError)。故行锁仅在 Postgres 家族施加。
  private readonly lockSupported: boolean;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(CreditTransaction)
    private readonly txRepo: Repository<CreditTransaction>,
  ) {
    this.lockSupported = this.dataSource.options.type === 'postgres';
  }

  // 加点(正数):注册赠送 / 管理员充值。事务内锁 user 行 → 加余额 → 写流水。返回落账后余额。
  async grant(
    userId: string,
    delta: number,
    type: Extract<CreditTransactionType, 'signup_grant' | 'admin_grant'>,
    note?: string,
    createdBy?: string,
  ): Promise<number> {
    return this.dataSource.transaction(async (manager) => {
      const user = await this.lockUser(manager, userId);
      const balanceAfter = user.credit_balance + delta;
      await manager.update(User, { id: userId }, { credit_balance: balanceAfter });
      await manager.insert(CreditTransaction, {
        user_id: userId,
        delta,
        type,
        balance_after: balanceAfter,
        note: note ?? null,
        created_by: createdBy ?? null,
        endpoint: null,
      });
      return balanceAfter;
    });
  }

  // 扣 1 点(AI 端点成功后由 CreditInterceptor 调)。事务内锁 user 行 → 减 1 → 写 consume 流水。
  // 余额校验由 CreditGuard 前置(< 1 即 402);Guard 与本扣减之间存在并发窗口,余额可能被并发
  // 请求短暂打到 -1(下一次请求即被 Guard 挡下),业务可接受、不回滚。
  // 关键不变量:每次 consume 恰好扣 1 且恰好记一条流水,balance_after 与实际余额始终自洽(行锁保证)。
  async consume(userId: string, endpoint: string): Promise<number> {
    return this.dataSource.transaction(async (manager) => {
      const user = await this.lockUser(manager, userId);
      const balanceAfter = user.credit_balance - 1;
      await manager.update(User, { id: userId }, { credit_balance: balanceAfter });
      await manager.insert(CreditTransaction, {
        user_id: userId,
        delta: -1,
        type: 'consume',
        balance_after: balanceAfter,
        note: null,
        created_by: null,
        endpoint,
      });
      return balanceAfter;
    });
  }

  // 事务内读取并锁定 user 行(Postgres:FOR UPDATE;sqlite:无锁,靠单连接串行)。
  private async lockUser(manager: EntityManager, userId: string): Promise<User> {
    const user = await manager.findOne(User, {
      where: { id: userId },
      ...(this.lockSupported ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return user;
  }

  // 某用户流水倒序分页(/me/credits 用)。
  async listTransactions(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<{ items: CreditTransaction[]; total: number }> {
    const [items, total] = await this.txRepo.findAndCount({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { items, total };
  }
}
