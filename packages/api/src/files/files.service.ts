import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import * as path from 'path';
import * as fs from 'fs/promises';
import { FileMetadata } from '../database/entities/file.entity';

@Injectable()
export class FilesService {
  private uploadDir: string;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(FileMetadata)
    private readonly metaRepo: Repository<FileMetadata>,
  ) {
    // For dev/testing: use local filesystem. Production: switch to OSS.
    this.uploadDir = config.get('UPLOAD_DIR', './uploads');
  }

  async upload(userId: string, file: Express.Multer.File, folder: string): Promise<string> {
    const ext = path.extname(file.originalname);
    const key = `${folder}/${uuid()}${ext}`;
    const fullPath = path.join(this.uploadDir, key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, file.buffer);
    await this.metaRepo.save(this.metaRepo.create({ key, user_id: userId, folder }));
    return key;
  }

  // 对象级 ACL:请求者必须是该 key 的属主,否则按现行 findOne(id,userId) 模式抛 404
  // (不泄露 key 是否存在,避免越权探测)。下载端点服务文件前必须先过这一关。
  async assertOwner(key: string, userId: string): Promise<void> {
    const meta = await this.metaRepo.findOne({ where: { key, user_id: userId } });
    if (!meta) throw new NotFoundException();
  }

  getFilePath(key: string): string {
    return path.join(this.uploadDir, key);
  }
}
