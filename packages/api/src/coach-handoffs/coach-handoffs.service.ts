import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CoachHandoff, HandoffStatus } from './entities/coach-handoff.entity';

// 合法流转表:proposed 可转 accepted/dismissed,accepted 可转 completed。
// dismissed 和 completed 是终态,不可再转。
const VALID_TRANSITIONS: Record<HandoffStatus, HandoffStatus[]> = {
  proposed: ['accepted', 'dismissed'],
  accepted: ['completed'],
  dismissed: [],
  completed: [],
};

@Injectable()
export class CoachHandoffsService {
  constructor(
    @InjectRepository(CoachHandoff)
    private readonly repo: Repository<CoachHandoff>,
  ) {}

  async create(data: {
    user_id: string;
    conversation_id: string;
    message_id?: string;
    target: CoachHandoff['target'];
    payload: Record<string, unknown>;
  }): Promise<CoachHandoff> {
    const handoff = this.repo.create({
      user_id: data.user_id,
      conversation_id: data.conversation_id,
      message_id: data.message_id ?? null,
      target: data.target,
      payload: data.payload,
      status: 'proposed',
    } as Partial<CoachHandoff>);
    return this.repo.save(handoff) as Promise<CoachHandoff>;
  }

  async findOne(id: string, userId: string): Promise<CoachHandoff> {
    // 404 不泄露存在性:owner 不匹配时与不存在等价(统一 NotFoundException)。
    const handoff = await this.repo.findOne({ where: { id } });
    if (!handoff || handoff.user_id !== userId) throw new NotFoundException();
    return handoff;
  }

  async updateStatus(
    id: string,
    userId: string,
    newStatus: HandoffStatus,
  ): Promise<CoachHandoff> {
    const handoff = await this.findOne(id, userId);
    const allowed = VALID_TRANSITIONS[handoff.status];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `状态流转不合法:${handoff.status} → ${newStatus}`,
      );
    }
    handoff.status = newStatus;
    return this.repo.save(handoff) as Promise<CoachHandoff>;
  }

}
