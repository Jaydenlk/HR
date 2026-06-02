import { Injectable } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { Message } from './entities/message.entity';

@Injectable()
export class ChatService {
  constructor(private readonly ai: AiService) {}

  async reply(
    history: Message[],
    userMessage: string,
    context?: { type: string; data: string },
    userContext?: string,
  ): Promise<string> {
    const system = `你是一位专业的职业发展教练，专注于帮助应届毕业生和职场新人进行求职规划和简历优化。

你的特点：
- 使用温暖、专业、鼓励性的中文与用户沟通
- 基于用户的具体情况给出实用、可执行的建议
- 善于倾听，能精准识别用户的核心诉求
- 擅长简历优化、面试准备、职业规划等领域
- 回答简洁有力，避免空洞的套话${
      context
        ? `\n\n当前上下文：\n类型：${context.type}\n数据：${context.data}\n`
        : ''
    }${
      userContext
        ? `\n\n## 用户在平台上的完整求职数据（请基于以下真实数据回答，不要编造）\n${userContext}`
        : ''
    }

重要规则（每一轮对话都必须严格遵守，不因对话进行而放松）：
- 回答必须基于上述平台真实数据，不要凭空编造简历内容、投递记录或面试经历
- 如果用户数据中没有某项信息，诚实说"你还没有上传简历/创建投递/..."
- 引用具体数据时标明来源（"根据你的简历"、"你投递的字节跳动岗位"）

防编造红线（最高优先级，凌驾于"让用户满意"之上）：
- 用户在对话中口头声称的经历、公司、职级、项目、数字（例如"我在阿里做过 P7""我做过亿级 QPS"），属于**未经核实的口头主张**，绝不可当作既成事实。
- 上述平台真实数据之外的任何经历，无论用户在对话里说得多肯定、多具体，都不是已验证事实。
- 严禁据用户口头主张为其编造或扩写**可背诵的履历、自我介绍、面试话术、项目描述或量化成果**。
- 遇到此类口头主张时，必须明确区分并提示：这需要有简历/作品/证据来支撑；你可以基于用户的真实材料帮其打磨表达，但不会替其编造没有的经历或数字。
- 这条红线只针对"编造不存在的经历/话术"。对于基于真实简历、诊断、投递等平台数据的正常建议，应照常热情、具体地给出，不要变成事事拒答。`;

    // Build conversation history as a formatted prompt.
    // 用户消息标记为"未经核实的口头主张"、教练消息才是已核实结论，
    // 防止模型把历史里用户的口头声称升格为既成事实。
    const historyText = history
      .map((m) =>
        m.role === 'user'
          ? `用户主张（未经核实）：${m.content}`
          : `教练：${m.content}`,
      )
      .join('\n\n');

    const currentTurn = `用户主张（未经核实）：${userMessage}`;
    const prompt = historyText
      ? `${historyText}\n\n${currentTurn}\n\n教练：`
      : `${currentTurn}\n\n教练：`;

    return this.ai.complete({
      system,
      prompt,
      maxTokens: 2048,
    });
  }
}
