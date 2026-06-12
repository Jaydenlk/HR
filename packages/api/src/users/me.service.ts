import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreditService } from '../credit/credit.service';
import { FilesService } from '../files/files.service';
import { MeProfileDto, toMeProfile } from './dto/me-profile.dto';

const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2MB
const AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// /me 端点的业务编排:基本信息 + credit 余额、credit 流水分页、头像上传更新。
@Injectable()
export class MeService {
  constructor(
    private readonly users: UsersService,
    private readonly credit: CreditService,
    private readonly files: FilesService,
  ) {}

  async getProfile(userId: string): Promise<MeProfileDto> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    return toMeProfile(user);
  }

  // credit 流水倒序分页;只暴露对外字段(不含 created_by/user_id)。
  async listCredits(userId: string, limit = 20, offset = 0) {
    const { items, total } = await this.credit.listTransactions(userId, limit, offset);
    return {
      items: items.map((t) => ({
        id: t.id,
        delta: t.delta,
        type: t.type,
        balance_after: t.balance_after,
        note: t.note,
        endpoint: t.endpoint,
        created_at: t.created_at,
      })),
      total,
    };
  }

  // 头像上传:限 2MB、仅 jpeg/png/webp;复用 FilesService.upload(file,'avatars'),更新 users.avatar_url。
  // avatar_url 存上传返回的 key(对齐简历 file_url 现行模式),返回该 key。
  async updateAvatar(userId: string, file: Express.Multer.File | undefined): Promise<{ avatar_url: string }> {
    if (!file) {
      throw new BadRequestException('请上传头像文件(字段名 file)');
    }
    if (file.size > AVATAR_MAX_BYTES) {
      throw new BadRequestException('头像不能超过 2MB');
    }
    if (!AVATAR_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('头像仅支持 JPEG / PNG / WebP');
    }
    const key = await this.files.upload(file, 'avatars');
    await this.users.updateAvatar(userId, key);
    return { avatar_url: key };
  }
}
