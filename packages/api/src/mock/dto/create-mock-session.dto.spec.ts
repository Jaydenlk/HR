/**
 * ConfirmedCompanyInfoDto MaxLength 验证测试
 * 超过上限时 ValidationPipe 应返回 400（validate 抛出异常）
 */
import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

// 直接复用 DTO 内部 class 需要先 export；本测试通过 CreateMockSessionDto 间接验证
import { CreateMockSessionDto } from './create-mock-session.dto';

async function validateDto(raw: Record<string, unknown>) {
  const dto = plainToInstance(CreateMockSessionDto, raw);
  return validate(dto, { whitelist: true });
}

const validBase = {
  company: '字节跳动',
  role: '产品经理',
  confirmed_company_info: {
    name: '字节跳动',
    summary: '科技公司',
    source_url: 'https://example.com',
    searched_at: '2026-06-13',
  },
};

describe('ConfirmedCompanyInfoDto — MaxLength 校验', () => {
  it('合法输入时验证通过', async () => {
    const errors = await validateDto(validBase);
    expect(errors.length).toBe(0);
  });

  it('name 超过 100 字符时验证失败', async () => {
    const raw = {
      ...validBase,
      confirmed_company_info: {
        ...validBase.confirmed_company_info,
        name: 'A'.repeat(101),
      },
    };
    const errors = await validateDto(raw);
    const nested = errors.find((e) => e.property === 'confirmed_company_info');
    expect(nested).toBeDefined();
    const children = nested?.children ?? [];
    const nameErr = children.find((c) => c.property === 'name');
    expect(nameErr).toBeDefined();
    expect(JSON.stringify(nameErr?.constraints)).toContain('maxLength');
  });

  it('summary 超过 500 字符时验证失败', async () => {
    const raw = {
      ...validBase,
      confirmed_company_info: {
        ...validBase.confirmed_company_info,
        summary: 'S'.repeat(501),
      },
    };
    const errors = await validateDto(raw);
    const nested = errors.find((e) => e.property === 'confirmed_company_info');
    const children = nested?.children ?? [];
    const summaryErr = children.find((c) => c.property === 'summary');
    expect(summaryErr).toBeDefined();
    expect(JSON.stringify(summaryErr?.constraints)).toContain('maxLength');
  });

  it('source_url 超过 500 字符时验证失败', async () => {
    const raw = {
      ...validBase,
      confirmed_company_info: {
        ...validBase.confirmed_company_info,
        source_url: 'https://example.com/' + 'x'.repeat(490),
      },
    };
    const errors = await validateDto(raw);
    const nested = errors.find((e) => e.property === 'confirmed_company_info');
    const children = nested?.children ?? [];
    const urlErr = children.find((c) => c.property === 'source_url');
    expect(urlErr).toBeDefined();
    expect(JSON.stringify(urlErr?.constraints)).toContain('maxLength');
  });

  it('searched_at 超过 40 字符时验证失败', async () => {
    const raw = {
      ...validBase,
      confirmed_company_info: {
        ...validBase.confirmed_company_info,
        searched_at: '2026-06-13T00:00:00.000Z' + 'X'.repeat(20),
      },
    };
    const errors = await validateDto(raw);
    const nested = errors.find((e) => e.property === 'confirmed_company_info');
    const children = nested?.children ?? [];
    const atErr = children.find((c) => c.property === 'searched_at');
    expect(atErr).toBeDefined();
    expect(JSON.stringify(atErr?.constraints)).toContain('maxLength');
  });
});
