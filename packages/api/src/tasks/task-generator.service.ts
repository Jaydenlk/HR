import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DailyTask, TaskType, LinkedType } from './entities/daily-task.entity';
import { AiService } from '../ai/ai.service';
import { ResumesService } from '../resumes/resumes.service';
import { ApplicationsService } from '../applications/applications.service';
import { InterviewsService } from '../interviews/interviews.service';

interface AiTaskItem {
  title: string;
  duration_min: number | null;
  task_type: TaskType;
  reason: string;
  linked_type?: LinkedType;
  linked_id?: string;
}

interface AiTasksResult {
  tasks: AiTaskItem[];
}

@Injectable()
export class TaskGeneratorService {
  constructor(
    @InjectRepository(DailyTask)
    private readonly repo: Repository<DailyTask>,
    private readonly ai: AiService,
    private readonly resumes: ResumesService,
    private readonly applications: ApplicationsService,
    private readonly interviews: InterviewsService,
  ) {}

  private getTodayDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  async generateDailyTasks(userId: string): Promise<DailyTask[]> {
    const today = this.getTodayDate();

    // If tasks already exist for today, return existing
    const existing = await this.repo.find({
      where: { user_id: userId, task_date: today },
      order: { created_at: 'ASC' },
    });
    if (existing.length > 0) {
      return existing;
    }

    // Gather context
    const context = await this.gatherContext(userId);

    // Call AI to generate 5 personalized daily tasks
    const result = await this.ai.completeStructured<AiTasksResult>({
      system: `你是一位专业的职业规划教练，帮助用户规划每日求职任务。
根据用户的求职状态，生成5个个性化的今日任务，帮助用户高效推进求职进程。
任务类型说明：
- practice: 面试练习
- apply: 投递简历/申请
- review: 回顾复盘
- learn: 学习提升
- resume: 简历优化

每个任务需要有明确的行动指导，让用户知道具体要做什么。`,
      prompt: `用户的求职状态如下：
${context}

请生成5个适合今天完成的具体任务，要个性化、可操作、有价值。`,
      toolName: 'generate_daily_tasks',
      toolDescription: '生成每日求职任务列表',
      schema: {
        type: 'object',
        properties: {
          tasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string', description: '任务标题，简洁明确，20字以内' },
                duration_min: { type: 'number', description: '预计完成时间（分钟），可为null', nullable: true },
                task_type: {
                  type: 'string',
                  enum: ['practice', 'apply', 'review', 'learn', 'resume'],
                  description: '任务类型',
                },
                reason: { type: 'string', description: '为什么今天做这个任务，50字以内' },
                linked_type: {
                  type: 'string',
                  enum: ['diagnosis', 'interview', 'application'],
                  description: '关联模块类型（可选）',
                  nullable: true,
                },
                linked_id: { type: 'string', description: '关联项目的UUID（可选）', nullable: true },
              },
              required: ['title', 'task_type', 'reason'],
            },
            minItems: 5,
            maxItems: 5,
          },
        },
        required: ['tasks'],
      },
    });

    // Save to DB
    const tasks = result.tasks.slice(0, 5).map((item) =>
      this.repo.create({
        user_id: userId,
        task_date: today,
        title: item.title,
        duration_min: item.duration_min ?? null,
        task_type: item.task_type,
        reason: item.reason ?? null,
        status: 'todo',
        linked_type: item.linked_type ?? null,
        linked_id: item.linked_id ?? null,
      }),
    );

    return this.repo.save(tasks);
  }

  private async gatherContext(userId: string): Promise<string> {
    const lines: string[] = [];

    try {
      const resumes = await this.resumes.findAllByUser(userId);
      if (resumes.length === 0) {
        lines.push('简历状态：用户尚未上传简历');
      } else {
        const primary = resumes.find((r) => r.is_primary) ?? resumes[0];
        lines.push(`简历状态：共${resumes.length}份简历，主简历《${primary.title}》`);
      }
    } catch {
      lines.push('简历状态：无法获取');
    }

    try {
      const stats = await this.applications.getStats(userId);
      const total = Object.values(stats).reduce((a, b) => a + b, 0);
      if (total === 0) {
        lines.push('求职申请：尚未开始投递');
      } else {
        lines.push(
          `求职申请：共${total}个，其中投递中${stats.applied}个，面试阶段${stats.interview}个，` +
            `终面${stats.final}个，Offer${stats.offer}个，被拒${stats.rejected}个`,
        );
      }
    } catch {
      lines.push('求职申请：无法获取');
    }

    try {
      const interviews = await this.interviews.findAllByUser(userId);
      if (interviews.length === 0) {
        lines.push('面试记录：暂无面试记录');
      } else {
        // Find upcoming interviews (within next 7 days)
        const now = new Date();
        const upcoming = interviews
          .filter((i) => i.interview_at && new Date(i.interview_at) > now)
          .sort((a, b) => new Date(a.interview_at!).getTime() - new Date(b.interview_at!).getTime())
          .slice(0, 3);

        if (upcoming.length > 0) {
          const upcomingDesc = upcoming
            .map((i) => `${i.company ?? '未知公司'}（${i.interview_at?.slice(0, 10)}）`)
            .join('、');
          lines.push(`即将到来的面试：${upcomingDesc}`);
        }

        const recent = interviews.slice(0, 3);
        const recentDesc = recent
          .map((i) => `${i.company ?? '未知公司'} ${i.round}轮`)
          .join('、');
        lines.push(`最近面试记录：${recentDesc}`);
      }
    } catch {
      lines.push('面试记录：无法获取');
    }

    return lines.join('\n');
  }
}
