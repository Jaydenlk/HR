/**
 * F5: GrantCreditsDto 边界校验
 * delta=99999 → 400;note 201 字符 → 400;正常值通过
 */
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { GrantCreditsDto } from './grant-credits.dto';

async function check(plain: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(GrantCreditsDto, plain);
  const errors = await validate(dto);
  return errors.flatMap((e) => Object.values(e.constraints ?? {}));
}

describe('F5: GrantCreditsDto 边界', () => {
  it('delta=99999 → 校验失败(delta 不能超过 10000)', async () => {
    const errs = await check({ delta: 99999 });
    expect(errs.length).toBeGreaterThan(0);
    expect(errs.some((e) => e.includes('10000'))).toBe(true);
  });

  it('note 为 201 字符 → 校验失败', async () => {
    const errs = await check({ delta: 100, note: 'x'.repeat(201) });
    expect(errs.length).toBeGreaterThan(0);
    expect(errs.some((e) => e.includes('200'))).toBe(true);
  });

  it('delta=1, note 省略 → 校验通过', async () => {
    const errs = await check({ delta: 1 });
    expect(errs).toHaveLength(0);
  });

  it('delta=10000, note=200 字符 → 校验通过', async () => {
    const errs = await check({ delta: 10000, note: 'x'.repeat(200) });
    expect(errs).toHaveLength(0);
  });

  it('delta=10001 → 校验失败', async () => {
    const errs = await check({ delta: 10001 });
    expect(errs.length).toBeGreaterThan(0);
  });
});
