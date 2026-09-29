# API Design Document

Version: 2.0.0

Status: Draft (Under Review)

---

# Purpose

This document defines the API surface for Clyro Version 1.0: the **Local Sync Server's** HTTP API, and the **extension ↔ website bridge**. There is no Clyro-operated backend and no account API — see `docs/ARCHITECTURE.md` and `docs/PRD.md` for why.

Google Drive and Dropbox, the two Cloud storage providers, are accessed through their own vendor SDKs/APIs (`chrome.identity` OAuth plus each provider's file API), not through anything Clyro defines. This document does not attempt to redocument their APIs; it documents the `SyncProvider` contract they must satisfy, which lives in `packages/shared-types` and is described in `docs/ARCHITECTURE.md`.

---

# API Design Philosophy

The Local Sync Server API follows these principles:

- RESTful architecture
- Versioned endpoints
- JSON request and response bodies
- Stateless request handling (beyond the single stored vault row)
- Zero-knowledge security — the server never receives anything but an opaque encrypted blob
- Consistent error responses
- Predictable endpoint behavior

---

# API Versioning

All Version 1 endpoints begin with:

`/api/v1/`

Examples:

- `GET /api/v1/vault`
- `POST /api/v1/vault`
- `PUT /api/v1/vault`
- `DELETE /api/v1/vault`
- `GET /api/v1/vault/metadata`

Future versions may introduce `/api/v2/` without breaking existing clients.

---

# Authentication

The Local Sync Server has no user accounts — it authenticates **the calling extension**, not a person.

Every request must include the pairing token issued by the server at install time:

```
Authorization: Bearer <pairingToken>
```

Requests missing this header, or presenting an invalid pairing token, receive a `401 UNAUTHORIZED` response. There is no login endpoint, no refresh flow, and no concept of an expiring session token — the pairing token is a long-lived device credential, revoked and reissued only by re-pairing.

The server additionally enforces an Origin allowlist (the extension's own origin, plus `http://localhost:3000` in development) on top of the pairing token, for requests that carry an `Origin` header at all. A request with an `Origin` header that doesn't match the allowlist is rejected with `401 UNAUTHORIZED`, same as a missing/invalid pairing token. A request with **no** `Origin` header is not rejected on that basis alone — Chrome does not attach one to a plain GET `fetch()` from an extension service worker to a `host_permissions`-covered target (confirmed 2026-09-04), even though it reliably does for POST/PUT/DELETE from the same code. The pairing token remains mandatory on every request regardless of Origin. The one place Origin is stricter is `POST /api/v1/pairing/initiate`, which requires an allowlisted `Origin`. See the Pairing API below.

---

# Request & Response Format

## Requests

Content-Type: `application/json`

## Responses

Content-Type: `application/json`

---

# Pairing API

Issues and validates the pairing token used to authenticate the extension to this Local Sync Server instance.

---

**POST /api/v1/pairing/initiate**

Called once, during first-run Local setup, to obtain a pairing token. It needs no pairing token, since it is how one is obtained. It does require an `Origin` header on the allowlist: a request with no `Origin`, or with any other origin, gets `401 UNAUTHORIZED` and no token is issued. Chrome always attaches the extension's origin to this POST, so the Clyro extension can pair. Web pages and other browser extensions send their own origin, so they cannot. This does not stop other software on the same machine, which can set any header, but that software could read `clyro.db` directly anyway. A remote deployment (home server/VPS) should additionally gate this endpoint behind an out-of-band shared secret configured at server install time — see `docs/ARCHITECTURE.md`'s Local Sync Server section.

**Authentication Required**

No pairing token. An allowlisted `Origin` header is required.

**Request Body**

None (or, for a remote deployment, an install-time shared secret — finalize at implementation time)

**Success Response (200)**

```json
{
  "success": true,
  "data": {
    "pairingToken": "<opaque token string>"
  }
}
```

**Error Responses**

- 401 UNAUTHORIZED — the `Origin` header is missing or not on the allowlist
- 403 FORBIDDEN — a remote deployment rejected the request (missing/invalid shared secret)

---

# Vault API

The Vault API manages the single encrypted vault this Local Sync Server instance stores.

The server stores the encrypted vault but never decrypts it, and holds no information about who the user is.

---

**GET /api/v1/vault**

Retrieves the stored encrypted vault.

Auth Required: Yes (`Authorization: Bearer <pairingToken>`)
Request Body: None

Success Response (200):
```json
{
  "success": true,
  "data": {
    "encryptedVault": "<opaque encrypted blob>",
    "vaultVersion": 15,
    "vaultSalt": "<base64 or hex-encoded salt>",
    "lastModified": "2026-08-16T14:00:00.000Z",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-08-16T14:00:00.000Z"
  }
}
```

Error Responses:
- 401 UNAUTHORIZED — missing/invalid pairing token, or disallowed Origin
- 404 NOT_FOUND — no vault has been created on this server yet

---

**POST /api/v1/vault**

Creates the vault on a server instance that does not yet have one. Called once, shortly after the user picks Local storage, when the extension generates the first encrypted vault.

Auth Required: Yes (`Authorization: Bearer <pairingToken>`)
Request Body:
```json
{
  "encryptedVault": "<opaque encrypted blob>",
  "vaultVersion": 1,
  "vaultSalt": "<base64 or hex-encoded salt>"
}
```

Note: `vaultSalt` must be provided once, at vault creation, and is immutable afterward — it is never updated by `PUT /api/v1/vault`.

Success Response (201):
```json
{
  "success": true,
  "data": {
    "encryptedVault": "<opaque encrypted blob>",
    "vaultVersion": 1,
    "vaultSalt": "<base64 or hex-encoded salt>",
    "lastModified": "2026-08-16T15:00:00.000Z",
    "createdAt": "2026-08-16T15:00:00.000Z",
    "updatedAt": "2026-08-16T15:00:00.000Z"
  }
}
```

Error Responses:
- 401 UNAUTHORIZED — missing/invalid pairing token, or disallowed Origin
- 409 CONFLICT — a vault already exists on this server (use PUT to update instead)
- 422 VALIDATION_ERROR — missing/malformed `encryptedVault`, `vaultVersion`, or `vaultSalt`

---

**PUT /api/v1/vault**

Updates the stored vault with a new encrypted payload, using optimistic concurrency control (see `docs/DATABASE.md`).

Auth Required: Yes (`Authorization: Bearer <pairingToken>`)
Request Body:
```json
{
  "encryptedVault": "<opaque encrypted blob>",
  "vaultVersion": 16
}
```

Success Response (200):
```json
{
  "success": true,
  "data": {
    "encryptedVault": "<opaque encrypted blob>",
    "vaultVersion": 16,
    "lastModified": "2026-08-16T15:30:00.000Z",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-08-16T15:30:00.000Z"
  }
}
```

Error Responses:
- 401 UNAUTHORIZED — missing/invalid pairing token, or disallowed Origin
- 404 NOT_FOUND — no vault exists yet on this server (client should POST to create one first)
- 409 CONFLICT — submitted `vaultVersion` is not strictly newer than the stored version. Response includes the current server state so the client can resolve:
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Version conflict: your vault version is out of date.",
    "details": {
      "serverVersion": 16,
      "lastModified": "2026-08-16T15:30:00.000Z"
    }
  }
}
```
- 422 VALIDATION_ERROR — missing/malformed `encryptedVault` or `vaultVersion`

---

**GET /api/v1/vault/metadata**

Retrieves lightweight sync metadata without downloading the full encrypted vault — used by the extension to check whether a sync is needed before downloading the full payload.

Auth Required: Yes (`Authorization: Bearer <pairingToken>`)
Request Body: None

Success Response (200):
```json
{
  "success": true,
  "data": {
    "vaultVersion": 15,
    "lastModified": "2026-08-16T14:00:00.000Z"
  }
}
```

Error Responses:
- 401 UNAUTHORIZED — missing/invalid pairing token, or disallowed Origin
- 404 NOT_FOUND — no vault exists yet on this server

---

**DELETE /api/v1/vault**

Permanently deletes the vault from this server instance. This is irreversible — per the zero-knowledge architecture, there is no server-side backup; the encrypted export (`.clyro` file) is the only recovery path if a copy is needed.

Auth Required: Yes (`Authorization: Bearer <pairingToken>`)
Request Body: None

Success Response (200):
```json
{
  "success": true,
  "data": { "message": "Vault deleted successfully." }
}
```

Error Responses:
- 401 UNAUTHORIZED — missing/invalid pairing token, or disallowed Origin
- 404 NOT_FOUND — no vault exists on this server

---

# Synchronization Rules

- The extension always fetches the newest vault version before assuming its cache is current.
- The extension uploads a fully encrypted vault; the server never sees plaintext.
- The server never modifies vault contents — it only stores and returns the blob.
- The server validates vault version numbers and rejects stale writes with `409 CONFLICT`.
- A rejected write is never surfaced to the user as a failure on the first attempt. The extension re-fetches the current vault, re-applies the change the user actually made to it, and writes again (up to three attempts). Because each attempt is applied to freshly fetched state, a concurrent write from another device is preserved rather than overwritten — the extension never re-sends an item list assembled from a stale read. See `docs/ARCHITECTURE.md` "Conflict Resolution".
- **Local Sync Server and Dropbox**: a stale write is rejected atomically (SQLite transaction / Dropbox `rev`), so the retry is exact.
- **Google Drive**: no server-side reject is possible (no compare-and-swap primitive), so the provider re-reads the stored version immediately before writing and reports a conflict itself. This leaves a small inherent race Drive cannot close — see `docs/ARCHITECTURE.md`.

---

# Security Notes

The Vault API never:

- Receives decrypted credentials.
- Receives plaintext notes.
- Receives encryption keys.
- Performs encryption or decryption.
- Learns anything about the user's identity — only a pairing token, which authenticates the extension instance, not a person.

All cryptographic operations occur entirely inside the extension.

---

# Extension ↔ Website Bridge

This is not an HTTP API — it is `chrome.runtime.sendMessage` / `onMessageExternal` between the Clyro website and the Clyro extension, scoped by the extension's `externally_connectable` manifest entry. Full mechanism and rationale: `docs/ARCHITECTURE.md`'s "Extension ↔ Website Bridge" section and `docs/SECURITY.md`'s trust boundary section.

**Hard rule: neither message type below may ever carry a credential, master password, vault key, or decrypted blob.** The message union type in `packages/shared-types` has no field capable of carrying one — this is enforced at the type level, not just by convention.

---

**GET_STATUS**

Sent by the website's Dashboard page to check whether the extension is installed and what state it's in.

Request:
```json
{ "type": "GET_STATUS" }
```

Response:
```json
{
  "installed": true,
  "provider": "local",
  "locked": true
}
```

`provider` is one of `"local" | "google-drive" | "dropbox" | null` (`null` if setup has not been completed yet). If the extension is not installed or does not respond, the website treats this as `{ installed: false }` locally — it does not receive an actual response.

---

**OPEN_VAULT**

Sent by the website's Dashboard "Open Vault" button. Instructs the extension to open its own full-page vault tab via `chrome.tabs.create` — a web page cannot navigate to a `chrome-extension://` URL directly, so this message is the only way the website can launch it.

Request:
```json
{ "type": "OPEN_VAULT" }
```

Response:
```json
{ "opened": true }
```

There is no data payload beyond acknowledgement — the extension does all the work of deciding what to show (storage picker, unlock screen, or the unlocked vault) once its own tab opens.

---

# Error Handling

All Local Sync Server API responses follow a consistent JSON structure.

## Success Response

```json
{
  "success": true,
  "data": {}
}
```

## Error Response

```json
{
  "success": false,
  "error": {
    "code": "INVALID_PAIRING_TOKEN",
    "message": "The provided pairing token is invalid or has been revoked."
  }
}
```

---

# HTTP Status Codes

The API uses standard HTTP status codes.

| Status | Meaning |
|---------|---------|
| 200 | Success |
| 201 | Resource created |
| 400 | Bad request |
| 401 | Unauthorized (bad/missing pairing token, or disallowed Origin) |
| 403 | Forbidden |
| 404 | Not found |
| 409 | Conflict |
| 422 | Validation error |
| 429 | Too many requests |
| 500 | Internal server error |

---

# API Security

The API follows security-first principles.

## Requirements

- Pairing-token authentication on every Vault API request
- Origin allowlist enforced alongside the pairing token
- Server-side validation of every request body
- Request size limits
- Rate limiting on `/api/v1/pairing/initiate` in particular, since it is the one unauthenticated endpoint
- The bridge's message union type structurally excludes any field that could carry a secret

---

# API Versioning Strategy

Version 1 endpoints use `/api/v1/`. Breaking changes require a new version. Older API versions may remain available during migration periods.

---

# Future API Enhancements

Potential future additions include:

- Multi-vault support
- Additional Storage Providers beyond Google Drive and Dropbox
- A remote-deployment pairing flow more elaborate than a shared secret
- Security event / diagnostics APIs on the Local Sync Server

These are outside the scope of Version 1.0.

---

# Conclusion

The Clyro API surface — the Local Sync Server's Vault API, and the extension↔website bridge — is designed around the following principles:

- RESTful architecture where an HTTP API exists at all
- Zero-knowledge security: no endpoint anywhere can receive plaintext vault data
- Stateless, pairing-token-authenticated communication with the Local Sync Server
- A structurally secret-free bridge between the website and the extension
- Predictable behavior
- Minimal surface area, since there is no account system to expose

Encryption and decryption always occur inside the browser extension — never at the Local Sync Server, never at Google Drive or Dropbox, and never on the website.
