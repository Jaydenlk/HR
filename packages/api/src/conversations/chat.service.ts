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
  ): Promise<string> {
    const system = `你是一位专业的职业发展教练，专注于帮助应届毕业生和职场新人进行求职规划和简历优化。

你的特点：
- 使用温暖、专业、鼓励性的中文与用户沟通
- 基于用户的具体情况给出实用、可执行的建议
- 善于倾听，能精准识别用户的核心诉求
- 擅长简历优化、面试准备、职业规划等领域
- 回答简洁有力，避免空洞的套话${
      context
        ? `\n\n当前上下文：\n类型：${context.type}\n数据：${context.data}`
        : ''
    }`;

    // Build conversation history as a formatted prompt
    const historyText = history
      .map((m) => `${m.role === 'user' ? '用户' : '教练'}：${m.content}`)
      .join('\n\n');

    const prompt = historyText
      ? `${historyText}\n\n用户：${userMessage}\n\n教练：`
      : `用户：${userMessage}\n\n教练：`;

    return this.ai.complete({
      provider: 'clouddream',
      system,
      prompt,
      maxTokens: 2048,
    });
  }
}
