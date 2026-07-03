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
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateDiagnosisDto,
  ): Promise<DiagnosisResponseDto> {
    // 过 DTO 白名单投影:与 GET 同口径,不把 failure_reason/pipeline_error_message 随实体返裸。
    const diagnosis = await this.diagnoses.create(user.id, dto);
    return DiagnosisResponseDto.fromEntity(diagnosis);
  }

  @Post('campus')
  @UseGuards(CreditGuard)
  @UseInterceptors(AiUsageInterceptor, CreditInterceptor)
  async createCampus(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateCampusDiagnosisDto,
  ): Promise<DiagnosisResponseDto> {
    const diagnosis = await this.diagnoses.createProfessionStandard(user.id, dto);
    return DiagnosisResponseDto.fromEntity(diagnosis);
  }

  // SSE 流式诊断。CreditGuard 前置校验余额(<1 → 402);记账(扣点 + ai_usage)由 service 在流水线成功后
  // 手动执行,故此处不挂 CreditInterceptor / AiUsageInterceptor(拦截器在响应 observable 完成时记账,
  // 无法表达「流中断/排队满不记」)。对齐 conversations 的流式扣费时机。
  @Post('campus/stream')
  @UseGuards(CreditGuard)
  async streamCampus(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateCampusDiagnosisDto,
    @Res() res: Response,
  ): Promise<void> {
    // 防重复(S0):同用户同 mode 已有未超时进行中诊断 → 409 携带其 id(前端转入「进行中」视图,不重复发起/扣费)。
    // reserveRunningSlot 在进程内 per-(user,mode) 串行锁下原子完成「查冲突(内含惰性判死)→ 落 running 行」,
    // 关闭并发发起的原子性空档:两个几乎同时的请求经此串行,第二个必命中 409、不再各自建行/各自扣费。
    // 无冲突时已落库的 running 行 id 透传给 streamCreate,后台流水线复用该行、不二次插入。
    const reserved = await this.diagnoses.reserveRunningSlot(
      user.id,
      'profession_standard',
      dto.resume_id,
    );
    if ('conflict' in reserved) {
      res.status(409).json({
        diagnosisId: reserved.conflict.id,
        message: '你已有一个校招诊断正在进行中,请等待其完成后再发起。',
      });
      return;
    }
    return this.pipeSse(
      res,
      this.diagnoses.streamCreateProfessionStandard(
        user.id,
        dto,
        '/api/diagnoses/campus/stream',
        reserved,
      ),
    );
  }

  @Post('stream')
  @UseGuards(CreditGuard)
  async streamJd(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateDiagnosisDto,
    @Res() res: Response,
  ): Promise<void> {
    // 防重复(S0):见 streamCampus 注释——reserveRunningSlot 原子「查冲突 → 落 running 行」,关闭并发空档。
    const reserved = await this.diagnoses.reserveRunningSlot(user.id, 'jd_match', dto.resume_id);
    if ('conflict' in reserved) {
      res.status(409).json({
        diagnosisId: reserved.conflict.id,
        message: '你已有一个诊断正在进行中,请等待其完成后再发起。',
      });
      return;
    }
    return this.pipeSse(
      res,
      this.diagnoses.streamCreate(user.id, dto, '/api/diagnoses/stream', reserved),
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
