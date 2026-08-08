import * as sodiumImport from 'libsodium-wrappers-sumo';
import type sodiumType from 'libsodium-wrappers-sumo';

const _sodium: typeof sodiumType =
  (sodiumImport as unknown as { default: typeof sodiumType }).default ??
  (sodiumImport as unknown as typeof sodiumType);

/**
 * Generates a new random salt for vault key derivation.
 * This salt is NOT secret — it is stored server-side (Vault.vaultSalt) so the
 * same encryption key can be re-derived on any device, per docs/DATABASE.md.
 * Generated once, client-side, at vault creation. Never regenerated afterward.
 */
export async function generateSalt(): Promise<string> {
  await _sodium.ready;
  const salt = _sodium.randombytes_buf(_sodium.crypto_pwhash_SALTBYTES);
  return _sodium.to_base64(salt, _sodium.base64_variants.ORIGINAL);
}

/**
 * Derives a vault encryption key from the user's master password and a salt,
 * using Argon2id at the MODERATE cost preset. This key exists only in memory
 * while the vault is unlocked and must be securely discarded when locked,
 * per docs/SECURITY.md. The master password itself is never used as a key directly.
 */
export async function deriveVaultKey(masterPassword: string, saltBase64: string): Promise<Uint8Array> {
  await _sodium.ready;
  const salt = _sodium.from_base64(saltBase64, _sodium.base64_variants.ORIGINAL);

  return _sodium.crypto_pwhash(
    _sodium.crypto_secretbox_KEYBYTES,
    masterPassword,
    salt,
    _sodium.crypto_pwhash_OPSLIMIT_MODERATE,
    _sodium.crypto_pwhash_MEMLIMIT_MODERATE,
    _sodium.crypto_pwhash_ALG_ARGON2ID13
  );
}
