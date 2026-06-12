import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DigestRun } from './entities/digest-run.entity';
import { FeedItem } from './entities/feed-item.entity';
import { FeedSource } from './entities/feed-source.entity';
import { Company } from './entities/company.entity';
import { Department } from './entities/department.entity';
import { RoleCategory } from './entities/role-category.entity';
import { CoverageMetric } from './entities/coverage-metric.entity';
import { FeedController } from './feed.controller';
import { NewspaperController } from './newspaper.controller';
import { FeedService } from './feed.service';
import { NewspaperService } from './newspaper.service';
import { RssImporterService } from './importers/rss-importer.service';
import { WechatImporterService } from './importers/wechat-importer.service';
import { XhsImporterService } from './importers/xhs-importer.service';
import { DigestGeneratorService } from './digest-generator.service';
import { AiModule } from '../ai/ai.module';
import { IntelligenceModule } from '../intelligence/intelligence.module';
import { QuotaModule } from '../quota/quota.module';
import { CreditModule } from '../credit/credit.module';
import { SourceRegistryService } from './source-registry.service';
import { FeedClassifierService } from './feed-classifier.service';
import { FeedIngestionService } from './feed-ingestion.service';
import { CompanyRegistryService } from './company-registry.service';
import { SearchSchedulerService } from './search-scheduler.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FeedItem, FeedSource, DigestRun, Company, Department, RoleCategory, CoverageMetric,
    ]),
    AiModule,
    IntelligenceModule,
    QuotaModule,
    CreditModule,
  ],
  controllers: [FeedController, NewspaperController],
  providers: [
    FeedService,
    NewspaperService,
    RssImporterService,
    WechatImporterService,
    XhsImporterService,
    DigestGeneratorService,
    SourceRegistryService,
    FeedClassifierService,
    FeedIngestionService,
    CompanyRegistryService,
    SearchSchedulerService,
  ],
})
export class FeedModule {}
