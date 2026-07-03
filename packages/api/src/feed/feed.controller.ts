import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { AiUsageInterceptor } from '../quota/ai-usage.interceptor';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FeedService } from './feed.service';
import { CreateFeedItemDto } from './dto/create-feed-item.dto';
import { FeedQueryDto } from './dto/feed-query.dto';
import { ImportFeedDto } from './dto/import-feed.dto';
import { CreateRecruitSourceDto } from './dto/create-recruit-source.dto';
import { DigestGeneratorService } from './digest-generator.service';
import { SourceRegistryService } from './source-registry.service';
import { FeedIngestionService } from './feed-ingestion.service';
import { RecruitIntelService } from './recruit-intel.service';

const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

@Controller('feed')
@UseGuards(JwtAuthGuard)
export class FeedController {
  constructor(
    private readonly feed: FeedService,
    private readonly digestGenerator: DigestGeneratorService,
    private readonly sources: SourceRegistryService,
    private readonly ingestion: FeedIngestionService,
    private readonly recruitIntel: RecruitIntelService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateFeedItemDto,
  ) {
    return this.feed.create(user.id, dto);
  }

  @Get()
  findAll(@Query() query: FeedQueryDto, @CurrentUser() user: { id: string }) {
    return this.feed.findAll(query, user.id);
  }

  // 波0 隔离(T4 已定):来源列表/抓取记录含运营内部信息,补 AdminGuard 与写端点对称。
  // 侦察确认 dev 分支上这两个 GET 此前仍缺 AdminGuard(T4 该项尚未先行执行)——
  // 本任务补齐这个最小缺口,使 M8 的前端权限门有实际意义,不做 T4 其余审计项。
  @Get('sources')
  @UseGuards(AdminGuard)
  findSources() {
    return this.sources.findAll();
  }

  @Get('runs')
  @UseGuards(AdminGuard)
  findRuns() {
    return this.ingestion.findRuns();
  }

  // M7:管理员运营操作,摘除 CreditGuard/CreditInterceptor(不从触发它的管理员个人 credit 扣点);
  // AiUsageInterceptor 是用量/失败观测而非计费,保留不动。
  @Post('import')
  @UseGuards(AdminGuard)
  @UseInterceptors(AiUsageInterceptor)
  import(@Body() dto: ImportFeedDto) {
    return this.ingestion.import(dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.feed.remove(id, user.id);
  }

  // M7:同上,摘除 CreditGuard/CreditInterceptor,AiUsageInterceptor 保留。
  @Post('digest')
  @UseGuards(AdminGuard)
  @UseInterceptors(AiUsageInterceptor)
  async generateDigest() {
    const item = await this.digestGenerator.generateWeeklyDigest();
    return item;
  }

  // ── T2 校招情报:三类源管理 + 上传(均为管理员运营操作,不挂 C 端计费) ──

  @Post('sources')
  @UseGuards(AdminGuard)
  createRecruitSource(@Body() dto: CreateRecruitSourceDto) {
    return this.sources.createManual(dto);
  }

  // 上传解析内部会调用 AiService(GLM 结构化抽取),挂 AiUsageInterceptor 做用量/失败观测
  // (与 import/digest 同规则:不是计费,不挂 CreditGuard/CreditInterceptor)。
  @Post('sources/:id/upload')
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: UPLOAD_MAX_BYTES } }), AiUsageInterceptor)
  uploadRecruitSource(
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }
    return this.recruitIntel.ingestUpload(id, file);
  }
}
