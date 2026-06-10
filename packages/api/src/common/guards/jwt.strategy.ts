import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_SECRET', 'dev-secret'),
    });
  }

  // 每请求查库取 user(主键查询,可接受的成本)并检查封禁状态,使封禁即时生效:
  // 改 status='banned' 后,已签发的 JWT 立即失效。返回 {id,email} 形状保持兼容。
  async validate(payload: { sub: string; email: string }): Promise<{ id: string; email: string }> {
    const user = await this.users.findById(payload.sub);
    if (!user || user.status === 'banned') {
      throw new UnauthorizedException('账号已被停用');
    }
    return { id: user.id, email: user.email };
  }
}
