import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResumesService } from './resumes.service';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { CreateResumeVersionDto } from './dto/create-resume-version.dto';
import {
  ResumeListItem,
  ResumeDetailResponse,
  ResumeVersionResponse,
  toResumeListItem,
  toResumeDetailResponse,
  toResumeVersionResponse,
} from './dto/resume-response.dto';

// 与 diagnoses 侧简历正文最小长度口径一致(diagnoses.service 校验 < 30 字拒绝)。
const MIN_RESUME_LENGTH = 30;

@Controller('resumes')
@UseGuards(JwtAuthGuard)
export class ResumesController {
  constructor(private readonly resumes: ResumesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateResumeDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ResumeDetailResponse> {
    const rawText = file ? await this.extractText(file) : (dto.raw_text ?? '');
    // 兜底:文件解析路径绕过了 DTO 的 raw_text 校验,这里对最终正文统一把关,
    // 空/过短简历一律 400 拒绝(上游防"数据缺失",对齐 diagnoses 侧 30 字口径)。
    if (rawText.trim().length < MIN_RESUME_LENGTH) {
      throw new BadRequestException(
        `简历内容至少需要 ${MIN_RESUME_LENGTH} 字，请提供包含完整工作经历和技能的简历正文`,
      );
    }
    const fileType = file ? this.resolveFileType(file.mimetype) : undefined;
    const resume = await this.resumes.create(user.id, dto, rawText, fileType);
    return toResumeDetailResponse(resume);
  }

  @Get()
  async findAll(@CurrentUser() user: { id: string }): Promise<ResumeListItem[]> {
    const resumes = await this.resumes.findAllByUser(user.id);
    return resumes.map(toResumeListItem);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: { id: string }): Promise<ResumeDetailResponse> {
    const resume = await this.resumes.findOne(id, user.id);
    return toResumeDetailResponse(resume);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateResumeDto,
  ): Promise<ResumeDetailResponse> {
    const resume = await this.resumes.update(id, user.id, dto);
    return toResumeDetailResponse(resume);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.resumes.remove(id, user.id);
  }

  @Get(':id/versions')
  async getVersions(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ): Promise<ResumeVersionResponse[]> {
    const versions = await this.resumes.getVersions(id, user.id);
    return versions.map(toResumeVersionResponse);
  }

  @Post(':id/versions')
  async createVersion(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateResumeVersionDto,
  ): Promise<ResumeVersionResponse> {
    const version = await this.resumes.createVersion(id, user.id, dto.raw_text, dto.change_note ?? '');
    return toResumeVersionResponse(version);
  }

  private resolveFileType(mimetype: string): string {
    if (mimetype === 'application/pdf') return 'pdf';
    if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
    return 'txt';
  }

  private async extractText(file: Express.Multer.File): Promise<string> {
    try {
      if (file.mimetype === 'application/pdf') {
        const { PDFParse } = await import('pdf-parse');
        const parser = new PDFParse({ data: file.buffer });
        const result = await parser.getText();
        return result.text;
      }
      if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        return result.value;
      }
      return file.buffer.toString('utf-8');
    } catch {
      throw new BadRequestException('无法解析此文件格式，请尝试粘贴文本');
    }
  }
}
