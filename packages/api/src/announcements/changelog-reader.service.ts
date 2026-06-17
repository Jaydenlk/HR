import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

// 解析出的一节更新日志:日期(或版本)标题 + 该节下的要点。
export interface ChangelogEntry {
  heading: string;
  bullets: string[];
}

// 候选 CHANGELOG.md 路径(按优先级)。容器 WORKDIR=/repo/packages/api、CMD `node dist/main`,
// 故 process.cwd() 为 /repo/packages/api,根 CHANGELOG 在 ../../CHANGELOG.md(=/repo/CHANGELOG.md)。
// 本机开发 cwd 同为 packages/api,同样命中。兜底再试 cwd 本目录与 monorepo 根,降低环境差异风险。
function candidatePaths(): string[] {
  const cwd = process.cwd();
  return [
    path.join(cwd, '..', '..', 'CHANGELOG.md'),
    path.join(cwd, 'CHANGELOG.md'),
    path.resolve(cwd, 'CHANGELOG.md'),
  ];
}

@Injectable()
export class ChangelogReaderService {
  private readonly logger = new Logger(ChangelogReaderService.name);

  // 读最新一节更新日志。文件缺失/为空/无任何 ## 节/节内无要点 → 返回 null。
  // graceful 铁律:任何 fs 或解析异常一律吞掉返回 null,绝不抛出(不让端点 500)。
  getLatestEntry(): ChangelogEntry | null {
    const raw = this.readFile();
    if (raw === null) return null;
    try {
      const entries = this.parse(raw);
      return entries.length > 0 ? entries[0] : null;
    } catch (err) {
      this.logger.warn(`解析 CHANGELOG 失败,返回空: ${String(err)}`);
      return null;
    }
  }

  // 把一节要点拼成每行一条的纯文本,作为 generateDraft 的 source_content。
  toSourceContent(entry: ChangelogEntry): string {
    return entry.bullets.join('\n');
  }

  // 逐候选路径读取首个存在的文件;全部读不到/出错 → null。
  private readFile(): string | null {
    for (const p of candidatePaths()) {
      try {
        if (fs.existsSync(p)) {
          return fs.readFileSync(p, 'utf-8');
        }
      } catch (err) {
        this.logger.warn(`读取 CHANGELOG 候选路径失败(${p}),继续尝试: ${String(err)}`);
      }
    }
    this.logger.warn('未找到 CHANGELOG.md,从最近更新生成将无内容可用');
    return null;
  }

  // 按 `## 标题` 切节,每节收集其下以 - 或 * 开头的要点(去前缀+去首尾空白)。
  // 节按出现顺序返回(文件顶部=最新),故 entries[0] 即最新节。无要点的节跳过。
  private parse(raw: string): ChangelogEntry[] {
    const lines = raw.split(/\r?\n/);
    const entries: ChangelogEntry[] = [];
    let current: ChangelogEntry | null = null;

    for (const line of lines) {
      const headingMatch = /^##\s+(.+?)\s*$/.exec(line);
      if (headingMatch) {
        if (current && current.bullets.length > 0) entries.push(current);
        current = { heading: headingMatch[1], bullets: [] };
        continue;
      }
      if (!current) continue;
      const bulletMatch = /^[-*]\s+(.+?)\s*$/.exec(line);
      if (bulletMatch) {
        const text = bulletMatch[1].trim();
        if (text.length > 0) current.bullets.push(text);
      }
    }
    if (current && current.bullets.length > 0) entries.push(current);
    return entries;
  }
}
