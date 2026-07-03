import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { Application } from './entities/application.entity';
import { ApplicationsService } from './applications.service';
import { Interview } from '../interviews/entities/interview.entity';
import { MockSession } from '../mock/entities/mock-session.entity';
import { CoverLetter } from '../cover-letters/entities/cover-letter.entity';
import { Resume } from '../resumes/entities/resume.entity';
import { ResumeVersion } from '../resumes/entities/resume-version.entity';
import { CompanyResearch } from '../company-research/entities/company-research.entity';
import { InterviewTranscribeTask } from '../speech/entities/transcribe-task.entity';
import { normalizeCompanyName } from '../common/normalize-company-name';
import { LinkApplicationDto } from './dto/link-application.dto';
import type {
  ApplicationRelatedResponse,
  InterviewSummary,
  MockSessionSummary,
  CoverLetterSummary,
  LinkSuggestion,
  LinkSuggestionsResponse,
} from './dto/application-related.dto';

/**
 * applications 域下的聚合/link/建议服务(BRIEF 第四节循环依赖提示):对 Interview/MockSession/
 * CoverLetter/ResumeVersion/CompanyResearch 各自 forFeature 二次注册拿独立 Repository,
 * 不 import 消费方模块的 Service/Module(避免 ApplicationsModule 反过来依赖它们成环)。
 * 先例:interviews.module.ts 与 speech.module.ts 已经是同一实体分别 forFeature 各自拿仓库。
 */
@Injectable()
export class ApplicationLinksService {
  constructor(
    @InjectRepository(Application)
    private readonly appRepo: Repository<Application>,
    @InjectRepository(Interview)
    private readonly interviewRepo: Repository<Interview>,
    @InjectRepository(MockSession)
    private readonly mockRepo: Repository<MockSession>,
    @InjectRepository(CoverLetter)
    private readonly coverLetterRepo: Repository<CoverLetter>,
    @InjectRepository(Resume)
    private readonly resumeRepo: Repository<Resume>,
    @InjectRepository(ResumeVersion)
    private readonly resumeVersionRepo: Repository<ResumeVersion>,
    @InjectRepository(CompanyResearch)
    private readonly companyResearchRepo: Repository<CompanyResearch>,
    @InjectRepository(InterviewTranscribeTask)
    private readonly transcribeTaskRepo: Repository<InterviewTranscribeTask>,
    private readonly applications: ApplicationsService,
  ) {}

  // ── GET /applications/:id/related ─────────────────────────────────────────

  async getRelated(id: string, userId: string): Promise<ApplicationRelatedResponse> {
    // 第一步:确认该 application 属于当前用户(既有 404 未归属保护)。
    await this.applications.findOne(id, userId);
    // 归属已确认,可安全按 id 直查实体行取 resume_id/resume_version_id/company_research_id。
    const appRow = await this.appRepo.findOne({ where: { id } });

    const [interviews, mockSessions, coverLetters] = await Promise.all([
      this.interviewRepo.find({
        where: { application_id: id, user_id: userId },
        order: { created_at: 'DESC' },
      }),
      this.mockRepo.find({
        where: { application_id: id, user_id: userId },
        order: { created_at: 'DESC' },
      }),
      this.coverLetterRepo.find({
        where: { application_id: id, user_id: userId },
        order: { created_at: 'DESC' },
      }),
    ]);

    const interviewSummaries = await this.toInterviewSummaries(interviews);

    return {
      interviews: interviewSummaries,
      mock_sessions: mockSessions.map(toMockSummary),
      cover_letters: coverLetters.map(toCoverLetterSummary),
      resume: await this.loadResumeLink(appRow, userId),
      company_research: await this.loadCompanyResearch(appRow),
    };
  }

  private async toInterviewSummaries(interviews: Interview[]): Promise<InterviewSummary[]> {
    if (interviews.length === 0) return [];
    const ids = interviews.map((iv) => iv.id);
    // 每个 interview 最近一次转写任务的状态:一次查询取回全部候选,按 created_at 倒序,
    // 逐 interview_id 取第一条命中(即最新一条)。
    const tasks = await this.transcribeTaskRepo.find({
      where: { interview_id: In(ids) },
      order: { created_at: 'DESC' },
    });
    const latestStatusByInterview = new Map<string, InterviewTranscribeTask['status']>();
    for (const task of tasks) {
      if (!latestStatusByInterview.has(task.interview_id)) {
        latestStatusByInterview.set(task.interview_id, task.status);
      }
    }
    return interviews.map((iv) => ({
      id: iv.id,
      company: iv.company ?? null,
      role: iv.role ?? null,
      round: iv.round,
      interview_at: iv.interview_at ?? null,
      duration_min: iv.duration_min ?? null,
      overall_grade: iv.overall_grade ?? null,
      created_at: iv.created_at,
      transcript_status: latestStatusByInterview.get(iv.id) ?? null,
    }));
  }

  private async loadResumeLink(
    appRow: Application | null,
    userId: string,
  ): Promise<ApplicationRelatedResponse['resume']> {
    if (!appRow?.resume_id) return null;
    const resumeRow = await this.resumeRepo.findOne({ where: { id: appRow.resume_id, user_id: userId } });
    if (!resumeRow) return null;

    let version = null;
    if (appRow.resume_version_id) {
      const versionRow = await this.resumeVersionRepo.findOne({ where: { id: appRow.resume_version_id } });
      // resume_versions 表无 user_id 列,归属经 resume_id 反查:必须属于上面已确认归属的 resumeRow。
      if (versionRow && versionRow.resume_id === resumeRow.id) {
        version = {
          id: versionRow.id,
          version_num: versionRow.version_num,
          change_note: versionRow.change_note ?? null,
          created_at: versionRow.created_at,
        };
      }
    }

    return {
      resume: { id: resumeRow.id, title: resumeRow.title, is_primary: resumeRow.is_primary },
      version,
    };
  }

  private async loadCompanyResearch(
    appRow: Application | null,
  ): Promise<ApplicationRelatedResponse['company_research']> {
    if (!appRow?.company_research_id) return null;
    // company_research 是全局缓存表,无 user_id 列——只判存在,不套用"属于当前用户"式校验。
    const row = await this.companyResearchRepo.findOne({ where: { id: appRow.company_research_id } });
    if (!row) return null;
    return {
      id: row.id,
      display_name: row.display_name,
      summary: row.summary,
      source_url: row.source_url,
      source_domain: row.source_domain,
      retrieved_at: row.retrieved_at,
    };
  }

  // ── PATCH /applications/:id/link ──────────────────────────────────────────

  async link(applicationId: string, userId: string, dto: LinkApplicationDto): Promise<{ ok: true }> {
    // application 本身归属:findOne 已保证。
    await this.applications.findOne(applicationId, userId);

    switch (dto.type) {
      case 'interview':
        await this.linkEntityTable(this.interviewRepo, applicationId, userId, dto);
        break;
      case 'mock':
        await this.linkEntityTable(this.mockRepo, applicationId, userId, dto);
        break;
      case 'cover_letter':
        await this.linkEntityTable(this.coverLetterRepo, applicationId, userId, dto);
        break;
      case 'resume_version':
        await this.linkResumeVersion(applicationId, userId, dto);
        break;
      case 'company_research':
        await this.linkCompanyResearch(applicationId, dto);
        break;
    }

    return { ok: true };
  }

  /**
   * interview/mock/cover_letter 共用:target 表自身有 user_id 列,直接查归属。
   * 泛型约束到三表共有的最小形状,避免为三张表各写一份重复的 link/unlink 逻辑。
   */
  private async linkEntityTable<T extends { id: string; user_id: string; application_id: string | null }>(
    repo: Repository<T>,
    applicationId: string,
    userId: string,
    dto: LinkApplicationDto,
  ): Promise<void> {
    const where = { id: dto.target_id, user_id: userId } as FindOptionsWhere<T>;
    const target = await repo.findOne({ where });
    if (!target) {
      throw new ForbiddenException(`${dto.type} target_id 不存在或不属于当前用户`);
    }

    if (dto.action === 'link') {
      target.application_id = applicationId;
    } else {
      if (target.application_id !== applicationId) {
        throw new BadRequestException('该记录当前未关联到此投递,无法取消关联');
      }
      target.application_id = null;
    }
    await repo.save(target);
  }

  private async linkResumeVersion(
    applicationId: string,
    userId: string,
    dto: LinkApplicationDto,
  ): Promise<void> {
    const versionRow = await this.resumeVersionRepo.findOne({ where: { id: dto.target_id } });
    if (!versionRow) {
      throw new ForbiddenException('resume_version target_id 不存在或不属于当前用户');
    }
    // resume_versions 无 user_id 列:归属经 resume_id 反查其所属 Resume 的 user_id。
    const ownedResume = await this.resumeRepo.findOne({
      where: { id: versionRow.resume_id, user_id: userId },
    });
    if (!ownedResume) {
      throw new ForbiddenException('resume_version target_id 不存在或不属于当前用户');
    }

    const appRow = await this.appRepo.findOne({ where: { id: applicationId } });
    if (!appRow) throw new NotFoundException();

    if (dto.action === 'link') {
      // 关联版本时一并把 resume_id 跟到该版本所属的简历——语义上"选了这一版"必然隐含"选了这份简历",
      // 不要求用户先经旧的 create/update resume_id 流程单独选过一次简历(否则 related.resume 会因
      // resume_id 仍为空而始终展示不出这条刚关联的版本,体验上说不通)。
      appRow.resume_id = ownedResume.id;
      appRow.resume_version_id = dto.target_id;
    } else {
      if (appRow.resume_version_id !== dto.target_id) {
        throw new BadRequestException('该简历版本当前未关联到此投递,无法取消关联');
      }
      // unlink 只撤销"选中了哪一版"这一层,不动 resume_id(可能是用户此前独立选定的简历)。
      appRow.resume_version_id = null;
    }
    await this.appRepo.save(appRow);
  }

  private async linkCompanyResearch(applicationId: string, dto: LinkApplicationDto): Promise<void> {
    // company_research 无 user_id 列,只判存在——不套用"属于当前用户"式校验。
    const row = await this.companyResearchRepo.findOne({ where: { id: dto.target_id } });
    if (!row) {
      throw new NotFoundException('company_research target_id 不存在');
    }

    const appRow = await this.appRepo.findOne({ where: { id: applicationId } });
    if (!appRow) throw new NotFoundException();

    if (dto.action === 'link') {
      appRow.company_research_id = dto.target_id;
    } else {
      if (appRow.company_research_id !== dto.target_id) {
        throw new BadRequestException('该公司背景当前未关联到此投递,无法取消关联');
      }
      appRow.company_research_id = null;
    }
    await this.appRepo.save(appRow);
  }

  // ── GET /applications/:id/link-suggestions ────────────────────────────────
  // 红线:本方法只读,不写库。任何写入必须来自用户显式点击"采纳"触发的 PATCH link 调用。

  async getLinkSuggestions(id: string, userId: string): Promise<LinkSuggestionsResponse> {
    const appDto = await this.applications.findOne(id, userId);
    const canonical = normalizeCompanyName(appDto.company);
    if (!canonical) return { suggestions: [] };

    // 扫当前用户全部记录后在内存过滤 application_id 为空:三张表数据量均以用户为界,规模小,
    // 换取比 TypeORM IS NULL where 子句更直白的可读性。
    const [interviews, mockSessions, coverLetters] = await Promise.all([
      this.interviewRepo.find({ where: { user_id: userId } }),
      this.mockRepo.find({ where: { user_id: userId } }),
      this.coverLetterRepo.find({ where: { user_id: userId } }),
    ]);
    const unlinkedInterviews = interviews.filter((iv) => !iv.application_id);
    const unlinkedMocks = mockSessions.filter((m) => !m.application_id);
    const unlinkedCoverLetters = coverLetters.filter((c) => !c.application_id);

    const suggestions: LinkSuggestion[] = [];

    for (const iv of unlinkedInterviews) {
      if (!iv.company || normalizeCompanyName(iv.company) !== canonical) continue;
      suggestions.push({
        type: 'interview',
        target_id: iv.id,
        label: `${iv.company} · ${iv.round}`,
        reason: `公司名与本投递高度相似:"${iv.company}"`,
      });
    }
    for (const m of unlinkedMocks) {
      if (!m.company || normalizeCompanyName(m.company) !== canonical) continue;
      suggestions.push({
        type: 'mock',
        target_id: m.id,
        label: `${m.company} · 模拟面试`,
        reason: `公司名与本投递高度相似:"${m.company}"`,
      });
    }
    for (const c of unlinkedCoverLetters) {
      if (!c.company || normalizeCompanyName(c.company) !== canonical) continue;
      suggestions.push({
        type: 'cover_letter',
        target_id: c.id,
        label: `${c.company} · 求职信`,
        reason: `公司名与本投递高度相似:"${c.company}"`,
      });
    }

    return { suggestions };
  }
}

function toMockSummary(session: MockSession): MockSessionSummary {
  return {
    id: session.id,
    company: session.company ?? null,
    role: session.role ?? null,
    mode: session.mode,
    status: session.status,
    overall_grade: session.evaluation?.overall_grade ?? null,
    created_at: session.created_at,
  };
}

function toCoverLetterSummary(letter: CoverLetter): CoverLetterSummary {
  return {
    id: letter.id,
    company: letter.company ?? null,
    role: letter.role ?? null,
    tone: letter.tone,
    version: letter.version,
    created_at: letter.created_at,
  };
}
