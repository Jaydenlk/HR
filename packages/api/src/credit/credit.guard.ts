import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

// 放在 JwtAuthGuard 之后:依赖 request.user 已被 passport 填充。
// 余额 < 1 → 402(区别于限流的 429,便于前端区分「没点」与「限流」),body message 为充值提示。
@Injectable()
export class CreditGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: { id?: string } }>();
    const userId = request.user?.id;
    // 未认证:理论上 JwtAuthGuard 已拦截,但防御性兜底——不依赖上游守卫的隐式假设。
    if (!userId) {
      throw new UnauthorizedException();
    }

    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: { id: true, credit_balance: true },
    });

    if (!user || user.credit_balance < 1) {
      throw new HttpException(
        { message: '点数不足，请联系管理员充值' },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return true;
  }
}
