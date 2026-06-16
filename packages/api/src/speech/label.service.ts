import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import type { TranscriptSegment } from './providers/speech.provider';

/**
 * LLM 角色打标后的句段:在 ASR 句级时间戳基础上补上语义判定的说话人。
 * speaker 仅两类——'interviewer'(面试官) / 'candidate'(候选人,前端展示为"用户")。
 * 由 label.service 产出,写入 task.segments_json,供复盘页渲染可纠正列表 + S1 confirm 流程复用。
 * 与 B1 的 TranscriptSegment 关系:同 text/startMs/endMs,额外把可空的 speaker 收敛为必填两枚举。
 */
export interface LabeledSegment {
  text: string;
  startMs: number;
  endMs: number;
  speaker: 'interviewer' | 'candidate';
}

// AI 仅回 {idx, speaker}[](不回传全文省 token),按 idx 回引原段。
interface SpeakerLabel {
  idx: number;
  speaker: 'interviewer' | 'candidate';
}
interface LabelToolResult {
  segments: SpeakerLabel[];
}

@Injectable()
export class LabelService {
  // 单段约预算的输出 token(idx+speaker 的 JSON 很小);乘段数 + 基线兜底,长面试不被 max_tokens 截断。
  private static readonly TOKENS_PER_SEGMENT = 24;
  private static readonly TOKENS_BASE = 512;
  private static readonly TOKENS_CAP = 16384;

  constructor(private readonly ai: AiService) {}

  /**
   * 给每段转写打 interviewer|candidate 标。
   * 防编造红线:不改 text、不漏段、不造段——
   *   - 入参空数组 → 抛错(上游 ASR 出空 utterances 不该走到这,绝不返回空当成功);
   *   - AI 返回的 idx 集合与输入不是一一对应(缺/多/越界/重复)→ 抛错,不静默补默认值。
   * text/startMs/endMs 一律取自服务端入参,AI 仅决定 speaker。
   */
  async label(segments: TranscriptSegment[]): Promise<LabeledSegment[]> {
    if (segments.length === 0) {
      // ASR 成功必有句段;走到这里为空说明上游异常,显式抛错而非返回 [] 当成功。
      throw new InternalServerErrorException('转写结果为空,无法进行角色打标');
    }

    const maxTokens = Math.min(
      LabelService.TOKENS_BASE + segments.length * LabelService.TOKENS_PER_SEGMENT,
      LabelService.TOKENS_CAP,
    );

    const result = await this.ai.completeStructured<LabelToolResult>({
      system: this.buildSystemPrompt(),
      prompt: this.buildUserPrompt(segments),
      toolName: 'label_speakers',
      toolDescription: '为面试转写的每一句标注说话人角色(面试官/候选人)',
      schema: this.buildSchema(),
      maxTokens,
      tier: 'flash',
    });

    return this.applyLabels(segments, result.segments);
  }

  private buildSystemPrompt(): string {
    return `你是面试录音转写的角色标注助手。输入是一段面试对话被切成的若干句子(按时间顺序,带下标 idx),你的唯一任务是判断每一句出自谁之口,标为 "interviewer"(面试官)或 "candidate"(候选人)。

判定规则:
- interviewer(面试官):提出问题、追问、介绍岗位/公司、给出反馈或评价、引导话题、宣布流程(如"我们开始""下面问几个技术题")。若有多位面试官,全部标 "interviewer",不细分。
- candidate(候选人):回答问题、自我介绍、举例说明、向面试官反问(如"请问这个岗位的技术栈是?")。群面多位候选人时统一标 "candidate",不细分。
- 利用上下文连贯性判断:问句后紧跟的长陈述通常是候选人作答;一句话被切成相邻多段时角色应保持一致,直到出现明显的问答轮转。

铁律:
- 只判断说话人,绝不改写、翻译、增删任何文字。
- 必须为输入中的每一个 idx 恰好给出一条标注,不漏、不重、不新增不存在的 idx。
- 拿不准的句子也必须二选一(结合上下文给最合理的判断),不得留空、不得返回第三种值。`;
  }

  private buildUserPrompt(segments: TranscriptSegment[]): string {
    // 只传 {idx,text},不回传时间戳与全文,省 token;AI 按 idx 回引。
    const lines = segments.map((s, idx) => `${idx}: ${s.text}`).join('\n');
    return `下面是面试转写的逐句内容(格式"idx: 文本"),共 ${segments.length} 句。请为每一句标注说话人角色,通过 label_speakers 工具返回。

${lines}`;
  }

  private buildSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        segments: {
          type: 'array',
          description: '每段的角色标注,与输入 idx 一一对应',
          items: {
            type: 'object',
            properties: {
              idx: { type: 'integer', description: '对应输入句子的下标' },
              speaker: {
                type: 'string',
                enum: ['interviewer', 'candidate'],
                description: '说话人角色:面试官或候选人',
              },
            },
            required: ['idx', 'speaker'],
          },
        },
      },
      required: ['segments'],
    };
  }

  /**
   * 将 AI 的 {idx,speaker} 标注覆盖回原段,产出 LabeledSegment[]。
   * 严格校验一一对应,任何偏差(缺段/多段/越界/重复)即判 AI 输出不可信 → 抛错(防编造)。
   */
  private applyLabels(
    segments: TranscriptSegment[],
    labels: SpeakerLabel[],
  ): LabeledSegment[] {
    if (labels.length !== segments.length) {
      throw new InternalServerErrorException(
        `角色打标结果数量不匹配(期望 ${segments.length} 段,实得 ${labels.length} 段)`,
      );
    }

    const byIdx = new Map<number, 'interviewer' | 'candidate'>();
    for (const label of labels) {
      if (label.idx < 0 || label.idx >= segments.length) {
        throw new InternalServerErrorException(
          `角色打标返回越界下标 idx=${label.idx}(有效范围 0..${segments.length - 1})`,
        );
      }
      if (byIdx.has(label.idx)) {
        throw new InternalServerErrorException(`角色打标返回重复下标 idx=${label.idx}`);
      }
      byIdx.set(label.idx, label.speaker);
    }

    return segments.map((seg, idx) => {
      const speaker = byIdx.get(idx);
      if (speaker === undefined) {
        // 数量相等但某 idx 缺失(意味着另一个 idx 重复/越界——已被上面拦截,此处为双保险)。
        throw new InternalServerErrorException(`角色打标缺少下标 idx=${idx} 的标注`);
      }
      return {
        text: seg.text,
        startMs: seg.startMs,
        endMs: seg.endMs,
        speaker,
      };
    });
  }
}
