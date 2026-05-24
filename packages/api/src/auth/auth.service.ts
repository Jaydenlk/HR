import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private validCodes: string[];

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    this.validCodes = ['COACH2026'];
    const extra = this.config.get<string>('INVITE_CODES');
    if (extra) extra.split(',').forEach((c) => this.validCodes.push(c.trim()));
  }

  async login(dto: LoginDto) {
    if (!this.validCodes.includes(dto.invite_code)) {
      throw new UnauthorizedException('无效的邀请码');
    }
    const user = await this.users.findOrCreate(dto.email, dto.name, dto.invite_code);
    const token = this.jwt.sign({ sub: user.id, email: user.email });
    return { access_token: token, user };
  }

  async getProfile(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
