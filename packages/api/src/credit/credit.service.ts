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
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
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

  // 扣点(AI 端点成功后由 CreditInterceptor / service 内部调)。事务内锁 user 行 → 减 amount → 写一条 consume 流水。
  // amount 缺省 1(绝大多数端点单次扣 1 点);重端点(如录音转写复盘 = 7 点)显式传入总额,
  // 仍是「一次成功 = 一条流水扣满总额」,不拆成多条小额,避免多段累加 ≠ 总成本。
  // 余额校验由 CreditGuard / service 预检前置(不足即 402);预检与本扣减之间存在并发窗口,余额可能被并发
  // 请求短暂打到负值(下一次请求即被预检挡下),业务可接受、不回滚。
  // 关键不变量:每次 consume 恰好扣 amount 且恰好记一条流水,balance_after 与实际余额始终自洽(行锁保证)。
  async consume(userId: string, endpoint: string, amount = 1): Promise<number> {
    return this.dataSource.transaction(async (manager) => {
      const user = await this.lockUser(manager, userId);
      const balanceAfter = user.credit_balance - amount;
      await manager.update(User, { id: userId }, { credit_balance: balanceAfter });
      await manager.insert(CreditTransaction, {
        user_id: userId,
        delta: -amount,
        type: 'consume',
        balance_after: balanceAfter,
        note: null,
        created_by: null,
        endpoint,
      });
      return balanceAfter;
    });
  }

  // 余额预检:读当前余额是否 ≥ required(不扣点、不写流水)。供重端点(总额 > 1)在「接活前」
  // 校验余额是否够付总成本——CreditGuard 只能保证 ≥ 1,够付 1 点不代表够付 7 点。
  async hasBalance(userId: string, required: number): Promise<boolean> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: { id: true, credit_balance: true },
    });
    return !!user && user.credit_balance >= required;
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
