import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  findById(id: string): Promise<User | null> {
    return this.repo.findOneBy({ id });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOneBy({ email: email.trim().toLowerCase() });
  }

  // 注册新用户(首次登录):记录注册所用邀请码;命中 ADMIN_EMAILS → role=admin。
  createUser(email: string, name: string, inviteCode: string, isAdmin: boolean): Promise<User> {
    const user = this.repo.create({
      email: email.trim().toLowerCase(),
      name: name.trim(),
      invite_code: inviteCode,
      role: isAdmin ? 'admin' : 'user',
    });
    return this.repo.save(user);
  }

  // 老用户登录:命中 ADMIN_EMAILS 则补提升为 admin(幂等)。返回最新记录。
  async promoteIfAdmin(user: User, isAdmin: boolean): Promise<User> {
    if (isAdmin && user.role !== 'admin') {
      user.role = 'admin';
      return this.repo.save(user);
    }
    return user;
  }

  // 登录成功落盘:最近登录 IP/离线归属省市/时间。
  // terms_agreed_at 带 IsNull 条件单独更新:仅首次写入,已有值绝不覆盖。
  async recordLogin(
    id: string,
    ip: string | null,
    province: string | null,
    city: string | null,
  ): Promise<void> {
    await this.repo.update(
      { id },
      {
        last_login_ip: ip,
        last_login_province: province,
        last_login_city: city,
        last_login_at: new Date(),
      },
    );
    await this.repo.update({ id, terms_agreed_at: IsNull() }, { terms_agreed_at: new Date() });
  }

  // 更新用户头像:存调用方传入的可访问路径(如 /files/download/avatars/xxx.png)。
  async updateAvatar(id: string, avatarKey: string): Promise<void> {
    await this.repo.update({ id }, { avatar_url: avatarKey });
  }

  // 管理后台:全量用户(20 人规模不分页)。
  findAll(): Promise<User[]> {
    return this.repo.find({ order: { created_at: 'ASC' } });
  }

  // 管理后台:按主键更新 status/role(由 controller 校验字段与自操作约束)。
  async updateById(
    id: string,
    patch: Partial<Pick<User, 'status' | 'role'>>,
  ): Promise<User | null> {
    await this.repo.update({ id }, patch);
    return this.findById(id);
  }
}
