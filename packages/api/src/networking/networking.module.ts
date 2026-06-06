import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { NetworkingController } from './networking.controller';
import { NetworkingService } from './networking.service';

@Module({
  imports: [AiModule],
  controllers: [NetworkingController],
  providers: [NetworkingService],
})
export class NetworkingModule {}
