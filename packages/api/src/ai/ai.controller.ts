import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ConcurrencyLimiter, QueueStatus } from './concurrency-limiter';

// AI 并发队列可见化:前端据此向用户提示"当前排队中,请稍候"。
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly limiter: ConcurrencyLimiter) {}

  @Get('queue-status')
  queueStatus(): QueueStatus {
    return this.limiter.status();
  }
}
