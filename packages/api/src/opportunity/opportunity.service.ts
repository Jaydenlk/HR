import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Opportunity } from './entities/opportunity.entity';
import { OpportunityEvaluation } from './entities/opportunity-evaluation.entity';
import { OpportunityEvidence } from './entities/opportunity-evidence.entity';
import { OpportunityAction } from './entities/opportunity-action.entity';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import type { OpportunityStatus } from './types/opportunity.types';

// 列表项 = 机会 + 最近一条评估概览(用于卡片渲染评分条/推荐徽章)。无评估时 evaluations 为空数组。
export type OpportunityListItem = Opportunity & { evaluations: OpportunityEvaluation[] };

@Injectable()
export class OpportunityService {
  constructor(
    @InjectRepository(Opportunity)
    private readonly repo: Repository<Opportunity>,
    @InjectRepository(OpportunityEvaluation)
    private readonly evalRepo: Repository<OpportunityEvaluation>,
    @InjectRepository(OpportunityEvidence)
    private readonly evidenceRepo: Repository<OpportunityEvidence>,
    @InjectRepository(OpportunityAction)
    private readonly actionRepo: Repository<OpportunityAction>,
  ) {}

  async create(userId: string, dto: CreateOpportunityDto): Promise<Opportunity> {
    const opportunity = this.repo.create({
      ...dto,
      user_id: userId,
      status: 'draft' as OpportunityStatus,
    });
    return this.repo.save(opportunity);
  }

  async findAllByUser(userId: string, status?: OpportunityStatus): Promise<OpportunityListItem[]> {
    const where: Record<string, unknown> = { user_id: userId };
    if (status) {
      where.status = status;
    }
    const opportunities = await this.repo.find({ where, order: { updated_at: 'DESC' } });
    if (opportunities.length === 0) {
      return [];
    }

    // 批量带上每个机会的最近一条评估,供列表卡片渲染评分条/推荐徽章(避免 N+1)。
    const ids = opportunities.map((o) => o.id);
    const evaluations = await this.evalRepo.find({
      where: { opportunity_id: In(ids) },
      order: { created_at: 'DESC' },
    });
    const latestByOpp = new Map<string, OpportunityEvaluation>();
    for (const ev of evaluations) {
      if (!latestByOpp.has(ev.opportunity_id)) {
        latestByOpp.set(ev.opportunity_id, ev);
      }
    }

    return opportunities.map((o) => {
      const latest = latestByOpp.get(o.id);
      return Object.assign(o, { evaluations: latest ? [latest] : [] });
    });
  }

  async findOne(id: string, userId: string): Promise<Opportunity> {
    const opportunity = await this.repo.findOne({ where: { id, user_id: userId } });
    if (!opportunity) {
      throw new NotFoundException('机会不存在');
    }
    return opportunity;
  }

  async findOneWithDetails(id: string, userId: string) {
    const opportunity = await this.findOne(id, userId);
    const [evaluations, evidences, actions] = await Promise.all([
      this.evalRepo.find({ where: { opportunity_id: id }, order: { created_at: 'DESC' } }),
      this.evidenceRepo.find({ where: { opportunity_id: id }, order: { created_at: 'DESC' } }),
      this.actionRepo.find({ where: { opportunity_id: id }, order: { created_at: 'DESC' } }),
    ]);
    return { ...opportunity, evaluations, evidences, actions };
  }

  async setStatus(id: string, userId: string, status: OpportunityStatus, errorMessage?: string): Promise<void> {
    const opportunity = await this.findOne(id, userId);
    opportunity.status = status;
    if (errorMessage !== undefined) {
      opportunity.error_message = errorMessage;
    }
    await this.repo.save(opportunity);
  }

  async remove(id: string, userId: string): Promise<Opportunity> {
    const opportunity = await this.findOne(id, userId);
    return this.repo.remove(opportunity);
  }

  /**
   * Remove all prior evaluation artifacts for an opportunity so a re-evaluation
   * replaces (not appends to) the previous result. Called right before persisting
   * a fresh evaluation, so a failed AI run leaves the previous good data intact.
   */
  async clearEvaluationData(opportunityId: string): Promise<void> {
    await Promise.all([
      this.evalRepo.delete({ opportunity_id: opportunityId }),
      this.evidenceRepo.delete({ opportunity_id: opportunityId }),
      this.actionRepo.delete({ opportunity_id: opportunityId }),
    ]);
  }

  async saveEvaluation(partial: Partial<OpportunityEvaluation>): Promise<OpportunityEvaluation> {
    return this.evalRepo.save(this.evalRepo.create(partial));
  }

  async saveEvidence(items: Partial<OpportunityEvidence>[]): Promise<OpportunityEvidence[]> {
    return this.evidenceRepo.save(items.map((item) => this.evidenceRepo.create(item)));
  }

  async saveActions(items: Partial<OpportunityAction>[]): Promise<OpportunityAction[]> {
    return this.actionRepo.save(items.map((item) => this.actionRepo.create(item)));
  }

  async updateOpportunity(id: string, userId: string, partial: Partial<Opportunity>): Promise<void> {
    const opportunity = await this.findOne(id, userId);
    Object.assign(opportunity, partial);
    await this.repo.save(opportunity);
  }
}
