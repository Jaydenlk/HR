import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * AES-256-GCM 对称加密工具:用于把 AI provider 的 api_key 加密落库。
 *
 * 设计:
 * - 主密钥从 env PROVIDER_ENC_KEY 取(64 位 hex = 32 字节,或 base64 解出 32 字节)。
 * - 密文格式 `v1:<iv_b64>:<tag_b64>:<ct_b64>`:带版本前缀便于日后轮换/换算法;
 *   iv 每次 randomBytes(12) 全新(GCM 严禁 IV 复用),authTag 16 字节做完整性校验。
 * - 主密钥缺失/非 32 字节 → resolveMasterKey 返回 null;调用方据「生产 fail-fast / dev 降级只读」策略处理。
 *
 * 安全红线:本工具只处理密钥的加解密,明文密钥绝不出现在日志/DTO/响应。
 */

const ALGO = 'aes-256-gcm';
const KEY_BYTES = 32; // 256-bit
const IV_BYTES = 12; // GCM 推荐 96-bit IV
const VERSION = 'v1';

/**
 * 解析 env 主密钥为 32 字节 Buffer。
 * 接受两种格式:64 位 hex,或 base64(任一解出恰好 32 字节即合法)。
 * 缺失 / 解码失败 / 长度非 32 字节 → 返回 null(视为"未配置主密钥")。
 */
export function resolveMasterKey(raw: string | undefined): Buffer | null {
  if (!raw || raw.trim().length === 0) return null;
  const value = raw.trim();

  // 优先 hex(64 位十六进制 = 32 字节)。
  if (/^[0-9a-fA-F]{64}$/.test(value)) {
    return Buffer.from(value, 'hex');
  }

  // 否则尝试 base64。
  try {
    const buf = Buffer.from(value, 'base64');
    if (buf.length === KEY_BYTES) return buf;
  } catch {
    // 落到下面返回 null
  }
  return null;
}

/**
 * 加密明文密钥 → `v1:<iv_b64>:<tag_b64>:<ct_b64>`。
 * key 必须是 32 字节(由 resolveMasterKey 保证);非法 key 抛错(调用方应先校验)。
 */
export function encryptSecret(plaintext: string, key: Buffer): string {
  if (key.length !== KEY_BYTES) {
    throw new Error('PROVIDER_ENC_KEY 必须是 32 字节(256-bit)');
  }
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`;
}

/**
 * 解密 `v1:<iv_b64>:<tag_b64>:<ct_b64>` → 明文密钥。
 * 格式不符 / 版本不识别 / authTag 校验失败(密文被篡改或换了主密钥)→ 抛错。
 */
export function decryptSecret(encoded: string, key: Buffer): string {
  if (key.length !== KEY_BYTES) {
    throw new Error('PROVIDER_ENC_KEY 必须是 32 字节(256-bit)');
  }
  const parts = encoded.split(':');
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error('密文格式非法(期望 v1:<iv>:<tag>:<ct>)');
  }
  const iv = Buffer.from(parts[1], 'base64');
  const tag = Buffer.from(parts[2], 'base64');
  const ct = Buffer.from(parts[3], 'base64');
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

/**
 * 密钥打码:只回末 4 位(`****abcd`),不足 4 位时全打码。空串/缺失返回空串。
 * 用于响应 DTO 展示「已配置」状态,绝不回明文。
 */
export function maskSecret(plaintext: string | null | undefined): string {
  if (!plaintext || plaintext.length === 0) return '';
  if (plaintext.length <= 4) return '****';
  return `****${plaintext.slice(-4)}`;
}
