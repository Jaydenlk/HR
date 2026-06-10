import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InviteCode } from './entities/invite-code.entity';
import { InvitesService } from './invites.service';

@Module({
  imports: [TypeOrmModule.forFeature([InviteCode])],
  providers: [InvitesService],
  exports: [InvitesService],
})
export class InvitesModule {}
