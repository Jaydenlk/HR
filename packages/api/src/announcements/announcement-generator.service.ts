import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../ai/ai.service';
import {
  Announcement,
  AnnouncementDisplayType,
  AnnouncementKind,
} from './entities/announcement.entity';
import { GenerateAnnouncementDto } from './dto/generate-announcement.dto';

// AI 工具输出形状(经 AiService.completeStructured 的 schema 校验:required + enum)。
interface GeneratedDraft {
  title: string;
  body: string;
  kind: AnnouncementKind;
  display_type: AnnouncementDisplayType;
}

const KINDS: AnnouncementKind[] = ['feature', 'fix', 'maintenance'];
const DISPLAY_TYPES: AnnouncementDisplayType[] = ['banner', 'modal'];

// 标题 8-24 字、正文 50-300 字:写进 schema description + system prompt 约束模型;
// 服务端再做边界兜底(截断超长,不补全过短——过短交人审,不编造)。
const TITLE_MAX = 24;
const BODY_MAX = 300;

const DRAFT_SCHEMA = {
  type: 'object' as const,
  properties: {
    title: {
      type: 'string',
      description: '公告标题,8-24 个中文字,概括本次更新,口语友好不堆术语',
    },
    body: {
      type: 'string',
      description: '公告正文,50-300 个中文字,把要点讲成用户能懂的话,不编造要点之外的功能',
    },
    kind: {
      type: 'string',
      enum: KINDS,
      description: 'feature=功能上新 / fix=问题修复 / maintenance=维护通知',
    },
    display_type: {
      type: 'string',
      enum: DISPLAY_TYPES,
      description: 'banner=主区顶部横幅 / modal=登录后弹窗',
    },
  },
  required: ['title', 'body', 'kind', 'display_type'],
};

const SYSTEM_PROMPT = `你是校招求职产品 Coach 的运营文案助手。你的唯一任务:把管理员粘贴的「本次更新要点」改写成一条友好、口语化、非技术性的站内公告。

铁律(违反任何一条都是严重错误):
1. 只能依据管理员给出的要点。要点里没有的功能、数据、承诺,一个字都不能编造或脑补。宁可少写,绝不虚构。
2. 用用户听得懂的人话,讲「你现在能做到什么、对你有什么用」,不要堆技术名词和内部黑话。
3. 标题 8-24 个中文字;正文 50-300 个中文字。简洁克制,不浮夸、不喊口号。
4. 判断这批更新的性质:主要是新功能就标 feature,主要是修 bug 就标 fix,主要是维护/停机就标 maintenance。
5. 全部用简体中文。

你必须且只能调用工具 draft_announcement 返回结果,不要输出任何正文解释。`;

@Injectable()
export class AnnouncementGeneratorService {
  constructor(
    private readonly ai: AiService,
    @InjectRepository(Announcement)
    private readonly repo: Repository<Announcement>,
  ) {}

  // AI 起草「最近更新」公告并保存为草稿(status='draft', active=false, published_at=null)。
  // CTA 字段一律留空——AI 只写正文,CTA 由管理员后续编辑时设。
  async generateDraft(dto: GenerateAnnouncementDto): Promise<Announcement> {
    const userPrompt = [
      '以下是管理员粘贴的本次更新要点(每行一条),请据此起草公告。只能用这些要点,不得编造:',
      '',
      dto.source_content,
    ].join('\n');

    const raw = await this.ai.completeStructured<GeneratedDraft>({
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      toolName: 'draft_announcement',
      toolDescription: '把更新要点改写成一条友好的站内公告草稿',
      schema: DRAFT_SCHEMA,
      tier: 'flash',
    });

    const title = this.clamp(raw.title, TITLE_MAX);
    const body = this.clamp(raw.body, BODY_MAX);
    const kind: AnnouncementKind = KINDS.includes(raw.kind) ? raw.kind : 'feature';
    // 管理员传了展示形态倾向就以它为准(可控);否则用模型判断,再兜底 banner。
    const display_type: AnnouncementDisplayType =
      dto.preferred_display_type ??
      (DISPLAY_TYPES.includes(raw.display_type) ? raw.display_type : 'banner');

    const entity = this.repo.create({
      title,
      body,
      kind,
      display_type,
      // 草稿:不上架、不计发布点、状态为 draft。公开端绝不可见。
      active: false,
      published_at: null,
      status: 'draft',
    });
    return this.repo.save(entity);
  }

  // 超长截断(取整字符,不在中间补省略号——草稿交人审,人会再编辑)。
  private clamp(text: string, max: number): string {
    const t = text.trim();
    return t.length > max ? t.slice(0, max) : t;
  }
}
