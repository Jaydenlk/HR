import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Interview } from './entities/interview.entity';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';
import { DebriefService } from './debrief.service';

@Injectable()
export class InterviewsService {
  constructor(
    @InjectRepository(Interview)
    private readonly repo: Repository<Interview>,
    private readonly debrief: DebriefService,
  ) {}

  async create(userId: string, dto: CreateInterviewDto): Promise<Interview> {
    const interview = this.repo.create({
      user_id: userId,
      round: dto.round,
      company: dto.company,
      role: dto.role,
      interview_at: dto.interview_at,
      duration_min: dto.duration_min,
      interviewer: dto.interviewer,
      transcript: dto.transcript,
      application_id: dto.application_id,
    });

    const saved = await this.repo.save(interview);

    if (dto.transcript) {
      try {
        const result = await this.debrief.analyze(
          dto.transcript,
          dto.company,
          dto.role,
          dto.round,
        );
        Object.assign(saved, result);
        await this.repo.save(saved);
      } catch {
        // debrief failure is non-fatal — interview still created
      }
    }

    return saved;
  }

  findAllByUser(userId: string): Promise<Interview[]> {
    return this.repo.find({
      where: { user_id: userId },
      relations: { application: true },
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Interview> {
    const interview = await this.repo.findOne({
      where: { id, user_id: userId },
      relations: { application: true },
    });
    if (!interview) throw new NotFoundException();
    return interview;
  }

  async update(id: string, userId: string, dto: UpdateInterviewDto): Promise<Interview> {
    const interview = await this.findOne(id, userId);
    const hadTranscript = !!interview.transcript;

    Object.assign(interview, dto);
    const saved = await this.repo.save(interview);

    // Trigger debrief if transcript was newly added and no scores yet
    const transcriptAdded = !hadTranscript && !!dto.transcript;
    const noScores = !saved.scores || saved.scores.length === 0;
    if (transcriptAdded && noScores) {
      try {
        const result = await this.debrief.analyze(
          saved.transcript!,
          saved.company ?? undefined,
          saved.role ?? undefined,
          saved.round,
        );
        Object.assign(saved, result);
        await this.repo.save(saved);
      } catch {
        // debrief failure is non-fatal
      }
    }

    return saved;
  }

  async analyze(id: string, userId: string): Promise<Interview> {
    const interview = await this.findOne(id, userId);
    if (!interview.transcript) throw new NotFoundException('面试记录没有 transcript，无法分析');

    const result = await this.debrief.analyze(
      interview.transcript,
      interview.company ?? undefined,
      interview.role ?? undefined,
      interview.round,
    );
    Object.assign(interview, result);
    return this.repo.save(interview);
  }

  async remove(id: string, userId: string): Promise<void> {
    const interview = await this.findOne(id, userId);
    await this.repo.remove(interview);
  }
}
