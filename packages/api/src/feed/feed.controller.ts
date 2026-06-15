import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CreditGuard } from '../credit/credit.guard';
import { AiUsageInterceptor } from '../quota/ai-usage.interceptor';
import { CreditInterceptor } from '../credit/credit.interceptor';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FeedService } from './feed.service';
import { CreateFeedItemDto } from './dto/create-feed-item.dto';
import { FeedQueryDto } from './dto/feed-query.dto';
import { ImportFeedDto } from './dto/import-feed.dto';
import { DigestGeneratorService } from './digest-generator.service';
import { SourceRegistryService } from './source-registry.service';
import { FeedIngestionService } from './feed-ingestion.service';

@Controller('feed')
@UseGuards(JwtAuthGuard)
export class FeedController {
  constructor(
    private readonly feed: FeedService,
    private readonly digestGenerator: DigestGeneratorService,
    private readonly sources: SourceRegistryService,
    private readonly ingestion: FeedIngestionService,
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

  @Get('runs')
  findRuns() {
    return this.ingestion.findRuns();
  }

  @Post('import')
  @UseGuards(AdminGuard, CreditGuard)
  @UseInterceptors(AiUsageInterceptor, CreditInterceptor)
  import(@Body() dto: ImportFeedDto) {
    return this.ingestion.import(dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.feed.remove(id, user.id);
  }

  @Post('digest')
  @UseGuards(AdminGuard, CreditGuard)
  @UseInterceptors(AiUsageInterceptor, CreditInterceptor)
  async generateDigest() {
    const item = await this.digestGenerator.generateWeeklyDigest();
    return item;
  }
}
