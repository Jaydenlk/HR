import { Injectable } from '@nestjs/common';
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

    // auto-v2 中转模型偶发返回空对象 {} 或无 tool_use,会毒化下游缓存。
    // 校验非空对象;为空则重试一次,仍为空才抛错——绝不静默返回 {}。
    const first = this.extractToolInput<T>(await this.client.messages.create(messageParams), toolName);
    if (first !== null) {
      return first;
    }

    const retry = this.extractToolInput<T>(await this.client.messages.create(messageParams), toolName);
    if (retry !== null) {
      return retry;
    }

    throw new Error(`CloudDreamAI 为工具 "${toolName}" 返回了空结果(重试后仍为空)`);
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
