import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application, ApplicationStage } from './entities/application.entity';
import { ApplicationEvent } from './entities/application-event.entity';
import { Resume } from '../resumes/entities/resume.entity';
import { Diagnosis } from '../diagnoses/entities/diagnosis.entity';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { ApplicationResponseDto, ApplicationEventResponseDto } from './dto/application-response.dto';

export interface ApplicationStats {
  wishlist: number;
  applied: number;
  interview: number;
  final: number;
  offer: number;
  rejected: number;
}

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application)
    private readonly repo: Repository<Application>,
    @InjectRepository(ApplicationEvent)
    private readonly eventRepo: Repository<ApplicationEvent>,
    @InjectRepository(Resume)
    private readonly resumeRepo: Repository<Resume>,
    @InjectRepository(Diagnosis)
    private readonly diagnosisRepo: Repository<Diagnosis>,
  ) {}

  // Guard #112: 校验 resume_id / diagnosis_id 归属当前用户，拒绝跨用户引用(IDOR)。
  // create 与 update 共用，确保两条写路径对称。仅校验 dto 中显式提供(非 undefined)的引用。
  private async assertOwnedRefs(
    userId: string,
    refs: { resume_id?: string; diagnosis_id?: string },
  ): Promise<void> {
    if (refs.resume_id !== undefined) {
      const resume = await this.resumeRepo.findOne({ where: { id: refs.resume_id } });
      if (!resume || resume.user_id !== userId) {
        throw new ForbiddenException('resume_id 不属于当前用户');
      }
    }
    if (refs.diagnosis_id !== undefined) {
      const diagnosis = await this.diagnosisRepo.findOne({ where: { id: refs.diagnosis_id } });
      if (!diagnosis || diagnosis.user_id !== userId) {
        throw new ForbiddenException('diagnosis_id 不属于当前用户');
      }
    }
  }

  async create(userId: string, dto: CreateApplicationDto): Promise<ApplicationResponseDto> {
    const stage: ApplicationStage = dto.stage ?? 'wishlist';

    await this.assertOwnedRefs(userId, { resume_id: dto.resume_id, diagnosis_id: dto.diagnosis_id });

    const application = await this.repo.save(
      this.repo.create({
        user_id: userId,
        company: dto.company,
        role: dto.role,
        location: dto.location,
        stage,
        salary_range: dto.salary_range,
        deadline: dto.deadline,
        referrer: dto.referrer,
        notes: dto.notes,
        resume_id: dto.resume_id,
        diagnosis_id: dto.diagnosis_id,
      }),
    );

    await this.eventRepo.save(
      this.eventRepo.create({
        application_id: application.id,
        from_stage: null,
        to_stage: stage,
        note: '创建申请',
      }),
    );

    return ApplicationResponseDto.from(application);
  }

  async findAllByUser(userId: string): Promise<ApplicationResponseDto[]> {
    const rows = await this.repo.find({
      where: { user_id: userId },
      order: { updated_at: 'DESC' },
    });
    return rows.map(ApplicationResponseDto.from);
  }

  async findOne(id: string, userId: string): Promise<ApplicationResponseDto> {
    const application = await this.repo.findOne({
      where: { id, user_id: userId },
      relations: { events: true },
      order: { events: { created_at: 'ASC' } },
    });
    if (!application) throw new NotFoundException();
    return ApplicationResponseDto.from(application);
  }

  async update(id: string, userId: string, dto: UpdateApplicationDto): Promise<ApplicationResponseDto> {
    const application = await this.repo.findOne({ where: { id, user_id: userId } });
    if (!application) throw new NotFoundException();
    const oldStage = application.stage;

    await this.assertOwnedRefs(userId, { resume_id: dto.resume_id, diagnosis_id: dto.diagnosis_id });

    Object.assign(application, dto);
    await this.repo.save(application);

    if (dto.stage && dto.stage !== oldStage) {
      await this.eventRepo.save(
        this.eventRepo.create({
          application_id: id,
          from_stage: oldStage,
          to_stage: dto.stage,
        }),
      );
    }

    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const application = await this.repo.findOne({ where: { id, user_id: userId } });
    if (!application) throw new NotFoundException();
    await this.repo.remove(application);
  }

  async getStats(userId: string): Promise<ApplicationStats> {
    const rows = await this.repo
      .createQueryBuilder('a')
      .select('a.stage', 'stage')
      .addSelect('COUNT(*)', 'count')
      .where('a.user_id = :userId', { userId })
      .groupBy('a.stage')
      .getRawMany<{ stage: ApplicationStage; count: string }>();

    const stats: ApplicationStats = {
      wishlist: 0,
      applied: 0,
      interview: 0,
      final: 0,
      offer: 0,
      rejected: 0,
    };

    const KNOWN_STAGES = new Set<ApplicationStage>([
      'wishlist', 'applied', 'interview', 'final', 'offer', 'rejected',
    ]);

    for (const row of rows) {
      if (KNOWN_STAGES.has(row.stage)) {
        stats[row.stage] = parseInt(row.count, 10);
      }
    }

    return stats;
  }

  async getEvents(id: string, userId: string): Promise<ApplicationEventResponseDto[]> {
    await this.findOne(id, userId);
    const events = await this.eventRepo.find({
      where: { application_id: id },
      order: { created_at: 'ASC' },
    });
    return events.map(ApplicationEventResponseDto.from);
  }
}
