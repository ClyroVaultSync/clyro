# Database Design Document

Version: 2.0.0

Status: Draft (Under Review)

---

# Purpose

This document defines the database used by the **Local Sync Server** — the only database Clyro defines. There is no Clyro-operated shared database; each user who chooses Local storage runs their own instance of this database on their own machine (see `docs/ARCHITECTURE.md`).

Google Drive and Dropbox, the two Cloud storage providers, store the vault as a single opaque file in the user's own account via each provider's own API — there is no Clyro-defined schema for them, since they hold exactly one blob with no relational structure.

The database is designed to support:

- Storage of a single encrypted vault
- Optimistic-concurrency version checking
- Nothing else — there is no account, device, or session concept to store

---

# Database Philosophy

Clyro follows a **local-first, zero-knowledge** architecture. The Local Sync Server's database is responsible for storing one encrypted vault while remaining unable to access its contents.

The database must never store plaintext credentials, the master password, or any information that would allow the server to decrypt the vault.

Because there is no Clyro account and no multi-user concept, the schema is deliberately minimal: effectively one table.

---

# Core Principles

The database design follows these principles:

- Security before convenience
- Zero-knowledge by design
- Minimal schema — no more tables than the product actually needs
- Predictable synchronization behavior
- No ORM — a single table and a single engine (SQLite) make an ORM pure overhead

---

# Engine

**SQLite, bundled with the Local Sync Server.** The application creates and initializes `clyro.db` on first launch. There is no configuration wizard and no choice of database engine in Version 1.0 — the bring-your-own-database option considered during planning was cut to keep the server small and dependency-free. See `docs/ARCHITECTURE.md`'s Local Sync Server section.

Access is via direct SQLite queries, not an ORM.

---

# What the Database Stores

The database stores:

- The encrypted vault blob
- Its version number, for optimistic concurrency
- Its immutable salt, for cross-device key derivation

# What the Database Never Stores

The database must never store:

- Plaintext passwords
- Plaintext vault contents
- Plaintext website credentials
- The master password
- Encryption keys
- Decrypted notes
- Any user account, identity, device, or session information — none of these concepts exist in Version 1.0

All sensitive vault data must remain encrypted before reaching this database.

---

# Entity Overview

Version 1.0 has exactly one meaningful table: `vault`. There is no ownership relationship to model, because a given Local Sync Server instance serves exactly one vault, for exactly one extension installation (or a small number of devices sharing that one server, if the user runs it on a home server/VPS — see `docs/ARCHITECTURE.md`).

```
vault (0 or 1 row)
```

A second table, `pairing_tokens`, exists to authenticate callers — see below.

---

# `vault` Table

The `vault` table stores the single encrypted vault this server instance holds.

## Purpose

Represents the one vault this Local Sync Server serves. The server stores the encrypted vault but cannot decrypt it.

## Fields

| Field | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key. Always `1` in practice — the table holds at most one row. |
| encrypted_vault | TEXT | Fully encrypted vault blob (base64 or hex-encoded ciphertext) |
| vault_version | INTEGER | Version number, incremented on every accepted update |
| vault_salt | TEXT | Cryptographic salt used for Argon2id key derivation. Not secret — required for the client to re-derive the same vault encryption key on any device. Never used server-side. |
| last_modified | TEXT (ISO 8601) | Last vault modification time |
| created_at | TEXT (ISO 8601) | Vault creation time |
| updated_at | TEXT (ISO 8601) | Last synchronization time |

`vault_salt` is generated once, client-side, when the vault is first created, by the extension. It is stored here purely so multiple devices sharing this server can derive the identical vault encryption key from the user's master password. The server never uses this salt for anything — it only stores and returns it. See `docs/SECURITY.md`.

## Constraint

The table is enforced (at the application layer, not necessarily a SQL constraint) to hold at most one row — this server has exactly one vault. `POST /api/v1/vault` fails with `409 CONFLICT` if a row already exists; see `docs/API.md`.

---

# `pairing_tokens` Table

Authenticates the extension (or extensions) allowed to call this server instance. This table exists because `localhost` is not a trust boundary against other software on the same machine, and is no boundary at all once the server is reachable from more than one machine — see `docs/SECURITY.md`.

## Fields

| Field | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| token_hash | TEXT | Hash of the pairing token (the raw token is never stored) |
| created_at | TEXT (ISO 8601) | When this pairing was issued |
| last_used_at | TEXT (ISO 8601) | Last time this token authenticated a request |

## Security Notes

- Only hashed pairing tokens are stored.
- The raw pairing token is shown to the user/extension exactly once, at pairing time, and never persisted in plaintext by the server.
- There is no expiration by default in Version 1.0 — a pairing is revoked by deleting its row (e.g. via a "reset pairing" action in the extension's Storage & Sync settings), not by a timer.

---

# Synchronization Strategy: Optimistic Concurrency Control

Vault updates include a `vaultVersion` number. When the extension submits an update, the server checks that the submitted `vaultVersion` is strictly greater than the currently stored version.

- If the submitted version is newer: the update is accepted, and `vault_version` is stored as submitted.
- If the submitted version is equal to or older than the currently stored version: the update is **rejected** with a `409 Conflict` response (see `docs/API.md`). The extension must fetch the latest vault (`GET /api/v1/vault`) and resolve the conflict before attempting to sync again.

This prevents silent data loss when multiple devices attempt to sync near-simultaneously against the same Local Sync Server — a critical property for a password vault, where losing an edit silently is unacceptable.

This is the same contract Google Drive and Dropbox are held to by the extension's `SyncProvider` implementations, even though neither of them is a SQL database — see `docs/ARCHITECTURE.md`. The Local Sync Server enforces it with a straightforward SQLite transaction (read current version, compare, write, all inside one transaction), which is simple specifically because there is only one row to guard.

---

# Synchronization Flow

1. Extension fetches the latest encrypted vault from the active Storage Provider.
2. User unlocks the vault locally, inside the extension.
3. User makes changes.
4. Vault is re-encrypted locally.
5. Updated encrypted vault is sent to the Storage Provider with the version it was based on.
6. The Local Sync Server increments `vault_version` and accepts the write, or rejects it with `409` if stale.
7. Other devices pointed at the same server pick up the new version on their next fetch.

---

# Security Notes

This database never:

- Decrypts vault contents.
- Reads website credentials.
- Accesses notes.
- Stores encryption keys.
- Stores any information identifying the user as a person.

The Local Sync Server acts only as a secure synchronization coordinator for a single opaque blob.

---

# Database Indexes

## vault

- No index needed beyond the primary key — the table holds at most one row.

## pairing_tokens

- `token_hash` (used to look up and verify an incoming pairing token on every request)

---

# Database Constraints

The database enforces minimal referential integrity, appropriate to its minimal schema:

- The `vault` table holds at most one row (application-enforced).
- `pairing_tokens.token_hash` values are unique.

There is no cross-table foreign key relationship to enforce, because there is no user/device/session hierarchy in Version 1.0.

---

# Database Security

The database is considered an untrusted storage layer from the perspective of vault contents — security relies on client-side encryption performed by the extension, not on trusting this database.

The database never stores:

- Plaintext credentials
- Plaintext vault contents
- Encryption keys
- Decrypted notes
- Plaintext passwords

Sensitive data remains encrypted before it ever reaches this database, because encryption happens inside the extension before any network call is made.

---

# Backup & Recovery

This database has **no Clyro-operated backup** — it is a single SQLite file (`clyro.db`) on the user's own machine (or their own home server/VPS, for a remote deployment).

- A lost, corrupted, or deleted `clyro.db` with no corresponding encrypted export is an unrecoverable vault. This is the single most important operational fact about this database, and is why encrypted export/import is first-class scope in `docs/PRD.md`, not an optional convenience.
- Users are responsible for their own file-level backup of `clyro.db` if they want redundancy beyond periodic `.clyro` exports.
- Because all data in the file is already encrypted, an ordinary file backup of `clyro.db` carries the same security properties as an encrypted export — it never exposes decrypted vault contents.

---

# Future Enhancements

Possible future improvements include:

- Vault version history (retaining prior encrypted versions, not just the current one)
- Multiple pairing tokens with individual names/revocation, for users running the server for several devices
- An optional remote-deployment pairing flow beyond a shared secret
- Bring-your-own-database support (Postgres/MySQL), reconsidered if V1's SQLite-only approach proves limiting

These features are intentionally outside the scope of Version 1.0.

---

# Conclusion

The Local Sync Server's database is designed around the principles of:

- Zero-knowledge security
- Minimalism — one table for the vault, one for pairing
- No Clyro-operated infrastructure — the user runs and owns this database
- Optimistic-concurrency synchronization
- Simplicity over premature scalability

The database serves as a secure, single-purpose synchronization layer while ensuring that only the browser extension — never the server, never Clyro — can decrypt the vault.
