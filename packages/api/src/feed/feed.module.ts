import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedItem } from './entities/feed-item.entity';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';

@Module({
  imports: [TypeOrmModule.forFeature([FeedItem])],
  controllers: [FeedController],
  providers: [FeedService],
})
export class FeedModule {}
