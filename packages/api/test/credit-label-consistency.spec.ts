/**
 * 剧本 8:按钮"消耗 N 点"标注一致性静态检查。
 *
 * 检查以下对应关系:
 *   1. 诊断页(diagnoses/new/page.tsx)           → 有"消耗 1 点"
 *   2. 求职信页(cover-letter/page.tsx)           → 有"消耗 1 点"
 *   3. 模拟面试创建页(mock/page.tsx)             → 有"消耗 N 点"文字
 *   4. 聊天页(chat/[id]/chat-detail.tsx)         → 检查是否有"消耗"标注
 *   5. 模拟面试"总评"端点前端是否显示扣点提示
 *   6. 模拟面试标注完整性:必须包含"总评"
 *
 * 这是无需运行时的静态验证,用于找出标注遗漏 bug。
 */
import * as fs from 'fs';
import * as path from 'path';

const WEB_ROOT = path.resolve(__dirname, '../../web/src/app/(main)');
const WEB_SRC = path.resolve(__dirname, '../../web/src');

function readFile(relPath: string): string {
  const absPath = path.join(WEB_ROOT, relPath);
  if (!fs.existsSync(absPath)) return '';
  return fs.readFileSync(absPath, 'utf-8');
}

describe('Credit 标注一致性静态检查 (剧本 8)', () => {
  it('诊断页(diagnoses/new/page.tsx)含"消耗 1 点"标注', () => {
    const content = readFile('diagnoses/new/page.tsx');
    expect(content).toContain('消耗 1 点');
  });

  it('求职信页(cover-letter/page.tsx)含"消耗 1 点"标注', () => {
    const content = readFile('cover-letter/page.tsx');
    expect(content).toContain('消耗 1 点');
  });

  it('模拟面试创建页(mock/page.tsx)含"消耗"标注', () => {
    const content = readFile('mock/page.tsx');
    expect(content).toMatch(/消耗/);
  });

  /**
   * BUG CHECK: 模拟面试标注应包含"总评"字样
   * 后端 POST /mock-sessions/:id/complete 端点已挂 CreditGuard + CreditInterceptor,
   * 会扣 1 点,但前端标注只说"出题1点+每题作答1点×5",遗漏了总评1点。
   */
  it('【BUG检查】模拟面试标注应包含"总评"以覆盖 POST /complete 扣点', () => {
    const content = readFile('mock/page.tsx');
    // 预期失败:已知 bug——前端标注遗漏了总评1点
    const hasZongping = content.includes('总评');
    if (!hasZongping) {
      // 记录为 bug,但不 fail 整个 suite——协调者须修复
      console.warn(
        '[BUG] mock/page.tsx 标注缺少"总评"。后端 POST /:id/complete 扣 1 点,但前端未明示。' +
        '\n  当前标注:"本场约消耗 5 点（出题 1 点 + 每题作答 1 点 × 5）"' +
        '\n  正确标注应为:"约消耗 6 点（出题 1 点 + 每题作答 1 点 × 5 + 总评 1 点）"',
      );
    }
    // 修复后断言:标注已包含"总评"
    expect(hasZongping).toBe(true); // 已修复:mock/page.tsx 标注包含"总评"
  });

  /**
   * 聊天页"消耗 1 点"标注来源校验
   *
   * 标注由 ChatInput 组件负责渲染(chat-input.tsx:163 含"消耗 1 点")。
   * chat-detail.tsx 自身不需要重复标注——只需确认它 import + 使用了 ChatInput。
   * chat-input.tsx 去掉注释后确认包含"消耗 1 点"。
   */
  it('聊天页(chat-detail.tsx)渲染 ChatInput 且 ChatInput 含"消耗 1 点"(真实渲染来源)', () => {
    const detailContent = readFile('chat/[id]/chat-detail.tsx');

    // 1. chat-detail.tsx 必须 import ChatInput
    const hasImport = /import\s+.*ChatInput.*from/.test(detailContent);
    expect(hasImport).toBe(true);

    // 2. chat-detail.tsx JSX 中必须使用 <ChatInput
    // 去掉 JSX 注释和行注释后检查
    const detailWithoutComments = detailContent
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
      .replace(/\/\/[^\n]*/g, '');
    const hasJsx = detailWithoutComments.includes('<ChatInput');
    expect(hasJsx).toBe(true);

    // 3. chat-input.tsx 非注释内容含"消耗 1 点"——真实的标注渲染源头
    const chatInputPath = path.join(WEB_SRC, 'components/chat/chat-input.tsx');
    const chatInputRaw = fs.existsSync(chatInputPath)
      ? fs.readFileSync(chatInputPath, 'utf-8')
      : '';
    const chatInputWithoutComments = chatInputRaw
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
      .replace(/\/\/[^\n]*/g, '');
    expect(chatInputWithoutComments).toContain('消耗 1 点');
  });

  it('侧边栏布局(layout.tsx)含余额展示逻辑', () => {
    const content = readFile('layout.tsx');
    expect(content).toContain('creditBalance');
    expect(content).toContain('credit_balance');
  });

  it('layout.tsx 含全局 402 处理并弹"点数不足"提示', () => {
    const content = readFile('layout.tsx');
    expect(content).toContain('coach:insufficient-credit');
    expect(content).toContain('点数不足');
  });
});
