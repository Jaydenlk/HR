// lib/qrcode.ts 渲染冒烟断言(web 包无 jest/vitest runner,故用可在 node 直接跑的脚本)。
//
// 跑法(在 packages/web 下):
//   node --experimental-strip-types scripts/qrcode-smoke.mjs
//
// 验证目标(此前漏测的核心:扫码上传 URL 能否编码成二维码):
//   1) 代表性短上传 URL(站点 origin + /upload/<22 字符短 id>)能成功编码,产出有效 QR 布尔矩阵。
//   2) 相对路径 /upload/<短 id> 也能编码。
//   3) 旧式长 JWT 令牌拼成的 URL 会触发"超出最大版本"错误——正是本次改短令牌前的故障复现。
//   4) 明显超长内容按预期抛错(边界)。

import { generateQrMatrix } from '../src/lib/qrcode.ts';

let pass = 0;
let fail = 0;

function ok(name, cond, detail = '') {
  if (cond) {
    pass++;
    console.log(`  PASS  ${name}${detail ? ' — ' + detail : ''}`);
  } else {
    fail++;
    console.error(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`);
  }
}

// 一个有效的 QR 矩阵:方阵、非空、含深浅模块、尺寸符合 version*4+17。
function isValidMatrix(m) {
  if (!Array.isArray(m) || m.length === 0) return false;
  const n = m.length;
  if (!m.every((row) => Array.isArray(row) && row.length === n)) return false;
  if (!m.every((row) => row.every((v) => typeof v === 'boolean'))) return false;
  const validSize = (n - 17) % 4 === 0 && (n - 17) / 4 >= 1 && (n - 17) / 4 <= 10;
  let dark = 0;
  for (const row of m) for (const v of row) if (v) dark++;
  return validSize && dark > 0 && dark < n * n;
}

console.log('lib/qrcode.ts 渲染冒烟:');

// 1) 代表性短上传 URL(16 字节 base64url ≈ 22 字符短 id)。
const shortId = 'AbCdEf0123456789xyzXY_'; // 22 字符,与服务端 randomBytes(16).base64url 同量级
const absUrl = `https://coach.example.com/upload/${shortId}`;
try {
  const m = generateQrMatrix(absUrl);
  ok(
    '绝对短上传 URL 可编码',
    isValidMatrix(m),
    `len=${absUrl.length}, size=${m.length}x${m.length}`,
  );
} catch (e) {
  ok('绝对短上传 URL 可编码', false, `抛错: ${e.message}`);
}

// 2) 相对路径 /upload/<短 id>。
const relPath = `/upload/${shortId}`;
try {
  const m = generateQrMatrix(relPath);
  ok('相对短上传路径可编码', isValidMatrix(m), `len=${relPath.length}, size=${m.length}x${m.length}`);
} catch (e) {
  ok('相对短上传路径可编码', false, `抛错: ${e.message}`);
}

// 3) 故障复现:旧式长 JWT 令牌(~280 字符)拼成的 URL 应触发"超出最大版本"——即本次修复前的报错。
const fakeJwt =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJwdXJwb3NlIjoiYXVkaW9fdXBsb2FkIiwiaW50ZXJ2aWV3SWQiOiI3YjE5ZTJhNC1kZjUxLTQ2YzMtOWE4ZC0xMjM0NTY3ODkwYWIiLCJzdWIiOiJjMmExZjRkNi04YjMzLTQ5MTAtYjEyMy0wOTg3NjU0MzIxZmUiLCJqdGkiOiJlMWQyYzNiNC1hNTk2LTQ3ODgtOTllZS1mZWRjYmE5ODc2NTQiLCJpYXQiOjE3MTg1MDAwMDAsImV4cCI6MTcxODUwMDA2MH0.' +
  'k9Qw3rT7yU2iO0pA1sD4fG6hJ8kL0zX2cV4bN6mQ8wE';
const jwtUrl = `https://coach.example.com/upload/${fakeJwt}`;
try {
  generateQrMatrix(jwtUrl);
  ok('旧长 JWT URL 触发超长错误(故障复现)', false, `未抛错,len=${jwtUrl.length}`);
} catch (e) {
  ok(
    '旧长 JWT URL 触发超长错误(故障复现)',
    e.message.includes('超出支持的最大版本'),
    `len=${jwtUrl.length}, msg="${e.message}"`,
  );
}

// 4) 边界:明显超长内容按预期抛错。
try {
  generateQrMatrix('x'.repeat(500));
  ok('超长内容按预期抛错', false, '未抛错');
} catch (e) {
  ok('超长内容按预期抛错', e.message.includes('超出支持的最大版本'), `msg="${e.message}"`);
}

console.log(`\n结果: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
