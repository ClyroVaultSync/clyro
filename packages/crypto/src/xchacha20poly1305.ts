import * as sodiumImport from 'libsodium-wrappers-sumo';
import type sodiumType from 'libsodium-wrappers-sumo';

const _sodium: typeof sodiumType =
  (sodiumImport as unknown as { default: typeof sodiumType }).default ??
  (sodiumImport as unknown as typeof sodiumType);

/**
 * Encrypts plaintext vault data using XChaCha20-Poly1305 authenticated encryption.
 * The nonce is generated fresh via a secure OS random source for every call,
 * per docs/SECURITY.md's requirement that nonces never be predictable or reused.
 * Returns a single base64 string: nonce prepended to ciphertext, ready to store
 * as the opaque encryptedVault blob.
 */
export async function encryptVault(key: Uint8Array, plaintext: string): Promise<string> {
  await _sodium.ready;
  const nonce = _sodium.randombytes_buf(_sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const messageBytes = _sodium.from_string(plaintext);

  const ciphertext = _sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    messageBytes,
    null, // no additional authenticated data
    null, // nsec, unused in this construction
    nonce,
    key
  );

  const combined = new Uint8Array(nonce.length + ciphertext.length);
  combined.set(nonce, 0);
  combined.set(ciphertext, nonce.length);

  return _sodium.to_base64(combined, _sodium.base64_variants.ORIGINAL);
}

/**
 * Decrypts a vault blob produced by encryptVault(). Throws if the ciphertext
 * has been tampered with (authentication failure) — this is XChaCha20-Poly1305's
 * built-in integrity guarantee, per docs/SECURITY.md's tamper-detection requirement.
 */
export async function decryptVault(key: Uint8Array, encryptedBlob: string): Promise<string> {
  await _sodium.ready;
  const combined = _sodium.from_base64(encryptedBlob, _sodium.base64_variants.ORIGINAL);

  const nonceBytes = _sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES;
  const nonce = combined.slice(0, nonceBytes);
  const ciphertext = combined.slice(nonceBytes);

  const decrypted = _sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null, // nsec
    ciphertext,
    null, // additional data
    nonce,
    key
  );

  return _sodium.to_string(decrypted);
}
