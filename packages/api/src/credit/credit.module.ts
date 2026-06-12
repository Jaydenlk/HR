import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { CreditTransaction } from './entities/credit-transaction.entity';
import { CreditService } from './credit.service';
import { CreditGuard } from './credit.guard';
import { CreditInterceptor } from './credit.interceptor';

// 替代 QuotaModule:各 AI 控制器所在 feature module 需 import 本模块,
// 这样 @UseGuards(CreditGuard)/@UseInterceptors(CreditInterceptor) 引用类时,
// NestJS 能在宿主控制器所在模块的注入器里解析到本模块导出的单例(及其依赖)。
// 故必须 re-export TypeOrmModule.forFeature([User, CreditTransaction]):
// CreditGuard 依赖 UserRepository、CreditInterceptor→CreditService 依赖 CreditTransactionRepository,
// 这些仓库必须在导入方注入器内可解析。
// CreditService 同时供 auth(注册赠送)/users(/me 流水)/admin(充值)注入,一并导出。
@Module({
  imports: [TypeOrmModule.forFeature([User, CreditTransaction])],
  providers: [CreditService, CreditGuard, CreditInterceptor],
  exports: [CreditService, CreditGuard, CreditInterceptor, TypeOrmModule],
})
export class CreditModule {}
