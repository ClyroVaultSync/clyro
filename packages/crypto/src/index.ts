// Crypto module exports
// IMPORTANT: This package must NEVER be imported by apps/backend — only by apps/extension.
// IMPORTANT: Use libsodium-wrappers-sumo, not the minimal libsodium-wrappers package.
// The minimal build does not include Argon2id (crypto_pwhash_str) or other functions
// this package will need for vault key derivation. Confirmed during backend-auth
// Track A implementation (see apps/backend/src/services/authPassword.ts).
export * from './argon2id';
export * from './xchacha20poly1305';
