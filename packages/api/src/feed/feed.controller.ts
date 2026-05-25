import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FeedService } from './feed.service';
import { CreateFeedItemDto } from './dto/create-feed-item.dto';
import { FeedQueryDto } from './dto/feed-query.dto';
import { DigestGeneratorService } from './digest-generator.service';
import { SourceRegistryService } from './source-registry.service';

@Controller('feed')
@UseGuards(JwtAuthGuard)
export class FeedController {
  constructor(
    private readonly feed: FeedService,
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

  @Post('digest')
  async generateDigest() {
    const item = await this.digestGenerator.generateWeeklyDigest();
    return item;
  }
}
