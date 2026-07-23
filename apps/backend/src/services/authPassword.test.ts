import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './authPassword';

describe('authPassword service', () => {
  it('should hash a password and verify it correctly', async () => {
    const plainPassword = 'mySuperSecretPassword123!';
    
    // Hash the password
    const hash = await hashPassword(plainPassword);
    
    // Hash should not equal the plain password
    expect(hash).not.toBe(plainPassword);
    // Argon2id hashes usually start with $argon2id$ or $argon2
    expect(hash.startsWith('$argon2')).toBe(true);

    // Verification with correct password should return true
    const isValid = await verifyPassword(plainPassword, hash);
    expect(isValid).toBe(true);
  });

  it('should return false when verifying with incorrect password', async () => {
    const plainPassword = 'mySuperSecretPassword123!';
    const wrongPassword = 'wrongPassword123!';
    
    const hash = await hashPassword(plainPassword);
    
    const isValid = await verifyPassword(wrongPassword, hash);
    expect(isValid).toBe(false);
  });
});
