import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DigestRun } from './entities/digest-run.entity';
import { FeedItem } from './entities/feed-item.entity';
import { FeedSource } from './entities/feed-source.entity';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { RssImporterService } from './importers/rss-importer.service';
import { XhsImporterService } from './importers/xhs-importer.service';
import { DigestGeneratorService } from './digest-generator.service';
import { AiModule } from '../ai/ai.module';
import { SourceRegistryService } from './source-registry.service';
import { FeedClassifierService } from './feed-classifier.service';
import { FeedIngestionService } from './feed-ingestion.service';

@Module({
  imports: [TypeOrmModule.forFeature([FeedItem, FeedSource, DigestRun]), AiModule],
  controllers: [FeedController],
  providers: [
    FeedService,
    RssImporterService,
    XhsImporterService,
    DigestGeneratorService,
    SourceRegistryService,
    FeedClassifierService,
    FeedIngestionService,
  ],
})
export class FeedModule {}
