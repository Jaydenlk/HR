import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
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

// 明确的催促词组（多字），按句界整句删除。
// 独立单字「急」另行处理（见 STANDALONE_URGE_PATTERN）：
//   复合词（加急/应急/救急/心急/情急/焦急/紧急/急需/急切/性急/告急/求急 等）均为合法词，
//   不可整句删除；故单字「急」只做 confidence 降级 + risks 标注，不做删段（finding #83）。
const FORBIDDEN_PATTERNS: RegExp[] = [
  /尽快回复/g,
  /尽快/g,
  /马上/g,
  /很急/g,
  /十分急/g,
  /非常急/g,
  /快点/g,
];

// 独立催促「急」检测：前后均非构词字时才算真正的独立催促语气。
// lookbehind 排除：加/应/救/心/情/焦/紧/着/危/緊/性/告/求/事/应（繁）
// lookahead  排除：需/切/促/迫/忙/于/速/性/救/告
// 命中时不删段，仅触发 confidence 降级 + risks 标注（finding #83）。
const STANDALONE_URGE_PATTERN =
  /(?<![加应救心情焦紧着危緊性告求事])急(?![需切促迫忙于速性救告])/;

// #29: 中文字符占比兜底阈值。message_draft 中中文字符（CJK统一汉字区）占非空白字符比例
// 低于此阈值时，判定为疑似非中文内容，触发 confidence 降级 + risks 标注。
// 注：编造内容的文字语义无法通过字符统计根治，done=false 的根因保留在 notes 中。
const MIN_CHINESE_CHAR_RATIO = 0.3;

// 中文字符范围：CJK 统一汉字（基本区 + 扩展）及全角标点。
const CHINESE_CHAR_RE = /[一-鿿㐀-䶿豈-﫿　-〿＀-￯]/g;

// ── Placeholder / fabrication markers (thank_you 占位式编造检测) ───────────────

// AI 在缺面试细节时若仍写出「我们讨论了X」「您提到的X」等内容，需判定为占位式编造。
// 占位符（[您提到的X话题] 等方括号）= 合规留白；裸写的「讨论/提到」+ 无实质细节 = 编造。
const FABRICATION_MARKERS = ['我们讨论了', '您提到的', '我们谈到', '您分享的', '我们聊到'];
const PLACEHOLDER_PATTERN = /[【\[][^】\]]*[】\]]/; // 含方括号占位符即视为合规留白

// 小句分隔符（含逗号）— 催促词剔除以「最小句段」为单位，保留无催促词的相邻小句
const CLAUSE_DELIMITERS = /([。！？!?；;，,])/;

// ── Text guards (module-level pure helpers) ─────────────────────────────────────

/**
 * 删除含催促词的整个最小句段，而非裸删两字（finding #6）。
 * 按句界切分，逐句检测：命中任一禁用 pattern → 丢弃整句；其余原样保留。
 * 末尾若被删句导致缺标点，补回中文句号保持成文。
 */
function stripForbiddenSegments(text: string): { text: string; stripped: boolean } {
  // 切分为 [小句, 分隔符, 小句, 分隔符, ...]，保留分隔符以便重组
  const parts = text.split(CLAUSE_DELIMITERS);
  const kept: string[] = [];
  let stripped = false;

  for (let i = 0; i < parts.length; i += 2) {
    const clause = parts[i] ?? '';
    const delimiter = parts[i + 1] ?? '';
    if (clause === '' && delimiter === '') continue;

    const hasForbidden = FORBIDDEN_PATTERNS.some((p) => {
      p.lastIndex = 0; // 全局正则需复位，避免 test() 受 lastIndex 影响
      return p.test(clause);
    });

    if (hasForbidden) {
      stripped = true;
      continue; // 丢弃整个最小句段（含其后分隔符），不裸删两字
    }
    kept.push(clause + delimiter);
  }

  let result = kept.join('').trim();
  // 删段后若结尾遗留逗号，规整为中文句号；若无任何句末标点则补句号，保持成文
  result = result.replace(/[，,]+$/, '');
  if (stripped && result.length > 0 && !/[。！？!?；;]$/.test(result)) {
    result += '。';
  }
  return { text: result, stripped };
}

/**
 * 按句界截断到 ≤ limit 字（finding #42）。
 * 优先在最后一个完整句界处截断；若首句已超长则在末逗号处截断；
 * 仍无可用标点时才硬切。截断后保证结果 ≤ limit。
 */
function truncateToSentence(text: string, limit: number): string {
  if (text.length <= limit) return text;

  const window = text.slice(0, limit);
  // 1) 优先句末标点
  const sentenceEnd = Math.max(
    window.lastIndexOf('。'),
    window.lastIndexOf('！'),
    window.lastIndexOf('？'),
    window.lastIndexOf('!'),
    window.lastIndexOf('?'),
    window.lastIndexOf('；'),
    window.lastIndexOf(';'),
  );
  if (sentenceEnd >= 0) return window.slice(0, sentenceEnd + 1);

  // 2) 退而求其次：逗号断句
  const commaEnd = Math.max(window.lastIndexOf('，'), window.lastIndexOf(','));
  if (commaEnd >= 0) return window.slice(0, commaEnd + 1);

  // 3) 无任何标点 → 硬切（仍保证 ≤ limit）
  return window;
}

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
    // Ownership check: if application_id provided, verify it belongs to the calling user.
    // 仅将「不存在/不属于本人」(NotFound/Forbidden) 归一为 403（防泄露存在性）；
    // 其他异常（如 DB 故障）原样抛出 → 500，避免把真实错误伪装成 403（finding #43）。
    if (dto.application_id) {
      try {
        await this.applications.findOne(dto.application_id, userId);
      } catch (err) {
        if (err instanceof NotFoundException || err instanceof ForbiddenException) {
          throw new ForbiddenException('application_id does not belong to current user');
        }
        throw err;
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
    let confidence = result.confidence;
    const cannot_determine: string[] = [...(result.cannot_determine ?? [])];
    const risks: string[] = [...(result.risks ?? [])];

    // Guard 0: message_draft 类型守卫 — 非字符串(缺失/null/对象) → insufficient + 空草稿
    // 避免后续 .replace/.length 抛 TypeError → 500（finding #5）
    if (typeof result.message_draft !== 'string') {
      return {
        ...result,
        message_draft: '',
        confidence: 'insufficient',
        cannot_determine: [...cannot_determine, 'AI 未返回有效消息正文'],
        risks,
      };
    }

    let message_draft = result.message_draft;

    // Guard 1: 感谢信防编造 + 缺细节降级（findings #41, #113）
    if (dto.scenario === 'thank_you') {
      const hasSubstantialDetails =
        typeof dto.interview_details === 'string' &&
        dto.interview_details.trim().length >= 10;

      // 占位式编造检测：缺实质细节却仍写出「我们讨论了X / 您提到的X」且无方括号占位
      // → 该内容为编造，降到 insufficient 并标注（finding #113）。
      const hasFabrication =
        FABRICATION_MARKERS.some((m) => message_draft.includes(m)) &&
        !PLACEHOLDER_PATTERN.test(message_draft);

      if (!hasSubstantialDetails && hasFabrication) {
        confidence = 'insufficient';
        cannot_determine.push('感谢信引用了未提供的面试细节，已判定为占位式编造');
        risks.push('草稿包含无法核实的面试内容，发送前必须替换为真实细节');
      } else if (!hasSubstantialDetails && (confidence === 'high' || confidence === 'medium')) {
        // 无实质细节但无编造：仍不可达 high；保守降到 low（finding #41）
        confidence = 'low';
        if (!cannot_determine.some((c) => c.includes('面试细节'))) {
          cannot_determine.push('未提供充分面试细节，无法生成高置信度的个性化感谢信');
        }
      }
    }

    // Guard 2: 禁用催促短语 — 按句界删除含催促词的最小句段，不在成品裸删两字（finding #6）
    const stripResult = stripForbiddenSegments(message_draft);
    message_draft = stripResult.text;
    if (stripResult.stripped) {
      if (!risks.some((r) => r.includes('催促'))) {
        risks.push('原草稿含催促语气，已删除相关句段，请复核语义完整性');
      }
      if (confidence === 'high') confidence = 'medium';
    }

    // Guard 2b: 独立催促「急」— 不删段（避免误删加急/应急/救急/心急/情急等合法复合词所在句），
    // 仅触发 confidence 降级 + risks 标注（finding #83）。
    STANDALONE_URGE_PATTERN.lastIndex = 0;
    if (STANDALONE_URGE_PATTERN.test(message_draft)) {
      if (!risks.some((r) => r.includes('催促'))) {
        risks.push('原草稿含催促语气（急），建议复核措辞');
      }
      if (confidence === 'high') confidence = 'medium';
    }

    // Guard 3: 长度限制 — 除 offer 场景外 ≤ 150 字，按句界截断；剔除催促词后复检（finding #42）
    const LIMIT_SCENARIOS: FollowUpScenario[] = ['thank_you', 'status_inquiry', 'rejection_reply'];
    if (LIMIT_SCENARIOS.includes(dto.scenario)) {
      message_draft = truncateToSentence(message_draft, 150);
    }

    // Guard 4: #29 中文字符占比兜底。统计 message_draft 中中文字符比例；
    // 低于阈值时说明草稿可能为英文或混合语言，触发 confidence 降级 + risks 标注。
    // 注：此为确定性统计兜底，无法从语义层面识别编造内容；编造根治需要真实数据。
    if (message_draft.length > 0) {
      const nonWhitespace = message_draft.replace(/\s/g, '');
      if (nonWhitespace.length > 0) {
        CHINESE_CHAR_RE.lastIndex = 0;
        const chineseMatches = message_draft.match(CHINESE_CHAR_RE);
        const chineseCount = chineseMatches ? chineseMatches.length : 0;
        const ratio = chineseCount / nonWhitespace.length;
        if (ratio < MIN_CHINESE_CHAR_RATIO) {
          if (!risks.some((r) => r.includes('中文'))) {
            risks.push('草稿中文字符占比过低，疑似含非中文内容，请复核后再发送');
          }
          if (confidence === 'high') confidence = 'medium';
        }
      }
    }

    return { ...result, message_draft, confidence, cannot_determine, risks };
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
