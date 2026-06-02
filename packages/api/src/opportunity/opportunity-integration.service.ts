import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Opportunity } from './entities/opportunity.entity';
import { OpportunityAction } from './entities/opportunity-action.entity';
import { OpportunityEvaluation } from './entities/opportunity-evaluation.entity';
import { Application } from '../applications/entities/application.entity';
import { ApplicationEvent } from '../applications/entities/application-event.entity';
import { DailyTask } from '../tasks/entities/daily-task.entity';

@Injectable()
export class OpportunityIntegrationService {
  constructor(
    @InjectRepository(Opportunity)
    private readonly opportunityRepo: Repository<Opportunity>,
    @InjectRepository(OpportunityAction)
    private readonly actionRepo: Repository<OpportunityAction>,
    @InjectRepository(OpportunityEvaluation)
    private readonly evalRepo: Repository<OpportunityEvaluation>,
    @InjectRepository(Application)
    private readonly applicationRepo: Repository<Application>,
    @InjectRepository(ApplicationEvent)
    private readonly applicationEventRepo: Repository<ApplicationEvent>,
    @InjectRepository(DailyTask)
    private readonly taskRepo: Repository<DailyTask>,
  ) {}

  async trackToApplication(opportunityId: string, userId: string): Promise<Application> {
    const opportunity = await this.opportunityRepo.findOne({
      where: { id: opportunityId, user_id: userId },
    });
    if (!opportunity) {
      throw new NotFoundException('机会不存在');
    }
    if (opportunity.status !== 'evaluated') {
      throw new BadRequestException('只有已评估的机会才能投递追踪，当前状态：' + opportunity.status);
    }

    const application = await this.applicationRepo.save(
      this.applicationRepo.create({
        user_id: userId,
        company: opportunity.company ?? '',
        role: opportunity.role ?? '',
        location: opportunity.location ?? undefined,
        stage: 'wishlist',
      }),
    );

    await this.applicationEventRepo.save(
      this.applicationEventRepo.create({
        application_id: application.id,
        from_stage: null,
        to_stage: 'wishlist',
        note: `从机会追踪创建：${opportunity.company ?? ''} - ${opportunity.role ?? ''}`,
      }),
    );

    opportunity.application_id = application.id;
    opportunity.status = 'tracked';
    await this.opportunityRepo.save(opportunity);

    return application;
  }

  async generateTasks(opportunityId: string, userId: string): Promise<DailyTask[]> {
    const opportunity = await this.opportunityRepo.findOne({
      where: { id: opportunityId, user_id: userId },
    });
    if (!opportunity) {
      throw new NotFoundException('机会不存在');
    }

    // Idempotent: only actions that have not yet produced a task. linked_task_id
    // is set below once a task is created, so a repeat call skips them and never
    // duplicates tasks.
    const actions = await this.actionRepo.find({
      where: { opportunity_id: opportunityId, status: 'pending', linked_task_id: IsNull() },
      order: { created_at: 'ASC' },
    });

    const top3 = actions.slice(0, 3);
    if (top3.length === 0) {
      return [];
    }

    const today = new Date().toISOString().slice(0, 10);
    const createdTasks: DailyTask[] = [];

    for (const action of top3) {
      const task = await this.taskRepo.save(
        this.taskRepo.create({
          user_id: userId,
          task_date: today,
          title: action.title,
          task_type: mapActionTypeToTaskType(action.action_type),
          reason: action.reason,
          status: 'todo',
          linked_type: 'opportunity',
          linked_id: opportunityId,
          duration_min: null,
        }),
      );

      action.linked_task_id = task.id;
      await this.actionRepo.save(action);

      createdTasks.push(task);
    }

    return createdTasks;
  }

  async getChatContext(opportunityId: string, userId: string): Promise<{ system_message: string }> {
    const opportunity = await this.opportunityRepo.findOne({
      where: { id: opportunityId, user_id: userId },
    });
    if (!opportunity) {
      throw new NotFoundException('机会不存在');
    }

    const [evaluations, actions] = await Promise.all([
      this.evalRepo.find({
        where: { opportunity_id: opportunityId },
        order: { created_at: 'DESC' },
      }),
      this.actionRepo.find({
        where: { opportunity_id: opportunityId },
        order: { created_at: 'ASC' },
      }),
    ]);

    const latestEval = evaluations[0];
    const lines: string[] = [
      `## 机会背景`,
      `- 公司：${opportunity.company ?? '未知'}`,
      `- 职位：${opportunity.role ?? '未知'}`,
      `- 地点：${opportunity.location ?? '未知'}`,
      `- 状态：${opportunity.status}`,
    ];

    if (latestEval) {
      lines.push(
        `\n## 评估结果`,
        `- 综合评分：${latestEval.overall_score}/100`,
        `- 匹配度：${latestEval.match_score}/100`,
        `- 岗位价值：${latestEval.value_score}/100`,
        `- 可信度：${latestEval.credibility_score}/100`,
        `- 推荐建议：${latestEval.recommendation}`,
        `- 置信度：${latestEval.confidence}`,
      );
      if (latestEval.strengths.length > 0) {
        lines.push(`- 优势：${latestEval.strengths.join('、')}`);
      }
      if (latestEval.gaps.length > 0) {
        lines.push(`- 不足：${latestEval.gaps.join('、')}`);
      }
      if (latestEval.risk_flags.length > 0) {
        lines.push(`- 风险提示：${latestEval.risk_flags.join('、')}`);
      }
    }

    if (actions.length > 0) {
      lines.push(`\n## 建议行动`);
      for (const action of actions) {
        lines.push(`- [${action.action_type}] ${action.title}：${action.reason}`);
      }
    }

    return { system_message: lines.join('\n') };
  }
}

function mapActionTypeToTaskType(actionType: string): string {
  const mapping: Record<string, string> = {
    optimize_resume: 'resume',
    write_cover_letter: 'resume',
    prepare_interview: 'practice',
    research_company: 'learn',
    apply: 'apply',
    dismiss: 'review',
  };
  return mapping[actionType] ?? 'review';
}
