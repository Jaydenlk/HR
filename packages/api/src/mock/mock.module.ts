import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MockSession } from './entities/mock-session.entity';
import { MockController } from './mock.controller';
import { MockService } from './mock.service';
import { AiModule } from '../ai/ai.module';
import { QuotaModule } from '../quota/quota.module';
import { CreditModule } from '../credit/credit.module';

@Module({
  imports: [TypeOrmModule.forFeature([MockSession]), AiModule, QuotaModule, CreditModule],
  controllers: [MockController],
  providers: [MockService],
  exports: [MockService],
})
export class MockModule {}
