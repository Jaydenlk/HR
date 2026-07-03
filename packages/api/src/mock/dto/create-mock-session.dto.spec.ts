/**
 * CreateMockSessionDto — company_research_id 校验测试
 *
 * T6 破坏性变更:confirmed_company_info(前端回传原始文本)已替换为 company_research_id
 * (前端只回传候选 id，后端按 id 查库取真实字段，防伪造 M3)。本文件验证 DTO 层的 UUID 格式校验。
 */
import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateMockSessionDto } from './create-mock-session.dto';

async function validateDto(raw: Record<string, unknown>) {
  const dto = plainToInstance(CreateMockSessionDto, raw);
  return validate(dto, { whitelist: true });
}

const VALID_UUID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

describe('CreateMockSessionDto — company_research_id 校验', () => {
  it('不带 company_research_id 时验证通过(通用模式)', async () => {
    const errors = await validateDto({ company: '字节跳动', role: '产品经理' });
    expect(errors.length).toBe(0);
  });

  it('合法 UUID 时验证通过', async () => {
    const errors = await validateDto({
      company: '字节跳动',
      role: '产品经理',
      company_research_id: VALID_UUID,
    });
    expect(errors.length).toBe(0);
  });

  it('非 UUID 格式的 company_research_id 验证失败', async () => {
    const errors = await validateDto({
      company: '字节跳动',
      role: '产品经理',
      company_research_id: '不是一个uuid',
    });
    const err = errors.find((e) => e.property === 'company_research_id');
    expect(err).toBeDefined();
    expect(JSON.stringify(err?.constraints)).toContain('isUuid');
  });
});
