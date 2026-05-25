import { Injectable } from '@nestjs/common';
import { EvidenceService } from '../intelligence/evidence.service';

@Injectable()
export class CoachContextService {
  constructor(private readonly evidence: EvidenceService) {}

  async buildContext(userId: string): Promise<string> {
    const intelligence = await this.evidence.gather(userId);
    return this.evidence.formatForAI(intelligence);
  }
}
