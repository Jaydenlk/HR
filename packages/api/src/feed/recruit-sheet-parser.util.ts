import { parse } from 'csv-parse/sync';
import ExcelJS from 'exceljs';

export interface SheetRow {
  /** 原始表头 → 该行的原始字符串值(未经 AI 处理),整行原样带入 GLM prompt。 */
  fields: Record<string, string>;
  /** 该行在源文件中的序号(1-based,含表头行之后的第几条数据),用于日志与 GLM 输出对齐。 */
  row_number: number;
}

// 常见"链接"列的表头别名(购买的招聘信息表格常见命名),用于确定性提取原始链接兜底 apply_url——
// 不经 AI 推断,只是把行内已有的真实值原样传递,遵守"不得由 AI 或代码推断补全链接"的红线
// (这不是推断,是把已经存在于输入行里的真实值原样保留)。
const LINK_HEADER_ALIASES = [
  '链接', 'url', 'URL', 'Url', 'link', 'Link',
  '原文链接', '报名链接', '申请链接', '投递链接', '网申链接', '详情链接',
];

/** 从一行原始字段中确定性提取"链接"列的值(命中别名表头且非空)。找不到返回 null。 */
export function extractRawLink(fields: Record<string, string>): string | null {
  for (const alias of LINK_HEADER_ALIASES) {
    const value = fields[alias];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function isSheetEmptyRow(fields: Record<string, string>): boolean {
  return Object.values(fields).every((value) => !value || value.trim().length === 0);
}

/**
 * 解析 CSV 文本为行数组。脏数据容错:
 * - 跳过完全空白行
 * - 列数与表头不一致的行不抛错(relax_column_count),缺列按空串补齐
 * - 每个单元格 trim 空白
 */
export function parseCsvRows(buffer: Buffer): SheetRow[] {
  const records: Record<string, string>[] = parse(buffer, {
    columns: (header: string[]) => header.map((h) => h.trim()),
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
    bom: true,
  });

  const rows: SheetRow[] = [];
  let rowNumber = 0;
  for (const record of records) {
    rowNumber += 1;
    const fields: Record<string, string> = {};
    for (const [key, value] of Object.entries(record)) {
      if (!key) continue; // 无表头的多余列(relax_column_count 产出的额外键)忽略
      fields[key] = typeof value === 'string' ? value.trim() : String(value ?? '');
    }
    if (isSheetEmptyRow(fields)) continue;
    rows.push({ fields, row_number: rowNumber });
  }
  return rows;
}

/** 解析 XLSX 第一个工作表:首行为表头,其余为数据行。空行跳过。 */
export async function parseXlsxRows(buffer: Buffer): Promise<SheetRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber] = String(cell.value ?? '').trim();
  });

  const rows: SheetRow[] = [];
  let rowNumber = 0;
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const fields: Record<string, string> = {};
    let hasValue = false;
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const header = headers[colNumber];
      if (!header) return;
      const value = cellToString(cell.value);
      fields[header] = value;
      if (value.trim().length > 0) hasValue = true;
    });
    if (!hasValue) continue;
    rowNumber += 1;
    rows.push({ fields, row_number: rowNumber });
  }
  return rows;
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object' && 'text' in value) return String((value as { text: unknown }).text ?? '');
  if (typeof value === 'object' && 'result' in value) return String((value as { result: unknown }).result ?? '');
  return String(value).trim();
}

export type SheetFileFormat = 'csv' | 'xlsx';

/** 按文件名后缀判定格式;.xlsx/.xls 走 XLSX 解析,其余一律按 CSV 解析(含 .csv 与无后缀)。 */
export function detectSheetFormat(filename: string): SheetFileFormat {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return 'xlsx';
  return 'csv';
}

export async function parseSheetFile(buffer: Buffer, filename: string): Promise<SheetRow[]> {
  const format = detectSheetFormat(filename);
  return format === 'xlsx' ? parseXlsxRows(buffer) : parseCsvRows(buffer);
}
