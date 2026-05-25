import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResumesService } from './resumes.service';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';

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
  ) {
    const rawText = file ? await this.extractText(file) : (dto.raw_text ?? '');
    return this.resumes.create(user.id, dto, rawText);
  }

  @Get()
  findAll(@CurrentUser() user: { id: string }) {
    return this.resumes.findAllByUser(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.resumes.findOne(id, user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser() user: { id: string }, @Body() dto: UpdateResumeDto) {
    return this.resumes.update(id, user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.resumes.remove(id, user.id);
  }

  @Get(':id/versions')
  getVersions(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.resumes.getVersions(id, user.id);
  }

  @Post(':id/versions')
  createVersion(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() body: { raw_text: string; change_note: string },
  ) {
    return this.resumes.createVersion(id, user.id, body.raw_text, body.change_note);
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
