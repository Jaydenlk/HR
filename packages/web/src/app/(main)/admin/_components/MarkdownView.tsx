'use client';

/**
 * MarkdownView — 作用域限定的最小 markdown→React 渲染器
 *
 * 只为渲染管理后台「性能测试」报告各分区的 markdown(PerfSection.markdown,含表格)。
 * 刻意不做成通用 CommonMark 库(KISS)——只覆盖该报告实际用到的构造:
 *   - 标题 # ~ ######
 *   - GFM 管道表格 | a | b | + 分隔行 |---|---|(渲染成真 <table>)
 *   - 无序/有序列表 - / * / 1.
 *   - 水平线 ---
 *   - 引用块 >
 *   - 行内 **粗体** 与 `代码`
 *   - 普通段落
 * fenced code(```)报告里 0 处,不实现但安全跳过(不崩)。
 *
 * 安全:全程按纯文本处理,行内样式用 React 元素拼装,绝不 dangerouslySetInnerHTML。
 * 样式:沿用全站玻璃 UI 色板与字体令牌(--serif/--font-mono/--color-ink-*)。
 */

import type { ReactElement, ReactNode } from 'react';

// ─── 行内解析:把一行文本切成 React 片段(**粗体** 与 `代码`)────────────────────

// 切分优先级:先按 `代码` 切(代码内不再解析粗体),再对非代码段按 **粗体** 切。
const CODE_SPLIT = /(`[^`]+`)/g;
const BOLD_SPLIT = /(\*\*[^*]+\*\*)/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  // 第一层:抽出行内代码段
  text.split(CODE_SPLIT).forEach((chunk, i) => {
    if (chunk.length === 0) return;
    if (chunk.startsWith('`') && chunk.endsWith('`') && chunk.length >= 2) {
      out.push(
        <code
          key={`${keyPrefix}-c${i}`}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.88em',
            background: 'rgba(47,143,255,.08)',
            color: 'var(--color-ink)',
            padding: '1px 5px',
            borderRadius: '5px',
            border: '1px solid var(--hair)',
            wordBreak: 'break-all',
          }}
        >
          {chunk.slice(1, -1)}
        </code>,
      );
      return;
    }
    // 第二层:非代码段里解析 **粗体**
    chunk.split(BOLD_SPLIT).forEach((seg, j) => {
      if (seg.length === 0) return;
      if (seg.startsWith('**') && seg.endsWith('**') && seg.length >= 4) {
        out.push(
          <strong
            key={`${keyPrefix}-b${i}-${j}`}
            style={{ fontWeight: 700, color: 'var(--color-ink)' }}
          >
            {seg.slice(2, -2)}
          </strong>,
        );
      } else {
        out.push(<span key={`${keyPrefix}-t${i}-${j}`}>{seg}</span>);
      }
    });
  });
  return out;
}

// ─── 表格行解析:`| a | b | c |` → ['a','b','c'](去掉首尾空管道)──────────────────

function parseTableRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
}

// 分隔行:|---|:--:|---| 之类(单元格仅含 - : 空格)
function isTableDivider(line: string): boolean {
  const s = line.trim();
  if (!s.includes('|') && !s.includes('-')) return false;
  const cells = parseTableRow(s);
  if (cells.length === 0) return false;
  return cells.every((c) => /^:?-{1,}:?$/.test(c));
}

function looksLikeTableRow(line: string): boolean {
  const s = line.trim();
  return s.startsWith('|') && s.includes('|', 1);
}

// ─── 块级样式 ────────────────────────────────────────────────────────────────

const headingStyle = (level: number): React.CSSProperties => {
  // h1~h6 字号梯度,标题统一用衬线体
  const sizes = [22, 19, 16.5, 15, 14, 13];
  const size = sizes[Math.min(level - 1, sizes.length - 1)];
  return {
    fontFamily: 'var(--serif)',
    fontSize: `${size}px`,
    fontWeight: level <= 2 ? 800 : 700,
    color: 'var(--color-ink)',
    letterSpacing: '-0.01em',
    lineHeight: 1.35,
    margin: level <= 2 ? '22px 0 12px' : '18px 0 8px',
    ...(level === 1
      ? { borderBottom: '1px solid var(--color-line)', paddingBottom: '8px' }
      : {}),
  };
};

const paragraphStyle: React.CSSProperties = {
  fontSize: '13.5px',
  lineHeight: 1.7,
  color: 'var(--color-ink-2)',
  margin: '8px 0',
};

const listStyle: React.CSSProperties = {
  margin: '8px 0',
  paddingLeft: '22px',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const liStyle: React.CSSProperties = {
  fontSize: '13.5px',
  lineHeight: 1.65,
  color: 'var(--color-ink-2)',
};

const quoteStyle: React.CSSProperties = {
  margin: '10px 0',
  padding: '8px 14px',
  borderLeft: '3px solid var(--color-brand)',
  background: 'rgba(47,143,255,.05)',
  borderRadius: '0 8px 8px 0',
  fontSize: '13px',
  lineHeight: 1.65,
  color: 'var(--color-ink-3)',
};

const hrStyle: React.CSSProperties = {
  border: 'none',
  borderTop: '1px solid var(--color-line)',
  margin: '20px 0',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  fontSize: '11.5px',
  fontWeight: 700,
  color: 'var(--color-ink-3)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  padding: '8px 10px',
  borderBottom: '1px solid var(--color-line)',
  whiteSpace: 'nowrap',
  background: 'var(--color-surface)',
};

const tdStyle: React.CSSProperties = {
  fontSize: '12.5px',
  color: 'var(--color-ink-2)',
  padding: '8px 10px',
  borderBottom: '1px solid var(--color-line)',
  verticalAlign: 'top',
};

// ─── 块级解析:逐行扫描,聚合表格/列表/引用为整块 ──────────────────────────────

export function MarkdownView({ markdown }: { markdown: string }): ReactElement {
  // 规整换行符,按行处理
  const lines = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  // 段落缓冲:连续非空、非特殊语法行合并成一个段落
  let paraBuf: string[] = [];
  const flushPara = () => {
    if (paraBuf.length === 0) return;
    const text = paraBuf.join(' ');
    blocks.push(
      <p key={`p${key++}`} style={paragraphStyle}>
        {renderInline(text, `p${key}`)}
      </p>,
    );
    paraBuf = [];
  };

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trimEnd();
    const trimmed = line.trim();

    // 空行:段落分隔
    if (trimmed === '') {
      flushPara();
      i += 1;
      continue;
    }

    // fenced code 围栏:安全跳过(报告里 0 处),整段原样吞掉直到闭合,避免误解析
    if (trimmed.startsWith('```')) {
      flushPara();
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        buf.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1; // 吞掉闭合围栏
      blocks.push(
        <pre
          key={`pre${key++}`}
          style={{
            margin: '10px 0',
            padding: '12px 14px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-line)',
            borderRadius: '8px',
            overflowX: 'auto',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            lineHeight: 1.6,
            color: 'var(--color-ink-2)',
          }}
        >
          {buf.join('\n')}
        </pre>,
      );
      continue;
    }

    // 水平线:--- / *** / ___(整行)
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushPara();
      blocks.push(<hr key={`hr${key++}`} style={hrStyle} />);
      i += 1;
      continue;
    }

    // 标题:# ~ ######
    const h = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (h) {
      flushPara();
      const level = h[1].length;
      const content = h[2].trim();
      blocks.push(
        <div key={`h${key++}`} role="heading" aria-level={level} style={headingStyle(level)}>
          {renderInline(content, `h${key}`)}
        </div>,
      );
      i += 1;
      continue;
    }

    // GFM 表格:当前行像表头 + 下一行是分隔行
    if (looksLikeTableRow(line) && i + 1 < lines.length && isTableDivider(lines[i + 1])) {
      flushPara();
      const header = parseTableRow(line);
      i += 2; // 跳过表头 + 分隔行
      const rows: string[][] = [];
      while (i < lines.length && looksLikeTableRow(lines[i].trim()) && lines[i].trim() !== '') {
        rows.push(parseTableRow(lines[i]));
        i += 1;
      }
      const colCount = header.length;
      blocks.push(
        <div key={`tbl${key++}`} style={{ overflowX: 'auto', margin: '12px 0' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: `${Math.max(colCount * 110, 320)}px`,
            }}
          >
            <thead>
              <tr>
                {header.map((cell, ci) => (
                  <th key={ci} style={thStyle}>
                    {renderInline(cell, `th${key}-${ci}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>
                  {Array.from({ length: colCount }).map((_, ci) => (
                    <td key={ci} style={tdStyle}>
                      {renderInline(row[ci] ?? '', `td${key}-${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // 引用块:连续的 > 行聚合
    if (/^>\s?/.test(trimmed)) {
      flushPara();
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        buf.push(lines[i].trim().replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push(
        <blockquote key={`q${key++}`} style={quoteStyle}>
          {renderInline(buf.join(' '), `q${key}`)}
        </blockquote>,
      );
      continue;
    }

    // 列表:连续的 - / * / 1. 行聚合(同一块内允许有序/无序混排,按首行决定标签)
    if (/^(\s*)([-*]|\d+\.)\s+/.test(line)) {
      flushPara();
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && /^(\s*)([-*]|\d+\.)\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^(\s*)([-*]|\d+\.)\s+/, '').trim());
        i += 1;
      }
      const Tag = ordered ? 'ol' : 'ul';
      blocks.push(
        <Tag key={`list${key++}`} style={listStyle}>
          {items.map((it, li) => (
            <li key={li} style={liStyle}>
              {renderInline(it, `li${key}-${li}`)}
            </li>
          ))}
        </Tag>,
      );
      continue;
    }

    // 其余:并入段落缓冲
    paraBuf.push(trimmed);
    i += 1;
  }

  flushPara();

  return <div style={{ color: 'var(--color-ink-2)' }}>{blocks}</div>;
}

export default MarkdownView;
