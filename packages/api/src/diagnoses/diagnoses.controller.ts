import { Controller, Get, Post, Param, Body, Res, UseGuards, UseInterceptors } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreditGuard } from '../credit/credit.guard';
import { AiUsageInterceptor } from '../quota/ai-usage.interceptor';
import { CreditInterceptor } from '../credit/credit.interceptor';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DiagnosesService, DiagnosisStreamEvent } from './diagnoses.service';
import { CreateDiagnosisDto } from './dto/create-diagnosis.dto';
import { CreateCampusDiagnosisDto } from './dto/create-campus-diagnosis.dto';
import { DiagnosisResponseDto } from './dto/diagnosis-response.dto';
import {
  ProfessionPresetsService,
  ProfessionGroup,
} from '../profession-presets/profession-presets.service';

@Controller('diagnoses')
@UseGuards(JwtAuthGuard)
export class DiagnosesController {
  constructor(
    private readonly diagnoses: DiagnosesService,
    private readonly presets: ProfessionPresetsService,
  ) {}

  @Get('campus/professions')
  campusProfessions(): ProfessionGroup[] {
    return this.presets.list();
  }

  @Post()
  @UseGuards(CreditGuard)
  @UseInterceptors(AiUsageInterceptor, CreditInterceptor)
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateDiagnosisDto,
  ) {
    return this.diagnoses.create(user.id, dto);
  }

  @Post('campus')
  @UseGuards(CreditGuard)
  @UseInterceptors(AiUsageInterceptor, CreditInterceptor)
  createCampus(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateCampusDiagnosisDto,
  ) {
    return this.diagnoses.createProfessionStandard(user.id, dto);
  }

  // SSE 流式诊断。CreditGuard 前置校验余额(<1 → 402);记账(扣点 + ai_usage)由 service 在流水线成功后
  // 手动执行,故此处不挂 CreditInterceptor / AiUsageInterceptor(拦截器在响应 observable 完成时记账,
  // 无法表达「流中断/排队满不记」)。对齐 conversations 的流式扣费时机。
  @Post('campus/stream')
  @UseGuards(CreditGuard)
  streamCampus(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateCampusDiagnosisDto,
    @Res() res: Response,
  ): Promise<void> {
    return this.pipeSse(
      res,
      this.diagnoses.streamCreateProfessionStandard(
        user.id,
        dto,
        '/api/diagnoses/campus/stream',
      ),
    );
  }

  @Post('stream')
  @UseGuards(CreditGuard)
  streamJd(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateDiagnosisDto,
    @Res() res: Response,
  ): Promise<void> {
    return this.pipeSse(
      res,
      this.diagnoses.streamCreate(user.id, dto, '/api/diagnoses/stream'),
    );
  }

  // SSE 帧转发(对齐 conversations 流式端点写法):@Res() 接管响应 → 显式 200(成败都用 data 帧表达,不靠状态码)
  // → 关缓冲冲刷头 → 逐帧 `data: {json}\n\n`。诊断流水线在 service 里作为独立后台任务运行,不绑定本连接生命周期:
  // 客户端断开只是停止转发,DB 落库照常跑完,结果永不丢。
  private async pipeSse(
    res: Response,
    stream: AsyncIterable<DiagnosisStreamEvent>,
  ): Promise<void> {
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    let closed = false;
    res.on('close', () => {
      closed = true;
    });

    try {
      for await (const event of stream) {
        if (closed) break; // 客户端已断开:停止转发,后台流水线仍跑完落库。
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } finally {
      if (!closed) res.end();
    }
  }

  @Get()
  async findAll(
    @CurrentUser() user: { id: string },
  ): Promise<DiagnosisResponseDto[]> {
    const list = await this.diagnoses.findAllByUser(user.id);
    return list.map(DiagnosisResponseDto.fromEntity);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ): Promise<DiagnosisResponseDto> {
    const diagnosis = await this.diagnoses.findOne(id, user.id);
    return DiagnosisResponseDto.fromEntity(diagnosis);
  }
}
