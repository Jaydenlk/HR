import { Controller, Post, Body, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { QuotaGuard } from '../quota/quota.guard';
import { AiUsageInterceptor } from '../quota/ai-usage.interceptor';
import { NetworkingService } from './networking.service';
import { NetworkingMessageDto } from './dto/networking-message.dto';
import { ReferralStrategyDto } from './dto/referral-strategy.dto';

// 2 个端点全为 AI;Jwt 先行(填充 request.user)再 Quota 计数,顺序由数组决定。
@Controller('networking')
@UseGuards(JwtAuthGuard, QuotaGuard)
@UseInterceptors(AiUsageInterceptor)
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
