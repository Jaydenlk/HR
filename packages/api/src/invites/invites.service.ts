import { ConflictException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { InviteCode } from './entities/invite-code.entity';

// 随机邀请码字符集:去掉易混字符(0/O/1/I),大写字母+数字。
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

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

  // 管理后台:全部邀请码,新建在前。
  findAll(): Promise<InviteCode[]> {
    return this.repo.find({ order: { created_at: 'DESC' } });
  }

  // 管理后台:创建邀请码。code 不传则生成随机 8 位(大写字母+数字)。
  async create(code: string | undefined, maxUses: number): Promise<InviteCode> {
    const finalCode = code?.trim() ? code.trim().toUpperCase() : this.randomCode();
    const existing = await this.repo.findOneBy({ code: finalCode });
    if (existing) {
      throw new ConflictException('邀请码已存在');
    }
    return this.repo.save(this.repo.create({ code: finalCode, max_uses: maxUses }));
  }

  // 管理后台:停用/启用邀请码。
  async setDisabled(id: string, disabled: boolean): Promise<InviteCode | null> {
    await this.repo.update({ id }, { disabled });
    return this.repo.findOneBy({ id });
  }

  // 随机 8 位邀请码。
  private randomCode(): string {
    const bytes = randomBytes(8);
    let out = '';
    for (let i = 0; i < 8; i++) {
      out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    }
    return out;
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
