\# Database Design Document



Version: 1.0.0



Status: Draft



\---



\# Purpose



This document defines the database architecture for Clyro Version 1.0.



It describes how data is organized, stored, and managed while preserving Clyro's core security principles.



The database is designed to support:



\- User account management

\- Authentication

\- Trusted device management

\- Encrypted vault synchronization

\- Account recovery

\- Future scalability



\---



\# Database Philosophy



Clyro follows a \*\*cloud-first, zero-knowledge\*\* architecture.



The database is responsible for storing and synchronizing encrypted user data while remaining unable to access its contents.



The database must never store plaintext credentials or any information that would allow the server to decrypt a user's vault.



\---



\# Core Principles



The database design follows these principles:



\- Security before convenience

\- Zero-knowledge by design

\- Normalized schema where practical

\- Strong referential integrity

\- Clear ownership of data

\- Scalability for future growth

\- Predictable synchronization behavior



\---



\# What the Database Stores



The database stores information such as:



\- User accounts

\- Authentication metadata

\- Trusted devices

\- Encrypted vault data

\- Synchronization metadata

\- Email verification status

\- Password reset metadata

\- Audit metadata



\---



\# What the Database Never Stores



The database must never store:



\- Plaintext passwords

\- Plaintext vault contents

\- Plaintext website credentials

\- Master password

\- Encryption keys

\- Decrypted notes

\- Any information capable of decrypting user vaults



All sensitive vault data must remain encrypted before reaching the backend.

---



\# Entity Relationship Overview



Version 1.0 follows a simple ownership model.



Each user owns exactly one encrypted vault.



Relationship:



User (1)

&#x20;   │

&#x20;   ▼

Vault (1)



A vault may contain many credentials and may be synchronized across multiple trusted devices.



\---



\# Users Table



The `users` table stores account information required for authentication and account management.



\## Purpose



The users table represents the owner of a Clyro account.



It does not contain encrypted vault data.



\## Fields



| Field | Type | Description |

|--------|------|-------------|

| id | UUID | Primary key |

| email | VARCHAR | Unique email address |

| phone | VARCHAR | Optional unique phone number |

| email\_verified | BOOLEAN | Email verification status |

| phone\_verified | BOOLEAN | Phone verification status |

| password\_hash | TEXT | Authentication password hash |

| created\_at | TIMESTAMP | Account creation time |

| updated\_at | TIMESTAMP | Last update time |

| last\_login\_at | TIMESTAMP | Last successful login |

| account\_status | ENUM | Active, Suspended, Deleted |



\---



\# Vaults Table



The `vaults` table stores the encrypted vault for each user.



\## Purpose



Each user owns exactly one vault.



The backend stores the encrypted vault but cannot decrypt it.



\## Fields



| Field | Type | Description |

|--------|------|-------------|

| id | UUID | Primary key |

| user\_id | UUID | Owner of the vault |

| encrypted\_vault | BYTEA / TEXT | Fully encrypted vault |

| vault\_version | INTEGER | Version number |

| last\_modified | TIMESTAMP | Last vault modification |

| created\_at | TIMESTAMP | Vault creation time |

| updated\_at | TIMESTAMP | Last synchronization |

| vault\_salt | TEXT | Cryptographic salt used for Argon2id key derivation. Not secret — required for the client to re-derive the same vault encryption key on any device. Never used server-side. |

`vault_salt` is generated once, client-side, when the vault is first created. It is stored here purely so multiple devices can derive the identical vault encryption key from the user's master password. The backend never uses this salt for anything — it only stores and returns it.



\---



\# Relationship



\- One User owns one Vault.

\- Every Vault belongs to exactly one User.

\- Deleting a user deletes the associated vault.


---



\# Trusted Devices Table



The `trusted\_devices` table tracks devices that have been authorized to access a user's encrypted vault.



\## Purpose



Trusted devices allow users to securely synchronize their vault across multiple devices while maintaining account security.



Each device is individually registered and can be revoked without affecting other devices.



\---



\## Fields



| Field | Type | Description |

|--------|------|-------------|

| id | UUID | Primary key |

| user\_id | UUID | Owner of the device |

| device\_name | VARCHAR | User-friendly device name |

| device\_identifier | VARCHAR | Unique device identifier |

| platform | VARCHAR | Operating system or browser platform |

| browser | VARCHAR | Browser name and version |

| last\_ip | INET | Last known IP address |

| last\_seen\_at | TIMESTAMP | Last successful synchronization |

| trusted\_since | TIMESTAMP | Date the device became trusted |

| is\_active | BOOLEAN | Indicates whether the device is currently trusted |

| created\_at | TIMESTAMP | Record creation time |



\---



\## Relationship



\- One User can have many Trusted Devices.

\- Every Trusted Device belongs to exactly one User.



Relationship:



User (1)

&#x20;   │

&#x20;   ▼

Trusted Devices (Many)



\---



\## Device Revocation



Users may revoke any trusted device.



Revoking a device immediately prevents it from:



\- Synchronizing vault updates

\- Authenticating future requests

\- Receiving new encrypted vault versions



Already synchronized encrypted data remains on that device until the user signs out or deletes local data.



\---



\## Security Notes



The database stores device metadata only.



The database does \*\*not\*\* store:



\- Encryption keys

\- Plaintext vault contents

\- Master password

\- Decrypted credentials


---



\# Sessions Table



The `sessions` table tracks active authenticated sessions.



Sessions are independent of trusted devices and represent individual logins.



\---



\## Purpose



The sessions table enables:



\- Persistent authentication

\- Session expiration

\- Logout from a single session

\- Logout from all sessions

\- Session auditing



\---



\## Fields



| Field | Type | Description |

|--------|------|-------------|

| id | UUID | Primary key |

| user\_id | UUID | Session owner |

| device\_id | UUID | Trusted device |

| refresh\_token\_hash | TEXT | Hashed refresh token |

| expires\_at | TIMESTAMP | Session expiration |

| last\_activity\_at | TIMESTAMP | Last authenticated request |

| created\_at | TIMESTAMP | Session creation |

| revoked\_at | TIMESTAMP | Session revocation timestamp |

| is\_active | BOOLEAN | Indicates whether the session is active |



\---



\## Relationship



One User

&#x20;   │

&#x20;   ▼

Many Sessions



One Trusted Device

&#x20;   │

&#x20;   ▼

Many Sessions



\---



\## Session Lifecycle



A session is created when:



\- The user successfully logs in.



A session ends when:



\- The user logs out.

\- The refresh token expires.

\- The session is revoked.

\- The user selects "Log out from all devices."



\---



\## Security Notes



Only hashed refresh tokens are stored.



The database never stores:



\- Access tokens

\- Plaintext refresh tokens

\- Encryption keys

\- Decrypted vault data

---



\# Email Verification \& Password Recovery



Clyro uses secure, time-limited verification tokens for account verification and password recovery.



These tokens never contain sensitive vault information.



\---



\# Verification Tokens Table



\## Purpose



Stores temporary verification tokens used for:



\- Email verification

\- Phone verification

\- Account activation



\---



\## Fields



| Field | Type | Description |

|--------|------|-------------|

| id | UUID | Primary key |

| user\_id | UUID | Associated user |

| token\_hash | TEXT | Hashed verification token |

| token\_type | ENUM | Email, Phone |

| expires\_at | TIMESTAMP | Expiration time |

| used\_at | TIMESTAMP | When the token was used |

| created\_at | TIMESTAMP | Creation time |



\---



\# Password Reset Tokens Table



\## Purpose



Stores temporary password reset requests.



Password reset changes only the authentication password.



It never decrypts or exposes the encrypted vault.



\---



\## Fields



| Field | Type | Description |

|--------|------|-------------|

| id | UUID | Primary key |

| user\_id | UUID | Associated user |

| token\_hash | TEXT | Hashed reset token |

| expires\_at | TIMESTAMP | Expiration |

| used\_at | TIMESTAMP | When redeemed |

| created\_at | TIMESTAMP | Creation time |



\---



\# Security Rules



\- Tokens are cryptographically secure.

\- Tokens are stored only as hashes.

\- Tokens expire automatically.

\- Used tokens cannot be reused.

\- Expired tokens are periodically removed.

---



\# Vault Synchronization Metadata



Clyro synchronizes encrypted vaults across trusted devices.



The backend coordinates synchronization but never decrypts vault contents.



\---



\# Synchronization Strategy



Version 1.0 uses the \*\*Last Change Wins (LCW)\*\* synchronization model.



Every vault update increments its version number.



The backend compares versions and timestamps to determine the latest encrypted vault.



\---



\# Synchronization Metadata



The vault table maintains synchronization metadata including:



| Field | Type | Description |

|--------|------|-------------|

| vault\_version | INTEGER | Current vault version |

| last\_modified | TIMESTAMP | Last modification time |

| updated\_at | TIMESTAMP | Last synchronization time |



\---



\# Synchronization Flow



1\. Device downloads the latest encrypted vault.

2\. User unlocks the vault locally.

3\. User makes changes.

4\. Vault is encrypted locally.

5\. Updated encrypted vault is uploaded.

6\. Backend increments the vault version.

7\. Other trusted devices receive the latest encrypted vault during synchronization.



\---



\# Synchronization Strategy: Optimistic Concurrency Control

Vault updates include a vaultVersion number. When a client submits an update, the server checks that the submitted vaultVersion is strictly greater than the currently stored version.

- If the submitted version is newer: the update is accepted, and vaultVersion is incremented/stored as submitted.
- If the submitted version is equal to or older than the currently stored version: the update is REJECTED with a 409 Conflict response. The client must fetch the latest vault (GET /api/v1/vault) and resolve the conflict — either by retrying with a freshly merged version, or prompting the user — before attempting to sync again.

This prevents silent data loss when multiple devices attempt to sync near-simultaneously, which is a critical property for a password vault where losing an edit silently is unacceptable.



\---



\# Security Notes



The synchronization service never:



\- Decrypts vault contents.

\- Reads website credentials.

\- Accesses notes.

\- Stores encryption keys.



The backend acts only as a secure synchronization coordinator.


---



\# Database Indexes



To ensure efficient query performance, the following indexes should be created.



\## Users



\- email (Unique)

\- phone (Unique)



\## Vaults



\- user\_id (Unique)



\## Trusted Devices



\- user\_id

\- device\_identifier (Unique)



\## Sessions



\- user\_id

\- device\_id

\- refresh\_token\_hash

\- expires\_at



\## Verification Tokens



\- user\_id

\- token\_hash

\- expires\_at



\## Password Reset Tokens



\- user\_id

\- token\_hash

\- expires\_at



\---



\# Database Constraints



The database enforces strong referential integrity.



Examples include:



\- Every Vault must belong to an existing User.

\- Every Trusted Device must belong to an existing User.

\- Every Session must reference an existing User.

\- Every Session must reference an existing Trusted Device.

\- Deleting a User deletes all associated records.

\- Email addresses must be unique.

\- Phone numbers must be unique when provided.



\---



\# Database Security



The database is considered an untrusted storage layer.



Security relies on client-side encryption rather than trusting the server.



The database never stores:



\- Plaintext credentials

\- Plaintext vault contents

\- Encryption keys

\- Decrypted notes

\- Plaintext passwords



Sensitive data remains encrypted before transmission to the backend.



\---



\# Backup \& Recovery



The server infrastructure performs encrypted database backups.



Backups protect against:



\- Hardware failure

\- Database corruption

\- Operational mistakes

\- Disaster recovery events



Backups never expose decrypted vault contents because all vault data remains encrypted.



\---



\# Future Enhancements



Possible future improvements include:



\- Multiple vaults per user

\- Organization vaults

\- Shared vaults

\- Vault version history

\- Device approval workflows

\- Advanced audit logs

\- Security event history

\- Premium synchronization features



These features are intentionally outside the scope of Version 1.0.



\---



\# Conclusion



The Clyro database is designed around the principles of:



\- Zero-knowledge security

\- Cloud-first synchronization

\- Strong referential integrity

\- Secure authentication

\- Trusted device management

\- Scalability

\- Simplicity



The database serves as a secure synchronization layer while ensuring that only client devices can decrypt user vaults.








