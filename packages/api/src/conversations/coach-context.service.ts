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
import type { ParsedResume } from '../common/types';

@Injectable()
export class CoachContextService {
  constructor(
    @InjectRepository(Resume)
    private readonly resumeRepo: Repository<Resume>,
    @InjectRepository(Diagnosis)
    private readonly diagnosisRepo: Repository<Diagnosis>,
    @InjectRepository(Application)
    private readonly applicationRepo: Repository<Application>,
    @InjectRepository(DailyTask)
    private readonly taskRepo: Repository<DailyTask>,
    @InjectRepository(Opportunity)
    private readonly oppRepo: Repository<Opportunity>,
    @InjectRepository(OpportunityEvaluation)
    private readonly evalRepo: Repository<OpportunityEvaluation>,
    @InjectRepository(FeedItem)
    private readonly feedRepo: Repository<FeedItem>,
  ) {}

  async buildContext(userId: string): Promise<string> {
    const sections: string[] = [];

    // (a) Primary resume
    const resumeSection = await this.buildResumeSection(userId);
    if (resumeSection) sections.push(resumeSection);

    // (b) Active applications
    const appSection = await this.buildApplicationsSection(userId);
    if (appSection) sections.push(appSection);

    // (c) Recent opportunities with evaluations
    const oppSection = await this.buildOpportunitiesSection(userId);
    if (oppSection) sections.push(oppSection);

    // (d) Today's tasks
    const taskSection = await this.buildTasksSection(userId);
    if (taskSection) sections.push(taskSection);

    // (e) Recent diagnoses
    const diagSection = await this.buildDiagnosesSection(userId);
    if (diagSection) sections.push(diagSection);

    // (f) Related feed items
    const feedSection = await this.buildFeedSection(userId);
    if (feedSection) sections.push(feedSection);

    if (sections.length === 0) return '';

    return `## 用户求职档案\n\n${sections.join('\n\n')}`;
  }

  private async buildResumeSection(userId: string): Promise<string | null> {
    try {
      const resume = await this.resumeRepo.findOne({
        where: { user_id: userId, is_primary: true },
      });
      if (!resume?.parsed_json) return null;

      const parsed: ParsedResume = resume.parsed_json;
      const lines: string[] = ['### 简历'];

      const allSkills = [
        ...(parsed.skills?.technical || []),
        ...(parsed.skills?.soft || []),
      ];
      if (allSkills.length > 0) {
        lines.push(`- 核心技能：${allSkills.join(', ')}`);
      }

      const recentExp = (parsed.work_experience || []).slice(0, 3);
      if (recentExp.length > 0) {
        const expTitles = recentExp.map((e) => `${e.company}${e.title}`).join(', ');
        lines.push(`- 最近经历：${expTitles}`);
      }

      const edu = (parsed.education || []).slice(0, 2);
      if (edu.length > 0) {
        const eduText = edu.map((e) => `${e.school} ${e.major}`).join(', ');
        lines.push(`- 教育背景：${eduText}`);
      }

      return lines.length > 1 ? lines.join('\n') : null;
    } catch {
      return null;
    }
  }

  private async buildApplicationsSection(userId: string): Promise<string | null> {
    try {
      const apps = await this.applicationRepo.find({
        where: { user_id: userId, stage: Not('rejected') },
        order: { updated_at: 'DESC' },
        take: 5,
      });
      if (apps.length === 0) return null;

      const stageLabels: Record<string, string> = {
        wishlist: '待投递',
        applied: '已投递',
        interview: '面试中',
        final: '终面',
        offer: '已拿offer',
      };

      const lines: string[] = ['### 在投岗位'];
      for (const app of apps) {
        const label = stageLabels[app.stage] || app.stage;
        lines.push(`- ${app.company} ${app.role} (${label})`);
      }
      return lines.join('\n');
    } catch {
      return null;
    }
  }

  private async buildOpportunitiesSection(userId: string): Promise<string | null> {
    try {
      const opps = await this.oppRepo.find({
        where: { user_id: userId, status: In(['evaluated', 'tracked']) },
        order: { updated_at: 'DESC' },
        take: 3,
      });
      if (opps.length === 0) return null;

      const recLabels: Record<string, string> = {
        strongly_recommend: '强烈推荐',
        recommend: '推荐',
        neutral: '中性',
        cautious: '谨慎',
        not_recommend: '不推荐',
      };

      const lines: string[] = ['### 机会评估'];
      for (const opp of opps) {
        const eval_ = await this.evalRepo.findOne({
          where: { opportunity_id: opp.id },
          order: { created_at: 'DESC' },
        });
        if (eval_) {
          const recText = recLabels[eval_.recommendation] || eval_.recommendation;
          const matchPct = Math.round(eval_.match_score * 100);
          lines.push(`- ${opp.company || '未知'} ${opp.role || '未知'} — ${recText}，匹配度 ${matchPct}%`);
        } else {
          lines.push(`- ${opp.company || '未知'} ${opp.role || '未知'} — 评估中`);
        }
      }
      return lines.length > 1 ? lines.join('\n') : null;
    } catch {
      return null;
    }
  }

  private async buildTasksSection(userId: string): Promise<string | null> {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const tasks = await this.taskRepo.find({
        where: { user_id: userId, task_date: today },
        order: { created_at: 'ASC' },
      });
      if (tasks.length === 0) return null;

      const lines: string[] = ['### 今日任务'];
      for (const t of tasks) {
        const icon = t.status === 'done' ? '✅' : '⬜';
        lines.push(`- ${icon} ${t.title}`);
      }
      return lines.join('\n');
    } catch {
      return null;
    }
  }

  private async buildDiagnosesSection(userId: string): Promise<string | null> {
    try {
      const diags = await this.diagnosisRepo.find({
        where: { user_id: userId },
        order: { created_at: 'DESC' },
        take: 3,
      });
      if (diags.length === 0) return null;

      const lines: string[] = ['### 最近诊断'];
      for (const d of diags) {
        const company = d.jd_company || '未知';
        const role = d.jd_role || '未知';
        const score = d.score != null ? `${d.score}/100` : '评分中';
        lines.push(`- ${company} ${role} — ${score}`);
      }
      return lines.join('\n');
    } catch {
      return null;
    }
  }

  private async buildFeedSection(userId: string): Promise<string | null> {
    try {
      // Get companies from user's active applications
      const apps = await this.applicationRepo.find({
        where: { user_id: userId, stage: Not('rejected') },
        select: { company: true },
        take: 10,
      });
      const companies = [...new Set(apps.map((a) => a.company).filter(Boolean))];
      if (companies.length === 0) return null;

      // Find feed items matching those companies
      const items = await this.feedRepo
        .createQueryBuilder('fi')
        .where('fi.company IN (:...companies)', { companies })
        .orderBy('fi.created_at', 'DESC')
        .take(5)
        .getMany();

      if (items.length === 0) return null;

      const lines: string[] = ['### 相关面经'];
      for (const item of items) {
        lines.push(`- ${item.title}`);
      }
      return lines.join('\n');
    } catch {
      return null;
    }
  }
}
