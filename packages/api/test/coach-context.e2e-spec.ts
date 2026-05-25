import { Test } from '@nestjs/testing';
import { CoachContextService } from '../src/conversations/coach-context.service';
import { EvidenceService } from '../src/intelligence/evidence.service';
import type { UserIntelligence } from '../src/intelligence/evidence.types';

describe('CoachContextService', () => {
  let service: CoachContextService;
  let evidenceMock: jest.Mocked<EvidenceService>;

  beforeEach(async () => {
    const mockEvidence = {
      gather: jest.fn(),
      formatForAI: jest.fn(),
      gatherForCompany: jest.fn(),
      getCompaniesOfInterest: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        CoachContextService,
        { provide: EvidenceService, useValue: mockEvidence },
      ],
    }).compile();

    service = module.get(CoachContextService);
    evidenceMock = module.get(EvidenceService);
  });

  function mockIntelligence(
    overrides?: Partial<UserIntelligence>,
  ): UserIntelligence {
    return {
      user_id: 'test-user',
      gathered_at: new Date().toISOString(),
      resume: null,
      skills: [],
      target_roles: [],
      applications: [],
      application_companies: [],
      opportunities: [],
      opportunity_companies: [],
      diagnoses: [],
      diagnosis_patterns: { hit: [], miss: [] },
      tasks: [],
      feed_relevant: [],
      salary_context: [],
      companies_of_interest: [],
      has_resume: false,
      has_applications: false,
      has_opportunities: false,
      ...overrides,
    };
  }

  it('calls evidence.gather with userId', async () => {
    const intel = mockIntelligence();
    evidenceMock.gather.mockResolvedValue(intel);
    evidenceMock.formatForAI.mockReturnValue('formatted context');

    await service.buildContext('user-123');
    expect(evidenceMock.gather).toHaveBeenCalledWith('user-123');
  });

  it('calls evidence.formatForAI with gathered intelligence', async () => {
    const intel = mockIntelligence({ has_resume: true });
    evidenceMock.gather.mockResolvedValue(intel);
    evidenceMock.formatForAI.mockReturnValue('formatted');

    await service.buildContext('user-123');
    expect(evidenceMock.formatForAI).toHaveBeenCalledWith(intel);
  });

  it('returns formatForAI result', async () => {
    evidenceMock.gather.mockResolvedValue(mockIntelligence());
    evidenceMock.formatForAI.mockReturnValue('## 用户求职档案\n...');

    const result = await service.buildContext('user-123');
    expect(result).toBe('## 用户求职档案\n...');
  });

  it('handles empty data user without throwing', async () => {
    evidenceMock.gather.mockResolvedValue(mockIntelligence());
    evidenceMock.formatForAI.mockReturnValue('');

    const result = await service.buildContext('empty-user');
    expect(result).toBe('');
    expect(evidenceMock.gather).toHaveBeenCalledWith('empty-user');
  });

  it('handles user with full data', async () => {
    const intel = mockIntelligence({
      has_resume: true,
      has_applications: true,
      has_opportunities: true,
      application_companies: ['字节跳动', '腾讯'],
      companies_of_interest: ['字节跳动', '腾讯', '阿里'],
    });
    evidenceMock.gather.mockResolvedValue(intel);
    evidenceMock.formatForAI.mockReturnValue('full context with data');

    const result = await service.buildContext('rich-user');
    expect(result).toBe('full context with data');
  });

  it('propagates gather errors', async () => {
    evidenceMock.gather.mockRejectedValue(new Error('DB down'));

    await expect(service.buildContext('user-x')).rejects.toThrow('DB down');
  });
});
