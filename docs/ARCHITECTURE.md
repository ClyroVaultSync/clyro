# Clyro Architecture Document

**Project:** Clyro
**Organization:** ClyroVaultSync
**Document Version:** 2.0.0
**Status:** Draft (Under Review)
**Last Updated:** August 2026

---

# Purpose

This document defines the technical architecture of Clyro Version 1.0.

It describes how the system is structured, how its components interact, and the engineering principles that guide implementation.

Unlike the Product Requirements Document (PRD), which defines **what** Clyro should do, this document defines **how** those requirements are implemented.

This document is intended for:

- Software engineers
- AI coding assistants
- Future maintainers
- Security reviewers
- Contributors

Every implementation should align with the architectural decisions documented here.

---

# Architecture Goals

The architecture is designed to achieve the following objectives:

- Security first
- True zero-knowledge encryption
- Local-first operation with user-chosen sync
- Simple and maintainable design
- Modular components
- Reliable synchronization
- Extensibility for future platforms
- Clear separation of responsibilities

Where trade-offs exist, security and maintainability take priority over feature complexity.

---

# Architectural Principles

The following principles guide all technical decisions.

## 1. Documentation First

Architecture is defined before implementation. Changes to architecture should be documented before code is written.

## 2. Security First

Security takes priority over convenience. No architectural decision should weaken the zero-knowledge security model.

## 3. Simplicity

Prefer simple, understandable solutions over unnecessary complexity. Avoid premature optimization.

## 4. Separation of Responsibilities

Each major component should have a clearly defined responsibility. Components should communicate through well-defined interfaces.

## 5. User Ownership of Storage

Clyro does not operate a shared backend or hold user accounts. The user chooses where their encrypted vault lives — a self-run local server, or their own Google Drive/Dropbox — and can move it between those choices at any time via export/import.

## 6. Scalability

The architecture should support future expansion without requiring major redesign. Version 1.0 focuses on Chromium browsers, but the architecture should accommodate future browser and mobile clients.

## 7. Maintainability

The codebase should remain readable, modular, and easy to extend. Every component should have a clear ownership boundary.

---

# High-Level System Architecture

Clyro Version 1.0 has **no Clyro-run backend for regular use**. The extension is the product; it picks one **Storage Provider** at setup and talks to it directly. The website is a marketing site and a launcher — it never touches vault data.

```
                    Chromium Browser
+--------------------------------------------------------+
|  Clyro Extension                                        |
|  UI (popup + full-page vault tab) · Autofill            |
|  Crypto Engine · Vault Manager · Sync Provider           |
+-----------------------+----------------------------------+
                          |
          (exactly one active Storage Provider)
                          |
        +-----------------+------------------+
        |                 |                  |
        v                 v                  v
  Local Sync Server   Google Drive       Dropbox
  (self-run, SQLite)  (appDataFolder)    (App Folder)
```

```
   Clyro Website (marketing + launcher, no vault data)
                          |
          externally_connectable bridge
          (status only — GET_STATUS / OPEN_VAULT)
                          |
                          v
                  Clyro Extension
```

The website and the extension are connected only by a narrow, status-only bridge (see [Extension ↔ Website Bridge](#extension--website-bridge)). The website cannot reach a user's local server or cloud storage directly, and never receives credentials, master passwords, or decrypted vault contents.

---

# Core Components

## 1. Browser Extension

The browser extension is the product. It is the only component that ever handles plaintext credentials.

Responsibilities include:

- Storage provider selection and setup (Local / Google Drive / Dropbox)
- Vault unlocking
- Password generation
- Password capture
- Autofill
- Auto Login
- Vault search
- Encryption and decryption
- Synchronization with the active storage provider
- Encrypted vault export / import

The extension hosts the vault UI itself, as a full-page extension tab — not the website. See [Vault UI Placement](#vault-ui-placement) below.

## 2. Storage Providers

Each user has exactly one active Storage Provider at a time, chosen during first-run setup:

- **Local** — a small self-run background application (the Local Sync Server) storing the vault in a bundled SQLite database on the user's own machine.
- **Google Drive** — the encrypted vault stored as a single file in the user's Drive `appDataFolder`, connected via `chrome.identity` OAuth.
- **Dropbox** — the encrypted vault stored via Dropbox's file API, same OAuth pattern.

All three are treated as opaque blob stores. None of them can decrypt vault contents — see [SyncProvider Interface](#syncprovider-interface).

## 3. Companion Website

The companion website provides marketing and a launcher for the extension. Examples include:

- Product marketing and homepage
- Local setup instructions (installing the Local Sync Server, pairing)
- Cloud setup instructions (connecting Google Drive / Dropbox)
- Dashboard launcher (opens the extension's vault tab if installed; shows an install prompt if not)
- Password generator (standalone, client-side)
- Download links and documentation

The website is **not** a vault interface. It never renders credentials, never receives a decryption key, and structurally cannot reach a user's local server or cloud storage — see [Extension ↔ Website Bridge](#extension--website-bridge).

### Hosting

The website is a **static export** (`output: 'export'` in `apps/website/next.config.js`), served from Cloudflare Pages at `https://clyrovault.pages.dev` on the free plan. Every push to `main` rebuilds and redeploys it.

- **It must stay server-free.** Static export cannot serve API routes, middleware, `next/image` optimisation, edge/on-demand routes, or dynamic routes without `generateStaticParams`. A feature that needs one of these means changing the hosting model, not just the code. This is also why the link-preview image is a committed `app/opengraph-image.png` rather than a generated route.
- **The live origin is duplicated on purpose.** It is set in `NEXT_PUBLIC_SITE_URL` / `src/lib/site-config.ts` (canonical URLs, sitemap, robots) and in the extension's `externally_connectable`. A domain change has to update both, or the bridge silently stops working.

---

# System Boundaries

## Client (Extension) Responsibilities

The extension performs:

- Storage provider connection and switching
- Encryption
- Decryption
- Password generation
- Vault search
- Autofill
- Password capture
- Encrypted export / import

Sensitive plaintext data never leaves the extension.

## Storage Provider Responsibilities

Each storage provider (Local Sync Server, Google Drive, Dropbox) performs:

- Accepting and returning an opaque encrypted vault blob
- Optimistic-concurrency version checking

No storage provider ever accesses decrypted vault contents, and none of them perform authentication of the *user* — there is no Clyro account. The Local Sync Server authenticates *callers* (see [Local Sync Server](#local-sync-server-architecture)) via a pairing token, which is a device-pairing concern, not a user-identity one.

## Website Responsibilities

The website performs:

- Presenting marketing content and setup instructions
- Pinging the extension for install/lock status (`GET_STATUS`)
- Asking the extension to open its vault tab (`OPEN_VAULT`)

The website never accesses vault data, encrypted or otherwise.

---

# Architectural Philosophy

Clyro follows a **client-centric architecture**. The extension owns all cryptographic operations and all storage-provider communication. There is no Clyro-run coordination service standing between the user and their data — the user's chosen storage is the only durable copy beyond the extension's own local cache.

---

# Browser Extension Architecture

The Chromium extension contains the majority of Clyro's business logic and is organized into independent components.

```
+--------------------------------------------------+
|                Browser Extension                 |
+--------------------------------------------------+
|  Popup UI (quick access)                         |
|  Full-page Vault Tab (vault.html) — main screen   |
|        |                                          |
|        v                                          |
|  Storage Picker / Setup (first run)               |
|        |                                          |
|        v                                          |
|  Vault Manager                                    |
|   |-- Crypto Engine                               |
|   |-- Vault Search                                |
|   |-- Password Generator                          |
|   |-- Password Capture                            |
|   |-- Autofill Engine                             |
|   |-- Auto Login                                  |
|   |-- Local Cache (encrypted)                     |
|   `-- Export / Import                             |
|        |                                          |
|        v                                          |
|  Sync Provider (SyncProvider interface)           |
|   |-- LocalProvider    -> Local Sync Server        |
|   |-- GoogleDriveProvider -> Google Drive          |
|   `-- DropboxProvider  -> Dropbox                  |
|                                                    |
|  Bridge Handler (onMessageExternal)                |
|   -> GET_STATUS / OPEN_VAULT from the website      |
+--------------------------------------------------+
```

---

# Extension Components

## Vault UI Placement

The vault UI is a **full-page extension tab** (`chrome-extension://<id>/vault.html`), not a page on the website. This is the product's main screen. The popup is a slimmed-down quick-access surface (search, copy, autofill) that links to the full tab.

This placement is deliberate, not incidental: a website page runs in a context any injected script on that page can read. Keeping the vault UI inside the extension means decrypted vault contents never exist inside an ordinary web page's JS context. See `docs/SECURITY.md` for the trust boundary this establishes.

### Responsibilities

- First-run storage picker (Local vs. Cloud)
- Vault list, search, add/edit/delete credentials
- Password generator interface
- Settings — Storage & Sync (connect, reconnect, switch provider)
- Export / import
- User notifications

The UI should remain lightweight and delegate business logic to dedicated modules.

## Storage Picker (First Run)

Replaces any concept of account login. On first run:

- **Local** branches to install instructions for the Local Sync Server, then pairing.
- **Cloud** branches to Google Drive or Dropbox OAuth via `chrome.identity`.

Neither path involves a Clyro account or a login screen.

## Vault Manager

The Vault Manager is the central coordinator for all vault operations.

Responsibilities include:

- Reading credentials
- Writing credentials
- Updating credentials
- Deleting credentials
- Organizing vault entries
- Coordinating encryption
- Coordinating synchronization via the active Sync Provider
- Coordinating export / import

The Vault Manager never talks to a storage backend directly — it always goes through `getActiveProvider()`. This is what lets `createVault`, `unlockVault`, `lockVault`, `getVaultItems`, and `applyVaultChange` stay identical regardless of which storage provider is active.

## Crypto Engine

The Crypto Engine performs all cryptographic operations, unchanged by the storage-provider model.

Responsibilities include:

- Key derivation (Argon2id)
- Encryption / decryption (XChaCha20-Poly1305)
- Secure random generation
- Key management in memory

The Crypto Engine is the only module responsible for handling encryption keys, and is implemented in `packages/crypto`, shared across the monorepo. See [[Vault Crypto]] in the knowledge base.

## Sync Provider

### SyncProvider Interface

All three storage providers implement the same interface, so the rest of the extension never needs to know which one is active:

```ts
interface SyncProvider {
  id: 'local' | 'google-drive' | 'dropbox';
  getVault(): Promise<{ encryptedVault: string; vaultVersion: number; vaultSalt: string } | null>;
  createVault(payload: { encryptedVault: string; vaultVersion: number; vaultSalt: string }): Promise<Result>;
  updateVault(payload: { encryptedVault: string; vaultVersion: number }): Promise<Result>;
  deleteVault(): Promise<Result>;
  isConnected(): Promise<boolean>;
}
```

This works because the vault-sync contract — an `encryptedVault` blob plus `vaultVersion` for optimistic concurrency — was already storage-agnostic before this design: "store a blob, return a blob, compare a version number" maps cleanly onto a local server, Google Drive, or Dropbox.

### LocalProvider

Talks to the Local Sync Server over `http://localhost:PORT`, authenticated with the pairing token issued at install time.

### GoogleDriveProvider

OAuth via `chrome.identity`; the vault is a single file in the user's Drive `appDataFolder`. Drive has no native version column or compare-and-swap precondition, so `vaultVersion` travels inside the JSON payload written to the file. `updateVault()` therefore re-reads the stored version immediately before writing and returns `CONFLICT` on a mismatch, leaving the retry to `applyVaultChange()`. A small read-then-write race remains that Drive cannot close. See [[Local-First Architecture]] in the knowledge base for the reasoning, and re-verify Drive's current API surface at implementation time.

Drive previously wrote a timestamped **conflict copy** file on a mismatch. That was removed once retry existed: the copy landed in the app-only `appDataFolder`, which the user cannot browse and the extension has no UI to restore from, so it was not a recovery path in practice — only an undiscoverable file accumulating on every conflict.

### DropboxProvider

Same shape via Dropbox's file API. Dropbox's upload endpoint supports a true atomic compare-and-swap (`mode: update` + `rev`), so a concurrent write is rejected at write time. `updateVault()` additionally compares `vaultVersion` before uploading: the `rev` precondition alone only guards the provider's own download-then-upload window, and would accept a write computed against a version that has since moved. Unlike Google Drive, Dropbox is not a native `chrome.identity.getAuthToken` provider — auth goes through `chrome.identity.launchWebAuthFlow` with PKCE (a public client, no client secret), and the resulting refresh token is stored so the access token can be silently refreshed without re-prompting the user.

## Password Capture

Responsibilities:

- Detect login forms
- Detect registration forms
- Detect password updates
- Prompt users to save credentials
- Detect duplicate credentials

## Autofill Engine

Responsibilities:

- Detect supported login forms
- Display credential selection dropdown
- Fill usernames
- Fill passwords
- Coordinate with Auto Login

The Autofill Engine never stores credentials itself.

## Auto Login

Responsibilities:

- Submit login forms after autofill
- Respect user preferences
- Remain disabled unless explicitly enabled

## Password Generator

Responsibilities:

- Generate secure passwords
- Respect user-selected options
- Provide passwords to the vault UI and the standalone website password generator

## Vault Search

Responsibilities:

- Search website names
- Search domains
- Search usernames
- Search account labels

Search operates entirely on the local decrypted vault while it is unlocked.

## Local Cache

Responsibilities:

- Store encrypted vault locally for fast loading and offline access
- Never persist decrypted credentials
- Act as a cache in front of whichever Storage Provider is active — not itself a Storage Provider

Only encrypted vault data is written to local storage. This is distinct from the **Local** Storage Provider, which is a separate self-run server; the Local Cache exists regardless of which provider is active.

## Export / Import

Responsibilities:

- Produce an encrypted `.clyro` file containing the full vault
- Restore a vault from a `.clyro` file
- Serve as the only recovery path when there is no account to reset
- Serve as the mechanism for moving a vault between storage providers

Both operations work on the already-encrypted vault blob; the file itself is never plaintext.

## Bridge Handler

Responsibilities:

- Listen for `chrome.runtime.onMessageExternal` from the Clyro website only (enforced by `externally_connectable`)
- Respond to `GET_STATUS` with `{ installed, provider, locked }`
- Handle `OPEN_VAULT` by calling `chrome.tabs.create` to open the extension's own vault tab

See [Extension ↔ Website Bridge](#extension--website-bridge) for the full contract and its constraints.

---

# Local Sync Server Architecture

The Local Sync Server is a trimmed, single-purpose repackaging of what was previously a shared cloud backend. It is not a Clyro-run service — each user runs their own instance on their own machine.

```
        +----------------------------+
        |   Local Sync Server        |
        |   (Fastify, localhost)     |
        +----------------------------+
                     |
        pairing-token auth + Origin allowlist
                     |
                     v
        +----------------------------+
        |   Vault route (opaque blob) |
        +----------------------------+
                     |
                     v
        +----------------------------+
        |   SQLite (clyro.db)         |
        |   single vault table        |
        +----------------------------+
```

## Responsibilities

- Accept and return an opaque encrypted vault blob plus its version number
- Enforce optimistic concurrency (reject stale-version writes)
- Authenticate callers via a pairing token issued at install time
- Restrict accepted request Origins to an allowlist

## What it does not do

There is no Clyro account, so the server does not perform:

- User registration or login
- Email or SMS verification
- Trusted device management
- Session management
- Any form of user identity

## Storage

- **Bundled SQLite only.** The app creates and initializes `clyro.db` on first launch. No configuration wizard, no user-visible SQL, no choice of database engine.
- **No ORM.** Prisma is dropped in favor of talking to SQLite directly — one table and one engine make an ORM pure overhead, and its removal is what makes single-binary packaging realistic.
- **Schema is essentially one table**: the encrypted vault blob, its version number, and the immutable `vaultSalt`. See `docs/DATABASE.md`.

## Authentication and network exposure

`localhost` is not a trust boundary against other software on the same machine, and is no boundary at all if the binary is later deployed somewhere reachable from more than one machine (a home server or VPS, for DIY multi-device sync). Because of this, authentication is required, not optional:

- The server issues a pairing token at install time.
- The extension stores the token and sends it with every request.
- The server rejects any request without a valid token, and enforces an Origin allowlist on top of that.

## Packaging and deployment

- Packaged as a small installer, Windows-first, matching the product's PC-focused audience.
- Runs as an auto-starting background process (system tray style) — the user never manually starts or restarts it after install.
- Running the same binary on a home server or VPS instead of pure `localhost` is a supported, documented deployment of the identical server, not a second code path. The pairing token is what makes that safe.

---

# Security & Encryption Architecture

Security is the foundation of Clyro's architecture.

Every component is designed around a true zero-knowledge model where only the extension can decrypt vault data. No storage provider — Local Sync Server, Google Drive, or Dropbox — ever has access to plaintext credentials, encryption keys, or the user's master password.

# Security Model

The security model is based on the following principles:

- Client-side encryption, entirely inside the extension
- End-to-end encrypted vault synchronization to whichever storage provider is active
- Zero-knowledge storage: every provider treats the vault as an opaque blob
- Strong password-based key derivation (Argon2id)
- Secure random generation
- Encryption keys remain in memory only while the vault is unlocked

# Master Password Lifecycle

The master password is created when the vault is first created — there is no account to register for. It is never stored anywhere, by the extension or by any storage provider.

The master password is used only for:

- Vault unlock
- Encryption key derivation

The master password itself is never used directly as an encryption key.

# Key Derivation

Clyro uses **Argon2id** to derive a cryptographic key from the user's master password.

The derivation process uses:

- User master password
- A unique, client-generated `vaultSalt` (immutable per vault, enabling consistent key derivation across devices)
- Memory-hard parameters (MODERATE preset)

The derived key exists only in memory while the vault is unlocked.

# Vault Encryption

All credentials stored in the vault are encrypted before leaving the extension.

Encryption occurs:

- Before local caching
- Before being sent to the active storage provider

No storage provider ever receives anything but encrypted vault data.

# Vault Decryption

Vault decryption occurs only after:

1. The extension has fetched (or already cached) the encrypted vault
2. The user supplies the correct master password
3. The client-side key derivation and decryption succeed

Only the extension performs decryption — no storage provider is capable of it.

# Local Storage

Requirements, unchanged regardless of which Storage Provider is active:

- Only encrypted vault data is stored on disk, by the extension's local cache or by the Local Sync Server's SQLite database.
- Plaintext credentials are never written to disk.
- Encryption keys are never persisted.
- Decrypted vault contents exist only in memory while unlocked.

# Secure Communication

- Local Sync Server traffic runs over `http://localhost` (or a user-operated remote deployment secured by the pairing token and Origin allowlist).
- Google Drive and Dropbox traffic runs over HTTPS via their respective SDKs.
- Sensitive information is never transmitted through insecure channels.

# Session Security

While the browser remains open:

- Vault remains unlocked once unlocked.
- Encryption keys remain in protected memory.

When the browser closes:

- Vault locks automatically.
- Encryption keys are destroyed from memory.
- Users must unlock the vault again during the next browser session.

# Vault Recovery

Because there is no Clyro account, there is no password reset flow. Recovery relies entirely on:

- **Encrypted export** (`.clyro` file) taken proactively by the user — the only backup mechanism.
- The vault surviving on whichever storage provider is active (a lost local `clyro.db` with no export is a lost vault).

Forgotten master passwords cannot recover an existing encrypted vault under any circumstances — this is an inherent property of the zero-knowledge model, not a missing feature.

# Security Responsibilities

## Extension

Responsible for:

- Key derivation
- Encryption
- Decryption
- Password generation
- Vault unlock
- Vault lock
- Export / import

## Storage Providers

Responsible for:

- Accepting and returning opaque encrypted vault blobs
- Version-based conflict detection
- (Local Sync Server only) authenticating callers via pairing token

No storage provider performs cryptographic operations on vault contents.

# Security Philosophy

Whenever security and convenience conflict, Clyro prioritizes protecting user data. Features that weaken the zero-knowledge model, or that would require plaintext vault data to leave the extension, are out of scope unless the project's security architecture is intentionally redesigned. See `docs/SECURITY.md` for the full threat model.

---

# Vault Unlock Lifecycle

The vault does not sit behind a login — it sits behind a master password check performed entirely client-side.

# Unlock Flow

1. User opens the extension (popup or full-page vault tab).
2. If no storage provider is configured yet, the first-run storage picker runs instead (see [Storage Picker](#storage-picker-first-run)).
3. The extension fetches the encrypted vault from the active storage provider (or uses its local cache if offline).
4. User enters the master password.
5. The extension derives the encryption key using Argon2id and the vault's `vaultSalt`.
6. The encrypted vault is decrypted locally.
7. The vault becomes available to the user.

At no point does any storage provider receive:

- The master password
- The encryption key
- Decrypted vault contents

# Browser Session

Once the vault has been unlocked:

- The vault remains unlocked while the browser is running.
- Encryption keys remain only in protected memory.
- The user may access vault features without repeatedly entering the master password.

Examples include autofill, password generation, vault search, and password capture.

# Browser Shutdown

When the browser closes:

- The vault immediately locks.
- Encryption keys are removed from memory.
- Decrypted vault data is discarded.

The next browser launch requires the user to unlock the vault again.

# Offline Operation

The extension continues functioning while offline, using its local encrypted cache. Users may unlock the vault, search credentials, view credentials, autofill credentials, and generate passwords. Changes made while offline remain encrypted locally and sync to the active storage provider automatically once connectivity returns.

# Session Timeout

Version 1.0 follows a browser-based session model:

- Vault remains unlocked while the browser is open.
- Closing the browser immediately locks the vault.
- Users unlock again during the next browser session.

Future versions may introduce configurable inactivity timeouts.

---

# Vault Synchronization Architecture

Clyro uses a **local-first synchronization model**: the extension owns the authoritative in-memory vault and pushes/pulls encrypted blobs to whichever single storage provider the user has chosen. There is no Clyro-run coordination service.

# Synchronization Flow

1. The vault is modified inside the extension.
2. The updated vault is encrypted locally.
3. The encrypted vault is sent to the active Storage Provider (`updateVault`), including the current `vaultVersion`.
4. The Storage Provider stores the encrypted vault and increments its version, or rejects the write as a conflict — in which case the extension re-applies the change to the newer vault and writes again (see [Conflict Resolution](#conflict-resolution)).
5. Other devices connected to the same Storage Provider detect a newer vault version on their next `getVault()` call.
6. The encrypted vault is fetched and decrypted locally on that device.

At no point does the Storage Provider access decrypted vault data.

# Synchronization Triggers

Synchronization occurs automatically when:

- A new credential is added, updated, or deleted.
- The vault is unlocked after being offline.
- The extension detects connectivity has returned.

Manual synchronization may also be available through the extension interface.

# Conflict Resolution

Version 1.0 uses **optimistic concurrency via `vaultVersion`**:

- A write includes the version it was based on.
- If the stored version has since moved (another device wrote first), the write is rejected.
- **Local Sync Server and Dropbox**: the provider enforces this atomically (SQLite transaction / Dropbox `rev`).
- **Google Drive**: no atomic precondition exists, so `GoogleDriveProvider` re-reads the stored version immediately before writing and reports the conflict itself. A small race remains that Drive cannot close.

A rejected write is retried automatically rather than shown to the user. `applyVaultChange()` in `background/vaultManager.ts` re-fetches the current vault, re-applies the change, and writes again, up to three attempts.

What makes that safe is that a save carries **the change** (an upsert of specific items, or a delete of specific ids) rather than a replacement item list. The extension therefore never writes back a list assembled from a stale read, so a concurrent write from another device survives untouched — it is present in the vault each attempt re-fetches. Conflicting edits to the *same* item still resolve last-write-wins.

`applyVaultChange()` also decrypts the stored vault before replacing it, so a vault encrypted under a different master password is refused rather than overwritten.

This approach prioritizes not losing data over merging conflicting edits to a single item. Future versions may introduce field-level merge or conflict history.

# Offline Synchronization

The extension remains fully functional while offline, via its local encrypted cache. Users can view, add, edit, and delete credentials, and generate and autofill passwords. All changes remain encrypted locally until synchronization to the active Storage Provider becomes possible.

# Synchronization Security

- Only encrypted vault data is ever transmitted to a Storage Provider.
- Local Sync Server traffic is authenticated with a pairing token and restricted by an Origin allowlist.
- Google Drive and Dropbox traffic is authenticated via their own OAuth flows, scoped to an app-specific folder.
- Encryption and decryption always occur inside the extension, never at a Storage Provider.

# Version Metadata

Each vault write includes:

- `vaultVersion`
- `vaultSalt` (set once at creation, immutable thereafter)

This metadata is used solely for synchronization coordination and never includes plaintext credential information.

# Synchronization Philosophy

Synchronization should be reliable, predictable, and transparent. Users should rarely need to think about which storage provider is active or how sync works during normal use. The system should automatically recover from temporary network failures without risking data integrity or compromising security, and should never silently discard a write it cannot safely apply.

---

# Extension ↔ Website Bridge

The live, publicly-hosted website cannot reach a visitor's local Sync Server or cloud storage directly — this is a deliberate browser security boundary (Private Network Access protections specifically block public HTTPS pages from probing local/private network addresses), not a missing feature.

**The vault UI lives in the extension, so the bridge carries status only — never credentials.** This is a hard architectural rule, recorded as a trust boundary in `docs/SECURITY.md`.

## Mechanism

1. The extension manifest declares `externally_connectable`, scoped strictly to Clyro's own live website domain plus `http://localhost:3000/*` for development. No other site can message the extension.
2. This requires a **stable extension ID** — a committed `key` in `apps/extension/manifest.json` (or a published Web Store listing).
3. The website's Dashboard page is a **launcher**. It sends exactly two message types:
   - `GET_STATUS` → extension responds `{ installed: true, provider: 'local' | 'google-drive' | 'dropbox' | null, locked: boolean }`
   - `OPEN_VAULT` → extension calls `chrome.tabs.create` to open its own vault tab
4. `OPEN_VAULT` has to work this way round because **a web page cannot navigate to a `chrome-extension://` URL** — Chrome blocks it unless the page is declared in `web_accessible_resources`, which Clyro deliberately does not do for the vault tab.
5. If the extension isn't installed or doesn't respond, the Dashboard shows an install prompt — never an error, and never stale or fake data.
6. No bridge message may ever carry a credential, master password, vault key, or decrypted blob. This is enforced by the message union type in `packages/shared-types`, which has no field capable of carrying such a payload.

This keeps sensitive vault operations inside the extension, with the website acting only as a doorway to it.

---

# Recommended Project Structure

The repository is organized to keep responsibilities clearly separated.

```
Clyro/
|-- docs/
|   |-- AI_INSTRUCTIONS.md
|   |-- PRD.md
|   |-- ARCHITECTURE.md
|   |-- DATABASE.md
|   `-- API.md
|
|-- apps/
|   |-- extension/            # Chromium extension (Vite + CRXJS)
|   |   `-- src/
|   |       |-- background/   # vaultManager, sync providers, bridge handler
|   |       |-- crypto/       # (re-exports packages/crypto)
|   |       |-- popup/        # slim quick-access UI
|   |       |-- vault/        # full-page vault tab
|   |       |-- options/      # Storage & Sync settings
|   |       |-- content/      # autofill content scripts
|   |       `-- storage/      # local encrypted cache
|   |
|   |-- backend/              # Local Sync Server (Fastify + SQLite, no Prisma)
|   |   `-- src/
|   |       |-- routes/       # vault.ts, pairing.ts
|   |       |-- services/     # vaultValidation.ts
|   |       `-- db/           # SQLite setup
|   |
|   `-- website/              # Next.js marketing site + launcher
|       `-- src/
|
|-- packages/
|   |-- crypto/               # Argon2id + XChaCha20-Poly1305 (unchanged by this design)
|   |-- shared-types/         # SyncProvider, bridge message types
|   `-- config/               # shared eslint/prettier/tsconfig
```

# Directory Responsibilities

## docs/

Contains all project documentation. Documentation is considered part of the product and should remain synchronized with implementation.

## apps/extension/

Contains the Chromium browser extension — the product itself. All client-side cryptographic operations and the vault UI live here.

## apps/backend/

Contains the Local Sync Server: a single-purpose, self-run vault store. It never decrypts vault data and holds no user accounts.

## apps/website/

Contains the marketing site and the extension launcher. Vault operations never happen here.

## packages/

Contains code shared between multiple apps: crypto primitives, shared types, and shared tooling config.

---

# Technology Stack

| Component | Technology |
|-----------|------------|
| Browser Extension | Chromium Extension (Manifest V3), Vite + CRXJS |
| Frontend Language | TypeScript |
| Local Sync Server Runtime | Node.js |
| Local Sync Server Framework | Fastify |
| Local Sync Server Storage | SQLite (bundled, no ORM) |
| Cloud Storage Providers | Google Drive (`chrome.identity`), Dropbox |
| Local Sync Server Auth | Pairing token + Origin allowlist |
| Key Derivation | Argon2id |
| Vault Encryption | XChaCha20-Poly1305 |
| Transport Security | HTTPS (TLS) for cloud providers; localhost / pairing-token-secured HTTP for the Local Sync Server |
| Website | Next.js |
| Package Manager | pnpm (workspaces) |
| Version Control | Git + GitHub |

# Technology Selection Principles

Technology choices should follow these principles:

- Prefer mature and well-maintained technologies.
- Minimize unnecessary dependencies.
- Favor readability over clever implementations.
- Prioritize long-term maintainability.
- Keep the architecture modular.
- Replace technologies only when there is a clear technical benefit.

Technology decisions should remain consistent across the project unless a documented architectural decision requires a change.

---

# Architecture Decision Summary

| Area | Decision |
|------|----------|
| Product Model | Local-first, bring-your-own-storage password manager |
| Clyro-run backend | None for regular use |
| Security Model | True Zero-Knowledge |
| Browser Support | Chromium-based browsers only |
| Future Expansion | Firefox, Safari, Mobile |
| Storage Providers | Local (self-run + SQLite), Google Drive, Dropbox — exactly one active |
| Vault UI Location | Inside the extension (full-page tab), not the website |
| Website Role | Marketing + status-only launcher |
| Vault Unlock | Master Password (client-side, no account) |
| Session Policy | Vault remains unlocked while browser is open |
| Browser Close | Automatically locks the vault |
| Client Encryption | Yes |
| Storage Provider Decryption | Never |
| Offline Support | Full, via local encrypted cache |
| Synchronization | Automatic, against the single active provider |
| Conflict Resolution | Optimistic concurrency (`vaultVersion`); rejected writes re-applied to the newer vault and retried automatically |
| Recovery | Encrypted export/import (`.clyro` file) — no account, no password reset |
| Password Generator | User-configurable, also available standalone on the website |
| Auto Login | Optional (disabled by default) |
| Local Sync Server Storage | SQLite, no ORM |
| Local Sync Server Auth | Pairing token + Origin allowlist |
| Backend Framework | Fastify |
| Frontend Language | TypeScript |
| Companion Website | Next.js |
| Encryption Algorithm | XChaCha20-Poly1305 |
| Key Derivation | Argon2id |

---

# Architecture Governance

This document serves as the technical source of truth for Clyro's implementation.

If a future implementation requires a significant architectural change, the change should be documented and reviewed before development proceeds.

Architecture decisions should be intentional, documented, and aligned with the project's core principles of security, privacy, simplicity, and maintainability.

---

# Conclusion

This Architecture Document defines the technical foundation for Clyro Version 1.0.

It translates the product vision described in the Product Requirements Document (PRD) into a practical engineering blueprint. The architecture establishes clear responsibilities for each system component, defines security boundaries, and documents the principles that guide implementation.

The most important architectural commitments made by this document are:

- True zero-knowledge security
- Client-side encryption and decryption, entirely inside the extension
- No Clyro-run backend for regular use — the user owns their storage
- A status-only bridge between the website and the extension
- Chromium-first browser support
- Clear separation of responsibilities
- Documentation-first development

Future platform expansion — including Firefox, Safari, Android, and iOS — should build upon this architecture without compromising its core security model.

Any significant architectural change should be documented, reviewed, and approved before implementation to ensure consistency across the project.

---

# Document Status

| Field | Value |
|-------|-------|
| Document | Architecture Document |
| Version | 2.0.0 |
| Status | Draft (Under Review) |
| Owner | ClyroVaultSync |
| Last Reviewed | August 2026 |
| Next Review | Before implementation of Version 1.1 |

**End of Document**
