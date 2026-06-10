import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InviteCode } from './entities/invite-code.entity';

@Injectable()
export class InvitesService implements OnModuleInit {
  private readonly logger = new Logger(InvitesService.name);

  constructor(
    @InjectRepository(InviteCode) private readonly repo: Repository<InviteCode>,
    private readonly config: ConfigService,
  ) {}

  // 启动引导:非 production 且邀请码表为空 → seed 一条 COACH2026。
  // production 不自动 seed(运营经管理后台/seed 发码)。
  async onModuleInit(): Promise<void> {
    if (this.config.get<string>('NODE_ENV') === 'production') return;
    const count = await this.repo.count();
    if (count > 0) return;
    await this.repo.save(
      this.repo.create({ code: 'COACH2026', max_uses: 100000, note: 'dev bootstrap' }),
    );
    this.logger.log('已 seed 开发引导邀请码 COACH2026(max_uses=100000)');
  }

  // 原子消费一次邀请码:仅当未停用且未超额时 used_count+1。
  // 返回 true 表示消费成功。用条件 UPDATE 防并发超额。
  async consume(code: string): Promise<boolean> {
    const result = await this.repo
      .createQueryBuilder()
      .update(InviteCode)
      .set({ used_count: () => 'used_count + 1' })
      .where('code = :code', { code: code.trim() })
      .andWhere('disabled = :disabled', { disabled: false })
      .andWhere('used_count < max_uses')
      .execute();
    return (result.affected ?? 0) > 0;
  }
}
