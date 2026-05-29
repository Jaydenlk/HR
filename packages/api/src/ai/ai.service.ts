import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

interface CompleteParams {
  system: string;
  prompt: string;
  tools?: Anthropic.Tool[];
  maxTokens?: number;
}

interface CompleteStructuredParams {
  system: string;
  prompt: string;
  toolName: string;
  toolDescription: string;
  schema: Record<string, unknown>;
}

@Injectable()
export class AiService {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor() {
    const apiKey = process.env.CLOUDDREAM_API_KEY;
    if (!apiKey) {
      throw new Error('CLOUDDREAM_API_KEY is required but not set');
    }

    this.client = new Anthropic({
      apiKey,
      baseURL: process.env.CLOUDDREAM_BASE_URL ?? 'https://api.tutorial.clouddreamai.com',
    });

    this.model = process.env.CLOUDDREAM_MODEL ?? 'auto-v2';
  }

  async complete(params: CompleteParams): Promise<string> {
    const { system, prompt, tools, maxTokens = 4096 } = params;

    const messageParams: Anthropic.MessageCreateParamsNonStreaming = {
      model: this.model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: prompt }],
    };

    if (tools && tools.length > 0) {
      messageParams.tools = tools;
    }

    const response = await this.client.messages.create(messageParams);

    for (const block of response.content) {
      if (block.type === 'text') {
        return block.text;
      }
    }

    return '';
  }

  async completeStructured<T>(params: CompleteStructuredParams): Promise<T> {
    const { system, prompt, toolName, toolDescription, schema } = params;

    const tool: Anthropic.Tool = {
      name: toolName,
      description: toolDescription,
      input_schema: schema as Anthropic.Tool['input_schema'],
    };

    const messageParams: Anthropic.MessageCreateParamsNonStreaming = {
      model: this.model,
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: prompt }],
      tools: [tool],
      tool_choice: { type: 'tool', name: toolName },
    };

    // auto-v2 中转偶发对强制 tool_use 返回空块({} 或无 tool_use),概率个位数 %、与业务无关,
    // 会毒化下游。视为瞬时故障:最多尝试 ATTEMPTS 次取非空;全空才抛 503(可重试),绝不静默返回空。
    const ATTEMPTS = 3;
    for (let i = 0; i < ATTEMPTS; i++) {
      const input = this.extractToolInput<T>(await this.client.messages.create(messageParams), toolName);
      if (input !== null) {
        return input;
      }
    }

    throw new ServiceUnavailableException(
      `AI 服务暂时波动(为工具 "${toolName}" 多次返回空结果),请稍后重试。`,
    );
  }

  private extractToolInput<T>(response: Anthropic.Message, toolName: string): T | null {
    for (const block of response.content) {
      if (block.type === 'tool_use' && block.name === toolName) {
        const input = block.input;
        if (typeof input === 'object' && input !== null && Object.keys(input).length > 0) {
          return input as T;
        }
        return null;
      }
    }
    return null;
  }
}
