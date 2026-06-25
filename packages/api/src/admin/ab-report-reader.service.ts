import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

// 性能测试报告的结构化类型(对应 src/data/perf-reports/*.json;api 自有定义,不 import web 端类型)。
export interface PerfSection {
  key: string;
  no: number;
  title: string;
  icon: string;
  colorVar: string;
  accent: string;
  tintBg: string;
  tintBorder: string;
  summary: string;
  defaultOpen: boolean;
  markdown: string;
}

export interface PerfReport {
  id: string;
  title: string;
  positioning: string;
  date: string;
  statusLabel: string;
  modelCount: number;
  sampleSummary: string;
  judgeCount: number;
  costSummary: string;
  definition: string;
  conclusionPreview: string;
  sections: PerfSection[];
}

// 报告库卡片(列表层):报告头元信息,不含 sections 全文(避免列表端点回传整份报告)。
export type PerfReportCard = Omit<PerfReport, 'sections' | 'definition'>;

// 报告 JSON 文件名(单文件目录,后续 1→N 扩展时增文件即可)。
const PERF_REPORT_FILES = ['round-1.json'] as const;

// 候选目录:__dirname 在 dist/admin(生产)或 src/admin(本机 ts/jest),
// ../data/perf-reports 同时命中 nest assets 拷进 dist 的副本与 src 源文件。
function perfReportDir(): string {
  return path.join(__dirname, '..', 'data', 'perf-reports');
}

@Injectable()
export class AbReportReaderService {
  private readonly logger = new Logger(AbReportReaderService.name);

  // 读单份报告 JSON 并解析为结构化对象。
  // graceful 铁律:文件缺失/读取异常/JSON.parse 失败一律吞掉返回 null(不抛、不让端点 500)。
  private readReport(file: string): PerfReport | null {
    const p = path.join(perfReportDir(), file);
    try {
      if (!fs.existsSync(p)) {
        this.logger.warn(`性能报告文件不存在(${p})`);
        return null;
      }
      return JSON.parse(fs.readFileSync(p, 'utf-8')) as PerfReport;
    } catch (err) {
      this.logger.warn(`读取/解析性能报告失败(${p}): ${String(err)}`);
      return null;
    }
  }

  // 报告库列表:逐文件读取,抽卡片元信息(剔除 sections 全文与 definition),读不到的文件跳过。
  getPerfReportCards(): PerfReportCard[] {
    const cards: PerfReportCard[] = [];
    for (const file of PERF_REPORT_FILES) {
      const report = this.readReport(file);
      if (!report) continue;
      const { sections: _sections, definition: _definition, ...card } = report;
      cards.push(card);
    }
    return cards;
  }

  // 报告详情:按 id 找对应文件并返回完整 PerfReport(含 7 分区);找不到返回 null。
  getPerfReport(id: string): PerfReport | null {
    for (const file of PERF_REPORT_FILES) {
      const report = this.readReport(file);
      if (report && report.id === id) return report;
    }
    return null;
  }
}
