import { randomBytes, createHash } from 'node:crypto';

export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  // Tokens use fast SHA-256 hashing (not Argon2id) because they're high-entropy random tokens,
  // not user-chosen passwords — the security model here is about the token's entropy,
  // not resistance to brute-force guessing of a weak input.
  return createHash('sha256').update(token).digest('hex');
}

export const generateRefreshToken = generateToken;
export const hashRefreshToken = hashToken;
