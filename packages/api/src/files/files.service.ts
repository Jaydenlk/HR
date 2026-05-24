import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuid } from 'uuid';
import * as path from 'path';
import * as fs from 'fs/promises';

@Injectable()
export class FilesService {
  private uploadDir: string;

  constructor(private readonly config: ConfigService) {
    // For dev/testing: use local filesystem. Production: switch to OSS.
    this.uploadDir = config.get('UPLOAD_DIR', './uploads');
  }

  async upload(file: Express.Multer.File, folder: string): Promise<string> {
    const ext = path.extname(file.originalname);
    const key = `${folder}/${uuid()}${ext}`;
    const fullPath = path.join(this.uploadDir, key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, file.buffer);
    return key;
  }

  getFilePath(key: string): string {
    return path.join(this.uploadDir, key);
  }
}
