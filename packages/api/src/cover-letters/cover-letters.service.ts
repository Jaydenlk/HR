import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CoverLetter } from './entities/cover-letter.entity';
import { CreateCoverLetterDto } from './dto/create-cover-letter.dto';
import { AiService } from '../ai/ai.service';
import { ResumesService } from '../resumes/resumes.service';

@Injectable()
export class CoverLettersService {
  constructor(
    @InjectRepository(CoverLetter)
    private readonly repo: Repository<CoverLetter>,
    private readonly ai: AiService,
    private readonly resumes: ResumesService,
  ) {}

  async generate(userId: string, dto: CreateCoverLetterDto): Promise<CoverLetter> {
    let resumeText = '';

    if (dto.resume_id) {
      const resume = await this.resumes.findOne(dto.resume_id, userId);
      resumeText = resume.raw_text;
    }

    const tone = dto.tone ?? 'warm';
    const toneLabel: Record<string, string> = {
      professional: '专业克制',
      warm: '真诚热情',
      concise: '简短直接',
    };
    const toneDesc = toneLabel[tone] ?? toneLabel['warm'];
    const lengthHint = dto.length_words ? `求职信字数控制在约 ${dto.length_words} 字以内。` : '';

    const system = `你是一位专业的职业发展教练，擅长撰写高质量求职信。请用中文撰写求职信。
语言：中文（简体）
语气风格：${toneDesc}
${lengthHint}
只返回求职信正文，不要添加任何额外说明或注释。`;

    const prompt = [
      resumeText ? `## 候选人简历\n${resumeText}` : '',
      dto.jd_text ? `## 职位描述\n${dto.jd_text}` : '',
      `## 目标公司：${dto.company}`,
      `## 目标职位：${dto.role}`,
      `\n请为该候选人撰写一封有说服力的中文求职信，用于申请${dto.company}的${dto.role}职位。`,
    ]
      .filter(Boolean)
      .join('\n\n');

    const content = await this.ai.complete({ system, prompt });

    const letter = this.repo.create({
      user_id: userId,
      resume_id: dto.resume_id ?? undefined,
      application_id: dto.application_id ?? undefined,
      tone,
      length_words: dto.length_words ?? undefined,
      company: dto.company,
      role: dto.role,
      content,
      version: 1,
    });

    return this.repo.save(letter);
  }

  findAllByUser(userId: string): Promise<CoverLetter[]> {
    return this.repo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<CoverLetter> {
    const letter = await this.repo.findOne({ where: { id, user_id: userId } });
    if (!letter) throw new NotFoundException();
    return letter;
  }

  async remove(id: string, userId: string): Promise<void> {
    const letter = await this.findOne(id, userId);
    await this.repo.remove(letter);
  }

  async regenerate(id: string, userId: string): Promise<CoverLetter> {
    const existing = await this.findOne(id, userId);

    const dto: CreateCoverLetterDto = {
      resume_id: existing.resume_id ?? undefined,
      application_id: existing.application_id ?? undefined,
      company: existing.company,
      role: existing.role,
      tone: existing.tone,
      length_words: existing.length_words ?? undefined,
    };

    const newLetter = await this.generate(userId, dto);
    newLetter.version = existing.version + 1;
    return this.repo.save(newLetter);
  }
}
