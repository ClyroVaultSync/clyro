import { describe, it, expect } from 'vitest';
import { encryptVault, decryptVault } from './xchacha20poly1305';
import { generateSalt, deriveVaultKey } from './argon2id';

describe('xchacha20poly1305', () => {
  it('encryptVault() then decryptVault() round-trips correctly', async () => {
    const salt = await generateSalt();
    const key = await deriveVaultKey('password', salt);
    const plaintext = 'secret vault data: {"accounts": []}';
    
    const encrypted = await encryptVault(key, plaintext);
    const decrypted = await decryptVault(key, encrypted);
    
    expect(decrypted).toBe(plaintext);
  });

  it('Two encryptions of the same plaintext with the same key produce DIFFERENT ciphertext', async () => {
    const salt = await generateSalt();
    const key = await deriveVaultKey('password', salt);
    const plaintext = 'secret data';
    
    const encrypted1 = await encryptVault(key, plaintext);
    const encrypted2 = await encryptVault(key, plaintext);
    
    expect(encrypted1).not.toBe(encrypted2);
  });

  it('decryptVault() throws/rejects when given tampered ciphertext', async () => {
    const salt = await generateSalt();
    const key = await deriveVaultKey('password', salt);
    const plaintext = 'secret data';
    
    const encrypted = await encryptVault(key, plaintext);
    
    // Tamper with the encrypted blob (flip a character)
    const chars = encrypted.split('');
    chars[0] = chars[0] === 'A' ? 'B' : 'A';
    const tampered = chars.join('');
    
    await expect(decryptVault(key, tampered)).rejects.toThrow();
  });

  it('decryptVault() throws/rejects when given the wrong key', async () => {
    const salt = await generateSalt();
    const key1 = await deriveVaultKey('password-1', salt);
    const key2 = await deriveVaultKey('password-2', salt);
    const plaintext = 'secret data';
    
    const encrypted = await encryptVault(key1, plaintext);
    
    await expect(decryptVault(key2, encrypted)).rejects.toThrow();
  });
});
