import * as crypto from 'crypto';
import NodeCache from 'node-cache';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Diagnosis } from './entities/diagnosis.entity';
import { CreateDiagnosisDto } from './dto/create-diagnosis.dto';
import { ResumesService } from '../resumes/resumes.service';
import { ParserService } from '../ai/parser.service';
import { AnalyzerService } from '../ai/analyzer.service';
import { RewriterService } from '../ai/rewriter.service';
import type { ParsedJD } from '../common/types';

@Injectable()
export class DiagnosesService {
  private readonly jdCache = new NodeCache({ stdTTL: 7 * 24 * 3600 });

  constructor(
    @InjectRepository(Diagnosis) private readonly repo: Repository<Diagnosis>,
    private readonly resumes: ResumesService,
    private readonly parser: ParserService,
    private readonly analyzer: AnalyzerService,
    private readonly rewriter: RewriterService,
  ) {}

  async create(userId: string, dto: CreateDiagnosisDto): Promise<Diagnosis> {
    // 0. Validate JD text is substantive enough for meaningful analysis
    const jdText = dto.jd_text?.trim() ?? '';
    if (jdText.length < 50) {
      throw new BadRequestException(
        'JD 文本至少需要 50 字，包含岗位职责和要求。仅提供公司名称无法进行有效匹配。',
      );
    }

    // 1. Get resume and verify ownership
    const resume = await this.resumes.findOne(dto.resume_id, userId);

    // 1.5 Validate resume has actual content
    const resumeText = resume.raw_text?.trim() ?? '';
    if (resumeText.length < 30) {
      throw new BadRequestException(
        '简历内容不足，请上传包含完整工作经历和技能的简历（至少 30 字）。',
      );
    }

    // 2. Parse resume if not already parsed
    let parsedResume = resume.parsed_json;
    if (!parsedResume) {
      parsedResume = await this.parser.parseResume(resume.raw_text);
      await this.resumes.updateParsedJson(resume.id, parsedResume);
    }

    // 3. Hash JD text → check cache → parse if miss (TTL 7 days)
    const jdHash = crypto.createHash('md5').update(dto.jd_text).digest('hex');
    let parsedJD = this.jdCache.get<ParsedJD>(jdHash);
    if (!parsedJD) {
      parsedJD = await this.parser.parseJD(dto.jd_text);
      this.jdCache.set(jdHash, parsedJD);
    }

    // 4. Analyze resume vs JD
    const matchResult = await this.analyzer.analyze(
      JSON.stringify(parsedResume),
      JSON.stringify(parsedJD),
    );

    // 5. Get rewrite suggestions
    const suggestions = await this.rewriter.suggest(
      resume.raw_text,
      dto.jd_text,
      JSON.stringify(matchResult),
    );

    // 6. Extract keywords_hit and keywords_miss from dimensions.skills
    const keywordsHit = matchResult.dimensions.skills.matched;
    const keywordsMiss = matchResult.dimensions.skills.missing;

    // 7. Save and return Diagnosis entity
    const diagnosis = this.repo.create({
      user_id: userId,
      resume_id: resume.id,
      jd_text: dto.jd_text,
      jd_parsed: parsedJD,
      jd_company: parsedJD.company ?? undefined,
      jd_role: parsedJD.job_title ?? undefined,
      score: matchResult.total_score,
      dimensions: matchResult.dimensions,
      keywords_hit: keywordsHit,
      keywords_miss: keywordsMiss,
      suggestions,
    });

    return this.repo.save(diagnosis) as Promise<Diagnosis>;
  }

  findAllByUser(userId: string): Promise<Diagnosis[]> {
    return this.repo.find({
      where: { user_id: userId },
      relations: { resume: true },
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Diagnosis> {
    const diagnosis = await this.repo.findOne({
      where: { id, user_id: userId },
      relations: { resume: true },
    });
    if (!diagnosis) throw new NotFoundException();
    return diagnosis;
  }
}
