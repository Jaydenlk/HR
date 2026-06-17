/**
 * FIX C1 单元测试:is404 按 HTTP 状态码判定 404,而非脆弱的消息子串匹配。
 *
 * 根因回归:后端无任务时抛 NestJS NotFoundException(),默认错误体 message="Not Found"(不含数字 404)。
 * 旧实现用正则匹配 message 里的 404 → 永远落空 → 连续 404 熔断成死代码。修复后 api.ts 把所有非 2xx
 * 包成带 status 的 ApiError,is404 直接判 status===404。
 *
 * 真 import 产品实现(零漂移):import 真实 is404 + ApiError;断言只认 status,不受 message 影响。
 * 本文件放 web/test/(与 api 同惯例,tsconfig 已 exclude test/,故不进 app 类型检查/eslint src 范围)。
 * 运行:从 packages/web 目录:
 *   node ../api/node_modules/jest/bin/jest.js --config ./jest.unit.config.json --runTestsByPath test/is404.spec.ts
 */
import { is404 } from '../src/components/interview/use-transcribe-status-polling';
import { ApiError } from '../src/lib/api';

describe('is404 (FIX C1 死熔断修复)', () => {
  it('ApiError(404, "Not Found") → true(NestJS 默认 404 体的真实形态)', () => {
    expect(is404(new ApiError(404, 'Not Found'))).toBe(true);
  });

  it('ApiError(404, 任意中文消息) → true(证明不再依赖 message 子串里有没有 404)', () => {
    expect(is404(new ApiError(404, '该面试暂无转写任务'))).toBe(true);
  });

  it('ApiError(500, "API 500: ...") → false(服务端错误不是 404)', () => {
    expect(is404(new ApiError(500, 'API 500: 内部错误'))).toBe(false);
  });

  it('普通 Error(message 里恰好含 404)→ false(旧实现会误判为 true,修复后不再误判)', () => {
    expect(is404(new Error('随便 404 随便'))).toBe(false);
  });

  it('普通 Error("Not Found")→ false(旧实现也会漏判;现在统一按类型+status)', () => {
    expect(is404(new Error('Not Found'))).toBe(false);
  });

  it('null / 非 Error 值 → false(不抛错、安全返回)', () => {
    expect(is404(null)).toBe(false);
    expect(is404(undefined)).toBe(false);
    expect(is404('404')).toBe(false);
    expect(is404({ status: 404 })).toBe(false); // 非 ApiError 实例:鸭子对象不算
  });
});
