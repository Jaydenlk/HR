import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MockSession } from './entities/mock-session.entity';
import { MockController } from './mock.controller';
import { MockService } from './mock.service';
import { CompanySearchService } from './company-search.service';
import { AiModule } from '../ai/ai.module';
import { QuotaModule } from '../quota/quota.module';
import { CreditModule } from '../credit/credit.module';
import { FeedModule } from '../feed/feed.module';

@Module({
  imports: [TypeOrmModule.forFeature([MockSession]), AiModule, QuotaModule, CreditModule, FeedModule],
  controllers: [MockController],
  providers: [MockService, CompanySearchService],
  exports: [MockService],
})
export class MockModule {}
