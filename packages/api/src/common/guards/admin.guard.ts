import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UsersService } from '../../users/users.service';

// 挂在 JwtAuthGuard 之后:依赖 request.user.id 已被 passport 填充。
// 用 req.user.id 查库验 role==='admin',否则 403。每请求查库(主键),保证封禁/降级即时生效。
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly users: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: { id?: string } }>();
    const userId = request.user?.id;
    if (!userId) {
      throw new ForbiddenException('无管理员权限');
    }
    const user = await this.users.findById(userId);
    if (!user || user.role !== 'admin') {
      throw new ForbiddenException('无管理员权限');
    }
    return true;
  }
}
