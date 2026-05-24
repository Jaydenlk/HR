import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedItem } from './entities/feed-item.entity';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { GithubImporterService } from './importers/github-importer.service';
import { RssImporterService } from './importers/rss-importer.service';
import { DigestGeneratorService } from './digest-generator.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([FeedItem]), AiModule],
  controllers: [FeedController],
  providers: [FeedService, GithubImporterService, RssImporterService, DigestGeneratorService],
})
export class FeedModule {}
