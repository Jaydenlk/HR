import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
}
