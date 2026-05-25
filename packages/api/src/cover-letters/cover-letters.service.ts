import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
    if (!dto.jd_text?.trim()) {
      throw new BadRequestException('请提供目标职位描述（JD），求职信必须针对具体岗位撰写');
    }

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

    const system = `你是一位专业的职业发展教练，擅长撰写高质量求职信。

硬性规则：
- 只能基于下方提供的【候选人简历】和【职位描述】撰写
- 如果没有提供简历，不要编造任何工作经历、项目经验或技能
- 如果没有简历，只基于 JD 写一封表达求职意愿和学习热情的通用信
- 不要写"在我的简历中您将看到"这类预设简历存在的句子
- 每一个具体经历、技能、项目都必须来自实际提供的简历内容
- 公司名和岗位名必须使用用户提供的值，不要自行替换

语言：中文（简体）
语气风格：${toneDesc}
${lengthHint}
只返回求职信正文，不要添加任何额外说明或注释。`;

    const sections: string[] = [];
    if (resumeText) {
      sections.push(`## 候选人简历\n${resumeText}`);
    } else {
      sections.push('## 注意：候选人尚未提供简历，请勿编造任何经历或技能');
    }
    sections.push(`## 职位描述\n${dto.jd_text}`);
    sections.push(`## 目标公司：${dto.company}`);
    sections.push(`## 目标职位：${dto.role}`);
    sections.push(`\n请为该候选人撰写一封有说服力的中文求职信，用于申请${dto.company}的${dto.role}职位。`);

    const prompt = sections.join('\n\n');

    const content = await this.ai.complete({ system, prompt });

    const letter = this.repo.create({
      user_id: userId,
      resume_id: dto.resume_id ?? undefined,
      application_id: dto.application_id ?? undefined,
      tone,
      length_words: dto.length_words ?? undefined,
      company: dto.company,
      role: dto.role,
      jd_text: dto.jd_text,
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
      jd_text: existing.jd_text ?? undefined,
    };

    const newLetter = await this.generate(userId, dto);
    newLetter.version = existing.version + 1;
    return this.repo.save(newLetter);
  }
}
