import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DigestRun } from './entities/digest-run.entity';
import { FeedItem } from './entities/feed-item.entity';
import { FeedSource } from './entities/feed-source.entity';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { GithubImporterService } from './importers/github-importer.service';
import { RssImporterService } from './importers/rss-importer.service';
import { XhsImporterService } from './importers/xhs-importer.service';
import { DigestGeneratorService } from './digest-generator.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([FeedItem, FeedSource, DigestRun]), AiModule],
  controllers: [FeedController],
  providers: [
    FeedService,
    GithubImporterService,
    RssImporterService,
    XhsImporterService,
    DigestGeneratorService,
  ],
})
export class FeedModule {}
