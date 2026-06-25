/**
 * 性能测试报告库的 TypeScript 类型。
 * 数据来源:经鉴权 api 端点 fetch(GET /admin/perf-reports 列表 + /admin/perf-reports/:id 详情);
 * 报告全文不进前端 bundle,仅管理员可取(view-only,无写入路径)。
 */

export type PerfSection = {
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
};

export type PerfReport = {
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
};

// 报告库列表卡片:报告头元信息(后端 GET /admin/perf-reports 返回,不含 sections 全文与 definition)。
export type PerfReportCard = Omit<PerfReport, 'sections' | 'definition'>;
