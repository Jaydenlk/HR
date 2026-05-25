import { Injectable } from '@nestjs/common';
import { AiService } from './ai.service';
import { SYSTEM as RESUME_SYSTEM, buildParseResumePrompt } from './prompts/parse-resume';
import { SYSTEM as JD_SYSTEM, buildParseJDPrompt } from './prompts/parse-jd';
import { PARSED_RESUME_SCHEMA } from './schemas/parsed-resume.schema';
import { PARSED_JD_SCHEMA } from './schemas/parsed-jd.schema';
import { ParsedResume, ParsedJD } from '../common/types';

@Injectable()
export class ParserService {
  constructor(private readonly ai: AiService) {}

  parseResume(text: string): Promise<ParsedResume> {
    return this.ai.completeStructured<ParsedResume>({
      provider: 'clouddream',
      system: RESUME_SYSTEM,
      prompt: buildParseResumePrompt(text),
      toolName: 'parse_resume',
      toolDescription: '将简历文本解析为结构化 JSON 数据',
      schema: PARSED_RESUME_SCHEMA,
    });
  }

  parseJD(text: string): Promise<ParsedJD> {
    return this.ai.completeStructured<ParsedJD>({
      provider: 'clouddream',
      system: JD_SYSTEM,
      prompt: buildParseJDPrompt(text),
      toolName: 'parse_jd',
      toolDescription: '将招聘 JD 文本解析为结构化 JSON 数据',
      schema: PARSED_JD_SCHEMA,
    });
  }
}
