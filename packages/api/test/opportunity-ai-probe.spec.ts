import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AiModule } from '../src/ai/ai.module';
import { AiService } from '../src/ai/ai.service';

interface JdProbeResult {
  company: string;
  role: string;
  location: string;
  risk_level: 'low' | 'medium' | 'high';
  match_score: number;
}

describe('CloudDreamAI Structured Output Probe', () => {
  let ai: AiService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), AiModule],
    }).compile();
    ai = module.get(AiService);
  });

  it('should return structured JSON for JD analysis', async () => {
    const result = await ai.completeStructured<JdProbeResult>({
      system: '你是一个 JD 结构化解析器。从 JD 文本中提取公司、岗位、地点信息，并评估风险等级和匹配分数。',
      prompt: '字节跳动招聘后端开发工程师，要求精通 Go 或 Java，熟悉分布式系统，3年以上工作经验。base 北京海淀，月薪 25K-50K（15薪）。团队：抖音电商-交易中台。',
      toolName: 'jd_analysis',
      toolDescription: '从 JD 文本中提取结构化信息',
      schema: {
        type: 'object',
        properties: {
          company: { type: 'string', description: '公司名称' },
          role: { type: 'string', description: '岗位名称' },
          location: { type: 'string', description: '工作地点' },
          risk_level: { type: 'string', enum: ['low', 'medium', 'high'], description: '风险等级' },
          match_score: { type: 'number', description: '0-1 之间的匹配分数' },
        },
        required: ['company', 'role', 'location', 'risk_level', 'match_score'],
      },
    });

    expect(result).toBeDefined();
    expect(typeof result.company).toBe('string');
    expect(result.company.length).toBeGreaterThan(0);
    expect(typeof result.role).toBe('string');
    expect(typeof result.location).toBe('string');
    expect(['low', 'medium', 'high']).toContain(result.risk_level);
    expect(typeof result.match_score).toBe('number');
    expect(result.match_score).toBeGreaterThanOrEqual(0);
    expect(result.match_score).toBeLessThanOrEqual(1);
  }, 30000);

  it('should detect training lure risk in suspicious JD', async () => {
    const result = await ai.completeStructured<JdProbeResult>({
      system: '你是一个 JD 结构化解析器。从 JD 文本中提取公司、岗位、地点信息，并评估风险等级和匹配分数。如果 JD 疑似培训引流，risk_level 必须为 high。',
      prompt: 'XX科技招聘AI工程师，0基础可转行，入职前先培训3个月，培训费用可分期，培训后包就业，月薪15K-30K。',
      toolName: 'jd_analysis',
      toolDescription: '从 JD 文本中提取结构化信息',
      schema: {
        type: 'object',
        properties: {
          company: { type: 'string', description: '公司名称' },
          role: { type: 'string', description: '岗位名称' },
          location: { type: 'string', description: '工作地点' },
          risk_level: { type: 'string', enum: ['low', 'medium', 'high'], description: '风险等级' },
          match_score: { type: 'number', description: '0-1 之间的匹配分数' },
        },
        required: ['company', 'role', 'location', 'risk_level', 'match_score'],
      },
    });

    expect(result).toBeDefined();
    expect(result.risk_level).toBe('high');
  }, 30000);
});
