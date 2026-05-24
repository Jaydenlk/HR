import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FeedService } from './feed.service';
import { CreateFeedItemDto } from './dto/create-feed-item.dto';

@Controller('feed')
@UseGuards(JwtAuthGuard)
export class FeedController {
  constructor(private readonly feed: FeedService) {}

  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateFeedItemDto,
  ) {
    return this.feed.create(user.id, dto);
  }

  @Get()
  findAll() {
    return this.feed.findAll();
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.feed.remove(id, user.id);
  }
}
