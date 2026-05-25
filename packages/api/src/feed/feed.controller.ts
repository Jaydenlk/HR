import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FeedService } from './feed.service';
import { CreateFeedItemDto } from './dto/create-feed-item.dto';
import { FeedQueryDto } from './dto/feed-query.dto';
import { GithubImporterService } from './importers/github-importer.service';
import { RssImporterService } from './importers/rss-importer.service';
import { XhsImporterService } from './importers/xhs-importer.service';
import { DigestGeneratorService } from './digest-generator.service';
import { SourceRegistryService } from './source-registry.service';

@Controller('feed')
@UseGuards(JwtAuthGuard)
export class FeedController {
  constructor(
    private readonly feed: FeedService,
    private readonly githubImporter: GithubImporterService,
    private readonly rssImporter: RssImporterService,
    private readonly xhsImporter: XhsImporterService,
    private readonly digestGenerator: DigestGeneratorService,
    private readonly sources: SourceRegistryService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateFeedItemDto,
  ) {
    return this.feed.create(user.id, dto);
  }

  @Get()
  findAll(@Query() query: FeedQueryDto) {
    return this.feed.findAll(query);
  }

  @Get('sources')
  findSources() {
    return this.sources.findAll();
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.feed.remove(id, user.id);
  }

  @Post('import/github')
  async importGitHub() {
    const count = await this.githubImporter.importFromGitHub();
    return { imported: count, source: 'github' };
  }

  @Post('import/rss')
  async importRSS() {
    const count = await this.rssImporter.importFromRSS();
    return { imported: count, source: 'rss' };
  }

  @Post('import/xhs')
  async importXhs(@Query('keyword') keyword?: string) {
    return this.xhsImporter.importFromXhs(keyword);
  }

  @Post('digest')
  async generateDigest() {
    const item = await this.digestGenerator.generateWeeklyDigest();
    return item;
  }
}
