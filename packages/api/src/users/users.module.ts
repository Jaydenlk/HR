import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import { CreditModule } from '../credit/credit.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), CreditModule, FilesModule],
  controllers: [MeController],
  providers: [UsersService, MeService],
  exports: [UsersService],
})
export class UsersModule {}
