import {
  Controller,
  Get,
  Post,
  Param,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { createReadStream } from 'fs';
import { access } from 'fs/promises';
import * as path from 'path';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FilesService } from './files.service';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async upload(
    @CurrentUser() user: { id: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    const key = await this.files.upload(user.id, file, 'resumes');
    return { key };
  }

  // 下载:对象级 ACL 出口。key 恒为两段 <folder>/<uuid>.<ext>,用两个具名段承接(避开通配符语法分歧)。
  // 先 assertOwner(非属主直接 404,不泄露存在性),再确认实体文件存在后流式返回。
  @Get('download/:folder/:name')
  async download(
    @Param('folder') folder: string,
    @Param('name') name: string,
    @CurrentUser() user: { id: string },
    @Res() res: Response,
  ) {
    const key = `${folder}/${name}`;
    await this.files.assertOwner(key, user.id);
    const fullPath = this.files.getFilePath(key);
    try {
      await access(fullPath);
    } catch {
      throw new NotFoundException();
    }
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(name)}"`);
    createReadStream(fullPath).pipe(res);
  }
}
