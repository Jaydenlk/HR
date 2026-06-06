import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestionBank } from './entities/question-bank.entity';
import { GenerateQuestionBankDto } from './dto/generate-question-bank.dto';
import {
  QuestionBankResult,
  QuestionBankResponse,
  QuestionBankListItem,
  QuestionItem,
} from './dto/question-bank-response.dto';
import { AiService } from '../ai/ai.service';


@Injectable()
export class QuestionBankService {
  constructor(
    @InjectRepository(QuestionBank)
    private readonly repo: Repository<QuestionBank>,
    private readonly ai: AiService,
  ) {}

  async generate(userId: string, dto: GenerateQuestionBankDto): Promise<QuestionBankResponse> {
    const result = await this.ai.completeStructured<QuestionBankResult>({
      system: this.buildSystem(dto),
      prompt: this.buildPrompt(dto),
      toolName: 'question_bank_build',
      toolDescription: '输出针对特定公司+岗位的结构化面试题库，含来源标注、频率、覆盖度与空白区域',
      schema: OUTPUT_SCHEMA,
    });

    const guarded = this.applyGuards(result);

    const record = this.repo.create({
      user_id: userId,
      company: dto.company,
      role: dto.role,
      result_json: JSON.stringify(guarded),
    });

    const saved = await this.repo.save(record);
    return this.toResponse(saved, guarded);
  }

  async findAllByUser(userId: string): Promise<QuestionBankListItem[]> {
    const records = await this.repo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });

    return records.map((r) => {
      const result: QuestionBankResult = JSON.parse(r.result_json);
      return {
        id: r.id,
        company: r.company,
        role: r.role,
        summary: result.summary,
        confidence: result.confidence,
        total_questions: result.coverage?.total_questions ?? 0,
        created_at: r.created_at.toISOString(),
      };
    });
  }

  async findOne(id: string, userId: string): Promise<QuestionBankResponse> {
    const record = await this.repo.findOne({ where: { id, user_id: userId } });
    if (!record) throw new NotFoundException();
    const result: QuestionBankResult = JSON.parse(record.result_json);
    return this.toResponse(record, result);
  }

  async remove(id: string, userId: string): Promise<void> {
    const record = await this.repo.findOne({ where: { id, user_id: userId } });
    if (!record) throw new NotFoundException();
    await this.repo.remove(record);
  }

  // ── 服务端确定性 guard ──────────────────────────────────────────────────────

  private applyGuards(result: QuestionBankResult): QuestionBankResult {
    const questions = (result.question_bank ?? []).map((q) => {
      // Guard 1: source 必填 — 无数据时标「岗位知识图谱通用」
      const source = q.source?.trim() ? q.source : '岗位知识图谱通用';

      // Guard 2: frequency 不得无依据标 very_high —
      // 仅当 source 包含「高频」「面经」「牛客」「实际」等实数据来源词汇时才允许 very_high
      const realSourceKeywords = ['高频', '面经', '牛客', '实际', '大量', '常见', 'high-freq'];
      const hasRealSource = realSourceKeywords.some((kw) =>
        source.toLowerCase().includes(kw.toLowerCase()),
      );
      const frequency =
        q.frequency === 'very_high' && !hasRealSource ? 'high' : q.frequency;

      // Guard 3: answer_hint 只给要点 — 不超过 200 字，过长截断并提示
      let answer_hint = q.answer_hint;
      if (answer_hint && answer_hint.length > 200) {
        answer_hint = answer_hint.slice(0, 197) + '…';
      }

      return { ...q, source, frequency, ...(answer_hint !== undefined ? { answer_hint } : {}) };
    });

    // Guard 4: gaps[] 必须列出 — 若 AI 返回空数组但 confidence 非 high，补一条兜底说明
    let gaps = result.gaps ?? [];
    if (
      gaps.length === 0 &&
      result.confidence !== 'high' &&
      questions.some((q) => q.source === '岗位知识图谱通用')
    ) {
      gaps = [
        {
          area: '实时面经数据',
          reason: '当前题目基于岗位知识图谱通用经验，缺乏该公司实时面经数据支撑',
          workaround: '可在牛客、Offer show 等平台搜索该公司近期面经补充',
        },
      ];
    }

    return { ...result, question_bank: questions, gaps };
  }

  // ── Response mapping — no user_id ──────────────────────────────────────────

  private toResponse(record: QuestionBank, result: QuestionBankResult): QuestionBankResponse {
    return {
      id: record.id,
      company: record.company,
      role: record.role,
      result,
      created_at: record.created_at.toISOString(),
    };
  }

  // ── Prompt builders ────────────────────────────────────────────────────────

  private buildSystem(dto: GenerateQuestionBankDto): string {
    return `你是一位专注中国校招市场的职业发展教练，擅长构建结构化面试题库。

## 题型配比说明

根据目标岗位「${dto.role}」从行业题型配比表中取对应配比，按权重分配题量。
若未命中具体职业，使用通用配比：行为面 30 / 案例 30 / 技术 20 / 文化契合 20。
在 gaps[] 中标注「未命中职业题型配比，按通用权重」。

## 防编造硬规则（违反即为错误输出）

1. 所有题目必须有可追溯来源：
   - 有真实面经数据 → source 填写「牛客2025-2026高频」等具体来源
   - 基于知识图谱推断 → source 必须填写「岗位知识图谱通用」，不得标注高频
2. **frequency 规则**：
   - very_high 仅允许在 source 中包含「高频/面经/牛客/实际/大量」等真实数据词时使用
   - 推断题目 frequency 上限为 high，不得标 very_high
3. **answer_hint 规则**：
   - 只给回答要点方向，不给完整答案，200字以内
   - 禁止给出「标准答案」或完整解题过程
4. gaps[] 必须诚实列出无法覆盖的题目方向及原因
5. 无数据时降级，在 gaps 标注「无面经数据」，不得捏造「真实高频」题目

## 题目分类体系

- behavioral: STAR结构行为题（所有岗位）
- technical_cs: 计算机基础（技术岗）
- technical_domain: 领域专业知识（技术岗）
- case_product: 产品/运营案例题
- case_business: 商业分析/市场估算（咨询/策略）
- motivation: 求职动机/职业规划（所有岗位）
- cultural_fit: 价值观/文化契合（所有岗位）
- system_design: 系统/架构设计（技术岗）

## 输出要求

- 全部中文，字段名保持英文
- summary 简述题库概况（2-3句）
- confidence 诚实反映数据质量：有实时面经 = high/medium；纯推断 = low
- 题目总数建议 15-25 道（按岗位需要调整）`;
  }

  private buildPrompt(dto: GenerateQuestionBankDto): string {
    return `请为以下面试场景构建结构化题库：

**目标公司**：${dto.company}
**目标岗位**：${dto.role}

要求：
1. 按岗位题型配比分配题量（先查知识库中「${dto.role}」的配比，未命中用通用 30/30/20/20）
2. 每道题标注 source（有实数据填真实来源，无数据填「岗位知识图谱通用」）
3. answer_hint 只给要点方向，不超过 200 字
4. gaps[] 诚实列出覆盖不足的方向

请严格按照防编造规则输出，不得将推断题目标为「高频」。`;
  }
}

// ── Output JSON Schema ─────────────────────────────────────────────────────────

const OUTPUT_SCHEMA = {
  type: 'object',
  required: [
    'skill_name', 'skill_version', 'summary', 'confidence',
    'evidence_used', 'recommendations', 'risks', 'next_actions',
    'follow_up_questions', 'cannot_determine',
    'question_bank', 'coverage', 'gaps',
  ],
  properties: {
    skill_name: { type: 'string' },
    skill_version: { type: 'string' },
    summary: { type: 'string' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low', 'insufficient'] },
    evidence_used: { type: 'array', items: { type: 'object' } },
    recommendations: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
    next_actions: { type: 'array', items: { type: 'string' } },
    follow_up_questions: { type: 'array', items: { type: 'string' } },
    cannot_determine: { type: 'array', items: { type: 'string' } },
    question_bank: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'question', 'category', 'difficulty', 'frequency', 'source'],
        properties: {
          id: { type: 'string' },
          question: { type: 'string' },
          category: {
            type: 'string',
            enum: ['behavioral', 'technical_cs', 'technical_domain', 'case_product',
              'case_business', 'motivation', 'cultural_fit', 'system_design'],
          },
          subcategory: { type: 'string' },
          difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
          frequency: { type: 'string', enum: ['very_high', 'high', 'medium', 'low'] },
          source: { type: 'string' },
          answer_hint: { type: 'string' },
          time_estimate: { type: 'integer' },
        },
      },
    },
    coverage: {
      type: 'object',
      required: ['total_questions', 'by_category', 'estimated_coverage_percentage'],
      properties: {
        total_questions: { type: 'integer', minimum: 0 },
        by_category: { type: 'object', additionalProperties: { type: 'integer' } },
        estimated_coverage_percentage: { type: 'integer', minimum: 0, maximum: 100 },
      },
    },
    gaps: {
      type: 'array',
      items: {
        type: 'object',
        required: ['area', 'reason'],
        properties: {
          area: { type: 'string' },
          reason: { type: 'string' },
          workaround: { type: 'string' },
        },
      },
    },
  },
} as const;

