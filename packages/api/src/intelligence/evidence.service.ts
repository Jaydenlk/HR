import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, In, Repository } from 'typeorm';
import { Resume } from '../resumes/entities/resume.entity';
import { Diagnosis } from '../diagnoses/entities/diagnosis.entity';
import { Application } from '../applications/entities/application.entity';
import { DailyTask } from '../tasks/entities/daily-task.entity';
import { Opportunity } from '../opportunity/entities/opportunity.entity';
import { OpportunityEvaluation } from '../opportunity/entities/opportunity-evaluation.entity';
import { FeedItem } from '../feed/entities/feed-item.entity';
import { Interview } from '../interviews/entities/interview.entity';
import { MockSession } from '../mock/entities/mock-session.entity';
import { CoverLetter } from '../cover-letters/entities/cover-letter.entity';
import type { Evidence, UserIntelligence } from './evidence.types';

@Injectable()
export class EvidenceService {
  constructor(
    @InjectRepository(Resume)
    private readonly resumeRepo: Repository<Resume>,
    @InjectRepository(Diagnosis)
    private readonly diagnosisRepo: Repository<Diagnosis>,
    @InjectRepository(Application)
    private readonly appRepo: Repository<Application>,
    @InjectRepository(DailyTask)
    private readonly taskRepo: Repository<DailyTask>,
    @InjectRepository(Opportunity)
    private readonly oppRepo: Repository<Opportunity>,
    @InjectRepository(OpportunityEvaluation)
    private readonly evalRepo: Repository<OpportunityEvaluation>,
    @InjectRepository(FeedItem)
    private readonly feedRepo: Repository<FeedItem>,
    @InjectRepository(Interview)
    private readonly interviewRepo: Repository<Interview>,
    @InjectRepository(MockSession)
    private readonly mockRepo: Repository<MockSession>,
    @InjectRepository(CoverLetter)
    private readonly coverLetterRepo: Repository<CoverLetter>,
  ) {}

  // ── Public API ────────────────────────────────────────────────────────

  async gather(userId: string): Promise<UserIntelligence> {
    const results = await Promise.allSettled([
      this.gatherResume(userId),
      this.gatherDiagnoses(userId),
      this.gatherApplications(userId),
      this.gatherTasks(userId),
      this.gatherOpportunities(userId),
      this.gatherRelevantFeed(userId),
      this.gatherInterviews(userId),
      this.gatherMockSessions(userId),
      this.gatherCoverLetters(userId),
    ]);

    const resume = this.settled<Evidence | null>(results[0], null);
    const diagnoses = this.settled<Evidence[]>(results[1], []);
    const applications = this.settled<Evidence[]>(results[2], []);
    const tasks = this.settled<Evidence[]>(results[3], []);
    const opportunities = this.settled<Evidence[]>(results[4], []);
    const feedRelevant = this.settled<Evidence[]>(results[5], []);
    const interviews = this.settled<Evidence[]>(results[6], []);
    const mockSessions = this.settled<Evidence[]>(results[7], []);
    const coverLetters = this.settled<Evidence[]>(results[8], []);

    const skills = resume?.structured?.['skills'] as string[] ?? [];
    const targetRoles = [
      ...applications.map((a) => a.structured['role'] as string),
      ...opportunities.map((o) => o.structured['role'] as string),
    ].filter(Boolean);

    const applicationCompanies = [
      ...new Set(
        applications.map((a) => a.structured['company'] as string).filter(Boolean),
      ),
    ];
    const opportunityCompanies = [
      ...new Set(
        opportunities.map((o) => o.structured['company'] as string).filter(Boolean),
      ),
    ];

    const hitSets = diagnoses.map(
      (d) => (d.structured['keywords_hit'] as string[]) ?? [],
    );
    const missSets = diagnoses.map(
      (d) => (d.structured['keywords_miss'] as string[]) ?? [],
    );
    const diagnosisPatterns = {
      hit: [...new Set(hitSets.flat())],
      miss: [...new Set(missSets.flat())],
    };

    const interviewCompanies = [
      ...new Set(
        interviews.map((i) => i.structured['company'] as string).filter(Boolean),
      ),
    ];
    const interviewScores = interviews
      .map((i) => i.structured['overall_score'] as number | null)
      .filter((s): s is number => s !== null);
    const interviewPatterns = {
      companies_interviewed: interviewCompanies,
      average_score:
        interviewScores.length > 0
          ? Math.round(
              (interviewScores.reduce((a, b) => a + b, 0) /
                interviewScores.length) *
                10,
            ) / 10
          : null,
      recent_questions: [
        ...new Set(
          interviews.flatMap(
            (i) => (i.structured['question_texts'] as string[]) ?? [],
          ),
        ),
      ],
      knowledge_gaps: [
        ...new Set(
          interviews.flatMap(
            (i) => (i.structured['knowledge_gaps'] as string[]) ?? [],
          ),
        ),
      ],
    };

    const mockGrades = mockSessions
      .map((m) => m.structured['overall_grade'] as string | null)
      .filter((g): g is string => g !== null);
    const mockScores = mockSessions
      .map((m) => m.structured['overall_score'] as number | null)
      .filter((s): s is number => s !== null);
    const mockReadiness = {
      sessions_count: mockSessions.length,
      latest_grade: mockGrades.length > 0 ? mockGrades[0] : null,
      average_score:
        mockScores.length > 0
          ? Math.round(
              (mockScores.reduce((a, b) => a + b, 0) / mockScores.length) * 10,
            ) / 10
          : null,
      weak_areas: [
        ...new Set(
          mockSessions.flatMap(
            (m) => (m.structured['weaknesses'] as string[]) ?? [],
          ),
        ),
      ],
    };

    const coverLetterTargets = {
      companies: [
        ...new Set(
          coverLetters
            .map((c) => c.structured['company'] as string)
            .filter(Boolean),
        ),
      ],
      roles: [
        ...new Set(
          coverLetters
            .map((c) => c.structured['role'] as string)
            .filter(Boolean),
        ),
      ],
    };

    const companiesOfInterest = [...await this.gatherCompanySignals(userId)];

    return {
      user_id: userId,
      gathered_at: new Date().toISOString(),
      resume,
      skills,
      target_roles: [...new Set(targetRoles)],
      applications,
      application_companies: applicationCompanies,
      opportunities,
      opportunity_companies: opportunityCompanies,
      diagnoses,
      diagnosis_patterns: diagnosisPatterns,
      tasks,
      feed_relevant: feedRelevant,
      interviews,
      interview_patterns: interviewPatterns,
      mock_sessions: mockSessions,
      mock_readiness: mockReadiness,
      cover_letters: coverLetters,
      cover_letter_targets: coverLetterTargets,
      companies_of_interest: companiesOfInterest,
      has_resume: resume !== null,
      has_applications: applications.length > 0,
      has_opportunities: opportunities.length > 0,
    };
  }

  async gatherForCompany(
    userId: string,
    company: string,
  ): Promise<Evidence[]> {
    const intel = await this.gather(userId);
    const lc = company.toLowerCase();
    return [
      ...(intel.resume && this.companyMatch(intel.resume, lc)
        ? [intel.resume]
        : []),
      ...intel.applications.filter((e) => this.companyMatch(e, lc)),
      ...intel.opportunities.filter((e) => this.companyMatch(e, lc)),
      ...intel.diagnoses.filter((e) => this.companyMatch(e, lc)),
      ...intel.feed_relevant.filter((e) => this.companyMatch(e, lc)),
      ...intel.interviews.filter((e) => this.companyMatch(e, lc)),
      ...intel.mock_sessions.filter((e) => this.companyMatch(e, lc)),
      ...intel.cover_letters.filter((e) => this.companyMatch(e, lc)),
    ];
  }

  async getCompaniesOfInterest(userId: string): Promise<string[]> {
    return [...await this.gatherCompanySignals(userId)];
  }

  private async gatherCompanySignals(userId: string): Promise<Set<string>> {
    const [apps, opps, diags, interviews, mocks, coverLetters] =
      await Promise.all([
        this.appRepo.find({
          where: { user_id: userId },
          select: { company: true },
        }),
        this.oppRepo.find({
          where: { user_id: userId },
          select: { company: true },
        }),
        this.diagnosisRepo.find({
          where: { user_id: userId },
          select: { jd_company: true },
        }),
        this.interviewRepo.find({
          where: { user_id: userId },
          select: { company: true },
        }),
        this.mockRepo.find({
          where: { user_id: userId },
          select: { company: true },
        }),
        this.coverLetterRepo.find({
          where: { user_id: userId },
          select: { company: true },
        }),
      ]);

    const set = new Set<string>();
    for (const a of apps) if (a.company) set.add(a.company);
    for (const o of opps) if (o.company) set.add(o.company);
    for (const d of diags) if (d.jd_company) set.add(d.jd_company);
    for (const i of interviews) if (i.company) set.add(i.company);
    for (const m of mocks) if (m.company) set.add(m.company);
    for (const c of coverLetters) if (c.company) set.add(c.company);
    return set;
  }

  formatForAI(intelligence: UserIntelligence): string {
    const lines: string[] = [];

    lines.push('# 用户画像（证据层自动采集）');
    lines.push(`采集时间: ${intelligence.gathered_at}`);
    lines.push('');

    // Resume
    if (intelligence.resume) {
      lines.push('## 简历');
      lines.push(`- ${intelligence.resume.summary}`);
      if (intelligence.skills.length > 0) {
        lines.push(`- 技能: ${intelligence.skills.join(', ')}`);
      }
      lines.push('');
    } else {
      lines.push('## 简历');
      lines.push('- 暂无简历数据');
      lines.push('');
    }

    // Target roles
    if (intelligence.target_roles.length > 0) {
      lines.push(`## 目标岗位`);
      lines.push(`- ${intelligence.target_roles.join(', ')}`);
      lines.push('');
    }

    // Applications
    if (intelligence.applications.length > 0) {
      lines.push(`## 求职进展 (${intelligence.applications.length}条)`);
      for (const app of intelligence.applications) {
        lines.push(`- [${app.confidence}] ${app.summary}`);
      }
      lines.push('');
    }

    // Opportunities
    if (intelligence.opportunities.length > 0) {
      lines.push(`## 机会追踪 (${intelligence.opportunities.length}条)`);
      for (const opp of intelligence.opportunities) {
        lines.push(`- [${opp.confidence}] ${opp.summary}`);
      }
      lines.push('');
    }

    // Diagnoses
    if (intelligence.diagnoses.length > 0) {
      lines.push(`## 诊断历史 (${intelligence.diagnoses.length}条)`);
      for (const diag of intelligence.diagnoses) {
        lines.push(`- ${diag.summary}`);
      }
      if (intelligence.diagnosis_patterns.hit.length > 0) {
        lines.push(
          `- 命中关键词: ${intelligence.diagnosis_patterns.hit.join(', ')}`,
        );
      }
      if (intelligence.diagnosis_patterns.miss.length > 0) {
        lines.push(
          `- 缺失关键词: ${intelligence.diagnosis_patterns.miss.join(', ')}`,
        );
      }
      lines.push('');
    }

    // Tasks
    if (intelligence.tasks.length > 0) {
      lines.push(`## 今日任务 (${intelligence.tasks.length}条)`);
      for (const task of intelligence.tasks) {
        lines.push(`- ${task.summary}`);
      }
      lines.push('');
    }

    // Feed
    if (intelligence.feed_relevant.length > 0) {
      lines.push(`## 相关动态 (${intelligence.feed_relevant.length}条)`);
      for (const feed of intelligence.feed_relevant) {
        lines.push(`- ${feed.summary}`);
      }
      lines.push('');
    }

    // Interviews
    if (intelligence.interviews.length > 0) {
      lines.push(`### 面试记录 (${intelligence.interviews.length}条)`);
      if (intelligence.interview_patterns.companies_interviewed.length > 0) {
        lines.push(
          `- 面试公司: ${intelligence.interview_patterns.companies_interviewed.join(', ')}`,
        );
      }
      if (intelligence.interview_patterns.average_score !== null) {
        lines.push(
          `- 平均分: ${intelligence.interview_patterns.average_score}`,
        );
      }
      if (intelligence.interview_patterns.recent_questions.length > 0) {
        lines.push(
          `- 近期问题: ${intelligence.interview_patterns.recent_questions.join(', ')}`,
        );
      }
      if (intelligence.interview_patterns.knowledge_gaps.length > 0) {
        lines.push(
          `- 知识薄弱点: ${intelligence.interview_patterns.knowledge_gaps.join(', ')}`,
        );
      }
      for (const iv of intelligence.interviews) {
        lines.push(`- ${iv.summary}`);
      }
      lines.push('');
    }

    // Mock sessions
    if (intelligence.mock_sessions.length > 0) {
      lines.push(`### 模拟面试 (${intelligence.mock_sessions.length}条)`);
      lines.push(
        `- 总次数: ${intelligence.mock_readiness.sessions_count}`,
      );
      if (intelligence.mock_readiness.latest_grade) {
        lines.push(
          `- 最近评级: ${intelligence.mock_readiness.latest_grade}`,
        );
      }
      if (intelligence.mock_readiness.average_score !== null) {
        lines.push(
          `- 平均分: ${intelligence.mock_readiness.average_score}`,
        );
      }
      if (intelligence.mock_readiness.weak_areas.length > 0) {
        lines.push(
          `- 薄弱环节: ${intelligence.mock_readiness.weak_areas.join(', ')}`,
        );
      }
      for (const ms of intelligence.mock_sessions) {
        lines.push(`- ${ms.summary}`);
      }
      lines.push('');
    }

    // Cover letters
    if (intelligence.cover_letters.length > 0) {
      lines.push(`### 求职信 (${intelligence.cover_letters.length}条)`);
      if (intelligence.cover_letter_targets.companies.length > 0) {
        lines.push(
          `- 目标公司: ${intelligence.cover_letter_targets.companies.join(', ')}`,
        );
      }
      if (intelligence.cover_letter_targets.roles.length > 0) {
        lines.push(
          `- 目标岗位: ${intelligence.cover_letter_targets.roles.join(', ')}`,
        );
      }
      for (const cl of intelligence.cover_letters) {
        lines.push(`- ${cl.summary}`);
      }
      lines.push('');
    }

    // Companies
    if (intelligence.companies_of_interest.length > 0) {
      lines.push('## 关注公司');
      lines.push(`- ${intelligence.companies_of_interest.join(', ')}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  // ── Private sub-queries ───────────────────────────────────────────────

  private async gatherResume(userId: string): Promise<Evidence | null> {
    const resume = await this.resumeRepo.findOne({
      where: { user_id: userId, is_primary: true },
    });
    if (!resume) return null;

    const parsed = resume.parsed_json;
    const allSkills: string[] = [];
    if (parsed?.skills) {
      allSkills.push(
        ...parsed.skills.technical,
        ...parsed.skills.soft,
        ...parsed.skills.languages,
      );
    }

    return {
      source_type: 'resume',
      source_id: resume.id,
      confidence: parsed ? 'high' : 'medium',
      freshness: this.calcFreshness(resume.updated_at),
      summary: `简历「${resume.title}」- ${allSkills.length}项技能`,
      structured: {
        title: resume.title,
        skills: allSkills,
        has_parsed: !!parsed,
        work_experience_count: parsed?.work_experience?.length ?? 0,
        education_count: parsed?.education?.length ?? 0,
      },
      reason: '用户主简历',
      observed_at: resume.updated_at.toISOString(),
      weight: 1.0,
    };
  }

  private async gatherDiagnoses(userId: string): Promise<Evidence[]> {
    const diagnoses = await this.diagnosisRepo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: 5,
    });

    return diagnoses.map((d) => ({
      source_type: 'diagnosis' as const,
      source_id: d.id,
      confidence: d.score !== null ? ('high' as const) : ('low' as const),
      freshness: this.calcFreshness(d.created_at),
      summary: `诊断 ${d.jd_company ?? '未知公司'} - ${d.jd_role ?? '未知岗位'}: ${d.score ?? '未评分'}分`,
      structured: {
        jd_company: d.jd_company,
        jd_role: d.jd_role,
        score: d.score,
        keywords_hit: d.keywords_hit ?? [],
        keywords_miss: d.keywords_miss ?? [],
      },
      reason: '简历诊断记录',
      observed_at: d.created_at.toISOString(),
      weight: 0.7,
    }));
  }

  private async gatherApplications(userId: string): Promise<Evidence[]> {
    const apps = await this.appRepo.find({
      where: {
        user_id: userId,
        stage: Not('rejected'),
      },
      order: { updated_at: 'DESC' },
      take: 10,
    });

    return apps.map((a) => ({
      source_type: 'application' as const,
      source_id: a.id,
      confidence: 'high' as const,
      freshness: this.calcFreshness(a.updated_at),
      summary: `${a.company} - ${a.role} [${a.stage}]`,
      structured: {
        company: a.company,
        role: a.role,
        stage: a.stage,
        location: a.location,
        salary_range: a.salary_range,
      },
      reason: '活跃求职申请',
      observed_at: a.updated_at.toISOString(),
      weight: 0.9,
    }));
  }

  private async gatherTasks(userId: string): Promise<Evidence[]> {
    const today = new Date().toISOString().slice(0, 10);
    const tasks = await this.taskRepo.find({
      where: { user_id: userId, task_date: today },
    });

    return tasks.map((t) => ({
      source_type: 'task' as const,
      source_id: t.id,
      confidence: 'high' as const,
      freshness: 'current' as const,
      summary: `[${t.status}] ${t.title}`,
      structured: {
        title: t.title,
        task_type: t.task_type,
        status: t.status,
        duration_min: t.duration_min,
        linked_type: t.linked_type,
        linked_id: t.linked_id,
      },
      reason: '今日任务',
      observed_at: t.created_at.toISOString(),
      weight: 0.5,
    }));
  }

  private async gatherOpportunities(userId: string): Promise<Evidence[]> {
    const opps = await this.oppRepo.find({
      where: {
        user_id: userId,
        status: In(['evaluated', 'tracked']),
      },
      order: { updated_at: 'DESC' },
      take: 10,
    });

    if (opps.length === 0) return [];

    const oppIds = opps.map((o) => o.id);
    const evals = await this.evalRepo.find({
      where: { opportunity_id: In(oppIds) },
    });
    const evalMap = new Map(evals.map((e) => [e.opportunity_id, e]));

    return opps.map((o) => {
      const ev = evalMap.get(o.id);
      return {
        source_type: 'opportunity' as const,
        source_id: o.id,
        confidence: ev ? ('high' as const) : ('medium' as const),
        freshness: this.calcFreshness(o.updated_at),
        summary: `${o.company ?? '未知公司'} - ${o.role ?? '未知岗位'} [${o.status}]${ev ? ` 评分${ev.overall_score}` : ''}`,
        structured: {
          company: o.company,
          role: o.role,
          status: o.status,
          source_url: o.source_url,
          overall_score: ev?.overall_score ?? null,
          recommendation: ev?.recommendation ?? null,
          strengths: ev?.strengths ?? [],
          gaps: ev?.gaps ?? [],
        },
        reason: '机会评估',
        url: o.source_url ?? undefined,
        observed_at: o.updated_at.toISOString(),
        weight: 0.8,
      };
    });
  }

  private async gatherRelevantFeed(userId: string): Promise<Evidence[]> {
    const companies = await this.getCompaniesOfInterest(userId);
    if (companies.length === 0) return [];

    // Find feed items matching any company of interest
    const feeds = await this.feedRepo
      .createQueryBuilder('fi')
      .where('fi.company IN (:...companies)', { companies })
      .orderBy('fi.created_at', 'DESC')
      .take(10)
      .getMany();

    return feeds.map((f) => ({
      source_type: 'feed' as const,
      source_id: f.id,
      confidence: f.confidence === 'high' ? ('high' as const) : ('medium' as const),
      freshness: this.calcFreshness(f.created_at),
      summary: `[${f.company ?? ''}] ${f.title}`,
      structured: {
        company: f.company,
        role: f.role,
        category: f.category,
        source_kind: f.source_kind,
        source_url: f.source_url,
      },
      reason: '关注公司相关动态',
      url: f.source_url ?? undefined,
      observed_at: f.created_at.toISOString(),
      weight: 0.6,
    }));
  }

  private async gatherInterviews(userId: string): Promise<Evidence[]> {
    const interviews = await this.interviewRepo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: 5,
    });

    return interviews.map((i) => {
      const scores = i.scores ?? [];
      const avgScore =
        scores.length > 0
          ? Math.round(
              (scores.reduce((sum, s) => sum + s.score, 0) / scores.length) *
                10,
            ) / 10
          : null;

      const questions = i.questions ?? [];
      const questionTexts = [
        ...new Set(questions.map((q) => q.question).filter(Boolean)),
      ];
      const knowledgeGaps = [
        ...new Set(
          questions.flatMap((q) => q.knowledge_gaps ?? []).filter(Boolean),
        ),
      ];

      return {
        source_type: 'interview' as const,
        source_id: i.id,
        confidence: i.overall_grade ? ('high' as const) : ('medium' as const),
        freshness: this.calcFreshness(i.created_at),
        summary: `${i.company ?? '未知公司'} - ${i.role ?? '未知岗位'} ${i.round}轮${i.overall_grade ? ` [${i.overall_grade}]` : ''}`,
        structured: {
          company: i.company,
          role: i.role,
          round: i.round,
          overall_grade: i.overall_grade,
          overall_score: avgScore,
          question_texts: questionTexts,
          knowledge_gaps: knowledgeGaps,
          duration_min: i.duration_min,
        },
        reason: '面试记录',
        observed_at: i.created_at.toISOString(),
        weight: 0.8,
      };
    });
  }

  private async gatherMockSessions(userId: string): Promise<Evidence[]> {
    const sessions = await this.mockRepo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: 5,
    });

    return sessions.map((s) => ({
      source_type: 'mock_session' as const,
      source_id: s.id,
      confidence: s.evaluation ? ('high' as const) : ('low' as const),
      freshness: this.calcFreshness(s.created_at),
      summary: `模拟面试 ${s.company ?? ''} ${s.role ?? ''} [${s.status}]${s.evaluation ? ` ${s.evaluation.overall_grade}` : ''}`,
      structured: {
        company: s.company,
        role: s.role,
        mode: s.mode,
        status: s.status,
        overall_grade: s.evaluation?.overall_grade ?? null,
        overall_score: s.evaluation?.overall_score ?? null,
        strengths: s.evaluation?.strengths ?? [],
        weaknesses: s.evaluation?.weaknesses ?? [],
      },
      reason: '模拟面试记录',
      observed_at: s.created_at.toISOString(),
      weight: 0.6,
    }));
  }

  private async gatherCoverLetters(userId: string): Promise<Evidence[]> {
    const letters = await this.coverLetterRepo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: 5,
    });

    return letters.map((c) => ({
      source_type: 'cover_letter' as const,
      source_id: c.id,
      confidence: 'medium' as const,
      freshness: this.calcFreshness(c.created_at),
      summary: `求职信 ${c.company ?? ''} - ${c.role ?? ''} [${c.tone}]`,
      structured: {
        company: c.company,
        role: c.role,
        tone: c.tone,
        version: c.version,
        length_words: c.length_words,
      },
      reason: '求职信',
      observed_at: c.created_at.toISOString(),
      weight: 0.3,
    }));
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private calcFreshness(date: Date | null): 'current' | 'recent' | 'stale' {
    if (!date) return 'stale';
    const days = (Date.now() - date.getTime()) / 86400000;
    if (days < 7) return 'current';
    if (days < 30) return 'recent';
    return 'stale';
  }

  private settled<T>(
    result: PromiseSettledResult<T>,
    fallback: T,
  ): T {
    return result.status === 'fulfilled' ? result.value : fallback;
  }

  private companyMatch(evidence: Evidence, companyLower: string): boolean {
    const c = evidence.structured['company'];
    return typeof c === 'string' && c.toLowerCase().includes(companyLower);
  }
}
