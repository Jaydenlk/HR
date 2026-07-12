/**
 * 职业维基 · 回归/经济批/量产三阶段共用 · UUIDv7 生成辅助
 *
 * 依据 docs/refactor2/t3-regression5-plan.md Leader 裁决第4/6条:claim_id 统一用本文件的
 * generateUuidV7() 生成,内容 agent 不得自造 id 格式;occupation-coverage-gate.ts 里的
 * UUID_V7 正则(`^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`,
 * 大小写不敏感)是最终裁判,本文件生成的值必须全部匹配该正则。
 *
 * 零依赖手写(RFC 9562 UUIDv7 最简实现,不引入第三方 uuidv7 包):
 *  - 48 bit unix 毫秒时间戳(大端序,填前 6 字节)
 *  - 4 bit 版本位(固定 0111 = 7)
 *  - 12 bit 随机(与版本位共享第 7 字节:高 4 位是版本,低 4 位+第 8 字节前 8 bit = 12 bit 随机)
 *  - 2 bit variant(固定 10,填第 9 字节最高两位)
 *  - 62 bit 随机(第 9 字节剩余 6 bit + 第 10~16 字节)
 * 用 crypto.randomBytes 提供随机源,不用 Math.random(不满足密码学随机性但此处只是
 * 生成不重复 ID,用 randomBytes 是保守选择,成本可忽略)。
 */
import { randomBytes } from 'crypto';

function toHex(byte: number): string {
  return byte.toString(16).padStart(2, '0');
}

/**
 * 生成一个符合 RFC 9562 的 UUIDv7 字符串(小写,含连字符)。
 * 每次调用使用当前 `Date.now()` 作为 48bit 时间戳前缀,保证同秒内多次调用在时间戳
 * 相同时仍靠随机位区分(不做单调计数器,回归/经济批/量产三阶段的调用量级不需要
 * 严格单调保证,只需要"生成时间越晚,前缀数值越大或相等"这一弱有序性)。
 */
export function generateUuidV7(): string {
  const bytes = new Uint8Array(16);

  // 1) 48bit unix 毫秒时间戳,大端序填入前 6 字节。
  const ms = Date.now();
  bytes[0] = Math.floor(ms / 2 ** 40) & 0xff;
  bytes[1] = Math.floor(ms / 2 ** 32) & 0xff;
  bytes[2] = Math.floor(ms / 2 ** 24) & 0xff;
  bytes[3] = Math.floor(ms / 2 ** 16) & 0xff;
  bytes[4] = Math.floor(ms / 2 ** 8) & 0xff;
  bytes[5] = ms & 0xff;

  // 2) 随机源:剩余 10 字节全部先填随机字节,再盖版本位/variant 位。
  const rand = randomBytes(10);
  bytes.set(rand, 6);

  // 3) 第 7 字节(index 6):高 4 位版本号(0111=7),低 4 位保留随机。
  bytes[6] = 0x70 | (bytes[6] & 0x0f);

  // 4) 第 9 字节(index 8):最高两位 variant(10),其余 6 位保留随机。
  bytes[8] = 0x80 | (bytes[8] & 0x3f);

  const hex = Array.from(bytes, toHex).join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}
