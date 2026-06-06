import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { ApplicationsService } from '../applications/applications.service';
import { GenerateFollowUpDto, FollowUpScenario } from './dto/generate-follow-up.dto';

// ── Output shape ──────────────────────────────────────────────────────────────

export interface TimingAdvice {
  recommended_send_time: string;
  is_timing_appropriate: boolean;
  timing_note: string;
}

export interface ToneGuide {
  tone: 'formal' | 'semi_formal' | 'casual' | 'grateful' | 'professional';
  key_tone_points: string[];
  avoid: string[];
}

export interface FollowUpResult {
  skill_name: string;
  skill_version: string;
  summary: string;
  confidence: 'high' | 'medium' | 'low' | 'insufficient';
  evidence_used: Array<{ source: string; content: string }>;
  recommendations: string[];
  risks: string[];
  next_actions: string[];
  follow_up_questions: string[];
  cannot_determine: string[];
  message_draft: string;
  timing_advice: TimingAdvice;
  tone_guide: ToneGuide;
}

// ── Forbidden words that must not appear in message_draft ─────────────────────

// Explicit urging phrases — must NOT match compound words like 焦急/紧急/急需
const FORBIDDEN_PATTERNS = [/尽快/g, /马上/g, /很急/g, /十分急/g, /非常急/g, /尽快回复/g, /快点/g];

// ── Per-scenario system hints ─────────────────────────────────────────────────

const SCENARIO_RULES: Record<FollowUpScenario, string> = {
  thank_you: `
场景：面试感谢信（面试后24-48小时内发送）
- 必须提及面试中讨论的具体话题或细节；若无法确认，在 message_draft 中用「[您提到的X话题]」占位并将 confidence 降为 medium 或 low
- 消息长度不超过150字
- 语气：真诚、简洁、表达感谢+强化记忆点`.trim(),

  status_inquiry: `
场景：投递进度询问（投递14天+无回音后）
- 语气礼貌简短，给对方留空间，不施压
- 消息长度不超过150字
- 只跟进一次`.trim(),

  rejection_reply: `
场景：拒信礼貌回复（收到拒信后1-2天内）
- 语气感激、大度，不抱怨，不质疑对方决定
- 可礼貌询问拒绝原因
- 消息长度不超过150字`.trim(),

  offer_urge: `
场景：Offer催促（offer期限前3-5天）
- 语气专业、委婉，不施压，确认时间线
- 消息长度可适当延长（此场景可超150字，但应简练）`.trim(),

  acceptance: `
场景：录用确认（接受offer时）
- 语气正式、热情，表达期待，确认入职细节
- 消息长度可适当延长（此场景可超150字）`.trim(),
};

// ── Service ────────────────────────────────────────────────────────────────────

@Injectable()
export class FollowUpService {
  constructor(
    private readonly ai: AiService,
    private readonly applications: ApplicationsService,
  ) {}

  async generate(dto: GenerateFollowUpDto, userId: string): Promise<FollowUpResult> {
    // Ownership check: if application_id provided, verify it belongs to the calling user
    if (dto.application_id) {
      try {
        await this.applications.findOne(dto.application_id, userId);
      } catch {
        throw new ForbiddenException('application_id does not belong to current user');
      }
    }

    const result = await this.ai.completeStructured<FollowUpResult>({
      system: this.buildSystem(dto),
      prompt: this.buildPrompt(dto),
      toolName: 'follow_up_message',
      toolDescription: '输出跟进消息草稿、发送时机建议和语气指南',
      schema: OUTPUT_SCHEMA,
    });

    return this.applyGuards(result, dto);
  }

  // ── 服务端确定性 guard ────────────────────────────────────────────────────

  private applyGuards(result: FollowUpResult, dto: GenerateFollowUpDto): FollowUpResult {
    let { message_draft, confidence } = result;

    // Guard 1: 感谢信缺实质性面试细节 → confidence 降为 medium/low
    // 判定"实质性"：interview_details 必须有 10 个字以上非空格内容
    if (dto.scenario === 'thank_you') {
      const hasSubstantialDetails =
        typeof dto.interview_details === 'string' &&
        dto.interview_details.trim().length >= 10;

      if (!hasSubstantialDetails && (confidence === 'high')) {
        confidence = 'medium';
      }
    }

    // Guard 2: 禁用催促短语检测 — 从 message_draft 中剔除明确催促词组，保留合法复合词
    for (const pattern of FORBIDDEN_PATTERNS) {
      message_draft = message_draft.replace(pattern, '');
    }

    // Guard 3: 除 offer 回复(offer_urge/acceptance)外，message_draft ≤ 150 字
    const LIMIT_SCENARIOS: FollowUpScenario[] = ['thank_you', 'status_inquiry', 'rejection_reply'];
    if (LIMIT_SCENARIOS.includes(dto.scenario) && message_draft.length > 150) {
      // Truncate at last sentence boundary ≤ 150 chars
      const truncated = message_draft.slice(0, 150);
      const lastPunct = Math.max(
        truncated.lastIndexOf('。'),
        truncated.lastIndexOf('！'),
        truncated.lastIndexOf('？'),
        truncated.lastIndexOf('，'),
      );
      message_draft = lastPunct > 80 ? truncated.slice(0, lastPunct + 1) : truncated;
    }

    return { ...result, message_draft, confidence };
  }

  // ── Prompt builders ───────────────────────────────────────────────────────

  private buildSystem(dto: GenerateFollowUpDto): string {
    const scenarioRule = SCENARIO_RULES[dto.scenario];

    return `你是一位专业的职业发展教练，擅长撰写得体的职场跟进消息。

## 当前场景规则
${scenarioRule}

## 防编造规则（硬性，不得违反）
1. 所有消息内容只能基于用户提供的实际面试/投递信息，禁止虚构任何细节
2. 感谢信中禁止写「我们讨论了X」，除非面试细节中明确出现过该话题
3. 若面试细节为空或信息不足，将 confidence 设为 medium 或 low，并在 cannot_determine 中说明
4. 禁止在消息中出现「尽快」「急」「马上」等催促词
5. evidence_used 中每条证据必须能在用户提供的输入中定位

## 输出要求
- 语言：全部中文（简体）
- message_draft：可直接使用的消息正文
- timing_advice：发送时机建议
- tone_guide：语气指南（tone 字段必须是: formal/semi_formal/casual/grateful/professional 之一）
- summary：2-3 句话说明本次消息的策略`;
  }

  private buildPrompt(dto: GenerateFollowUpDto): string {
    const lines: string[] = [`## 跟进场景：${dto.scenario}`];

    if (dto.interview_details?.trim()) {
      lines.push(`## 面试/投递详情\n${dto.interview_details.trim()}`);
    } else {
      lines.push('## 注意：用户未提供面试/投递详情，禁止编造任何具体细节');
    }

    if (dto.contact?.trim()) {
      lines.push(`## 联系人信息\n${dto.contact.trim()}`);
    }

    if (dto.application_id) {
      lines.push(`## 投递 ID：${dto.application_id}`);
    }

    lines.push('\n请根据以上信息生成跟进消息草稿、发送时机建议和语气指南。');

    return lines.join('\n\n');
  }
}

// ── Output JSON Schema ─────────────────────────────────────────────────────────

const OUTPUT_SCHEMA = {
  type: 'object',
  required: [
    'skill_name', 'skill_version', 'summary', 'confidence',
    'evidence_used', 'recommendations', 'risks', 'next_actions',
    'follow_up_questions', 'cannot_determine',
    'message_draft', 'timing_advice', 'tone_guide',
  ],
  properties: {
    skill_name: { type: 'string' },
    skill_version: { type: 'string' },
    summary: { type: 'string' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low', 'insufficient'] },
    evidence_used: {
      type: 'array',
      items: {
        type: 'object',
        required: ['source', 'content'],
        properties: {
          source: { type: 'string' },
          content: { type: 'string' },
        },
      },
    },
    recommendations: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
    next_actions: { type: 'array', items: { type: 'string' } },
    follow_up_questions: { type: 'array', items: { type: 'string' } },
    cannot_determine: { type: 'array', items: { type: 'string' } },
    message_draft: { type: 'string' },
    timing_advice: {
      type: 'object',
      required: ['recommended_send_time', 'is_timing_appropriate', 'timing_note'],
      properties: {
        recommended_send_time: { type: 'string' },
        is_timing_appropriate: { type: 'boolean' },
        timing_note: { type: 'string' },
      },
    },
    tone_guide: {
      type: 'object',
      required: ['tone', 'key_tone_points', 'avoid'],
      properties: {
        tone: { type: 'string', enum: ['formal', 'semi_formal', 'casual', 'grateful', 'professional'] },
        key_tone_points: { type: 'array', items: { type: 'string' } },
        avoid: { type: 'array', items: { type: 'string' } },
      },
    },
  },
} as const;
