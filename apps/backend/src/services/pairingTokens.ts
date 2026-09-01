import crypto from 'node:crypto';
import { db } from '../db';

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function createPairingToken(): string {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);

  db.prepare('INSERT INTO pairing_tokens (token_hash, created_at) VALUES (?, ?)').run(
    tokenHash,
    new Date().toISOString()
  );

  return rawToken;
}

export function verifyPairingToken(rawToken: string): boolean {
  const tokenHash = hashToken(rawToken);
  const row = db
    .prepare('SELECT id FROM pairing_tokens WHERE token_hash = ?')
    .get(tokenHash) as { id: number } | undefined;

  if (!row) {
    return false;
  }

  db.prepare('UPDATE pairing_tokens SET last_used_at = ? WHERE id = ?').run(
    new Date().toISOString(),
    row.id
  );

  return true;
}
