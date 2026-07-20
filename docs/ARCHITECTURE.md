\# Clyro Architecture Document



\*\*Project:\*\* Clyro  

\*\*Organization:\*\* ClyroVaultSync  

\*\*Document Version:\*\* 1.0.0  

\*\*Status:\*\* Draft (Under Review)  

\*\*Last Updated:\*\* July 2026



\---



\# Purpose



This document defines the technical architecture of Clyro Version 1.0.



It describes how the system is structured, how its components interact, and the engineering principles that guide implementation.



Unlike the Product Requirements Document (PRD), which defines \*\*what\*\* Clyro should do, this document defines \*\*how\*\* those requirements are implemented.



This document is intended for:



\- Software engineers

\- AI coding assistants

\- Future maintainers

\- Security reviewers

\- Contributors



Every implementation should align with the architectural decisions documented here.



\---



\# Architecture Goals



The architecture is designed to achieve the following objectives:



\- Security first

\- True zero-knowledge encryption

\- Cloud-first synchronization

\- Simple and maintainable design

\- Modular components

\- Reliable synchronization

\- Extensibility for future platforms

\- Clear separation of responsibilities



Where trade-offs exist, security and maintainability take priority over feature complexity.



\---



\# Architectural Principles



The following principles guide all technical decisions.



\## 1. Documentation First



Architecture is defined before implementation.



Changes to architecture should be documented before code is written.



\---



\## 2. Security First



Security takes priority over convenience.



No architectural decision should weaken the zero-knowledge security model.



\---



\## 3. Simplicity



Prefer simple, understandable solutions over unnecessary complexity.



Avoid premature optimization.



\---



\## 4. Separation of Responsibilities



Each major component should have a clearly defined responsibility.



Components should communicate through well-defined interfaces.



\---



\## 5. Scalability



The architecture should support future expansion without requiring major redesign.



Version 1.0 focuses on Chromium browsers, but the architecture should accommodate future browser and mobile clients.



\---



\## 6. Maintainability



The codebase should remain readable, modular, and easy to extend.



Every component should have a clear ownership boundary.

---



\# High-Level System Architecture



Clyro Version 1.0 consists of four primary components that work together while maintaining a true zero-knowledge security model.



```

&#x20;                          +----------------------+

&#x20;                          |   Clyro Website      |

&#x20;                          |  (React Frontend)    |

&#x20;                          +----------+-----------+

&#x20;                                     |

&#x20;                                     | HTTPS

&#x20;                                     |

&#x20;                          +----------v-----------+

&#x20;                          |     Backend API      |

&#x20;                          |      (Fastify)       |

&#x20;                          +----------+-----------+

&#x20;                                     |

&#x20;                                     |

&#x20;                          +----------v-----------+

&#x20;                          |    PostgreSQL DB     |

&#x20;                          | Authentication Data  |

&#x20;                          | Encrypted Vault Data |

&#x20;                          +----------------------+



&#x20;                   HTTPS + End-to-End Encryption



+---------------------------------------------------------------+



&#x20;                Chromium Browser



+---------------------------------------------------------------+



+------------------------+

|  Clyro Extension       |

|------------------------|

| UI                     |

| Autofill Engine        |

| Password Capture       |

| Vault Search           |

| Sync Client            |

| Crypto Engine          |

| Local Encrypted Vault  |

+------------------------+

```



\---



\# Core Components



\## 1. Browser Extension



The browser extension is the primary client application.



Responsibilities include:



\- User authentication

\- Vault unlocking

\- Password generation

\- Password capture

\- Autofill

\- Auto Login

\- Vault search

\- Encryption and decryption

\- Synchronization

\- Trusted device management



The extension is responsible for handling all sensitive operations involving plaintext credentials.



\---



\## 2. Backend API



The backend coordinates communication between client devices.



Responsibilities include:



\- User authentication

\- Email verification

\- SMS verification

\- Trusted device management

\- Secure synchronization

\- Storage of encrypted vault data



The backend \*\*never decrypts user vaults\*\* and \*\*never stores the user's master password\*\*.



\---



\## 3. Database



The database stores only the information required for account management and encrypted synchronization.



Examples include:



\- User accounts

\- Verification status

\- Trusted devices

\- Encrypted vault blobs

\- Synchronization metadata



No plaintext credentials are stored.



\---



\## 4. Companion Website



The companion website provides account-related functionality.



Examples include:



\- Account registration

\- Login

\- Email verification

\- Phone verification

\- Download links

\- Documentation

\- Future account management



The website is \*\*not\*\* intended to replace the browser extension for vault operations.



Sensitive vault interactions remain inside the extension.



\---



\# System Boundaries



The architecture intentionally separates responsibilities.



\## Client Responsibilities



The client performs:



\- Encryption

\- Decryption

\- Password generation

\- Vault search

\- Autofill

\- Password capture



Sensitive plaintext data never leaves the client.



\---



\## Server Responsibilities



The server performs:



\- Authentication

\- Synchronization

\- Verification

\- Storage

\- Device management



The server never accesses decrypted vault contents.



\---



\# Architectural Philosophy



Clyro follows a \*\*client-centric architecture\*\*.



The client owns all cryptographic operations.



The backend acts as a secure coordination and synchronization service rather than a trusted vault.

---



\# Browser Extension Architecture



The Chromium extension is the primary client application and contains the majority of Clyro's business logic.



To keep the codebase modular and maintainable, the extension is divided into independent components.



```

+--------------------------------------------------+

|                Browser Extension                 |

+--------------------------------------------------+

|                                                  |

|  Extension UI                                   |

|        │                                         |

|        ▼                                         |

|  Authentication Manager                          |

|        │                                         |

|        ▼                                         |

|  Vault Manager                                   |

|   ├── Crypto Engine                              |

|   ├── Vault Search                               |

|   ├── Password Generator                         |

|   ├── Password Capture                           |

|   ├── Autofill Engine                            |

|   ├── Auto Login                                 |

|   └── Local Vault Storage                        |

|                                                  |

|                 │                                |

|                 ▼                                |

|             Sync Client                          |

|                 │                                |

|             HTTPS API                            |

+--------------------------------------------------+

```



\---



\# Extension Components



\## Extension UI



\### Responsibilities



\- Login screen

\- Vault interface

\- Settings

\- Password generator interface

\- Search interface

\- Trusted device management

\- User notifications



The UI should remain lightweight and delegate business logic to dedicated modules.



\---



\## Authentication Manager



\### Responsibilities



\- User authentication

\- Session validation

\- Vault unlock

\- Vault lock

\- Trusted device verification

\- Browser session lifecycle



This component controls access to the vault.



\---



\## Vault Manager



The Vault Manager acts as the central coordinator for all vault operations.



Responsibilities include:



\- Reading credentials

\- Writing credentials

\- Updating credentials

\- Deleting credentials

\- Organizing vault entries

\- Coordinating encryption

\- Coordinating synchronization



The Vault Manager should not directly communicate with the backend.



All synchronization is delegated to the Sync Client.



\---



\## Crypto Engine



The Crypto Engine performs all cryptographic operations.



Responsibilities include:



\- Key derivation (Argon2id)

\- Encryption

\- Decryption

\- Secure random generation

\- Key management in memory



The Crypto Engine is the only module responsible for handling encryption keys.



\---



\## Password Capture



Responsibilities:



\- Detect login forms

\- Detect registration forms

\- Detect password updates

\- Prompt users to save credentials

\- Detect duplicate credentials



\---



\## Autofill Engine



Responsibilities:



\- Detect supported login forms

\- Display credential selection dropdown

\- Fill usernames

\- Fill passwords

\- Coordinate with Auto Login



The Autofill Engine never stores credentials itself.



\---



\## Auto Login



Responsibilities:



\- Submit login forms after autofill

\- Respect user preferences

\- Remain disabled unless explicitly enabled



\---



\## Password Generator



Responsibilities:



\- Generate secure passwords

\- Respect user-selected options

\- Provide passwords to registration and password update workflows



\---



\## Vault Search



Responsibilities:



\- Search website names

\- Search domains

\- Search usernames

\- Search account labels



Search operates entirely on the local decrypted vault while it is unlocked.



\---



\## Local Vault Storage



Responsibilities:



\- Store encrypted vault locally

\- Support offline access

\- Provide fast vault loading

\- Never persist decrypted credentials



Only encrypted vault data is written to local storage.

---



\# Backend Architecture



The backend is responsible for authentication, synchronization, account management, and coordination between trusted client devices.



The backend is intentionally designed to remain unaware of the contents of a user's vault.



All sensitive vault data remains encrypted at all times.



```

&#x20;                   +---------------------------+

&#x20;                   |      Fastify Server       |

&#x20;                   +---------------------------+

&#x20;                              |

&#x20;    ---------------------------------------------------------

&#x20;    |             |             |            |               |

&#x20;    ▼             ▼             ▼            ▼               ▼

&#x20;Authentication  User API   Vault Sync   Device API   Notification API

&#x20;    |             |             |            |               |

&#x20;    ---------------------------------------------------------

&#x20;                              |

&#x20;                              ▼

&#x20;                       PostgreSQL Database

```



\---



\# Backend Responsibilities



The backend performs the following responsibilities:



\- User registration

\- Authentication

\- Email verification

\- Phone verification

\- Trusted device management

\- Synchronization

\- Secure storage of encrypted vault data

\- Metadata management

\- Security event logging



The backend \*\*never performs encryption or decryption of user vaults\*\*.



\---



\# Backend Modules



\## Authentication Service



Responsibilities:



\- Account registration

\- Login verification

\- Session validation

\- Access token generation

\- Refresh token management



This service authenticates users but never learns their master password.



\---



\## User Service



Responsibilities:



\- User profile management

\- Account settings

\- Email updates

\- Phone number updates



Only account-related metadata is stored.



\---



\## Vault Synchronization Service



Responsibilities:



\- Receive encrypted vault updates

\- Store encrypted vault data

\- Return encrypted vault data to trusted devices

\- Coordinate synchronization



The service treats vault data as an opaque encrypted object.



\---



\## Trusted Device Service



Responsibilities:



\- Register trusted devices

\- Revoke trusted devices

\- Validate trusted devices

\- Track device metadata



Each trusted device is associated with a user account.



\---



\## Verification Service



Responsibilities:



\- Email verification

\- SMS verification

\- Verification token management



Verification must occur before account activation.



\---



\## Notification Service



Responsibilities:



\- Security notifications

\- New device alerts

\- Email change notifications

\- Phone number change notifications



Notifications must never include plaintext credential information.



\---



\# Database Interaction



The backend communicates exclusively with PostgreSQL.



The backend stores:



\- User accounts

\- Verification records

\- Trusted devices

\- Encrypted vault blobs

\- Synchronization metadata

\- Audit and security logs



The backend never stores:



\- Master passwords

\- Encryption keys

\- Plaintext credentials

\- Decrypted vault contents



\---



\# Backend Design Principles



The backend follows these principles:



\## Stateless APIs



API endpoints should remain stateless wherever practical.



Persistent state is stored in PostgreSQL.



\---



\## Minimal Trust



The backend should assume as little trust as possible.



Sensitive cryptographic operations always occur on the client.



\---



\## Modular Services



Business logic should be separated into clearly defined services.



This simplifies testing and future expansion.



\---



\## Future Scalability



The architecture should support:



\- Horizontal scaling

\- Multiple API instances

\- Future microservice extraction (if ever required)



Version 1.0 will be implemented as a \*\*modular monolith\*\* to reduce operational complexity while preserving clean service boundaries.

---



\# Security \& Encryption Architecture



Security is the foundation of Clyro's architecture.



Every component is designed around a true zero-knowledge model where only the client can decrypt vault data.



The backend never has access to plaintext credentials, encryption keys, or the user's master password.



\---



\# Security Model



The security model is based on the following principles:



\- Client-side encryption

\- End-to-end encrypted vault synchronization

\- Zero-knowledge backend

\- Strong password-based key derivation

\- Secure random generation

\- Encryption keys remain in memory only while the vault is unlocked



\---



\# Master Password Lifecycle



The master password is created during account registration.



It is never stored by the backend.



The master password is used only for:



\- Vault unlock

\- Encryption key derivation



The master password itself is never used directly as an encryption key.



\---



\# Key Derivation



Clyro uses \*\*Argon2id\*\* to derive a cryptographic key from the user's master password.



The derivation process uses:



\- User master password

\- Unique cryptographic salt

\- Memory-hard parameters



The derived key exists only in memory while the vault is unlocked.



\---



\# Vault Encryption



All credentials stored in the vault are encrypted before leaving the client.



Encryption occurs:



\- Before synchronization

\- Before local storage

\- Before transmission to the backend



The backend receives only encrypted vault data.



\---



\# Vault Decryption



Vault decryption occurs only after:



1\. User authentication

2\. Successful vault unlock

3\. Correct master password



Only the client performs decryption.



\---



\# Local Storage



Trusted devices maintain an encrypted local copy of the vault.



Requirements:



\- Only encrypted vault data is stored.

\- Plaintext credentials are never written to disk.

\- Encryption keys are never persisted.

\- Decrypted vault contents exist only in memory while unlocked.



\---



\# Secure Communication



All communication between clients and backend services must use HTTPS with modern TLS.



Sensitive information should never be transmitted through insecure channels.



\---



\# Authentication vs Encryption



Authentication and encryption are intentionally separated.



Authentication verifies user identity.



Encryption protects vault contents.



Compromising one should not automatically compromise the other.



\---



\# Session Security



While the browser remains open:



\- Vault remains unlocked.

\- Encryption keys remain in protected memory.



When the browser closes:



\- Vault locks automatically.

\- Encryption keys are destroyed from memory.

\- Users must unlock the vault again during the next browser session.



\---



\# Password Recovery



Because Clyro follows a true zero-knowledge architecture:



\- Forgotten master passwords cannot recover encrypted vaults.

\- Backend administrators cannot decrypt vaults.

\- Support staff cannot recover vault contents.



Users may reset their account, but doing so creates a new empty encrypted vault.



\---



\# Security Responsibilities



\## Client



Responsible for:



\- Key derivation

\- Encryption

\- Decryption

\- Password generation

\- Vault unlock

\- Vault lock



\---



\## Backend



Responsible for:



\- Authentication

\- Synchronization

\- Verification

\- Secure storage of encrypted vault data

\- Trusted device management



The backend never performs cryptographic operations on user vault contents.



\---



\# Security Philosophy



Whenever security and convenience conflict, Clyro prioritizes protecting user data.



Features that weaken the zero-knowledge model are considered out of scope unless the project's security architecture is intentionally redesigned.

---



\# Authentication \& Session Lifecycle



Authentication and vault access are intentionally separated.



Authentication confirms the user's identity.



The master password unlocks the encrypted vault.



This separation ensures the backend never learns the user's encryption key or vault contents.



\---



\# Login Flow



The authentication flow is as follows:



1\. User opens the Clyro extension.

2\. User enters their registered email address or phone number.

3\. User authenticates with the backend.

4\. Backend validates the account.

5\. Backend returns a valid authenticated session.

6\. User enters the master password.

7\. The client derives the encryption key using Argon2id.

8\. The encrypted vault is decrypted locally.

9\. The vault becomes available to the user.



At no point does the backend receive:



\- The master password

\- The encryption key

\- Decrypted vault contents



\---



\# Browser Session



Once the vault has been unlocked:



\- The vault remains unlocked while the browser is running.

\- Encryption keys remain only in protected memory.

\- The user may access vault features without repeatedly entering the master password.



Examples include:



\- Autofill

\- Password generation

\- Vault search

\- Password capture



\---



\# Browser Shutdown



When the browser closes:



\- The vault immediately locks.

\- Encryption keys are removed from memory.

\- Decrypted vault data is discarded.

\- Active vault sessions terminate.



The next browser launch requires the user to authenticate and unlock the vault again.



\---



\# Trusted Device Lifecycle



When a new device is authenticated:



1\. Device authentication succeeds.

2\. Device is registered as trusted.

3\. The encrypted vault is synchronized.

4\. The device stores only the encrypted vault locally.



Trusted devices may later be revoked.



Revoked devices:



\- Lose synchronization access.

\- Must authenticate again before reconnecting.



\---



\# Offline Operation



Trusted devices continue functioning while offline.



Users may:



\- Unlock the vault

\- Search credentials

\- View credentials

\- Autofill credentials

\- Generate passwords



Changes made while offline remain encrypted locally.



Synchronization resumes automatically when connectivity returns.



\---



\# Session Timeout



Version 1.0 follows a browser-based session model.



Session policy:



\- Vault remains unlocked while the browser is open.

\- Closing the browser immediately locks the vault.

\- Users authenticate again during the next browser session.



Future versions may introduce configurable inactivity timeouts.



\---



\# Authentication Philosophy



Authentication proves \*\*who the user is\*\*.



The master password proves \*\*that the user can decrypt the vault\*\*.



These responsibilities remain intentionally independent to preserve the zero-knowledge architecture.

---



\# Vault Synchronization Architecture



Clyro uses a cloud-first synchronization model.



The backend coordinates synchronization between trusted devices while remaining unable to decrypt vault contents.



Only encrypted vault data is transmitted and stored.



\---



\# Synchronization Flow



The synchronization process follows these steps:



1\. A trusted device modifies the local vault.

2\. The updated vault is encrypted locally.

3\. The encrypted vault is uploaded to the backend.

4\. The backend stores the encrypted vault.

5\. Other trusted devices detect that a newer vault version is available.

6\. The encrypted vault is downloaded.

7\. The client decrypts the vault locally.

8\. Local data is updated.



At no point does the backend access decrypted vault data.



\---



\# Synchronization Triggers



Synchronization occurs automatically when:



\- A new credential is added.

\- An existing credential is updated.

\- A credential is deleted.

\- The vault is unlocked after being offline.

\- A trusted device comes back online.



Manual synchronization may also be available through the extension interface.



\---



\# Conflict Resolution



Version 1.0 uses the \*\*Last Change Wins (LCW)\*\* strategy.



If two trusted devices modify the same credential before synchronization:



\- The credential with the most recent modification timestamp is retained.

\- Older versions are overwritten.



This approach prioritizes simplicity and predictability.



Future versions may introduce optional conflict history or versioning.



\---



\# Offline Synchronization



Trusted devices remain fully functional while offline.



Users can:



\- View credentials

\- Add credentials

\- Edit credentials

\- Delete credentials

\- Generate passwords

\- Autofill credentials



All changes remain encrypted on the local device until synchronization becomes possible.



\---



\# Synchronization Security



Synchronization must follow these rules:



\- Only encrypted vault data is transmitted.

\- HTTPS with modern TLS is required.

\- Authentication is required before synchronization.

\- Only trusted devices may synchronize vault data.

\- Encryption and decryption always occur on the client.



\---



\# Version Metadata



Each vault synchronization includes metadata such as:



\- Vault version

\- Last modification timestamp

\- Device identifier

\- Synchronization timestamp



This metadata is used solely for synchronization coordination and never includes plaintext credential information.



\---



\# Synchronization Philosophy



Synchronization should be reliable, predictable, and transparent.



Users should rarely need to think about synchronization during normal use.



The system should automatically recover from temporary network failures without risking data integrity or compromising security.

---



\# Recommended Project Structure



The repository should be organized to keep responsibilities clearly separated and make future expansion straightforward.



```

Clyro/

│

├── docs/

│   ├── README.md

│   ├── PROJECT\_CONTEXT.md

│   ├── AI\_INSTRUCTIONS.md

│   ├── PRD.md

│   ├── ARCHITECTURE.md

│   ├── DATABASE.md

│   ├── API.md

│   └── CONTRIBUTING.md

│

├── extension/

│   ├── src/

│   │   ├── auth/

│   │   ├── autofill/

│   │   ├── capture/

│   │   ├── crypto/

│   │   ├── generator/

│   │   ├── search/

│   │   ├── storage/

│   │   ├── sync/

│   │   ├── ui/

│   │   └── utils/

│   │

│   ├── public/

│   ├── assets/

│   └── tests/

│

├── backend/

│   ├── src/

│   │   ├── auth/

│   │   ├── users/

│   │   ├── vault/

│   │   ├── devices/

│   │   ├── notifications/

│   │   ├── database/

│   │   ├── middleware/

│   │   ├── routes/

│   │   └── utils/

│   │

│   └── tests/

│

├── website/

│   ├── src/

│   ├── public/

│   └── assets/

│

└── shared/

&#x20;   ├── types/

&#x20;   ├── constants/

&#x20;   └── validation/

```



\---



\# Directory Responsibilities



\## docs/



Contains all project documentation.



Documentation is considered part of the product and should remain synchronized with implementation.



\---



\## extension/



Contains the Chromium browser extension.



All client-side cryptographic operations occur here.



\---



\## backend/



Contains the server responsible for authentication, synchronization, and account management.



The backend never decrypts vault data.



\---



\## website/



Contains the companion website used for account management, documentation, and extension downloads.



Vault operations remain inside the browser extension.



\---



\## shared/



Contains code that may be shared between multiple applications, such as:



\- Shared types

\- Validation schemas

\- Common constants



Business logic should not be duplicated unnecessarily.

---



\# Technology Stack



The following technologies have been selected for Version 1.0 of Clyro.



| Component | Technology |

|-----------|------------|

| Browser Extension | Chromium Extension (Manifest V3) |

| Frontend Language | TypeScript |

| Backend Runtime | Node.js |

| Backend Framework | Fastify |

| Database | PostgreSQL |

| ORM | Prisma |

| Authentication | JWT + Refresh Tokens |

| Password Hashing | Argon2id |

| Vault Encryption | AES-256-GCM |

| Transport Security | HTTPS (TLS) |

| Cloud Hosting | TBD |

| Website | React |

| Package Manager | pnpm |

| Version Control | Git + GitHub |



\---



\# Technology Selection Principles



Technology choices should follow these principles:



\- Prefer mature and well-maintained technologies.

\- Minimize unnecessary dependencies.

\- Favor readability over clever implementations.

\- Prioritize long-term maintainability.

\- Keep the architecture modular.

\- Replace technologies only when there is a clear technical benefit.



Technology decisions should remain consistent across the project unless a documented architectural decision requires a change.

---



\# Architecture Decision Summary



The following architectural decisions define Clyro Version 1.0.



| Area | Decision |

|------|----------|

| Product Model | Cloud-first password manager |

| Security Model | True Zero-Knowledge |

| Browser Support | Chromium-based browsers only |

| Future Expansion | Firefox, Safari, Mobile |

| Authentication | Email or Phone Number |

| Vault Unlock | Master Password |

| Session Policy | Vault remains unlocked while browser is open |

| Browser Close | Automatically locks the vault |

| Client Encryption | Yes |

| Server Decryption | Never |

| Offline Support | Trusted devices only |

| Synchronization | Automatic cloud synchronization |

| Conflict Resolution | Last Change Wins |

| Password Generator | User-configurable |

| Auto Login | Optional (disabled by default) |

| Backend Architecture | Modular Monolith |

| Database | PostgreSQL |

| Backend Framework | Fastify |

| Frontend Language | TypeScript |

| Companion Website | React |

| Encryption Algorithm | AES-256-GCM |

| Key Derivation | Argon2id |



\---



\# Architecture Governance



This document serves as the technical source of truth for Clyro's implementation.



If a future implementation requires a significant architectural change, the change should be documented and reviewed before development proceeds.



Architecture decisions should be intentional, documented, and aligned with the project's core principles of security, privacy, simplicity, and maintainability.

---



\# Conclusion



This Architecture Document defines the technical foundation for Clyro Version 1.0.



It translates the product vision described in the Product Requirements Document (PRD) into a practical engineering blueprint. The architecture establishes clear responsibilities for each system component, defines security boundaries, and documents the principles that guide implementation.



The most important architectural commitments made by this document are:



\- True zero-knowledge security

\- Client-side encryption and decryption

\- Cloud-first synchronization

\- Chromium-first browser support

\- Modular monolith backend architecture

\- Clear separation of responsibilities

\- Documentation-first development



Future platform expansion—including Firefox, Safari, Android, and iOS—should build upon this architecture without compromising its core security model.



Any significant architectural change should be documented, reviewed, and approved before implementation to ensure consistency across the project.



\---



\# Document Status



| Field | Value |

|-------|-------|

| Document | Architecture Document |

| Version | 1.0.0 |

| Status | Complete |

| Owner | ClyroVaultSync |

| Last Reviewed | July 2026 |

| Next Review | Before implementation of Version 1.1 |



\---



\*\*End of Document\*\*





