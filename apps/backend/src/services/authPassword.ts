/**
 * AUTH PASSWORD HASHING ONLY. This is unrelated to vault/master-password encryption 
 * (see packages/crypto, which this file must never import from). 
 * Used solely for backend login credential verification.
 */
import * as sodiumImport from 'libsodium-wrappers-sumo';
import type sodiumType from 'libsodium-wrappers-sumo';
const _sodium: typeof sodiumType = (sodiumImport as unknown as { default: typeof sodiumType }).default ?? (sodiumImport as unknown as typeof sodiumType);

/**
 * Hashes a plaintext password using Argon2id with moderate/interactive-appropriate settings.
 * Suitable for login-time checks.
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  await _sodium.ready;
  const sodium = _sodium;

  return sodium.crypto_pwhash_str(
    plainPassword,
    sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE
  );
}

/**
 * Verifies a plaintext password attempt against the stored hash.
 */
export async function verifyPassword(plainPassword: string, storedHash: string): Promise<boolean> {
  await _sodium.ready;
  const sodium = _sodium;

  try {
    return sodium.crypto_pwhash_str_verify(storedHash, plainPassword);
  } catch {
    // libsodium throws an error if verification fails or the hash format is invalid
    return false;
  }
}
