import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

type Provider = 'clouddream' | 'deepseek';

interface CompleteParams {
  provider?: Provider;
  system: string;
  prompt: string;
  tools?: Anthropic.Tool[];
  maxTokens?: number;
}

interface CompleteStructuredParams {
  provider?: Provider;
  system: string;
  prompt: string;
  toolName: string;
  toolDescription: string;
  schema: Record<string, unknown>;
}

@Injectable()
export class AiService {
  private readonly clouddreamClient: Anthropic;
  private readonly deepseekClient: OpenAI;

  private readonly clouddreamModel: string;
  private readonly deepseekModel: string;

  constructor() {
    const clouddreamApiKey = process.env.CLOUDDREAM_API_KEY;
    if (!clouddreamApiKey) {
      throw new Error('CLOUDDREAM_API_KEY is required but not set');
    }

    this.clouddreamClient = new Anthropic({
      apiKey: clouddreamApiKey,
      baseURL: process.env.CLOUDDREAM_BASE_URL ?? 'https://api.tutorial.clouddreamai.com',
    });

    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    this.deepseekClient = deepseekKey
      ? new OpenAI({ apiKey: deepseekKey, baseURL: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com/v1' })
      : (null as unknown as OpenAI);

    this.clouddreamModel = process.env.CLOUDDREAM_MODEL ?? 'auto-v2';
    this.deepseekModel = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat';
  }

  async complete(params: CompleteParams): Promise<string> {
    const { provider = 'clouddream', system, prompt, tools, maxTokens = 4096 } = params;

    if (provider === 'deepseek') {
      return this.completeDeepSeek(system, prompt, maxTokens);
    }

    return this.completeCloudDream(system, prompt, tools, maxTokens);
  }

  async completeStructured<T>(params: CompleteStructuredParams): Promise<T> {
    const { provider = 'clouddream', system, prompt, toolName, toolDescription, schema } = params;

    if (provider === 'deepseek') {
      return this.completeStructuredDeepSeek<T>(system, prompt, schema);
    }

    return this.completeStructuredCloudDream<T>(system, prompt, toolName, toolDescription, schema);
  }

  private async completeCloudDream(
    system: string,
    prompt: string,
    tools: Anthropic.Tool[] | undefined,
    maxTokens: number,
  ): Promise<string> {
    const messageParams: Anthropic.MessageCreateParamsNonStreaming = {
      model: this.clouddreamModel,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: prompt }],
    };

    if (tools && tools.length > 0) {
      messageParams.tools = tools;
    }

    const response = await this.clouddreamClient.messages.create(messageParams);

    for (const block of response.content) {
      if (block.type === 'text') {
        return block.text;
      }
    }

    return '';
  }

  private async completeDeepSeek(
    system: string,
    prompt: string,
    maxTokens: number,
  ): Promise<string> {
    if (!this.deepseekClient) {
      return this.completeCloudDream(system, prompt, undefined, maxTokens);
    }
    const response = await this.deepseekClient.chat.completions.create({
      model: this.deepseekModel,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    });

    return response.choices[0]?.message?.content ?? '';
  }

  private async completeStructuredCloudDream<T>(
    system: string,
    prompt: string,
    toolName: string,
    toolDescription: string,
    schema: Record<string, unknown>,
  ): Promise<T> {
    const tool: Anthropic.Tool = {
      name: toolName,
      description: toolDescription,
      input_schema: schema as Anthropic.Tool['input_schema'],
    };

    const response = await this.clouddreamClient.messages.create({
      model: this.clouddreamModel,
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: prompt }],
      tools: [tool],
      tool_choice: { type: 'tool', name: toolName },
    });

    for (const block of response.content) {
      if (block.type === 'tool_use') {
        return block.input as T;
      }
    }

    throw new Error(`CloudDreamAI did not return a tool_use block for tool "${toolName}"`);
  }

  private async completeStructuredDeepSeek<T>(
    system: string,
    prompt: string,
    schema: Record<string, unknown>,
    toolName?: string,
    toolDescription?: string,
  ): Promise<T> {
    if (!this.deepseekClient) {
      return this.completeStructuredCloudDream<T>(system, prompt, toolName ?? 'extract', toolDescription ?? 'Extract structured data', schema);
    }
    const schemaHint = `\n\nOutput ONLY valid JSON matching this schema:\n${JSON.stringify(schema, null, 2)}`;

    const response = await this.deepseekClient.chat.completions.create({
      model: this.deepseekModel,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system + schemaHint },
        { role: 'user', content: prompt },
      ],
    });

    const content = response.choices[0]?.message?.content ?? '{}';
    return JSON.parse(content) as T;
  }
}
