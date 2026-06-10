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

// ─── Confidence 白名单（服务端收口，防 AI 返回非法/越权枚举） ────────────────────
const VALID_CONFIDENCE = new Set<NetworkingMessageResult['confidence']>([
  'high',
  'medium',
  'low',
  'insufficient',
]);

function coerceConfidence(
  raw: unknown,
): NetworkingMessageResult['confidence'] {
  return VALID_CONFIDENCE.has(raw as NetworkingMessageResult['confidence'])
    ? (raw as NetworkingMessageResult['confidence'])
    : 'low';
}

// ─── Schema literals (kept minimal — only the fields we actually guard) ───────

const MESSAGE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  // #90: message_draft 不列 required —— 运行时 confidence=insufficient 时为 null，
  // 列入 required 会与 AiService 的「required 字段必须存在+类型匹配」校验冲突，抬高 503 率。
  // service guard 中以 (raw.message_draft ?? null) 兜底，schema 仅声明类型可空。
  required: ['confidence', 'summary', 'tone', 'key_points',
    'what_not_to_say', 'recommendations', 'risks', 'follow_up_timing',
    'cannot_determine'],
  properties: {
    confidence: { type: 'string', enum: ['high', 'medium', 'low', 'insufficient'] },
    summary: { type: 'string' },
    // #90: 允许空串/可空，与运行时 null 兼容（insufficient 时由 guard 置 null）
    message_draft: { type: ['string', 'null'] },
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
    // ── Guard 1: target_company / target_position 缺失 → insufficient ──────
    // (DTO validation already ensures both are present, but if either is an empty
    // string after trim, we refuse — #38: 仅列出实际缺失的字段，不再两个都列。)
    const missingFields: string[] = [];
    if (!dto.target_company.trim()) missingFields.push('target_company');
    if (!dto.target_position.trim()) missingFields.push('target_position');
    if (missingFields.length > 0) {
      return this.insufficientMessage(missingFields);
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

    // ── #13/#33 归一化：required 之外的数组字段统一 ?? [] 兜底，防止 AI 漏字段 → 下游崩 ──
    raw.key_points = raw.key_points ?? [];
    raw.what_not_to_say = raw.what_not_to_say ?? [];
    raw.recommendations = raw.recommendations ?? [];
    raw.risks = raw.risks ?? [];
    raw.cannot_determine = raw.cannot_determine ?? [];
    raw.message_draft = raw.message_draft ?? null;

    // ── Guard 0（confidence 白名单收口）: AI 返回非法枚举 → 降为 low ──────────────
    raw.confidence = coerceConfidence(raw.confidence);

    // ── Guard 1（空草稿自相矛盾收口）: 无可用 draft 不得伴随 high/medium/low ──────────
    // 草稿为 null（真实模型常直接返回 null）或空/纯空白字符串,都视为无可信产物 → 收口为 insufficient。
    // (旧实现用 `!= null` 漏掉了 null draft + 非 insufficient 置信的自相矛盾组合,经真跑 AI 暴露)
    if (raw.message_draft == null || !raw.message_draft.trim()) {
      raw.message_draft = null;
      if (raw.confidence !== 'insufficient') {
        raw.confidence = 'insufficient';
        raw.cannot_determine = [
          ...raw.cannot_determine,
          '未能生成有效的消息草稿（草稿为空），无法给出可信结果',
        ];
      }
    }

    // ── Guard 2（服务端确定性）: confidence insufficient → 强制清空 message_draft ──
    if (raw.confidence === 'insufficient') {
      raw.message_draft = null;
    }

    // ── #54 防编造：用户未提供可信共同背景，但草稿声称有共同点 → 降级并标注 ──────────
    // 「共同背景」可信来源仅限：shared_background（显式声明）或 relationship_type 属于
    // {alumni_or_ex_colleague, direct_friend}（结构化关系枚举）。
    // contact_description 是用户对联系人的自由描述，并非「双方共同背景」的可信来源，
    // 不得据此放行草稿声称校友/同学/同事/共同经历，否则视为编造，剥离草稿并降级。
    const hasSharedSource =
      !!dto.shared_background?.trim() ||
      dto.relationship_type === 'alumni_or_ex_colleague' ||
      dto.relationship_type === 'direct_friend';
    if (
      raw.message_draft &&
      !hasSharedSource &&
      this.draftClaimsSharedBackground(raw.message_draft)
    ) {
      raw.message_draft = null;
      raw.confidence = 'insufficient';
      raw.cannot_determine = [
        ...raw.cannot_determine,
        '未提供任何共同背景信息，无法生成可信的内推消息（草稿曾声称共同点，已剥离以防编造）',
      ];
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

      // ── #13/#33 归一化：required 之外/可能漏的容器字段统一 ?? [] 兜底 ──────────
      this.normalizeReferralArrays(raw);

      // ── confidence 白名单收口：AI 返回非法枚举 → 降为 low ──────────────────────
      raw.confidence = coerceConfidence(raw.confidence);

      // ── Deterministic guard: 无人脉 → 强制清空 referral_paths ──────────────
      raw.referral_paths = [];

      // ── #14 防编造：无人脉时 cold_outreach_targets 不得编造具体联系人/「内部有人」──
      raw.cold_outreach_targets = raw.cold_outreach_targets.filter(
        (t) => !this.coldTargetFabricatesContact(t),
      );

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

    // ── #13/#33 归一化：referral_paths 及其余容器统一 ?? [] / Array.isArray 兜底 ──
    // 漏字段时旧代码 for-of raw.referral_paths 直接 500，归一化后退化为空数组安全遍历。
    this.normalizeReferralArrays(raw);

    // ── confidence 白名单收口：AI 返回非法枚举 → 降为 low ──────────────────────
    raw.confidence = coerceConfidence(raw.confidence);

    // ── P0 防编造：每条 referral_path 的 contact_description 必须可溯源到 known_contacts ──
    // AI 可能编造一个不在用户人脉里的联系人。对不可溯源者降为 cold_contact 并清空
    // contact_description（不带具体联系人），记 cannot_determine。
    let strippedAnyContact = false;
    for (const path of raw.referral_paths) {
      if (!this.contactDescriptionTraceable(path.contact_description ?? '', dto.known_contacts!)) {
        path.path_type = 'cold_contact';
        path.contact_description = '';
        path.relationship_strength = undefined;
        strippedAnyContact = true;
      }
    }
    if (strippedAnyContact) {
      raw.cannot_determine = [
        ...raw.cannot_determine,
        '部分内推路径的联系人无法与您提供的已知人脉匹配，已降为冷接触并清除该联系人信息以防编造',
      ];
    }

    // ── Guard 2（#36/#62）: 服务端按 path_type 对全部三类路径校验成功率 ──────────
    // direct 30-50% / indirect 15-30% / cold_contact 5-15%；超区间上界即收口到区间标准值。
    // 置于溯源剥离之后：被降级为 cold_contact 的路径也一并纳入成功率收口。
    let clampedAnyRate = false;
    for (const path of raw.referral_paths) {
      if (this.clampRateToRange(path)) clampedAnyRate = true;
    }
    if (clampedAnyRate) {
      raw.cannot_determine = [
        ...raw.cannot_determine,
        '部分内推路径的成功率超出该路径类型的合理区间，已收口到行业参考区间以防虚报',
      ];
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
   * #13/#33：归一化 ReferralStrategyResult 的全部容器字段。
   * AI 可能漏 required 之外的字段或返回非数组，统一 Array.isArray 兜底为 []，
   * 防止下游 for-of / .filter / .length 在 undefined 上 500。
   */
  private normalizeReferralArrays(raw: ReferralStrategyResult): void {
    raw.referral_paths = Array.isArray(raw.referral_paths) ? raw.referral_paths : [];
    raw.cold_outreach_targets = Array.isArray(raw.cold_outreach_targets) ? raw.cold_outreach_targets : [];
    raw.network_gaps = Array.isArray(raw.network_gaps) ? raw.network_gaps : [];
    raw.recommendations = Array.isArray(raw.recommendations) ? raw.recommendations : [];
    raw.risks = Array.isArray(raw.risks) ? raw.risks : [];
    raw.cannot_determine = Array.isArray(raw.cannot_determine) ? raw.cannot_determine : [];
  }

  /**
   * P0 防编造：判断一条 referral_path 的 contact_description 是否可溯源到用户提供的
   * known_contacts。可信判据（任一命中即视为可溯源）：
   * - description 为某条 known_contact 的子串，或反之（整体包含）；
   * - description 与某条 known_contact 存在足量的共享连续片段（>=2 个长度≥2 的
   *   共同 bigram/子串）。中文无空格，故用「长度≥2 的共享连续字符片段」做重叠判据，
   *   单一通用词（如「校友」）只贡献 1 个片段，不足以判定可溯源，避免误放行编造联系人。
   * 不可溯源（含空串）→ 视为编造，调用方将其降为 cold_contact 并清空 contact_description。
   */
  private contactDescriptionTraceable(
    description: string,
    knownContacts: string[],
  ): boolean {
    const desc = description.trim();
    if (!desc) return false;

    for (const raw of knownContacts) {
      const contact = (raw ?? '').trim();
      if (!contact) continue;
      // 整体包含：description 引用了人脉原文，或人脉原文包含 description。
      if (contact.includes(desc) || desc.includes(contact)) return true;

      // 共享连续片段重叠：取 description 的全部 bigram，统计有多少不同 bigram
      // 同时出现在 contact 中。>=2 个不同共享 bigram 即认定可溯源。
      const descGrams = this.bigrams(desc);
      let shared = 0;
      for (const g of descGrams) {
        if (contact.includes(g)) shared += 1;
        if (shared >= 2) return true;
      }
    }
    return false;
  }

  /** 取字符串的全部去重 bigram（长度=2 的连续片段），用于跨中文的片段重叠判定。 */
  private bigrams(text: string): string[] {
    // 去掉空白与常见分隔符后再切 bigram，避免标点稀释重叠信号。
    const cleaned = text.replace(/[\s,，、。；;：:（）()【】「」"'\/\\\-—~·]+/g, '');
    const set = new Set<string>();
    for (let i = 0; i + 2 <= cleaned.length; i += 1) {
      set.add(cleaned.slice(i, i + 2));
    }
    return [...set];
  }

  /**
   * #14 防编造：无人脉场景下，冷接触建议本应是「通用画像」（如「公司内同校校友」），
   * 不得编造具体联系人或暗示「内部有人」。命中以下信号即剥离该条：
   * - 「内部有人」「有内推名额的人」等暗示已存在具体内线
   * - target_profile_type / approach 中出现具体人名标识（「张某」「李工」「认识的」等）
   * - 夸大保证（「保证」「一定」「百分百」）
   */
  private coldTargetFabricatesContact(target: {
    target_profile_type?: string;
    approach?: string;
  }): boolean {
    const text = `${target.target_profile_type ?? ''} ${target.approach ?? ''}`;
    const FABRICATION_SIGNALS = [
      /内部有人/,
      /我(认识|有)的/,
      /认识的(人|朋友|同学|校友)/,
      /已经(联系|认识)/,
      /有内推名额的人/,
      /[张王李刘陈杨赵黄周吴]某/,
      /[张王李刘陈杨赵黄周吴][工总哥姐]/,
      /保证(成功|内推|通过)/,
      /(一定|百分百|100%)(能|可以|帮)/,
    ];
    return FABRICATION_SIGNALS.some((re) => re.test(text));
  }

  /**
   * #54 防编造：检测消息草稿是否声称与联系人存在共同背景。
   * 「共同背景」可信来源仅限 shared_background 或 relationship_type∈
   * {alumni_or_ex_colleague, direct_friend}（判定在调用方）；二者皆无时草稿
   * 出现以下措辞即视为编造。contact_description 不构成共同背景可信来源。
   */
  private draftClaimsSharedBackground(draft: string): boolean {
    // 仅匹配「明确声称双方关系/共同点」的措辞；不匹配「贵公司/目标公司」这类中性指代，
    // 以免在最小信息场景误伤正常草稿。
    const CLAIM_SIGNALS = [
      /校友/,
      /同学/,
      /(前|曾经的|以前的)?同事/,
      /共同(经历|项目|朋友|好友|认识|背景)/,
      /我们(都|一起|曾)/,
      /同一?(所|个)(学校|大学|学院|实验室|社团|寝室|班级)/,
      /(同|一个)(项目|团队|实验室|社团|寝室|班级)/,
      /一起(做过|共事|工作|读)/,
    ];
    return CLAIM_SIGNALS.some((re) => re.test(draft));
  }

  /**
   * #37：仅解析「百分比」数字，提取字符串中所有百分比的最大值作为成功率上界。
   * 旧实现用 /\d+/g 取所有数字最大值，会把上下文数字（如「2年」「第3个」「工作三年」
   * 中阿拉伯数字部分）误当成成功率。现只匹配紧跟 % 的数字（如「20%」「10-20%」
   * 「成功率约 30 %」），忽略一切非百分比数字。返回 null 表示文本中没有任何百分比。
   */
  private parseRateUpperBound(rateStr: string): number | null {
    // 匹配数字（可含小数）后紧跟可选空白再跟 % 的片段，取数字部分。
    const matches = rateStr.match(/\d+(?:\.\d+)?(?=\s*%)/g);
    if (!matches || matches.length === 0) return null;
    return Math.max(...matches.map((n) => parseFloat(n)));
  }

  /**
   * 三类内推路径的合理成功率区间（系统提示约定）：
   * direct 30-50% / indirect 15-30% / cold_contact 5-15%。
   */
  private static readonly RATE_RANGES: Record<
    ReferralPath['path_type'],
    { lower: number; upper: number; label: string }
  > = {
    direct: { lower: 30, upper: 50, label: '30-50%' },
    indirect: { lower: 15, upper: 30, label: '15-30%' },
    cold_contact: { lower: 5, upper: 15, label: '5-15%' },
  };

  /**
   * #36/#62：按 path_type 对成功率做服务端 clamp/校验。
   * 提取文本里百分比的上界，若超出该路径类型区间上界 → 收口为区间标准值并标注。
   * 返回是否发生了收口（用于上层记录 cannot_determine）。
   * #37：上下文数字（「2年」「第3个」）不含 %，parseRateUpperBound 已忽略，不会误判。
   */
  private clampRateToRange(path: ReferralPath): boolean {
    const range = NetworkingService.RATE_RANGES[path.path_type];
    if (!range) return false;
    const upper = this.parseRateUpperBound(path.estimated_success_rate ?? '');
    if (upper === null) return false;
    if (upper > range.upper) {
      path.estimated_success_rate = range.label;
      return true;
    }
    return false;
  }
}
