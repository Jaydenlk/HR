import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Opportunity } from './entities/opportunity.entity';
import { OpportunityEvaluation } from './entities/opportunity-evaluation.entity';
import { OpportunityEvidence } from './entities/opportunity-evidence.entity';
import { OpportunityAction } from './entities/opportunity-action.entity';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import type { OpportunityStatus } from './types/opportunity.types';

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

  async findAllByUser(userId: string, status?: OpportunityStatus): Promise<Opportunity[]> {
    const where: Record<string, unknown> = { user_id: userId };
    if (status) {
      where.status = status;
    }
    return this.repo.find({ where, order: { updated_at: 'DESC' } });
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
