import {
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MeService } from './me.service';
import { ListCreditsQueryDto } from './dto/list-credits-query.dto';

// 当前登录用户自助接口:基本信息 + credit 余额 / credit 流水 / 头像上传。全部经 JwtAuthGuard。
@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(private readonly me: MeService) {}

  @Get()
  getProfile(@CurrentUser() user: { id: string }) {
    return this.me.getProfile(user.id);
  }

  @Get('credits')
  listCredits(@CurrentUser() user: { id: string }, @Query() query: ListCreditsQueryDto) {
    return this.me.listCredits(user.id, query.limit ?? 20, query.offset ?? 0);
  }

  // 头像上传:multipart 字段名 file,硬上限 2MB(Multer 层先拦)。
  // MIME 与大小的友好 400 文案在 MeService 内二次校验(file 缺失/超限/非图片)。
  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }))
  uploadAvatar(
    @CurrentUser() user: { id: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.me.updateAvatar(user.id, file);
  }
}
