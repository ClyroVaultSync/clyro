import { describe, it, expect } from 'vitest';
import { generateSalt, deriveVaultKey } from './argon2id';

describe('argon2id', () => {
  it('generateSalt() returns a non-empty string, and two calls produce different salts', async () => {
    const salt1 = await generateSalt();
    const salt2 = await generateSalt();
    
    expect(typeof salt1).toBe('string');
    expect(salt1.length).toBeGreaterThan(0);
    expect(salt1).not.toBe(salt2);
  });

  it('deriveVaultKey() with the same password+salt produces the same key both times', async () => {
    const salt = await generateSalt();
    const password = 'my-super-secret-master-password';
    const key1 = await deriveVaultKey(password, salt);
    const key2 = await deriveVaultKey(password, salt);
    
    expect(key1).toEqual(key2);
  });

  it('deriveVaultKey() with a different password produces a different key', async () => {
    const salt = await generateSalt();
    const key1 = await deriveVaultKey('password-1', salt);
    const key2 = await deriveVaultKey('password-2', salt);
    
    expect(key1).not.toEqual(key2);
  });
});
