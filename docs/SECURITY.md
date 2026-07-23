\# Security Document



Version: 1.0.0



Status: Documentation Complete (Version 1.0)



\---



\# Purpose



This document defines the security architecture, security principles, cryptographic design, and operational security practices for Clyro Version 1.0.



Security is the foundation of Clyro.



Every architectural decision, implementation detail, and future enhancement must preserve the project's zero-knowledge security model.



This document should be read together with:



\- README.md

\- PRD.md

\- ARCHITECTURE.md

\- DATABASE.md

\- API.md

\- AI\_INSTRUCTIONS.md

\- CONTRIBUTING.md



\---



\# Scope



This document defines the security principles and architectural guarantees for Clyro Version 1.0.



It is not intended to serve as a penetration testing report, security audit, or compliance certification.



Implementation details may evolve over time, but the security principles defined in this document are considered foundational and should remain consistent across future releases.

---



\# Security Philosophy



Clyro is built on one fundamental principle:



> Only the user should ever have access to their secrets.



Security always takes priority over convenience whenever a trade-off exists.



Version 1.0 follows the following security principles:



\- True Zero-Knowledge Architecture

\- Client-Side Encryption

\- Privacy by Design

\- Defense in Depth

\- Principle of Least Privilege

\- Secure Defaults

\- Industry-Standard Cryptography

\- Minimal Trust Architecture



Every future feature must preserve these principles.



\---



\# Security Goals



The primary security objectives of Version 1.0 are:



\- Protect all user credentials from unauthorized access.

\- Prevent server-side access to vault contents.

\- Ensure encryption and decryption occur exclusively on trusted client devices.

\- Secure account authentication.

\- Protect vault synchronization.

\- Secure local vault storage.

\- Protect authentication sessions.

\- Minimize attack surface.

\- Preserve user privacy.

\- Build a maintainable security architecture for future releases.



\---



\# Security Model



Clyro follows a true zero-knowledge security model.



The backend stores encrypted vaults but never possesses sufficient information to decrypt them.



At no point does the backend receive:



\- Master passwords

\- Encryption keys

\- Plaintext credentials

\- Plaintext secure notes

\- Decrypted vault contents



Only authenticated client devices that know the user's master password can decrypt vault data.



The backend acts solely as a secure synchronization and authentication service.



\---



\# Core Security Principles



\## Zero-Knowledge by Design



Zero-knowledge is the defining architectural principle of Clyro.



All sensitive information is encrypted before leaving the client device.



The server never performs encryption or decryption on behalf of users.



Compromise of backend infrastructure must not expose user vault contents.



\---



\## Client-Side Encryption



All cryptographic operations occur locally.



This includes:



\- Vault encryption

\- Vault decryption

\- Password generation

\- Encryption key derivation



Only encrypted vault data is transmitted to backend services.



\---



\## Privacy by Design



Clyro intentionally collects only information required for account functionality.



Examples include:



\- Email address

\- Optional phone number

\- Authentication metadata

\- Trusted device metadata

\- Synchronization metadata



Clyro intentionally avoids collecting unnecessary personal information.



\---



\## Defense in Depth



Security is implemented using multiple independent protection layers.



Examples include:



\- Strong authentication

\- Authenticated encryption

\- Secure key derivation

\- Trusted device validation

\- Session management

\- HTTPS communication

\- Backend validation

\- Access token expiration

\- Refresh token rotation



Compromising a single security mechanism should never compromise the entire system.



\---



\## Principle of Least Privilege



Every component receives only the permissions required for its role.



\### Browser Extension



Responsible for:



\- Vault encryption

\- Vault decryption

\- Password generation

\- Autofill

\- Auto-save

\- Auto-login

\- Local vault management



\### Backend



Responsible only for:



\- User authentication

\- Session management

\- Trusted devices

\- Encrypted vault synchronization

\- Encrypted vault storage

\- Account management



The backend never receives permission to decrypt vault contents.



\---



\## Secure Defaults



Default configuration should always favor security.



Examples include:



\- HTTPS-only communication

\- Encryption enabled by default

\- Session expiration

\- Authentication required for protected endpoints

\- Trusted device verification

\- Secure password generation defaults



Users may increase security settings but should never be placed into insecure configurations by default.



\---



\# Threat Model



Version 1.0 is designed to protect against realistic threats encountered by modern cloud-based password managers.



\---



\## Protected Assets



The following information is considered highly sensitive:



\- Website credentials

\- Secure notes

\- Master password

\- Authentication tokens

\- Encryption keys

\- Trusted device information

\- User vault contents



Protecting these assets is the primary objective of Clyro's security architecture.



\---



\## Threats Addressed



Version 1.0 is designed to mitigate:



\- Database compromise

\- Backend compromise

\- Network interception

\- Credential theft

\- Brute-force attacks

\- Dictionary attacks

\- Password reuse attacks

\- Replay attacks

\- Session hijacking

\- Unauthorized device access

\- API abuse

\- Unauthorized vault synchronization



Multiple security layers work together to reduce the likelihood and impact of these threats.



\---



\## Threats Outside the Scope of Version 1.0



No password manager can eliminate every possible threat.



Version 1.0 does not protect against:



\- Malware executing on an unlocked client device

\- Hardware keyloggers

\- Compromised operating systems

\- Physical theft of an already unlocked device

\- Social engineering attacks

\- Phishing attacks outside the application's control



Users remain responsible for maintaining the security of their devices and protecting their master password.



\---



\# Security Assumptions



The security guarantees provided by Clyro assume:



\- The user's operating system is trusted.

\- The browser extension has not been modified by malicious software.

\- The master password remains secret.

\- HTTPS certificates are valid.

\- Industry-standard cryptographic libraries are correctly implemented.

\- Trusted devices remain under the user's control.



If these assumptions are violated, some security guarantees may no longer apply.



\---



\# Security Architecture Overview



Clyro separates responsibilities between the client and backend to minimize trust.



\## Client Responsibilities



The client performs:



\- Encryption

\- Decryption

\- Key derivation

\- Vault management

\- Password generation

\- Credential management



\## Backend Responsibilities



The backend performs:



\- Authentication

\- Session management

\- Trusted device management

\- Encrypted vault storage

\- Vault synchronization



The backend is intentionally designed without access to user secrets.



\---



\# Cryptography



Version 1.0 uses modern, industry-standard cryptographic primitives.



Cryptography should always be implemented using well-tested, actively maintained libraries.



Custom cryptographic implementations are strictly prohibited.



\---

Encrypted vaults should include a cryptographic version identifier to allow future algorithm upgrades while maintaining backwards compatibility.



\## Authenticated Encryption



Clyro protects encrypted vault data using:



\*\*XChaCha20-Poly1305\*\*



This authenticated encryption algorithm provides:



\- Confidentiality

\- Integrity

\- Authenticity



Any unauthorized modification of encrypted vault data is detected during decryption.



\---



\## Key Derivation


Argon2id parameters (memory cost, iterations, and parallelism) should be selected according to current industry recommendations and may be adjusted in future releases as hardware capabilities evolve.


Encryption keys are derived using:



\*\*Argon2id\*\*



Argon2id provides strong protection against:



\- GPU attacks

\- ASIC attacks

\- Dictionary attacks

\- Brute-force attacks



No encryption key is permanently stored.



\---



\## Encryption Key Lifecycle



The encryption key exists only while the vault is unlocked.



The lifecycle is:



1\. User enters master password.

2\. Argon2id derives the encryption key.

3\. Vault is decrypted locally.

4\. Key remains only in volatile memory.

5\. Key is securely discarded when the vault is locked or the session ends.



Encryption keys are never:



\- Stored on disk

\- Uploaded to backend services

\- Logged

\- Persisted between sessions



\---

Future versions may support vault re-encryption using updated cryptographic parameters or algorithms without requiring changes to stored credentials.



\## Cryptographically Secure Randomness



All random values used for security-sensitive operations must originate from secure operating system random number generators.



This includes:



\- Encryption nonces

\- Authentication tokens

\- Password generation

\- Recovery tokens

\- Verification tokens



Predictable or non-cryptographic random generators must never be used.



\---

# Authentication Security



Authentication is responsible for verifying user identity while preserving Clyro's zero-knowledge architecture.



Authentication and encryption are intentionally separated.



The authentication password verifies the user's identity with the backend.



The master password protects the encrypted vault.



The backend never receives or stores the master password.



\---



\## Authentication Password



The authentication password is used exclusively for account authentication.



It is responsible for:



\- Logging into the account

\- Creating authenticated sessions

\- Refreshing authentication tokens

\- Accessing backend services



The authentication password is never used directly to encrypt or decrypt the user's vault.



The backend stores only a salted, computationally expensive hash of the authentication password using Argon2id. The plaintext authentication password is never stored.


\---



\## Master Password



The master password is the root of the user's encrypted vault.



Its sole purpose is to derive the encryption key required to decrypt vault contents.



The master password:



\- Never leaves the client device

\- Is never transmitted to backend services

\- Is never stored

\- Is never logged

\- Exists only during vault unlock



The backend has no knowledge of the master password.



\---



\## Separation of Authentication and Encryption



Version 1.0 intentionally separates authentication from encryption.



Authentication verifies the identity of the account owner.



The master password protects encrypted vault contents.



This separation provides multiple security benefits:



\- Backend authentication without exposing encryption keys.

\- Independent password reset capability.

\- Zero-knowledge preservation.

\- Reduced attack surface.



\---



\## Master Password Recovery



Clyro follows a true zero-knowledge recovery model.



If a user forgets their master password:



\- The encrypted vault cannot be recovered.

\- Backend services cannot decrypt stored vaults.

\- Customer support cannot recover vault contents.

\- Existing encrypted vault data remains permanently inaccessible.



Users may reset their authentication password, but doing so does not restore access to previously encrypted vault data.



This is a deliberate security decision rather than a technical limitation.



\---



\## Password Strength



Users should create strong master passwords.



Recommended characteristics include:



\- Long passphrases

\- High entropy

\- Unique passwords

\- No password reuse



Weak master passwords significantly reduce the security of encrypted vaults regardless of the encryption algorithm.



\---



\# Session Security



After successful authentication, the backend establishes an authenticated session.



Sessions allow users to access backend services without repeatedly entering authentication credentials.



\---



\## Access Tokens



Access tokens provide short-lived authorization for protected API endpoints.



Access tokens:



\- Are temporary

\- Have limited lifetime

\- Are transmitted only over HTTPS

\- Cannot decrypt vault contents



Expired access tokens require a valid refresh token to obtain new authorization.



\---



\## Refresh Tokens



Refresh tokens provide controlled renewal of access tokens.



Version 1.0 follows these principles:



\- Refresh tokens are securely generated.

\- Refresh tokens are stored only as hashes in the database.

\- Plaintext refresh tokens are never persisted.

\- Refresh tokens expire.

\- Refresh tokens may be revoked.



\---



\## Session Expiration



Sessions automatically expire after predefined inactivity or expiration limits.



Expired sessions require user authentication before additional backend access is granted.



\---



\## Session Revocation



Users may revoke:



\- Individual sessions

\- All active sessions



Revoking a session immediately prevents future authenticated requests from that session.



\---



\# Trusted Device Security



Trusted devices allow secure synchronization across multiple user devices.



Each trusted device is individually registered.



Trust is granted to the device—not permanently to the browser installation.



\---



\## Device Registration



A trusted device is registered only after successful user authentication.

Device registration is not a separate API call — the client submits device metadata (deviceIdentifier, deviceName, platform, browser) as part of the POST /api/v1/auth/login request body. The backend creates the TrustedDevice record automatically on first login from a new device, and attaches every session to its originating device.



Each device receives its own identity within the user's account.



\---



\## Device Metadata



Version 1.0 stores only operational metadata including:



\- Device name

\- Browser

\- Platform

\- Registration time

\- Last synchronization

\- Last known IP address



No sensitive vault information is stored as device metadata.



\---



\## Device Revocation



Users may revoke any trusted device.



Revocation immediately prevents:



\- Authentication

\- Session creation

\- Vault synchronization

\- Future encrypted vault downloads



Already synchronized encrypted vault data remains encrypted and inaccessible without the user's master password.



\---



\## Lost or Stolen Devices



If a trusted device is lost:



Users should:



\- Revoke the device immediately.

\- Revoke active sessions.

\- Sign in on a trusted device.

\- Review account activity.



Because vault data remains encrypted, possession of the device alone does not expose user credentials unless the attacker also knows the master password.



\---



\# Vault Security



The encrypted vault represents the most sensitive asset managed by Clyro.



Protecting the vault is the primary objective of the application's security architecture.



\---



\## Vault Encryption



Before storage or synchronization:



1\. Vault data is encrypted locally.

2\. Authentication tags are generated.

3\. Only encrypted vault data is uploaded.



Backend services never receive decrypted vault contents.



\---



\## Vault Integrity



Authenticated encryption ensures unauthorized modification of vault contents is detected.



Corrupted or tampered encrypted vaults must never decrypt successfully.



\---



\## Vault Synchronization



Synchronization transfers only encrypted vault data.



Backend services:



\- Store encrypted vaults.

\- Compare vault versions.

\- Coordinate synchronization.



Backend services never inspect vault contents.



\---



\## Offline Access



Version 1.0 supports offline vault access.



Users may unlock previously synchronized encrypted vaults without an active internet connection.



Offline access never requires backend decryption.



\---



\# Local Storage Security



Version 1.0 stores only encrypted vault data locally.



Plaintext credentials are never written to persistent storage.



\---



\## Local Encryption



Before local persistence:



\- Vault contents remain encrypted.

\- Authentication metadata is stored separately.

\- Encryption keys are never persisted.



\---



\## Memory Protection



Sensitive information should remain in memory only while required.



Examples include:



\- Master password

\- Derived encryption keys

\- Decrypted vault contents



Whenever practical, sensitive memory should be cleared immediately after use.



\---



\## Local Security Guarantees



Local storage provides the following guarantees:



\- No plaintext credentials stored on disk.

\- No stored encryption keys.

\- No stored master password.

\- Offline vault availability using encrypted storage.



These guarantees remain fundamental to the security model of Version 1.0.



\---

# Backend Security



The backend is intentionally designed as an untrusted coordination layer.



Its responsibilities are limited to:



\- User authentication

\- Session management

\- Trusted device management

\- Encrypted vault storage

\- Encrypted vault synchronization

\- Account management



The backend is deliberately prevented from accessing user secrets.



\---



\## Backend Trust Model



Version 1.0 assumes that backend infrastructure may eventually be compromised.



Therefore, the backend is designed so that compromise does not expose user vault contents.



An attacker obtaining the backend database should not be able to recover:



\- Website credentials

\- Secure notes

\- Master passwords

\- Encryption keys

\- Decrypted vault contents



This is achieved through client-side encryption and zero-knowledge architecture.



\---



\## Database Security



The database stores only:



\- Account information

\- Authentication metadata

\- Trusted device metadata

\- Session information

\- Encrypted vaults

\- Synchronization metadata



The database never stores:



\- Plaintext credentials

\- Master passwords

\- Encryption keys

\- Decrypted vault contents

\- Plaintext secure notes



\---



\## API Security



All communication between clients and backend services must occur over HTTPS.



Every protected endpoint requires valid authentication.



Version 1.0 follows these security requirements:



\- HTTPS only

\- JWT access tokens

\- Secure refresh tokens

\- Request validation

\- Rate limiting

\- Input validation

\- Output sanitization

\- Consistent error responses



Sensitive information must never appear in API responses.



\---



\## Authentication Endpoint Protection



Authentication endpoints are common attack targets.



Version 1.0 mitigates these risks through:



\- Password hashing

\- Rate limiting

\- Generic authentication errors

\- Session expiration

\- Secure token generation

\- Refresh token hashing



Authentication responses should never reveal whether an email address exists within the system.



\---



\## Authorization



Every authenticated request is validated before execution.



Users may access only resources that belong to their own account.



Backend authorization must prevent:



\- Cross-account access

\- Session impersonation

\- Device impersonation

\- Vault access without authentication



\---



\# Browser Extension Security



The browser extension is the trusted execution environment responsible for handling user secrets.



It performs:



\- Vault encryption

\- Vault decryption

\- Credential storage

\- Password generation

\- Autofill

\- Auto-save

\- Auto-login



Because sensitive operations occur within the extension, minimizing its attack surface is a primary design objective.



\---



\## Secure Credential Handling



Credentials should exist in plaintext only while actively required.



Whenever practical:



\- Avoid unnecessary copies in memory.

\- Minimize credential lifetime.

\- Clear sensitive variables after use.



Persistent storage must always contain encrypted data.



\---



\## Autofill Security



Autofill should occur only when:



\- The current website matches stored credentials.

\- The vault is unlocked.

\- The user has enabled autofill.



Autofill should never expose credentials to unrelated domains.



\---



\## Auto-Save Security



Credential detection should occur only after successful user interaction.



Detected credentials should be:



1\. Reviewed by the user.

2\. Encrypted locally.

3\. Stored inside the encrypted vault.



The backend never receives plaintext credentials.



\---



\# Logging and Monitoring



Security logging is valuable for operational monitoring but must never compromise user privacy.



\---



\## Safe Logging



Logs may include:



\- Authentication events

\- Session creation

\- Session revocation

\- Device registration

\- API failures

\- Synchronization failures



\---



\## Sensitive Information Never Logged



The following must never appear in logs:



\- Master passwords

\- Authentication passwords

\- Encryption keys

\- Plaintext credentials

\- Secure notes

\- Authentication tokens

\- Refresh tokens

\- Vault contents



Logging sensitive information is considered a critical security defect.



\---



\# Dependency Security



Clyro depends on trusted third-party libraries for cryptography and infrastructure.



Version 1.0 follows these principles:



\- Prefer mature libraries.

\- Avoid abandoned packages.

\- Keep dependencies updated.

\- Remove unused packages.

\- Monitor known vulnerabilities.



Cryptographic libraries should never be replaced by custom implementations.



\---



\# Supply Chain Security



Every dependency introduces potential security risk.



Version 1.0 aims to reduce supply chain exposure through:



\- Minimal dependency count

\- Trusted package sources

\- Dependency review

\- Version pinning where appropriate

\- Regular security updates



\---



\# Security Testing



Security testing should become part of the development lifecycle.



Recommended testing includes:



\- Authentication testing

\- Authorization testing

\- Session testing

\- API security testing

\- Encryption validation

\- Input validation

\- Trusted device testing

\- Synchronization testing



Regression testing should ensure new features do not weaken existing security guarantees.



\---



\# Vulnerability Disclosure



If a security vulnerability is discovered:



1\. Privately report the issue.

2\. Reproduce the vulnerability.

3\. Assess impact.

4\. Develop a fix.

5\. Validate the fix.

6\. Release the update.

7\. Publish disclosure details when appropriate.



Critical vulnerabilities should never be disclosed publicly before users have an opportunity to update.



\---



\# Future Security Enhancements



Potential future improvements include:



\- Hardware security key support

\- Passkey authentication

\- Biometric vault unlock

\- Security event dashboard

\- Encrypted vault version history

\- Secure account recovery improvements

\- Advanced anomaly detection

\- Device risk scoring



These enhancements remain outside the scope of Version 1.0.



\---



\# Security Responsibilities



Security is a shared responsibility.



\## Users



Users are responsible for:



\- Choosing a strong master password.

\- Protecting trusted devices.

\- Keeping operating systems updated.

\- Protecting authentication credentials.

\- Remaining vigilant against phishing and social engineering.



\## Developers



Developers are responsible for:



\- Preserving zero-knowledge architecture.

\- Following secure coding practices.

\- Updating documentation before architectural changes.

\- Reviewing security implications of new features.

\- Maintaining dependency security.



\---



\# Security Review Checklist



Before any production release, verify that:



\- Client-side encryption remains intact.

\- Master passwords never leave the client.

\- Encryption keys are never persisted.

\- Vault contents remain encrypted in transit.

\- Vault contents remain encrypted at rest.

\- HTTPS is enforced.

\- Authentication endpoints are protected.

\- Authorization rules are correctly enforced.

\- Sessions can be revoked.

\- Trusted devices function correctly.

\- Sensitive data is never logged.

\- Documentation accurately reflects implementation.



\---



\# Conclusion



Security is the defining characteristic of Clyro.



Every component of the system is designed around one objective:



> Ensure that only the user can access their secrets.



Version 1.0 achieves this through:



\- True zero-knowledge architecture

\- Client-side encryption

\- Modern cryptographic standards

\- Strong authentication

\- Secure session management

\- Trusted device management

\- Defense in depth

\- Privacy by design



Future versions of Clyro should preserve these principles while continuing to strengthen the platform against evolving security threats.



\---



\*\*End of SECURITY.md\*\*






