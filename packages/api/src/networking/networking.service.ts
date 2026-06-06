import { Injectable, BadRequestException } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { NetworkingMessageDto } from './dto/networking-message.dto';
import { ReferralStrategyDto } from './dto/referral-strategy.dto';

// ─── Output types ────────────────────────────────────────────────────────────

export interface NetworkingMessageResult {
  confidence: 'high' | 'medium' | 'low' | 'insufficient';
  summary: string;
  message_draft: string | null;
  tone: 'formal' | 'semi_formal' | 'casual';
  key_points: string[];
  what_not_to_say: string[];
  recommendations: string[];
  risks: string[];
  follow_up_timing: {
    best_send_time: string;
    follow_up_after_days: number;
    follow_up_note?: string;
  } | null;
  cannot_determine: string[];
}

export interface ReferralPath {
  target_company: string;
  contact_description: string;
  path_type: 'direct' | 'indirect' | 'cold_contact';
  estimated_success_rate: string;
  priority: number;
  relationship_strength?: 'strong' | 'moderate' | 'weak';
  suggested_action: string;
}

export interface ReferralStrategyResult {
  confidence: 'high' | 'medium' | 'low' | 'insufficient';
  summary: string;
  referral_paths: ReferralPath[];
  cold_outreach_targets: Array<{
    target_company: string;
    target_profile_type: string;
    platform: string;
    approach: string;
  }>;
  network_gaps: Array<{
    target_company: string;
    gap_description: string;
    fill_strategy: string[];
  }>;
  recommendations: string[];
  risks: string[];
  cannot_determine: string[];
}

// ─── Schema literals (kept minimal — only the fields we actually guard) ───────

const MESSAGE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  required: ['confidence', 'summary', 'message_draft', 'tone', 'key_points',
    'what_not_to_say', 'recommendations', 'risks', 'follow_up_timing',
    'cannot_determine'],
  properties: {
    confidence: { type: 'string', enum: ['high', 'medium', 'low', 'insufficient'] },
    summary: { type: 'string' },
    message_draft: { type: 'string' },
    tone: { type: 'string', enum: ['formal', 'semi_formal', 'casual'] },
    key_points: { type: 'array', items: { type: 'string' } },
    what_not_to_say: { type: 'array', items: { type: 'string' } },
    recommendations: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
    follow_up_timing: {
      type: 'object',
      required: ['best_send_time', 'follow_up_after_days'],
      properties: {
        best_send_time: { type: 'string' },
        follow_up_after_days: { type: 'integer', minimum: 1 },
        follow_up_note: { type: 'string' },
      },
    },
    cannot_determine: { type: 'array', items: { type: 'string' } },
  },
};

const REFERRAL_SCHEMA: Record<string, unknown> = {
  type: 'object',
  required: ['confidence', 'summary', 'referral_paths', 'cold_outreach_targets',
    'network_gaps', 'recommendations', 'risks', 'cannot_determine'],
  properties: {
    confidence: { type: 'string', enum: ['high', 'medium', 'low', 'insufficient'] },
    summary: { type: 'string' },
    referral_paths: {
      type: 'array',
      items: {
        type: 'object',
        required: ['target_company', 'contact_description', 'path_type',
          'estimated_success_rate', 'priority', 'suggested_action'],
        properties: {
          target_company: { type: 'string' },
          contact_description: { type: 'string' },
          path_type: { type: 'string', enum: ['direct', 'indirect', 'cold_contact'] },
          estimated_success_rate: { type: 'string' },
          priority: { type: 'integer', minimum: 1 },
          relationship_strength: { type: 'string', enum: ['strong', 'moderate', 'weak'] },
          suggested_action: { type: 'string' },
        },
      },
    },
    cold_outreach_targets: {
      type: 'array',
      items: {
        type: 'object',
        required: ['target_company', 'target_profile_type', 'platform', 'approach'],
        properties: {
          target_company: { type: 'string' },
          target_profile_type: { type: 'string' },
          platform: { type: 'string' },
          approach: { type: 'string' },
        },
      },
    },
    network_gaps: {
      type: 'array',
      items: {
        type: 'object',
        required: ['target_company', 'gap_description', 'fill_strategy'],
        properties: {
          target_company: { type: 'string' },
          gap_description: { type: 'string' },
          fill_strategy: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    recommendations: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
    cannot_determine: { type: 'array', items: { type: 'string' } },
  },
};

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class NetworkingService {
  constructor(private readonly ai: AiService) {}

  async writeMessage(dto: NetworkingMessageDto): Promise<NetworkingMessageResult> {
    // ── Guard 1: target_company + target_position 均缺 → insufficient ──────
    // (DTO validation already ensures both are present, but if both are empty strings
    // after trim, we still refuse)
    if (!dto.target_company.trim() || !dto.target_position.trim()) {
      return this.insufficientMessage(['target_company', 'target_position']);
    }

    const system = `你是一位专业的职业发展教练，负责帮用户撰写内推申请消息。

硬性防编造规则（必须遵守）：
1. 禁止声称「我们很熟」「关系特别好」等夸大关系的表述
2. 禁止虚构用户与联系人之间不存在的共同经历（同项目/同班/同寝室等）
3. 只能使用用户实际提供的共同背景信息；若未提供则不主动虚构
4. 冷接触场景（陌生人）：禁止在消息中承诺「成功率很高」或给对方夸张的保证
5. 若 confidence 为 insufficient，message_draft 必须返回空字符串
6. 必须在消息结尾给对方退路（如「如有不便，完全理解」）
7. 语言：中文（LinkedIn 场景可英文）

平台风格：
- 微信：简短自然，不用「尊敬的」
- 脉脉：100-150字，说明共同点
- LinkedIn：专业简洁
- 邮件：结构清晰，主题明确`;

    const parts: string[] = [];
    parts.push(`目标公司：${dto.target_company}`);
    parts.push(`目标职位：${dto.target_position}`);
    if (dto.platform) parts.push(`沟通平台：${dto.platform}`);
    if (dto.relationship_type) parts.push(`与联系人关系：${dto.relationship_type}`);
    if (dto.contact_description) parts.push(`联系人描述：${dto.contact_description}`);
    if (dto.candidate_background) parts.push(`我的背景：${dto.candidate_background}`);
    if (dto.shared_background) parts.push(`与联系人的共同背景：${dto.shared_background}`);

    const prompt = `请根据以下信息生成内推申请消息：\n${parts.join('\n')}`;

    const raw = await this.ai.completeStructured<NetworkingMessageResult>({
      system,
      prompt,
      toolName: 'write_networking_message',
      toolDescription: '生成内推申请消息',
      schema: MESSAGE_SCHEMA,
    });

    // ── Guard 2（服务端确定性）: confidence insufficient → 强制清空 message_draft ──
    if (raw.confidence === 'insufficient') {
      raw.message_draft = null;
    }

    // ── Guard 3: follow_up_timing 仅当 message_draft 存在时保留 ──────────────
    if (!raw.message_draft) {
      raw.follow_up_timing = null;
    }

    return raw;
  }

  async analyzeReferralStrategy(dto: ReferralStrategyDto): Promise<ReferralStrategyResult> {
    // ── Guard 1: 无已知人脉 → referral_paths 强制为空数组，不交给 AI 编造 ──
    const hasContacts = Array.isArray(dto.known_contacts) && dto.known_contacts.length > 0;

    if (!hasContacts) {
      // Build cold-contact recommendations only
      const system = `你是一位职业教练，帮用户分析内推路径。
当前用户尚无已知人脉。

硬性防编造规则（必须遵守）：
1. referral_paths 必须返回空数组，绝不捏造不存在的联系人
2. 可以提供 cold_outreach_targets 和 network_gaps 建议
3. 冷接触成功率估计必须使用合理区间（5-15%），禁止虚报高成功率
4. 只能基于目标公司和职位提供通用建议，不得编造具体联系人`;

      const parts: string[] = [];
      parts.push(`目标公司：${dto.target_companies.join('、')}`);
      parts.push(`目标职位：${dto.target_position}`);
      if (dto.candidate_background) parts.push(`候选人背景：${dto.candidate_background}`);
      parts.push('用户当前没有已知人脉，请仅提供冷接触建议和人脉空缺分析。');

      const prompt = `请分析内推策略：\n${parts.join('\n')}`;

      const raw = await this.ai.completeStructured<ReferralStrategyResult>({
        system,
        prompt,
        toolName: 'analyze_referral_strategy',
        toolDescription: '分析内推路径策略',
        schema: REFERRAL_SCHEMA,
      });

      // ── Deterministic guard: 强制清空 referral_paths ─────────────────────
      raw.referral_paths = [];
      return raw;
    }

    // ── 有人脉时：正常分析，但仍做 guard ─────────────────────────────────────
    const system = `你是一位职业教练，帮用户基于已知人脉分析最优内推路径。

硬性防编造规则（必须遵守）：
1. 只能基于用户提供的真实人脉信息生成 referral_paths，禁止编造不存在的联系人
2. 每条 referral_path 的 contact_description 必须直接来自用户输入
3. 成功率区间必须符合行业参考（直接内推30-50%，间接内推15-30%，冷接触5-15%），禁止虚报高成功率
4. 禁止对陌生人和熟人给出完全相同的建议
5. 所有路径必须标注 path_type：direct / indirect / cold_contact`;

    const parts: string[] = [];
    parts.push(`目标公司：${dto.target_companies.join('、')}`);
    parts.push(`目标职位：${dto.target_position}`);
    parts.push(`已知人脉（共 ${dto.known_contacts!.length} 条）：\n${dto.known_contacts!.map((c, i) => `${i + 1}. ${c}`).join('\n')}`);
    if (dto.candidate_background) parts.push(`候选人背景：${dto.candidate_background}`);

    const prompt = `请分析内推路径策略：\n${parts.join('\n')}`;

    const raw = await this.ai.completeStructured<ReferralStrategyResult>({
      system,
      prompt,
      toolName: 'analyze_referral_strategy',
      toolDescription: '分析内推路径策略',
      schema: REFERRAL_SCHEMA,
    });

    // ── Guard 2: 服务端校验 cold_contact 不得标高成功率 ───────────────────────
    for (const path of raw.referral_paths) {
      if (path.path_type === 'cold_contact') {
        // 如果估计成功率明显超出区间（含 >15% 或类似表述），降级为合理区间
        const rateStr = path.estimated_success_rate ?? '';
        if (this.isColdContactRateInflated(rateStr)) {
          path.estimated_success_rate = '5-15%';
        }
      }
    }

    return raw;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private insufficientMessage(missing: string[]): NetworkingMessageResult {
    return {
      confidence: 'insufficient',
      summary: '信息不足，无法生成消息草稿',
      message_draft: null,
      tone: 'formal',
      key_points: [],
      what_not_to_say: [],
      recommendations: [],
      risks: [],
      follow_up_timing: null,
      cannot_determine: missing.map((f) => `缺少必填字段: ${f}`),
    };
  }

  /**
   * 检测冷接触成功率是否被虚报（>15% 视为不合理，系统提示规定冷接触成功率 5-15%）
   * 用简单数字提取：取第一个数字，若 >15 视为虚报。
   */
  private isColdContactRateInflated(rateStr: string): boolean {
    const match = rateStr.match(/(\d+)/);
    if (!match) return false;
    return parseInt(match[1], 10) > 15;
  }
}
