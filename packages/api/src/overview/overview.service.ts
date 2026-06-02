import { Injectable } from '@nestjs/common';
import { ApplicationsService } from '../applications/applications.service';
import { InterviewsService } from '../interviews/interviews.service';
import { ResumesService } from '../resumes/resumes.service';
import { DiagnosesService } from '../diagnoses/diagnoses.service';
import { ConversationsService } from '../conversations/conversations.service';

export interface DashboardData {
  funnel: {
    wishlist: number;
    applied: number;
    interview: number;
    final: number;
    offer: number;
    rejected: number;
  };
  interviews: {
    total: number;
    avgGrade: string | null;
    recentGrades: Array<{ company: string; grade: string; date: string }>;
  };
  resumes: {
    total: number;
    primaryTitle: string | null;
    latestDiagnosisScore: number | null;
  };
  activity: {
    totalDiagnoses: number;
    totalConversations: number;
  };
}

const GRADE_ORDER = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D'];

function gradeToNum(grade: string): number {
  const idx = GRADE_ORDER.indexOf(grade);
  return idx === -1 ? -1 : GRADE_ORDER.length - 1 - idx;
}

function numToGrade(num: number): string | null {
  const rounded = Math.round(num);
  return GRADE_ORDER[GRADE_ORDER.length - 1 - rounded] ?? null;
}

@Injectable()
export class OverviewService {
  constructor(
    private readonly applications: ApplicationsService,
    private readonly interviews: InterviewsService,
    private readonly resumes: ResumesService,
    private readonly diagnoses: DiagnosesService,
    private readonly conversations: ConversationsService,
  ) {}

  async getDashboard(userId: string): Promise<DashboardData> {
    // Run all data fetches in parallel
    const [funnel, allInterviews, allResumes, allDiagnoses, allConversations] =
      await Promise.all([
        this.applications.getStats(userId),
        this.interviews.findAllByUser(userId),
        this.resumes.findAllByUser(userId),
        this.diagnoses.findAllByUser(userId),
        this.conversations.findAllByUser(userId),
      ]);

    // --- Interviews stats ---
    const graded = allInterviews.filter(
      (iv) => iv.overall_grade && gradeToNum(iv.overall_grade) !== -1,
    );

    let avgGrade: string | null = null;
    if (graded.length > 0) {
      const avg =
        graded.reduce((sum, iv) => sum + gradeToNum(iv.overall_grade!), 0) /
        graded.length;
      avgGrade = numToGrade(avg);
    }

    // 最近评分:取最新 5 条已评分面试,按 created_at DESC 稳定排序。
    // created_at 仅秒级精度,批量插入会撞同一时刻;不能依赖仓库返回序(并列项退化为
    // 行号 ASC,slice 会反向取到最旧的),故此处显式重排,并用 id 作为确定性 tiebreaker,
    // 保证并列时刻下输出依然稳定、不随插入顺序漂移。filter 在排序前,排序覆盖其影响。
    const recentGrades = allInterviews
      .filter((iv) => iv.overall_grade)
      .sort((a, b) => {
        const diff = b.created_at.getTime() - a.created_at.getTime();
        return diff !== 0 ? diff : b.id.localeCompare(a.id);
      })
      .slice(0, 5)
      .map((iv) => ({
        company: iv.company ?? iv.application?.company ?? '未知公司',
        grade: iv.overall_grade!,
        date: iv.created_at.toISOString().slice(0, 10),
      }));

    // --- Resume stats ---
    const primaryResume = allResumes.find((r) => r.is_primary) ?? allResumes[0] ?? null;
    const primaryTitle = primaryResume?.title ?? null;

    // Latest diagnosis score (across all resumes, sorted by created_at DESC)
    const latestDiagnosisScore = allDiagnoses.length > 0 ? allDiagnoses[0].score : null;

    return {
      funnel,
      interviews: {
        total: allInterviews.length,
        avgGrade,
        recentGrades,
      },
      resumes: {
        total: allResumes.length,
        primaryTitle,
        latestDiagnosisScore,
      },
      activity: {
        totalDiagnoses: allDiagnoses.length,
        totalConversations: allConversations.length,
      },
    };
  }
}
