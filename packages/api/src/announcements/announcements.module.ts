import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { AiModule } from '../ai/ai.module';
import { Announcement } from './entities/announcement.entity';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementGeneratorService } from './announcement-generator.service';
import { AnnouncementsController } from './announcements.controller';
import { AdminAnnouncementsController } from './admin-announcements.controller';
import { AdminGuard } from '../common/guards/admin.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Announcement]),
    // AdminGuard 依赖 UsersService 查库验 role。
    UsersModule,
    // AnnouncementGeneratorService 注入 AiService(AI 起草草稿)。
    AiModule,
  ],
  controllers: [AnnouncementsController, AdminAnnouncementsController],
  providers: [AnnouncementsService, AnnouncementGeneratorService, AdminGuard],
})
export class AnnouncementsModule {}
