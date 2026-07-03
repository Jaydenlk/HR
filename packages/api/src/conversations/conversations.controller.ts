import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Res,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreditGuard } from '../credit/credit.guard';
import { AiUsageInterceptor } from '../quota/ai-usage.interceptor';
import { CreditInterceptor } from '../credit/credit.interceptor';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateConversationDto,
  ) {
    return this.conversations.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: { id: string }) {
    return this.conversations.findAllByUser(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.conversations.findOne(id, user.id);
  }

  @Post(':id/messages')
  @UseGuards(CreditGuard)
  @UseInterceptors(AiUsageInterceptor, CreditInterceptor)
  sendMessage(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: SendMessageDto,
  ) {
    return this.conversations.sendMessage(id, user.id, dto.content);
  }

  // SSE 流式聊天。CreditGuard 前置校验余额(<1 → 402);记账由 service 在流完成后手动扣点,
  // 故此处不挂 CreditInterceptor(拦截器在响应 observable 完成时扣点,无法表达「流中断不扣」)。
  // AiUsageInterceptor 同理跳过:流式 service 内部已完整处理生命周期。
  @Post(':id/messages/stream')
  @UseGuards(CreditGuard)
  async streamMessage(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: SendMessageDto,
    @Res() res: Response,
  ): Promise<void> {
    // @Res() 接管响应:POST 默认 201,SSE 显式置 200(成败都用 data 事件帧表达,不靠状态码)。
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    // 反代/浏览器缓冲会让 SSE 攒批、延迟到达;关闭 nginx 类缓冲并立即冲刷响应头。
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const write = (event: unknown): void => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    // 断开只停转发,不取消生成(对齐诊断解耦哲学):客户端断开仅置 closed=true 停止 write;
    // service 后台任务继续把 AI 流完整消费并落库/扣费。拆掉了此前 res.on('close')→abort.abort() 联动,
    // 后者会真正中止上游生成、丢掉整条回复。findOne 越权/不存在等错误现由 service 以 error 事件推送。
    let closed = false;
    res.on('close', () => {
      closed = true;
    });

    try {
      for await (const event of this.conversations.streamMessage(
        id,
        user.id,
        dto.content,
        '/api/conversations/:id/messages/stream',
      )) {
        if (closed) break; // 客户端已断开:停止转发,后台任务仍跑完落库。
        write(event);
      }
    } finally {
      if (!closed) res.end();
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.conversations.remove(id, user.id);
  }
}
