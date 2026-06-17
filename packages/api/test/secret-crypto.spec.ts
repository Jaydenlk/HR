import {
  decryptSecret,
  encryptSecret,
  maskSecret,
  resolveMasterKey,
} from '../src/common/secret-crypto';

describe('secret-crypto (AES-256-GCM)', () => {
  const hexKey = 'a'.repeat(64); // 64 hex = 32 字节

  it('resolveMasterKey:64 位 hex → 32 字节 Buffer', () => {
    const k = resolveMasterKey(hexKey);
    expect(k).not.toBeNull();
    expect(k!.length).toBe(32);
  });

  it('resolveMasterKey:base64(32 字节)→ 32 字节 Buffer', () => {
    const b64 = Buffer.alloc(32, 7).toString('base64');
    const k = resolveMasterKey(b64);
    expect(k).not.toBeNull();
    expect(k!.length).toBe(32);
  });

  it('resolveMasterKey:缺失/空/短串 → null', () => {
    expect(resolveMasterKey(undefined)).toBeNull();
    expect(resolveMasterKey('')).toBeNull();
    expect(resolveMasterKey('   ')).toBeNull();
    expect(resolveMasterKey('short')).toBeNull();
    expect(resolveMasterKey('a'.repeat(63))).toBeNull(); // 非 32 字节
  });

  it('encrypt → decrypt 往返一致;密文带 v1 前缀且每次 IV 不同', () => {
    const key = resolveMasterKey(hexKey)!;
    const plain = 'sk-deepseek-secret-key-123';
    const ct1 = encryptSecret(plain, key);
    const ct2 = encryptSecret(plain, key);
    expect(ct1.startsWith('v1:')).toBe(true);
    expect(ct1).not.toBe(ct2); // 随机 IV → 密文不同
    expect(ct1).not.toContain(plain); // 密文不含明文
    expect(decryptSecret(ct1, key)).toBe(plain);
    expect(decryptSecret(ct2, key)).toBe(plain);
  });

  it('换主密钥解密 → 抛错(authTag 校验失败)', () => {
    const key = resolveMasterKey(hexKey)!;
    const other = resolveMasterKey('b'.repeat(64))!;
    const ct = encryptSecret('secret', key);
    expect(() => decryptSecret(ct, other)).toThrow();
  });

  it('篡改密文 → 抛错', () => {
    const key = resolveMasterKey(hexKey)!;
    const ct = encryptSecret('secret', key);
    const tampered = ct.slice(0, -4) + 'AAAA';
    expect(() => decryptSecret(tampered, key)).toThrow();
  });

  it('格式非法 → 抛错', () => {
    const key = resolveMasterKey(hexKey)!;
    expect(() => decryptSecret('not-a-valid-ciphertext', key)).toThrow();
    expect(() => decryptSecret('v2:x:y:z', key)).toThrow(); // 版本不识别
  });

  it('maskSecret:只回末 4 位;短串全打码;空串回空', () => {
    expect(maskSecret('sk-abcd1234')).toBe('****1234');
    expect(maskSecret('abcd')).toBe('****');
    expect(maskSecret('ab')).toBe('****');
    expect(maskSecret('')).toBe('');
    expect(maskSecret(null)).toBe('');
    expect(maskSecret(undefined)).toBe('');
  });
});
