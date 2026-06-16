import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { Announcement } from './entities/announcement.entity';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementsController } from './announcements.controller';
import { AdminAnnouncementsController } from './admin-announcements.controller';
import { AdminGuard } from '../common/guards/admin.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Announcement]),
    // AdminGuard 依赖 UsersService 查库验 role。
    UsersModule,
  ],
  controllers: [AnnouncementsController, AdminAnnouncementsController],
  providers: [AnnouncementsService, AdminGuard],
})
export class AnnouncementsModule {}
