import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { InvitesModule } from '../invites/invites.module';
import { CreditModule } from '../credit/credit.module';
import { AiUsage } from '../quota/entities/ai-usage.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from '../common/guards/admin.guard';

@Module({
  imports: [TypeOrmModule.forFeature([AiUsage]), UsersModule, InvitesModule, CreditModule],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
})
export class AdminModule {}
