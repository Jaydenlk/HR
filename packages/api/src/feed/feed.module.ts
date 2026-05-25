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
import { FeedService } from './feed.service';
import { RssImporterService } from './importers/rss-importer.service';
import { WechatImporterService } from './importers/wechat-importer.service';
import { XhsImporterService } from './importers/xhs-importer.service';
import { DigestGeneratorService } from './digest-generator.service';
import { AiModule } from '../ai/ai.module';
import { SourceRegistryService } from './source-registry.service';
import { FeedClassifierService } from './feed-classifier.service';
import { FeedIngestionService } from './feed-ingestion.service';

@Module({
  imports: [TypeOrmModule.forFeature([FeedItem, FeedSource, DigestRun, Company, Department, RoleCategory, CoverageMetric]), AiModule],
  controllers: [FeedController],
  providers: [
    FeedService,
    RssImporterService,
    WechatImporterService,
    XhsImporterService,
    DigestGeneratorService,
    SourceRegistryService,
    FeedClassifierService,
    FeedIngestionService,
  ],
})
export class FeedModule {}
