import {
  Controller,
  Post,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InterviewsService } from './interviews.service';
import { QrUploadTokenService } from './qr-upload-token.service';
import { TranscribeInterviewDto } from '../speech/dto/transcribe-interview.dto';

// 与 interviews.controller / speech.config 同口径(AUDIO_MAX_SIZE_MB,缺省 25)。
// FileInterceptor 的 limits 在装饰阶段静态求值,故直接读 env;超限由 multer 拦截返回 413。
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

/**
 * 扫码上传豁免控制器:手机端「未登录」直传音频专用。
 *
 * 路由 /upload(不在 /interviews 下),且整个控制器不挂 JwtAuthGuard —— 手机端没有登录态,
 * 鉴权完全靠 URL 路径里的 scoped 一次性令牌(QrUploadTokenService.verify):
 * 校验签名+exp+purpose+jti 未用过 → 解出绑定的 interviewId+userId → 走与登录端点同款转写 pipeline。
 *
 * 归属红线(绝不放宽):令牌只能传它绑定的 interview/user —— interviewId/userId 一律取自令牌,
 * 不接受请求体里的任何归属字段;service.transcribe 内部还会再 findOne(interviewId, userId) 兜一层。
 *
 * 一次性:上传「真实成功(已建 task)」后才烧 jti(burn)—— 失败不烧,允许用户在 60s 内重试同一令牌。
 */
@Controller('upload')
export class QrUploadController {
  constructor(
    private readonly interviews: InterviewsService,
    private readonly qrToken: QrUploadTokenService,
  ) {}

  /**
   * 凭令牌上传音频。202 返回 taskId(与登录端点一致),电脑端轮询既有
   * GET /interviews/:id/transcribe/status 看进度/结果。
   *
   * 计费/隐私与登录端点完全一致(同一 service.transcribe):失败不计费、音频仅在内存。
   */
  @Post(':token')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: AUDIO_MAX_BYTES },
      fileFilter: audioFileFilter,
    }),
  )
  async upload(
    @Param('token') token: string,
    // 与登录端点同口径:consent 必须 'true'(@IsIn 硬校验),手机端复选框勾选后随表单上送。
    @Body() _dto: TranscribeInterviewDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    // 1) 校验令牌:签名+exp+purpose+jti 未用过 → 解出绑定归属(任一不满足 401)。
    const verified = this.qrToken.verify(token);

    if (!file) {
      throw new BadRequestException('请上传音频文件');
    }

    // 2) 走与登录端点同款 pipeline。归属一律以令牌为准(verified.interviewId/userId),
    //    service 内部 findOne 再兜一层归属校验 + 余额预检 + 建任务。
    const result = await this.interviews.transcribeViaQrToken(
      verified.interviewId,
      verified.userId,
      file.buffer,
      file.mimetype,
    );

    // 3) 上传真实成功(已建 task)→ 此刻才烧 jti(用后即焚)。
    //    校验/建任务失败会在上面抛出、不会走到这里,故失败不烧,允许 60s 内重试。
    this.qrToken.burn(verified.jti);

    return result;
  }
}
