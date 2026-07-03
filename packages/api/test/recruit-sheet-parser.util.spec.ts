import { readFileSync } from 'fs';
import { join } from 'path';
import ExcelJS from 'exceljs';
import {
  detectSheetFormat,
  extractRawLink,
  parseCsvRows,
  parseSheetFile,
  parseXlsxRows,
} from '../src/feed/recruit-sheet-parser.util';

const FIXTURES_DIR = join(__dirname, 'fixtures');

describe('parseCsvRows — 规整 CSV', () => {
  it('parses every row with correct field values', () => {
    const buffer = readFileSync(join(FIXTURES_DIR, 'recruit-clean.csv'));
    const rows = parseCsvRows(buffer);

    expect(rows).toHaveLength(3);
    expect(rows[0].row_number).toBe(1);
    expect(rows[0].fields['公司']).toBe('字节跳动');
    expect(rows[0].fields['类型']).toBe('网申开启');
    expect(rows[0].fields['日期']).toBe('2026-08-01');
    expect(rows[0].fields['链接']).toBe('https://jobs.bytedance.com/campus/1');
    expect(rows[2].fields['公司']).toBe('阿里巴巴');
  });
});

describe('parseCsvRows — 脏 CSV 容错', () => {
  let rows: ReturnType<typeof parseCsvRows>;

  beforeAll(() => {
    const buffer = readFileSync(join(FIXTURES_DIR, 'recruit-dirty.csv'));
    rows = parseCsvRows(buffer);
  });

  it('trims whitespace around cell values', () => {
    const huawei = rows.find((r) => r.fields['公司']?.trim() === '华为');
    expect(huawei).toBeDefined();
    expect(huawei!.fields['公司']).toBe('华为');
    expect(huawei!.fields['岗位']).toBe('嵌入式开发');
  });

  it('skips the fully-blank row entirely (not just field-empty)', () => {
    // 全空行(",,,,,,")不应作为一条记录出现
    const blankRow = rows.find((r) => Object.values(r.fields).every((v) => v === ''));
    expect(blankRow).toBeUndefined();
  });

  it('tolerates a short row (fewer columns than header) without throwing', () => {
    const meituan = rows.find((r) => r.fields['公司'] === '美团');
    expect(meituan).toBeDefined();
    expect(meituan!.fields['类型']).toBe('面试批次');
    expect(meituan!.fields['日期']).toBeUndefined();
  });

  it('drops extra columns beyond the header count (relax_column_count)', () => {
    const pdd = rows.find((r) => r.fields['公司'] === '拼多多');
    expect(pdd).toBeDefined();
    expect(Object.keys(pdd!.fields)).not.toContain('extra_col');
    expect(pdd!.fields['链接']).toBe('https://careers.pinduoduo.com/campus/5');
  });

  it('does not crash on the whole dirty file (row_number stays sequential over kept rows)', () => {
    expect(rows.length).toBeGreaterThan(0);
    const rowNumbers = rows.map((r) => r.row_number);
    expect(rowNumbers).toEqual([...rowNumbers].sort((a, b) => a - b));
  });
});

describe('extractRawLink', () => {
  it('finds a value under a recognized link header alias', () => {
    expect(extractRawLink({ 公司: '字节跳动', 链接: 'https://a.example.com' })).toBe(
      'https://a.example.com',
    );
    expect(extractRawLink({ 公司: '腾讯', url: 'https://b.example.com' })).toBe(
      'https://b.example.com',
    );
  });

  it('returns null when no link-like header is present', () => {
    expect(extractRawLink({ 公司: '腾讯', 岗位: '产品经理' })).toBeNull();
  });

  it('ignores a link header with only whitespace', () => {
    expect(extractRawLink({ 公司: '腾讯', 链接: '   ' })).toBeNull();
  });
});

describe('detectSheetFormat', () => {
  it('detects .xlsx/.xls as xlsx, everything else as csv', () => {
    expect(detectSheetFormat('sheet.xlsx')).toBe('xlsx');
    expect(detectSheetFormat('sheet.XLS')).toBe('xlsx');
    expect(detectSheetFormat('sheet.csv')).toBe('csv');
    expect(detectSheetFormat('sheet')).toBe('csv');
  });
});

describe('parseXlsxRows — 真实 exceljs 往返', () => {
  it('round-trips a workbook written by exceljs back into rows', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('校招表');
    sheet.addRow(['公司', '岗位', '类型', '日期']);
    sheet.addRow(['美团', '后端开发', '网申开启', '2026-08-10']);
    sheet.addRow(['快手', '算法工程师', '笔试', '2026-08-25']);

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const rows = await parseXlsxRows(buffer);

    expect(rows).toHaveLength(2);
    expect(rows[0].fields['公司']).toBe('美团');
    expect(rows[0].fields['类型']).toBe('网申开启');
    expect(rows[1].fields['公司']).toBe('快手');
  });

  it('parseSheetFile dispatches to xlsx parsing based on filename', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('sheet1');
    sheet.addRow(['公司', '类型']);
    sheet.addRow(['京东', '宣讲会']);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const rows = await parseSheetFile(buffer, 'upload.xlsx');
    expect(rows).toHaveLength(1);
    expect(rows[0].fields['公司']).toBe('京东');
  });
});
