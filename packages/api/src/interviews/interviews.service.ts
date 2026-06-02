import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

    // 提供了非空 transcript 即承诺当场复盘:先分析后落盘。
    // analyze 过短(BadRequest 400)/AI 故障(ServiceUnavailable 503)都直接上抛,
    // 绝不静默吞掉、绝不创建一条 scores 全 null 却返 201 的假"成功"记录。
    // 未提供 transcript(null/缺省/空白)时是合法草稿:不分析,scores 保持 null,前端走"手动分析"。
    if (dto.transcript?.trim()) {
      const result = await this.debrief.analyze(
        dto.transcript,
        dto.company,
        dto.role,
        dto.round,
      );
      Object.assign(interview, result);
    }

    return this.repo.save(interview);
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
    const hadTranscript = !!interview.transcript?.trim();

    Object.assign(interview, dto);

    // 新增了非空 transcript 且尚无评分时,当场复盘:先分析后落盘。
    // analyze 过短(400)/AI 故障(503)都直接上抛,不静默吞掉、不留下"有记录无评分"的假态。
    const transcriptAdded = !hadTranscript && !!interview.transcript?.trim();
    const noScores = !interview.scores || interview.scores.length === 0;
    if (transcriptAdded && noScores) {
      const result = await this.debrief.analyze(
        interview.transcript,
        interview.company ?? undefined,
        interview.role ?? undefined,
        interview.round,
      );
      Object.assign(interview, result);
    }

    return this.repo.save(interview);
  }

  async analyze(id: string, userId: string): Promise<Interview> {
    const interview = await this.findOne(id, userId);
    if (!interview.transcript) {
      throw new BadRequestException('请先添加面试记录内容（transcript），再进行复盘分析');
    }

    const result = await this.debrief.analyze(
      interview.transcript,
      interview.company ?? undefined,
      interview.role ?? undefined,
      interview.round,
    );
    Object.assign(interview, result);
    await this.repo.save(interview);
    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const interview = await this.findOne(id, userId);
    await this.repo.remove(interview);
  }
}
