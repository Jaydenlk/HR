import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MockSession } from './entities/mock-session.entity';
import { MockController } from './mock.controller';
import { MockService } from './mock.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([MockSession]), AiModule],
  controllers: [MockController],
  providers: [MockService],
  exports: [MockService],
})
export class MockModule {}
