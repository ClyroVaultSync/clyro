\# API Design Document



Version: 1.0.0



Status: Draft



\---



\# Purpose



This document defines the API architecture for Clyro Version 1.0.



The API enables secure communication between the browser extension, companion website, and backend services while preserving Clyro's zero-knowledge architecture.



The backend coordinates authentication, encrypted vault synchronization, and account management, but never decrypts user vaults.



\---



\# API Design Philosophy



The Clyro API follows these principles:



\- RESTful architecture

\- Versioned endpoints

\- HTTPS-only communication

\- JSON request and response bodies

\- Stateless request handling

\- Zero-knowledge security

\- Consistent error responses

\- Predictable endpoint behavior



\---



\# API Versioning



All Version 1 endpoints begin with:



`/api/v1/`



Examples:



\- `POST /api/v1/auth/register`

\- `POST /api/v1/auth/login`

\- `POST /api/v1/auth/logout`

\- `GET /api/v1/vault`

\- `PUT /api/v1/vault`

\- `GET /api/v1/devices`

\- `DELETE /api/v1/devices/{deviceId}`



Future versions may introduce:



\- `/api/v2/`

\- `/api/v3/`



without breaking existing clients.



\---



\# Authentication



Authenticated requests require a valid access token.



Unauthenticated endpoints include:



\- Register

\- Login

\- Email verification

\- Password reset



All other endpoints require authentication.

Protected endpoints require the access token to be passed via the Authorization header using the Bearer scheme:

Authorization: Bearer <accessToken>

Requests missing this header, or presenting an invalid/expired access token, receive a 401 UNAUTHORIZED response.



\---



\# Request \& Response Format



\## Requests



Content-Type:



`application/json`



\## Responses



Content-Type:



`application/json`

---



\# Authentication API



The Authentication API manages user registration, login, logout, session refresh, email verification, and password recovery.



\---



\## Register



Create a new Clyro account.



\*\*Endpoint\*\*



POST /api/v1/auth/register



\*\*Authentication Required\*\*



No



\*\*Request Body\*\*



```json

{

&#x20; "email": "user@example.com",

&#x20; "phone": "+911234567890",

&#x20; "password": "StrongPassword123!"

}

```



\*\*Response\*\*



```json

{

&#x20; "message": "Account created successfully."

}

```



\---



\## Login



Authenticate a user.



\*\*Endpoint\*\*



POST /api/v1/auth/login



\*\*Authentication Required\*\*



No



\*\*Request Body\*\*



```json

{

  "email": "user@example.com",

  "password": "StrongPassword123!",

  "device": {

    "deviceIdentifier": "client-generated-uuid-or-fingerprint",

    "deviceName": "Chrome on Windows",

    "platform": "Windows",

    "browser": "Chrome 126"

  }

}

```



Note: The `device` object is required on every login request. `deviceIdentifier` should be a stable, client-generated identifier (e.g. a UUID persisted in extension/browser storage) unique per device. On successful login, if no TrustedDevice record exists matching this deviceIdentifier for the authenticated user, one is created automatically. The resulting session is always tied to a specific trusted device.



\*\*Successful Response\*\*



```json

{

&#x20; "accessToken": "...",

&#x20; "refreshToken": "...",

&#x20; "expiresIn": 900

}

```



\---



\## Refresh Session

Issues a new access token (and rotates the refresh token) using a valid, unexpired refresh token.

\*\*Endpoint\*\*

POST /api/v1/auth/refresh

\*\*Authentication Required\*\*

No (the refresh token itself is the credential)

\*\*Request Body\*\*

```json
{
  "refreshToken": "<raw refresh token string>"
}
```

\*\*Success Response (200)\*\*

```json
{
  "success": true,
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "expiresIn": 900
  }
}
```

Note: Refresh tokens are rotated on every use — the response always contains a NEW refresh token, and the previous one becomes invalid immediately. Clients must persist the new refresh token and discard the old one.

\*\*Error Responses\*\*

- 401 INVALID_REFRESH_TOKEN — token does not match any active session
- 401 REFRESH_TOKEN_EXPIRED — session found but has expired
- 401 SESSION_REVOKED — session found but has been revoked (isActive: false)
- 422 VALIDATION_ERROR — missing or malformed refreshToken field



\---



\## Logout

Invalidates the current session (the one tied to the presented access token).

\*\*Endpoint\*\*

POST /api/v1/auth/logout

\*\*Authentication Required\*\*

Yes (Authorization: Bearer <accessToken>)

\*\*Request Body\*\*

None

\*\*Success Response (200)\*\*

```json
{
  "success": true,
  "data": { "message": "Logged out successfully." }
}
```

\*\*Error Responses\*\*

- 401 UNAUTHORIZED — missing, invalid, or expired access token



\---



\## Logout From All Devices

Invalidates every active session belonging to the authenticated user, including the current session. The user will need to log in again on all devices.

\*\*Endpoint\*\*

POST /api/v1/auth/logout-all

\*\*Authentication Required\*\*

Yes (Authorization: Bearer <accessToken>)

\*\*Request Body\*\*

None

\*\*Success Response (200)\*\*

```json
{
  "success": true,
  "data": { "message": "Logged out of all devices." }
}
```

\*\*Error Responses\*\*

- 401 UNAUTHORIZED — missing, invalid, or expired access token



\---



\## Verify Email

Verifies a user's email address using the token sent to them after registration.

\*\*Endpoint\*\*

POST /api/v1/auth/verify-email

\*\*Authentication Required\*\*

No

\*\*Request Body\*\*

```json
{
  "token": "<raw verification token string>"
}
```

\*\*Success Response (200)\*\*

```json
{
  "success": true,
  "data": { "message": "Email verified successfully." }
}
```

\*\*Error Responses\*\*

- 401 INVALID_TOKEN — token does not match any verification record
- 401 TOKEN_EXPIRED — token found but has expired
- 401 TOKEN_ALREADY_USED — token has already been used
- 422 VALIDATION_ERROR — missing or malformed token field

Note: Email delivery of the verification token is currently stubbed (logged server-side) — no email provider is configured yet. This will be replaced with a real email service in a future task without changing this endpoint's contract.



\---



\## Request Password Reset

Initiates a password reset by generating a reset token for the given email, if an account with that email exists.

\*\*Endpoint\*\*

POST /api/v1/auth/request-password-reset

\*\*Authentication Required\*\*

No

\*\*Request Body\*\*

```json
{
  "email": "user@example.com"
}
```

\*\*Success Response (200)\*\*

```json
{
  "success": true,
  "data": { "message": "If an account exists with this email, a password reset link has been sent." }
}
```

Note: This endpoint ALWAYS returns success with this same generic message, regardless of whether the email exists in the system. This prevents attackers from using this endpoint to discover which emails are registered (user enumeration protection).

\*\*Error Responses\*\*

- 422 VALIDATION_ERROR — malformed email field

Note: Email delivery of the reset token is currently stubbed (logged server-side) — no email provider is configured yet.



\---



\## Reset Password

Resets a user's password using a valid reset token, then invalidates all of that user's existing sessions (forcing re-login everywhere, since the old password may have been compromised).

\*\*Endpoint\*\*

POST /api/v1/auth/reset-password

\*\*Authentication Required\*\*

No

\*\*Request Body\*\*

```json
{
  "token": "<raw reset token string>",
  "newPassword": "NewStrongPassword123!"
}
```

\*\*Success Response (200)\*\*

```json
{
  "success": true,
  "data": { "message": "Password reset successfully. Please log in again." }
}
```

\*\*Error Responses\*\*

- 401 INVALID_TOKEN — token does not match any reset record
- 401 TOKEN_EXPIRED — token found but has expired
- 401 TOKEN_ALREADY_USED — token has already been used
- 422 VALIDATION_ERROR — missing/malformed token, or newPassword under 8 characters

---



\# Vault API



The Vault API manages encrypted vault synchronization.



The backend stores encrypted vaults but never decrypts them.



\---



\**GET /api/v1/vault**

Retrieves the authenticated user's encrypted vault.

Auth Required: Yes (Authorization: Bearer <accessToken>)
Request Body: None

Success Response (200):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "encryptedVault": "<opaque encrypted blob>",
    "vaultVersion": 15,
    "lastModified": "2026-07-18T14:00:00.000Z",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-07-18T14:00:00.000Z"
  }
}
```

Error Responses:
- 401 UNAUTHORIZED — missing, invalid, or expired access token
- 404 NOT_FOUND — no vault exists yet for this user

---

**PUT /api/v1/vault**

Synchronizes (updates) the user's vault with a new encrypted payload, using optimistic concurrency control (see docs/DATABASE.md Synchronization Strategy).

Auth Required: Yes (Authorization: Bearer <accessToken>)
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
    "id": "uuid",
    "userId": "uuid",
    "encryptedVault": "<opaque encrypted blob>",
    "vaultVersion": 16,
    "lastModified": "2026-07-24T15:00:00.000Z",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-07-24T15:00:00.000Z"
  }
}
```

Error Responses:
- 401 UNAUTHORIZED — missing, invalid, or expired access token
- 404 NOT_FOUND — no vault exists yet for this user (client should POST to create one first)
- 409 CONFLICT — submitted vaultVersion is not strictly newer than the stored version. Response includes the current server state so the client can resolve:
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Version conflict: your vault version is out of date.",
    "details": {
      "serverVersion": 16,
      "lastModified": "2026-07-24T15:00:00.000Z"
    }
  }
}
```
- 422 VALIDATION_ERROR — missing/malformed encryptedVault or vaultVersion

---

**GET /api/v1/vault/metadata**

Retrieves lightweight sync metadata without downloading the full encrypted vault — used by clients to check if a local sync is needed before downloading the full payload.

Auth Required: Yes (Authorization: Bearer <accessToken>)
Request Body: None

Success Response (200):
```json
{
  "success": true,
  "data": {
    "vaultVersion": 15,
    "lastModified": "2026-07-18T14:00:00.000Z"
  }
}
```

Error Responses:
- 401 UNAUTHORIZED — missing, invalid, or expired access token
- 404 NOT_FOUND — no vault exists yet for this user

---

**POST /api/v1/vault**

Creates the initial vault for a user who does not yet have one. Typically called once, shortly after registration, when the client generates the first empty (or initial) encrypted vault.

Auth Required: Yes (Authorization: Bearer <accessToken>)
Request Body:
```json
{
  "encryptedVault": "<opaque encrypted blob>",
  "vaultVersion": 1
}
```

Success Response (201):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "encryptedVault": "<opaque encrypted blob>",
    "vaultVersion": 1,
    "lastModified": "2026-07-24T15:00:00.000Z",
    "createdAt": "2026-07-24T15:00:00.000Z",
    "updatedAt": "2026-07-24T15:00:00.000Z"
  }
}
```

Error Responses:
- 401 UNAUTHORIZED — missing, invalid, or expired access token
- 409 CONFLICT — a vault already exists for this user (use PUT to update instead)
- 422 VALIDATION_ERROR — missing/malformed encryptedVault or vaultVersion

---

**DELETE /api/v1/vault**

Permanently deletes the user's vault. This is irreversible — per the zero-knowledge architecture, there is no server-side backup or recovery of vault contents.

Auth Required: Yes (Authorization: Bearer <accessToken>)
Request Body: None

Success Response (200):
```json
{
  "success": true,
  "data": { "message": "Vault deleted successfully." }
}
```

Error Responses:
- 401 UNAUTHORIZED — missing, invalid, or expired access token
- 404 NOT_FOUND — no vault exists for this user

---

# Synchronization Rules



\- Clients always download the newest vault version.

\- Clients upload a fully encrypted vault.

\- The backend never modifies vault contents.

\- The backend validates vault version numbers.

\- Version conflicts are resolved using the Last Change Wins strategy.



\---



\# Security Notes



The Vault API never:



\- Receives decrypted credentials.

\- Receives plaintext notes.

\- Receives encryption keys.

\- Performs encryption or decryption.



All cryptographic operations occur entirely on the client.

---



\# Devices API



The Devices API allows users to view and manage trusted devices associated with their account.



\---



\## Get Trusted Devices

Retrieves all trusted devices associated with the authenticated user's account.

\*\*Endpoint\*\*

GET /api/v1/devices

\*\*Authentication Required\*\*

Yes (Authorization: Bearer <accessToken>)

\*\*Request Body\*\*

None

\*\*Success Response (200)\*\*

```json
{
  "success": true,
  "data": {
    "devices": [
      {
        "id": "uuid",
        "deviceName": "Chrome on Windows",
        "platform": "Windows",
        "browser": "Chrome 126",
        "lastSeenAt": "2026-07-24T10:00:00.000Z",
        "trustedSince": "2026-01-01T00:00:00.000Z",
        "isActive": true
      }
    ]
  }
}
```

Note: deviceIdentifier and lastIp are NOT included in the response — deviceIdentifier is an internal matching key, and lastIp is sensitive metadata not exposed to the client.

\*\*Error Responses\*\*

- 401 UNAUTHORIZED — missing, invalid, or expired access token



\---



\## Get Device Details

Retrieves details for a single trusted device belonging to the authenticated user.

\*\*Endpoint\*\*

GET /api/v1/devices/{deviceId}

\*\*Authentication Required\*\*

Yes (Authorization: Bearer <accessToken>)

\*\*Request Body\*\*

None

\*\*Success Response (200)\*\*

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "deviceName": "Chrome on Windows",
    "platform": "Windows",
    "browser": "Chrome 126",
    "lastSeenAt": "2026-07-24T10:00:00.000Z",
    "trustedSince": "2026-01-01T00:00:00.000Z",
    "isActive": true
  }
}
```

\*\*Error Responses\*\*

- 401 UNAUTHORIZED — missing, invalid, or expired access token
- 404 NOT_FOUND — device does not exist, or does not belong to the authenticated user



\---



\## Revoke Device

Revokes a trusted device, immediately preventing future synchronization and authentication from that device. Also revokes any active sessions tied to this device.

\*\*Endpoint\*\*

DELETE /api/v1/devices/{deviceId}

\*\*Authentication Required\*\*

Yes (Authorization: Bearer <accessToken>)

\*\*Request Body\*\*

None

\*\*Success Response (200)\*\*

```json
{
  "success": true,
  "data": { "message": "Device revoked successfully." }
}
```

\*\*Error Responses\*\*

- 401 UNAUTHORIZED — missing, invalid, or expired access token
- 404 NOT_FOUND — device does not exist, or does not belong to the authenticated user



\---



\# Sessions API



The Sessions API manages authenticated sessions.



\---



\## Get Active Sessions

Retrieves all active sessions belonging to the authenticated user, each linked to its originating device.

\*\*Endpoint\*\*

GET /api/v1/sessions

\*\*Authentication Required\*\*

Yes (Authorization: Bearer <accessToken>)

\*\*Request Body\*\*

None

\*\*Success Response (200)\*\*

```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "uuid",
        "deviceId": "uuid",
        "deviceName": "Chrome on Windows",
        "createdAt": "2026-07-24T09:00:00.000Z",
        "lastActivityAt": "2026-07-24T10:00:00.000Z",
        "expiresAt": "2026-08-23T09:00:00.000Z"
      }
    ]
  }
}
```

Note: refreshTokenHash is NEVER included in this or any response.

\*\*Error Responses\*\*

- 401 UNAUTHORIZED — missing, invalid, or expired access token



\---



\## Revoke Session

Terminates a single active session belonging to the authenticated user.

\*\*Endpoint\*\*

DELETE /api/v1/sessions/{sessionId}

\*\*Authentication Required\*\*

Yes (Authorization: Bearer <accessToken>)

\*\*Request Body\*\*

None

\*\*Success Response (200)\*\*

```json
{
  "success": true,
  "data": { "message": "Session revoked successfully." }
}
```

\*\*Error Responses\*\*

- 401 UNAUTHORIZED — missing, invalid, or expired access token
- 404 NOT_FOUND — session does not exist, or does not belong to the authenticated user



\---



\## Revoke All Sessions

This functionality is provided by POST /api/v1/auth/logout-all (see Authentication section). This endpoint has been removed to avoid duplicate functionality.



\---



\# Security Notes



Only the account owner can:



\- View trusted devices.

\- Remove trusted devices.

\- View active sessions.

\- Revoke sessions.



Administrative access to user vault data is never permitted.

---



\# Error Handling



All API responses follow a consistent JSON structure.



\## Success Response



```json

{

&#x20; "success": true,

&#x20; "data": {}

}

```



\## Error Response



```json

{

&#x20; "success": false,

&#x20; "error": {

&#x20;   "code": "INVALID\_CREDENTIALS",

&#x20;   "message": "Invalid email or password."

&#x20; }

}

```



\---



\# HTTP Status Codes



The API uses standard HTTP status codes.



| Status | Meaning |

|---------|---------|

| 200 | Success |

| 201 | Resource created |

| 204 | No content |

| 400 | Bad request |

| 401 | Unauthorized |

| 403 | Forbidden |

| 404 | Not found |

| 409 | Conflict |

| 422 | Validation error |

| 429 | Too many requests |

| 500 | Internal server error |



\---



\# API Security



The API follows security-first principles.



\## Requirements



\- HTTPS only

\- JWT access tokens

\- Refresh token authentication

\- Rate limiting

\- Secure password hashing

\- Server-side validation

\- Request size limits

\- Token expiration

\- Session revocation

\- Audit logging for authentication events



\---



\# API Versioning Strategy



Version 1 endpoints use:



`/api/v1/`



Breaking changes require a new version.



Older API versions may remain available during migration periods.



\---



\# Future API Enhancements



Potential future additions include:



\- Multi-vault support

\- Shared vault APIs

\- Organization APIs

\- Emergency access APIs

\- Security event APIs

\- Browser management APIs

\- Administrative dashboards

\- Premium feature APIs



These are outside the scope of Version 1.0.



\---



\# Conclusion



The Clyro API is designed around the following principles:



\- RESTful architecture

\- Zero-knowledge security

\- Stateless communication

\- Strong authentication

\- Secure synchronization

\- Predictable behavior

\- Scalability



The backend acts as a secure coordination layer while ensuring that encryption and decryption always occur on trusted client devices.



