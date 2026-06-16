import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AiProviderSettingsService } from '../src/ai/ai-provider-settings.service';
import { AiProviderSettings } from '../src/ai/entities/ai-provider-settings.entity';
import type { AiConfig } from '../src/config/ai.config';

/**
 * AiProviderSettingsService 单元测试:env 回退 / DB 读取 / 缓存 / update 写入与白名单过滤。
 * 用 fake repo(数组内存)避免接 DB;ConfigService 提供最小 ai 配置(primaryProvider)。
 */

function fakeConfig(primaryProvider: AiConfig['primaryProvider']): ConfigService {
  return {
    get: (k: string) =>
      k === 'ai' ? ({ primaryProvider } as unknown as AiConfig) : undefined,
  } as unknown as ConfigService;
}

// 内存 fake repo:只实现 service 用到的 find / create / save。
function fakeRepo(initial: AiProviderSettings[] = []) {
  const rows = [...initial];
  const repo = {
    find: (opts?: { order?: { updated_at: 'DESC' }; take?: number }) => {
      const sorted = [...rows].sort(
        (a, b) => b.updated_at.getTime() - a.updated_at.getTime(),
      );
      const take = opts?.take ?? sorted.length;
      return Promise.resolve(sorted.slice(0, take));
    },
    create: () => ({ updated_at: new Date() }) as AiProviderSettings,
    save: (row: AiProviderSettings) => {
      if (!rows.includes(row)) {
        row.updated_at = new Date(Date.now() + rows.length + 1);
        rows.push(row);
      } else {
        row.updated_at = new Date(Date.now() + rows.length + 1);
      }
      return Promise.resolve(row);
    },
  };
  return { repo: repo as unknown as Repository<AiProviderSettings>, rows };
}

function makeRow(primary: string, order: string[]): AiProviderSettings {
  const r = new AiProviderSettings();
  r.id = 'x';
  r.primary = primary;
  r.order = JSON.stringify(order);
  r.updated_by = null;
  r.updated_at = new Date();
  return r;
}

describe('AiProviderSettingsService', () => {
  it('无 DB 记录 → 回退 env primaryProvider + 默认顺序', async () => {
    const { repo } = fakeRepo([]);
    const svc = new AiProviderSettingsService(repo, fakeConfig('relay'));
    const eff = await svc.current();
    expect(eff.primary).toBe('relay');
    expect(eff.order).toEqual(['relay', 'deepseek', 'glm']);
  });

  it('有 DB 记录 → 读最新一行并按其 primary/order 规范化补齐', async () => {
    const { repo } = fakeRepo([makeRow('glm', ['glm', 'deepseek'])]);
    const svc = new AiProviderSettingsService(repo, fakeConfig('deepseek'));
    const eff = await svc.current();
    expect(eff.primary).toBe('glm');
    expect(eff.order).toEqual(['glm', 'deepseek', 'relay']); // relay 默认序补齐
  });

  it('DB order JSON 损坏 → 不崩,按默认序补齐', async () => {
    const bad = makeRow('glm', []);
    bad.order = '{not json';
    const { repo } = fakeRepo([bad]);
    const svc = new AiProviderSettingsService(repo, fakeConfig('deepseek'));
    const eff = await svc.current();
    expect(eff.primary).toBe('glm');
    expect(eff.order).toEqual(['glm', 'deepseek', 'relay']);
  });

  it('DB primary 非法值 → 回退 env', async () => {
    const bad = makeRow('bogus', ['glm']);
    const { repo } = fakeRepo([bad]);
    const svc = new AiProviderSettingsService(repo, fakeConfig('deepseek'));
    const eff = await svc.current();
    expect(eff.primary).toBe('deepseek');
  });

  it('缓存:第二次 current() 不再打 repo.find;invalidate 后重新读', async () => {
    const { repo } = fakeRepo([makeRow('glm', ['glm'])]);
    const findSpy = jest.spyOn(repo, 'find');
    const svc = new AiProviderSettingsService(repo, fakeConfig('deepseek'));
    await svc.current();
    await svc.current();
    expect(findSpy).toHaveBeenCalledTimes(1); // 第二次命中缓存
    svc.invalidate();
    await svc.current();
    expect(findSpy).toHaveBeenCalledTimes(2); // 失效后重读
  });

  it('update:写入新主力 + 过滤未知通道,返回规范化有效配置并失效缓存', async () => {
    const { repo, rows } = fakeRepo([]);
    const svc = new AiProviderSettingsService(repo, fakeConfig('deepseek'));
    const eff = await svc.update(
      'glm',
      ['glm', '__proto__' as never, 'deepseek'], // 注入未知通道名,须被过滤
      'admin-1',
    );
    expect(eff.primary).toBe('glm');
    expect(eff.order).toEqual(['glm', 'deepseek', 'relay']); // __proto__ 被过滤,relay 补齐
    expect(rows).toHaveLength(1);
    expect(rows[0].updated_by).toBe('admin-1');
    // 写入后 current() 读到新值
    const cur = await svc.current();
    expect(cur.primary).toBe('glm');
  });
});
