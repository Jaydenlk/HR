import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreditGuard } from '../credit/credit.guard';
import { AiUsageInterceptor } from '../quota/ai-usage.interceptor';
import { CreditInterceptor } from '../credit/credit.interceptor';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { InterviewsService } from './interviews.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';
import { TranscribeInterviewDto } from '../speech/dto/transcribe-interview.dto';
import { ConfirmLabelsDto } from '../speech/dto/confirm-labels.dto';

// 上传音频上限:与 speech.config 同口径(AUDIO_MAX_SIZE_MB,缺省 25)。FileInterceptor 的 limits
// 在装饰阶段求值(静态),故此处直接读 env;超限由 multer 拦截返回 413,不进 service。
const AUDIO_MAX_BYTES =
  Math.max(1, Number(process.env.AUDIO_MAX_SIZE_MB) || 25) * 1024 * 1024;

// 仅接受音频:fileFilter 在 multer 层拒非 audio/* 类型(后端为真正 guard,不依赖前端 accept)。
function audioFileFilter(
  _req: unknown,
  file: { mimetype: string },
  cb: (error: Error | null, acceptFile: boolean) => void,
): void {
  if (file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new BadRequestException('仅支持上传音频文件（MP3 / WAV / M4A / OGG / AAC 等）'), false);
  }
}

@Controller('interviews')
@UseGuards(JwtAuthGuard)
export class InterviewsController {
  constructor(private readonly interviews: InterviewsService) {}

  // 无 transcript 的草稿也计 1 次 AI 配额——试运行防滥用优先于精确计量,与 opportunity create 同语义
  @Post()
  @UseGuards(CreditGuard)
  @UseInterceptors(AiUsageInterceptor, CreditInterceptor)
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateInterviewDto,
  ) {
    return this.interviews.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: { id: string }) {
    return this.interviews.findAllByUser(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.interviews.findOne(id, user.id);
  }

  // 纯元数据 PATCH 也计 1 次 AI 配额——试运行防滥用优先于精确计量,与 opportunity create 同语义
  @Patch(':id')
  @UseGuards(CreditGuard)
  @UseInterceptors(AiUsageInterceptor, CreditInterceptor)
  update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateInterviewDto,
  ) {
    return this.interviews.update(id, user.id, dto);
  }

  // IMPORTANT: /:id/analyze must be defined BEFORE generic /:id routes
  @Post(':id/analyze')
  @UseGuards(CreditGuard)
  @UseInterceptors(AiUsageInterceptor, CreditInterceptor)
  analyze(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.interviews.analyze(id, user.id);
  }

  // ── 扫码上传(手机端录音直传)──────────────────────────────────────────────────
  // 电脑端已登录用户为自己的某个 interview 签发 scoped 一次性令牌(10 分钟),返回 token + /upload/<token>
  // 链接;前端编成二维码,手机扫码打开豁免页直传音频。归属校验在 service(findOne)兜住:
  // 非本人 / 不存在的 interview → 404,绝不为越权请求发令牌。
  // IMPORTANT: 必须定义在通用 /:id 路由之前。
  @Post(':id/upload-token')
  issueUploadToken(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.interviews.issueUploadToken(id, user.id);
  }

  // ── 录音转写(StepFun ASR + LLM 角色打标)──────────────────────────────────────
  // 上传音频 → 立即建 task 返回 taskId(202,不阻塞)→ 后台跑转写+打标 → 落 awaiting_confirm。
  // consent 必须 'true'(@IsIn 硬校验,缺/非 true → 400 不进流程)。
  //
  // 计费不走 CreditInterceptor:本端点 fire-and-forget,handler 立即 resolve(202)→ 拦截器会
  // 在 ASR/LLM 真正完成前就扣点,违反"失败不计费"。故移除 CreditInterceptor/AiUsageInterceptor,
  // 改由后台任务在转写+打标"真实成功"(落 awaiting_confirm)时由 service 扣【转写费 1 点】+ 记 ai_usage
  //(按进度分两段计费:转写 1 点在此扣,分析 6 点由 confirm 在 chargeAnalysis 扣,合计 7 点,不双扣);
  // 任一阶段失败标 task=failed 且不扣对应点。
  // 双重预检:CreditGuard 保留作 ≥1 廉价快路;service.transcribe 接活前再校验余额 ≥7(整条复盘付得起,不足 402 且不建任务)。
  @Post(':id/transcribe')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(CreditGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: AUDIO_MAX_BYTES },
      fileFilter: audioFileFilter,
    }),
  )
  transcribe(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    // DTO 校验 consent='true'(multipart 非文件字段);file 由 multer 注入。
    @Body() _dto: TranscribeInterviewDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('请上传音频文件');
    }
    // 捕获上传元数据(文件名/字节数/MIME,非音频内容)供桌面端「已收到上传」回执展示。
    return this.interviews.transcribe(id, user.id, file.buffer, file.mimetype, {
      originalFilename: file.originalname,
      fileSizeBytes: file.size,
      mimeType: file.mimetype,
    });
  }

  // 轮询任务状态 + 标注结果。只读不计费,仅 JwtAuthGuard。
  @Get(':id/transcribe/status')
  transcribeStatus(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.interviews.getTranscribeStatus(id, user.id);
  }

  // 删除某条转写任务(失败态恢复:重新上传/删除记录)。严格双重所有权(任务∈面试 ∧ 面试∈用户),
  // 否则 404。硬删任务行;204 无响应体。类级 JwtAuthGuard 已兜鉴权(无 token → 401)。
  // IMPORTANT: 必须定义在通用 @Delete(':id') 之前,否则 :id 会吞掉本路由(具体路由在前的既有约定)。
  @Delete(':id/transcribe/:taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTranscribeTask(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.interviews.deleteTranscribeTask(id, taskId, user.id);
  }

  // 提交纠正后的角色标注 → 触发 analyze。
  // 计 credit 由 service 内 chargeAnalysis 处理(分析真实成功落 completed 时扣【分析费 6 点】,
  // 幂等 CAS 防并发/重试双扣);转写费 1 点已在 transcribe 阶段扣过,一次复盘合计 7 点(1+6)。
  // 故此处【不挂 CreditInterceptor】:拦截器会在 confirm 一律扣点,与 service 内的分析费叠加 → 真双扣;
  // 也【不挂 CreditGuard】:用户付完转写费后余额可能为 0,不应被 ≥1 预检误挡(分析费允许临时负余额,充值即恢复)。
  // 保留 AiUsageInterceptor:ai_usage 仅作运营计数(不影响 credit 总额),analyze 成功记一条。
  @Patch(':id/transcribe/:taskId/confirm')
  @UseInterceptors(AiUsageInterceptor)
  confirmTranscribe(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: ConfirmLabelsDto,
  ) {
    return this.interviews.confirmTranscribe(id, taskId, user.id, dto.segments);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.interviews.remove(id, user.id);
  }
}
