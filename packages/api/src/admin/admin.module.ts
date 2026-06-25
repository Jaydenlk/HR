import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { InvitesModule } from '../invites/invites.module';
import { CreditModule } from '../credit/credit.module';
import { OpsEventsModule } from '../ops/ops-events.module';
import { AiModule } from '../ai/ai.module';
import { HealthModule } from '../health/health.module';
import { AiUsage } from '../quota/entities/ai-usage.entity';
import { CreditTransaction } from '../credit/entities/credit-transaction.entity';
import { Diagnosis } from '../diagnoses/entities/diagnosis.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminDetailService } from './admin-detail.service';
import { AbReportReaderService } from './ab-report-reader.service';
import { AdminGuard } from '../common/guards/admin.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([AiUsage, CreditTransaction, Diagnosis]),
    UsersModule,
    InvitesModule,
    CreditModule,
    OpsEventsModule,
    AiModule,
    HealthModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminDetailService, AbReportReaderService, AdminGuard],
})
export class AdminModule {}
