import { BadRequestException } from '@nestjs/common';

/**
 * wechat_dump 上传格式:通用文本/json 摄入,按
 * docs/refactor2/T2-wechat-source-research-2026-07-03.md §4.2 调研结论定的 json 结构落地
 * (人工整理/半自动脚本产出均可复用同一入口,不假设/不猜测某个具体抓取工具的专有字段)。
 *
 * 结构:{ account_name, batch_note?, articles: [{ title, content, url, publish_time, author?, digest? }] }
 */
export interface WechatDumpArticle {
  title: string;
  content: string;
  url: string;
  publish_time: string;
  author: string | null;
  digest: string | null;
}

export interface WechatDumpPayload {
  account_name: string;
  batch_note: string | null;
  articles: WechatDumpArticle[];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * 解析并校验 wechat_dump 上传的 JSON 文件。结构性必填字段(account_name / articles[].title /
 * content / url / publish_time)缺失时:文件级缺 account_name 或 articles 直接 400;
 * 单篇文章缺必填字段时该篇整体丢弃(不进入后续 GLM 解析),不是"缺字段填 null"——
 * 这些是摄入结构的完整性校验,不是 GLM 抽取的业务字段(公司/事件类型/日期等才适用"缺失就 null")。
 */
export function parseWechatDumpPayload(buffer: Buffer): WechatDumpPayload {
  let raw: unknown;
  try {
    raw = JSON.parse(buffer.toString('utf-8'));
  } catch {
    throw new BadRequestException('wechat_dump 文件不是合法 JSON');
  }
  if (!raw || typeof raw !== 'object') {
    throw new BadRequestException('wechat_dump JSON 顶层必须是对象');
  }
  const record = raw as Record<string, unknown>;
  if (!isNonEmptyString(record.account_name)) {
    throw new BadRequestException('wechat_dump 缺少 account_name');
  }
  if (!Array.isArray(record.articles) || record.articles.length === 0) {
    throw new BadRequestException('wechat_dump 缺少非空 articles 数组');
  }

  const articles: WechatDumpArticle[] = [];
  for (const item of record.articles as unknown[]) {
    if (!item || typeof item !== 'object') continue;
    const a = item as Record<string, unknown>;
    if (!isNonEmptyString(a.title) || !isNonEmptyString(a.content) || !isNonEmptyString(a.url) || !isNonEmptyString(a.publish_time)) {
      continue; // 结构性必填字段缺失:整篇丢弃,不进入 GLM(调用方应记日志)
    }
    articles.push({
      title: a.title.trim(),
      content: a.content.trim(),
      url: a.url.trim(),
      publish_time: a.publish_time.trim(),
      author: isNonEmptyString(a.author) ? a.author.trim() : null,
      digest: isNonEmptyString(a.digest) ? a.digest.trim() : null,
    });
  }

  return {
    account_name: record.account_name.trim(),
    batch_note: isNonEmptyString(record.batch_note) ? record.batch_note.trim() : null,
    articles,
  };
}
