import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resume } from './entities/resume.entity';
import { ResumeVersion } from './entities/resume-version.entity';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import type { ParsedResume } from '../common/types';

@Injectable()
export class ResumesService {
  constructor(
    @InjectRepository(Resume) private readonly repo: Repository<Resume>,
    @InjectRepository(ResumeVersion) private readonly versionRepo: Repository<ResumeVersion>,
  ) {}

  async create(userId: string, dto: CreateResumeDto, rawText: string): Promise<Resume> {
    if (dto.is_primary) {
      await this.repo.update({ user_id: userId, is_primary: true }, { is_primary: false });
    }
    return this.repo.save(this.repo.create({
      user_id: userId,
      title: dto.title,
      raw_text: rawText,
      is_primary: dto.is_primary ?? false,
    }));
  }

  findAllByUser(userId: string): Promise<Resume[]> {
    return this.repo.find({
      where: { user_id: userId },
      order: { is_primary: 'DESC', updated_at: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Resume> {
    const resume = await this.repo.findOne({
      where: { id, user_id: userId },
      relations: { versions: true, diagnoses: true },
    });
    if (!resume) throw new NotFoundException();
    return resume;
  }

  async update(id: string, userId: string, dto: UpdateResumeDto): Promise<Resume> {
    const resume = await this.findOne(id, userId);
    if (dto.is_primary) {
      await this.repo.update({ user_id: userId, is_primary: true }, { is_primary: false });
    }
    Object.assign(resume, dto);
    return this.repo.save(resume);
  }

  async remove(id: string, userId: string): Promise<void> {
    const resume = await this.findOne(id, userId);
    await this.repo.remove(resume);
  }

  async getVersions(id: string, userId: string): Promise<ResumeVersion[]> {
    await this.findOne(id, userId);
    return this.versionRepo.find({
      where: { resume_id: id },
      order: { version_num: 'DESC' },
    });
  }

  async createVersion(id: string, userId: string, rawText: string, changeNote: string): Promise<ResumeVersion> {
    const resume = await this.findOne(id, userId);
    const result = await this.versionRepo
      .createQueryBuilder('v')
      .select('MAX(v.version_num)', 'max')
      .where('v.resume_id = :id', { id })
      .getRawOne<{ max: number | null }>();
    const newNum = (result?.max ?? 0) + 1;

    const version = await this.versionRepo.save(this.versionRepo.create({
      resume_id: id,
      version_num: newNum,
      raw_text: rawText,
      change_note: changeNote,
    }));

    // Use update() instead of save(resume) to avoid TypeORM orphan-removal
    // deleting the just-created version (save() with a stale relations array
    // would cascade-delete any versions not present in the in-memory object).
    await this.repo.update(id, { raw_text: rawText, parsed_json: null });

    return version;
  }

  async updateParsedJson(id: string, parsed: ParsedResume): Promise<void> {
    await this.repo.update(id, { parsed_json: parsed });
  }
}
