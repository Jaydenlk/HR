import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NetworkingService } from './networking.service';
import { NetworkingMessageDto } from './dto/networking-message.dto';
import { ReferralStrategyDto } from './dto/referral-strategy.dto';

@Controller('networking')
@UseGuards(JwtAuthGuard)
export class NetworkingController {
  constructor(private readonly networking: NetworkingService) {}

  @Post('message')
  writeMessage(@Body() dto: NetworkingMessageDto) {
    return this.networking.writeMessage(dto);
  }

  @Post('referral-strategy')
  analyzeReferralStrategy(@Body() dto: ReferralStrategyDto) {
    return this.networking.analyzeReferralStrategy(dto);
  }
}
