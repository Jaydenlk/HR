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
    const lengthHint = dto.length_words ? `Keep the letter to approximately ${dto.length_words} words.` : '';

    const system = `You are a professional career coach writing cover letters. Write in a ${tone} tone. ${lengthHint}
Return only the cover letter text, no extra commentary.`;

    const prompt = [
      resumeText ? `## Candidate Resume\n${resumeText}` : '',
      dto.jd_text ? `## Job Description\n${dto.jd_text}` : '',
      `## Target Company: ${dto.company}`,
      `## Target Role: ${dto.role}`,
      `\nPlease write a compelling cover letter for this candidate applying to ${dto.role} at ${dto.company}.`,
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
