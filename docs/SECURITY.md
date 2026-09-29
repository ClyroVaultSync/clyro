# Security Document

Version: 2.0.0

Status: Draft (Under Review)

---

# Purpose

This document defines the security architecture, security principles, cryptographic design, and operational security practices for Clyro Version 1.0.

Security is the foundation of Clyro.

Every architectural decision, implementation detail, and future enhancement must preserve the project's zero-knowledge security model.

This document should be read together with:

- PRD.md
- ARCHITECTURE.md
- DATABASE.md
- API.md
- AI_INSTRUCTIONS.md

---

# Scope

This document defines the security principles and architectural guarantees for Clyro Version 1.0.

It is not intended to serve as a penetration testing report, security audit, or compliance certification.

Implementation details may evolve over time, but the security principles defined in this document are considered foundational and should remain consistent across future releases.

---

# Security Philosophy

Clyro is built on one fundamental principle:

> Only the user should ever have access to their secrets.

Security always takes priority over convenience whenever a trade-off exists.

Version 1.0 follows the following security principles:

- True Zero-Knowledge Architecture
- Client-Side Encryption
- User Ownership of Storage
- Privacy by Design
- Defense in Depth
- Principle of Least Privilege
- Secure Defaults
- Industry-Standard Cryptography
- Minimal Trust Architecture

Every future feature must preserve these principles.

---

# Security Goals

The primary security objectives of Version 1.0 are:

- Protect all user credentials from unauthorized access.
- Prevent any storage provider (Local Sync Server, Google Drive, Dropbox) from accessing vault contents.
- Ensure encryption and decryption occur exclusively inside the browser extension.
- Keep plaintext credentials and vault keys from ever crossing into a web page.
- Secure vault synchronization against unauthorized callers.
- Secure local vault storage.
- Minimize attack surface.
- Preserve user privacy.
- Build a maintainable security architecture for future releases.

---

# Security Model

Clyro follows a true zero-knowledge security model with **no Clyro-run backend for regular use**. The user's chosen Storage Provider stores an encrypted vault but never possesses sufficient information to decrypt it.

At no point does any Storage Provider receive:

- Master passwords
- Encryption keys
- Plaintext credentials
- Plaintext secure notes
- Decrypted vault contents

Only the browser extension, which knows the user's master password after a successful unlock, can decrypt vault data.

Each Storage Provider acts solely as an opaque blob store with optimistic-concurrency version checking — never as an authentication or coordination service for the user's identity, because there is no Clyro account.

---

# Trust Boundary: The Extension Is the Only Place Secrets Exist

**This is the central trust boundary of Clyro's design, and it must never be violated by any feature:**

> Plaintext credentials, the master password, and derived vault encryption keys never cross out of the browser extension into a web page — including Clyro's own website.

The Clyro website and the extension communicate only through a narrow, status-only bridge (`GET_STATUS` / `OPEN_VAULT`). No message in that bridge can carry a credential, master password, vault key, or decrypted blob — the bridge's message union type has no field capable of carrying one. See `docs/ARCHITECTURE.md`'s "Extension ↔ Website Bridge" section for the mechanism.

The reasoning: an ordinary web page runs in a context that any script injected into that page (via a compromised dependency, a malicious ad, an XSS bug elsewhere on the domain, etc.) can read. A browser extension page does not share that exposure with arbitrary web content. Because of this, the vault UI is a full-page **extension** tab, not a page on the website — decrypted vault contents must never exist inside a web page's JS context, under any circumstance, even temporarily.

This boundary did not exist in earlier designs that had the extension hand decrypted vault contents to a website page for rendering. That approach is rejected; any future proposal to render vault contents on the website must be treated as a security regression, not a UI convenience.

---

# Core Security Principles

## Zero-Knowledge by Design

Zero-knowledge is the defining architectural principle of Clyro.

All sensitive information is encrypted before leaving the browser extension.

No Storage Provider performs encryption or decryption on behalf of users.

Compromise of a Storage Provider (a user's own Local Sync Server, Google Drive account, or Dropbox account) must not expose vault contents beyond what that provider already had access to as an opaque encrypted blob.

## Client-Side Encryption

All cryptographic operations occur locally, inside the extension.

This includes:

- Vault encryption
- Vault decryption
- Password generation
- Encryption key derivation

Only encrypted vault data is transmitted to a Storage Provider.

## User Ownership of Storage

Clyro does not operate a shared backend or hold user accounts. The user chooses where their encrypted vault lives, and that choice determines the storage-side threat model:

- **Local** — the user's own machine (or a machine/VPS they operate).
- **Google Drive / Dropbox** — the user's own cloud account, secured by that provider's own authentication.

Clyro's security guarantees are about what leaves the extension, not about the storage provider's own infrastructure security — that responsibility belongs to the user and the provider they picked.

## Privacy by Design

Clyro intentionally collects no account information, because there is no Clyro account. The only metadata that exists is:

- The encrypted vault blob itself
- Its version number
- Its immutable `vaultSalt`
- (Local Sync Server only) a pairing token used to authenticate the extension as a caller

Clyro intentionally avoids collecting any unnecessary personal information.

## Defense in Depth

Security is implemented using multiple independent protection layers. Examples include:

- Authenticated encryption
- Secure key derivation
- Pairing-token authentication and Origin allowlisting on the Local Sync Server
- Optimistic-concurrency version checking on every Storage Provider
- The extension-only trust boundary described above

Compromising a single security mechanism should never compromise the entire system.

## Principle of Least Privilege

Every component receives only the permissions required for its role.

### Browser Extension

Responsible for:

- Vault encryption
- Vault decryption
- Password generation
- Autofill
- Auto-save
- Auto-login
- Local vault management
- Encrypted export / import

### Storage Providers

Responsible only for:

- Accepting and returning an opaque encrypted vault blob
- Version-based conflict detection
- (Local Sync Server only) authenticating the calling extension via pairing token

No Storage Provider ever receives permission to decrypt vault contents.

### Website

Responsible only for:

- Marketing content and setup instructions
- Pinging the extension for install/lock status
- Asking the extension to open its own vault tab

The website never receives permission to touch vault data in any form, and structurally cannot — it has no code path that reaches a Storage Provider.

## Secure Defaults

Default configuration should always favor security. Examples include:

- Encryption enabled by default (there is no "unencrypted vault" mode)
- Local Sync Server requires pairing-token authentication by default — it is not optional
- HTTPS-only communication for cloud Storage Providers
- Secure password generation defaults

Users may increase security settings but should never be placed into insecure configurations by default.

---

# Threat Model

Version 1.0 protects against realistic threats faced by a local-first, bring-your-own-storage password manager. The adversary Clyro defends against is no longer "someone who breaches Clyro's database" — there is no such database — but **someone who compromises, intercepts, or impersonates access to the user's own chosen storage.**

## Protected Assets

The following information is considered highly sensitive:

- Website credentials
- Secure notes
- Master password
- Derived encryption keys
- User vault contents

Protecting these assets is the primary objective of Clyro's security architecture.

## Threats Addressed

Version 1.0 is designed to mitigate:

- Compromise of a user's Local Sync Server host or its SQLite file
- Compromise of a user's Google Drive / Dropbox account credentials (mitigated by those providers' own auth, not by Clyro)
- Network interception between the extension and a Storage Provider
- Unauthenticated or unauthorized callers reaching the Local Sync Server (mitigated by the pairing token + Origin allowlist)
- Replay or tampering of encrypted vault data (mitigated by authenticated encryption)
- Lost writes from concurrent updates (mitigated by `vaultVersion` optimistic concurrency, plus automatic re-apply-and-retry on a rejected write — saves carry the change made, never a replacement item list)
- Credential exposure via a compromised or malicious web page — mitigated structurally by never putting plaintext vault data in a web page's JS context

## Threats Outside the Scope of Version 1.0

No password manager can eliminate every possible threat. Version 1.0 does not protect against:

- Malware executing on an unlocked client device
- Hardware keyloggers
- Compromised operating systems
- Physical theft of an already unlocked device
- Social engineering attacks
- Phishing attacks outside the application's control
- The user's chosen cloud storage provider (Google, Dropbox) itself being compromised at the infrastructure level

Users remain responsible for maintaining the security of their devices, protecting their master password, and securing whichever storage provider they choose.

---

# Security Assumptions

The security guarantees provided by Clyro assume:

- The user's operating system is trusted.
- The browser extension has not been modified by malicious software.
- The master password remains secret.
- HTTPS certificates are valid (for cloud Storage Providers).
- Industry-standard cryptographic libraries are correctly implemented.
- The user's Local Sync Server host, if used, remains under the user's control.

If these assumptions are violated, some security guarantees may no longer apply.

---

# Cryptography

Version 1.0 uses modern, industry-standard cryptographic primitives.

Cryptography should always be implemented using well-tested, actively maintained libraries.

Custom cryptographic implementations are strictly prohibited.

Encrypted vaults should include a cryptographic version identifier to allow future algorithm upgrades while maintaining backwards compatibility.

## Authenticated Encryption

Clyro protects encrypted vault data using:

**XChaCha20-Poly1305**

This authenticated encryption algorithm provides:

- Confidentiality
- Integrity
- Authenticity

Any unauthorized modification of encrypted vault data is detected during decryption, regardless of which Storage Provider held it.

## Key Derivation

Encryption keys are derived using:

**Argon2id**

Argon2id parameters (memory cost, iterations, and parallelism) follow the MODERATE preset and should be selected according to current industry recommendations, adjusted in future releases as hardware capabilities evolve.

Argon2id provides strong protection against:

- GPU attacks
- ASIC attacks
- Dictionary attacks
- Brute-force attacks

No encryption key is permanently stored.

## Encryption Key Lifecycle

The encryption key exists only while the vault is unlocked.

The lifecycle is:

1. User enters master password.
2. Argon2id derives the encryption key, using the vault's `vaultSalt`.
3. Vault is decrypted locally, inside the extension.
4. Key remains only in volatile memory.
5. Key is securely discarded when the vault is locked or the browser session ends.

The `vaultSalt` is generated once, client-side, at vault creation, and stored alongside the encrypted vault by whichever Storage Provider is active (see `docs/DATABASE.md`). This is safe under the zero-knowledge model: a salt has no value to an attacker without the corresponding master password, and no Storage Provider ever uses it for any cryptographic operation of its own — it exists purely so the extension can re-derive the identical key on any device.

Encryption keys are never:

- Stored on disk
- Sent to any Storage Provider
- Logged
- Persisted between browser sessions

Future versions may support vault re-encryption using updated cryptographic parameters or algorithms without requiring changes to stored credentials.

## Cryptographically Secure Randomness

All random values used for security-sensitive operations must originate from secure operating system random number generators.

This includes:

- Encryption nonces
- The `vaultSalt`
- The Local Sync Server pairing token
- Password generation

Predictable or non-cryptographic random generators must never be used.

---

# Master Password

The master password is the root of the user's encrypted vault, created when the vault is first created — there is no account to register.

Its sole purpose is to derive the encryption key required to decrypt vault contents.

The master password:

- Never leaves the browser extension
- Is never transmitted to any Storage Provider
- Is never stored, anywhere, by anything
- Is never logged
- Exists only during vault unlock, in memory

No Storage Provider has any knowledge of the master password.

## Master Password Recovery

Clyro follows a true zero-knowledge recovery model, made stricter by the absence of any account:

If a user forgets their master password:

- The encrypted vault cannot be recovered.
- No Storage Provider can decrypt stored vaults.
- There is no customer support path that can recover vault contents — there is no Clyro-run service to ask.
- Existing encrypted vault data remains permanently inaccessible.

**Because there is no account, there is no password reset flow of any kind.** The only defense against permanent vault loss is an **encrypted export** (`.clyro` file) taken proactively by the user before the master password is forgotten or the storage is lost. This makes export/import a first-class, load-bearing feature of Version 1.0, not an optional convenience — see `docs/PRD.md` and `docs/API.md`.

This is a deliberate security decision rather than a technical limitation, and it is a direct consequence of the zero-knowledge model: any recovery path that did not require the master password would necessarily mean somewhere held enough information to decrypt the vault without it.

## Password Strength

Users should create strong master passwords.

Recommended characteristics include:

- Long passphrases
- High entropy
- Uniqueness (no reuse from other accounts)

Weak master passwords significantly reduce the security of encrypted vaults regardless of the encryption algorithm.

---

# Local Sync Server Security

The Local Sync Server is not a Clyro-run service — each user runs their own instance, either on `localhost` or, for technically-inclined users, on a home server or VPS they control.

## Why Authentication Is Mandatory

`localhost` is not a trust boundary against other software running on the same machine, and provides no boundary at all once the server is reachable from more than one machine. Because of this, authentication is required, not optional, for every deployment shape:

- A pairing token is issued by the server at install time.
- The extension stores the token and sends it with every request.
- The server rejects any request without a valid token.
- The server additionally enforces an Origin allowlist, so only the Clyro extension (and, in development, `localhost:3000`) may call it.
- Pairing itself (`POST /api/v1/pairing/initiate`, the one endpoint that needs no token) requires an allowlisted `Origin` to be *present*. Web pages and other browser extensions always send their own origin, so they cannot obtain a token. The server is always running once installed, which is why this is stricter than the vault routes, where a missing `Origin` on a GET is tolerated.

## What the Local Sync Server Never Does

Because there is no Clyro account:

- No user registration or login
- No email or SMS verification
- No trusted device registry
- No session management
- No knowledge of user identity of any kind

It stores and returns exactly one thing: an opaque encrypted vault blob, its version, and its salt.

## Database Security

The Local Sync Server's SQLite database (`clyro.db`, at `%LOCALAPPDATA%\Clyro\clyro.db` for the Windows installer) stores only:

- The encrypted vault blob
- Its `vaultVersion`
- Its `vaultSalt`

It never stores:

- Plaintext credentials
- The master password
- Encryption keys
- Decrypted vault contents
- Any user account or identity information

A stolen `clyro.db` file exposes nothing without the master password — but see [Master Password Recovery](#master-password-recovery): a *lost* `clyro.db` with no corresponding export is an unrecoverable vault, which is a distinct risk from theft and the primary reason export/import exists.

## API Security

- Every request to the Local Sync Server must include a valid pairing token.
- The Origin allowlist rejects requests from any origin other than the Clyro extension and its declared development origin.
- Cloud Storage Providers (Google Drive, Dropbox) are reached over HTTPS via their own OAuth-authenticated SDKs; Clyro never handles or stores those providers' credentials beyond the OAuth token `chrome.identity` manages.
- Sensitive information must never appear in any response from any Storage Provider.

---

# Vault Security

The encrypted vault represents the most sensitive asset managed by Clyro. Protecting it is the primary objective of the application's security architecture, independent of which Storage Provider holds it.

## Vault Encryption

Before storage or synchronization:

1. Vault data is encrypted locally, inside the extension.
2. Authentication tags are generated as part of XChaCha20-Poly1305 encryption.
3. Only encrypted vault data is sent to the active Storage Provider.

No Storage Provider ever receives decrypted vault contents.

## Vault Integrity

Authenticated encryption ensures unauthorized modification of vault contents is detected. Corrupted or tampered encrypted vaults must never decrypt successfully.

## Vault Synchronization

Synchronization transfers only encrypted vault data to and from a single active Storage Provider. Every Storage Provider:

- Stores the encrypted vault blob.
- Compares `vaultVersion` to detect conflicting writes.
- Never inspects vault contents.

Google Drive, lacking a native compare-and-swap primitive, re-reads the stored version immediately before writing and reports a conflict itself rather than silently overwriting a concurrent write. On any provider, a rejected write is re-applied to the newer vault and retried rather than discarded — see `docs/ARCHITECTURE.md`.

## Offline Access

Version 1.0 supports full offline vault access via the extension's local encrypted cache. Users may unlock a previously synchronized encrypted vault without connectivity to their Storage Provider. Offline access never requires any Storage Provider to decrypt anything, because none of them can.

Changes saved while the Storage Provider is unreachable wait in an offline write queue, encrypted with the vault key (XChaCha20-Poly1305, as the vault itself) before they are written to `chrome.storage.local`. Only the number of waiting changes and the last sync error message are stored unencrypted; neither contains credential data. Until they sync, those changes exist only on this device, so removing the extension or clearing its data first loses them. See `docs/ARCHITECTURE.md` "Offline Synchronization".

## Vault Export and Import

The encrypted `.clyro` export file:

- Contains the same encrypted vault blob the extension would otherwise send to a Storage Provider — never a re-derived or weaker encryption.
- Is the only backup mechanism, given the absence of an account-based recovery path.
- Is the only way to move a vault from one Storage Provider to another.

Import restores a vault from a `.clyro` file by decrypting it locally (requiring the correct master password) exactly as if it had been fetched from a Storage Provider.

---

# Local Storage Security

Version 1.0 stores only encrypted vault data locally, on every device, regardless of which Storage Provider is active.

Plaintext credentials are never written to persistent storage.

## Local Encryption

Before local persistence:

- Vault contents remain encrypted.
- Encryption keys are never persisted.

## Memory Protection

Sensitive information should remain in memory only while required. Examples include:

- Master password
- Derived encryption keys
- Decrypted vault contents

Whenever practical, sensitive memory should be cleared immediately after use.

## Local Security Guarantees

Local storage provides the following guarantees:

- No plaintext credentials stored on disk, by the extension's cache or by the Local Sync Server.
- No stored encryption keys.
- No stored master password.
- Offline vault availability using encrypted storage only.

These guarantees remain fundamental to the security model of Version 1.0.

---

# Browser Extension Security

The browser extension is the trusted execution environment responsible for handling user secrets, and the **only** such environment in Clyro's architecture — see [Trust Boundary](#trust-boundary-the-extension-is-the-only-place-secrets-exist).

It performs:

- Vault encryption
- Vault decryption
- Credential storage
- Password generation
- Autofill
- Auto-save
- Auto-login
- Export / import

Because sensitive operations occur exclusively within the extension, minimizing its attack surface — including the surface exposed to the website via the bridge — is a primary design objective.

## Secure Credential Handling

Credentials should exist in plaintext only while actively required. Whenever practical:

- Avoid unnecessary copies in memory.
- Minimize credential lifetime.
- Clear sensitive variables after use.

Persistent storage must always contain encrypted data.

## Autofill Security

Autofill should occur only when:

- The current website matches stored credentials.
- The vault is unlocked.
- The user has enabled autofill.

Autofill should never expose credentials to unrelated domains.

## Auto-Save Security

Credential detection should occur only after successful user interaction. Detected credentials should be:

1. Reviewed by the user.
2. Encrypted locally.
3. Stored inside the encrypted vault.

No Storage Provider ever receives plaintext credentials.

## Bridge Security

The extension's `onMessageExternal` listener:

- Only accepts messages from origins declared in `externally_connectable` (Clyro's live website domain, plus `http://localhost:3000` for development).
- Only implements `GET_STATUS` and `OPEN_VAULT` — no other message type is recognized.
- Never returns vault contents, credentials, or key material in any response.

Any future bridge message must be reviewed against the trust boundary above before being added.

---

# Logging and Monitoring

Security logging is valuable for operational debugging but must never compromise user privacy.

## Safe Logging

Logs may include:

- Local Sync Server pairing failures (wrong token, disallowed Origin)
- Storage Provider connection failures
- Synchronization / version-conflict events
- Extension-side error events (without payload contents)

## Sensitive Information Never Logged

The following must never appear in logs, anywhere in the system:

- Master passwords
- Encryption keys
- Plaintext credentials
- Secure notes
- The pairing token itself (its failure/success may be logged; its value must not be)
- Vault contents, encrypted or decrypted

Logging sensitive information is considered a critical security defect.

---

# Dependency Security

Clyro depends on trusted third-party libraries for cryptography and infrastructure.

Version 1.0 follows these principles:

- Prefer mature libraries.
- Avoid abandoned packages.
- Keep dependencies updated.
- Remove unused packages.
- Monitor known vulnerabilities.

Cryptographic libraries should never be replaced by custom implementations.

---

# Supply Chain Security

Every dependency introduces potential security risk.

Version 1.0 aims to reduce supply chain exposure through:

- Minimal dependency count
- Trusted package sources
- Dependency review
- Version pinning where appropriate
- Regular security updates

---

# Security Testing

Security testing should become part of the development lifecycle.

Recommended testing includes:

- Encryption / decryption validation
- Local Sync Server pairing-token and Origin-allowlist enforcement
- Bridge message-boundary testing (confirming no message type can carry secrets)
- Storage Provider conflict-handling behavior, including that a retried write preserves a concurrent write from another device
- Export / import round-trip testing, including across Storage Providers
- Input validation

Regression testing should ensure new features do not weaken existing security guarantees.

---

# Vulnerability Disclosure

If a security vulnerability is discovered:

1. Privately report the issue.
2. Reproduce the vulnerability.
3. Assess impact.
4. Develop a fix.
5. Validate the fix.
6. Release the update.
7. Publish disclosure details when appropriate.

Critical vulnerabilities should never be disclosed publicly before users have an opportunity to update.

---

# Future Security Enhancements

Potential future improvements include:

- Hardware security key support for vault unlock
- Passkey-based vault unlock
- Biometric vault unlock
- Encrypted vault version history
- Additional Storage Providers
- Advanced conflict-resolution UI

These enhancements remain outside the scope of Version 1.0.

---

# Security Responsibilities

Security is a shared responsibility.

## Users

Users are responsible for:

- Choosing a strong master password.
- Taking regular encrypted exports (their only backup).
- Securing whichever Storage Provider they choose (their machine, or their Google/Dropbox account).
- Keeping operating systems updated.
- Remaining vigilant against phishing and social engineering.

## Developers

Developers are responsible for:

- Preserving zero-knowledge architecture.
- Preserving the extension-only trust boundary — never letting plaintext vault data reach a web page.
- Following secure coding practices.
- Updating documentation before architectural changes.
- Reviewing security implications of new features, especially new bridge messages or new Storage Providers.
- Maintaining dependency security.

---

# Security Review Checklist

Before any production release, verify that:

- Client-side encryption remains intact.
- Master passwords never leave the extension.
- Encryption keys are never persisted.
- Vault contents remain encrypted in transit to every Storage Provider.
- Vault contents remain encrypted at rest, everywhere.
- The bridge cannot carry credentials, master passwords, vault keys, or decrypted blobs, under any message type.
- The Local Sync Server rejects unpaired or disallowed-Origin callers.
- A version conflict is re-applied to the newer vault and retried, never a silent overwrite and never a lost write.
- Export / import round-trips a vault correctly, including across Storage Providers.
- Sensitive data is never logged.
- Documentation accurately reflects implementation.

---

# Conclusion

Security is the defining characteristic of Clyro.

Every component of the system is designed around one objective:

> Ensure that only the user can access their secrets.

Version 1.0 achieves this through:

- True zero-knowledge architecture with no Clyro-run backend
- Client-side encryption, entirely inside the browser extension
- A hard trust boundary keeping plaintext vault data out of any web page
- Modern cryptographic standards
- Pairing-token authentication on the Local Sync Server
- Encrypted export/import as the sole recovery and provider-migration path
- Defense in depth
- Privacy by design

Future versions of Clyro should preserve these principles while continuing to strengthen the platform against evolving security threats.

---

**End of SECURITY.md**
