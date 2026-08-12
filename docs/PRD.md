\# Product Requirements Document (PRD)



| Field | Value |

|-------|-------|

| Project | Clyro |

| Organization | ClyroVaultSync |

| Document Version | 1.0.0 |

| Status | Approved |

| Phase | Design \& Architecture |

| Primary Platform | Chromium Browser Extension |

| Secondary Platform | Companion Web Portal |

| Future Platforms | Firefox, Safari, Edge, Mobile Applications |

| Last Updated | July 2026 |
| Status Note | **Superseded by a 2026-08-12 architecture pivot, rewrite owed — see notice below** |



---
> **⚠ Superseded 2026-08-12.** This PRD describes Clyro as **cloud-first** with Clyro-hosted accounts (email/phone registration, email/SMS verification, trusted devices, backend-mediated sync). That model was replaced by **local-first, bring-your-own-storage**: no Clyro account at all; the extension picks a Storage Provider once at setup (a self-run local server + SQLite/BYO-database, or Google Drive/Dropbox); the website's Dashboard reaches storage only through the installed extension. Master-password-derived encryption is unchanged. This materially changes the Executive Summary, Product Philosophy §4 ("Cloud-First Experience"), the User Journey, Functional Requirements §1 (Account Management) and §9 (Trusted Devices), the Version 1.0 roadmap's feature list, and several Assumptions/Constraints below — all still describe the superseded account-based product. See `knowledge/Decisions/Local-First Bring-Your-Own-Storage Pivot.md` and `knowledge/Features/Local-First Architecture.md` for the replacement design; full rewrite tracked as owed work in `knowledge/NEXT_TASK.md`.
---



\# Executive Summary



Clyro is a cloud-first, zero-knowledge password manager designed to provide secure password storage, synchronization, and autofill across trusted devices while ensuring that only the user can access their data.



Unlike traditional password managers, Clyro is built around a strict zero-knowledge architecture. The backend stores only encrypted vault data and never has access to plaintext credentials, encryption keys, or master passwords.



The first release targets Chromium-based browsers as a browser extension. A companion website will provide account management, documentation, and extension downloads. Future releases will expand support to additional browsers and mobile platforms.



\---



\# Vision



Build the simplest, most trustworthy cloud-first password manager that combines modern security, intuitive user experience, and true zero-knowledge privacy.



Clyro aims to provide users with confidence that:



\- Their passwords belong only to them.

\- Their data remains private.

\- Synchronization is seamless.

\- Security never comes at the expense of usability.



\---



\# Problem Statement



Managing passwords has become increasingly difficult.



Users often:



\- Reuse weak passwords.

\- Forget credentials.

\- Store passwords insecurely.

\- Maintain passwords across multiple devices manually.



Existing password managers frequently overwhelm users with unnecessary features or require trust in services that process sensitive information.



Clyro aims to solve these problems through a focused, security-first product that is easy to use while maintaining a strict zero-knowledge model.



\---



\# Product Goals



The primary goals of Clyro are:



\- Provide secure password storage.

\- Enable automatic password saving.

\- Provide intelligent autofill.

\- Synchronize encrypted vaults across trusted devices.

\- Operate using a true zero-knowledge architecture.

\- Deliver a clean and intuitive user experience.

\- Support offline vault access on trusted devices.

\- Maintain strong security without unnecessary complexity.



\---



\# Non-Goals



The initial release of Clyro will \*\*not\*\* include:



\- VPN services

\- Identity theft monitoring

\- Secure file storage

\- Secure notes

\- Credit card storage

\- Two-factor authenticator generation

\- Team or enterprise vaults

\- Password sharing

\- Mobile applications

\- Non-Chromium browser extensions



These features may be considered in future versions but are intentionally excluded from Version 1.0 to keep the product focused.

---



\# Product Philosophy



Clyro is built around a small number of principles that guide every product and engineering decision.



\## 1. Security Before Convenience



Convenience should never compromise user security.



Where a trade-off exists, security takes priority while maintaining a user experience that remains intuitive and approachable.



\---



\## 2. True Zero-Knowledge



Clyro is designed so that only the user can decrypt their vault.



The backend never has access to:



\- Master passwords

\- Encryption keys

\- Plaintext credentials

\- Decrypted vault contents



\---



\## 3. Simplicity Over Feature Bloat



Version 1 focuses on solving one problem exceptionally well:



\*\*Password management.\*\*



Features unrelated to password management are intentionally excluded from the initial release.



\---



\## 4. Cloud-First Experience



Users should experience seamless synchronization between trusted devices without manually exporting or importing vaults.



Cloud synchronization should feel automatic while preserving end-to-end encryption.



\---



\## 5. Offline First for Trusted Devices



Trusted devices maintain an encrypted local copy of the vault.



Users should continue accessing passwords even when temporarily offline.



\---



\## 6. User Control



Users remain in control of:



\- Their vault

\- Password generation preferences

\- Trusted devices

\- Auto-login preferences

\- Account recovery decisions



The product should never remove meaningful user control for the sake of automation.



\---



\## 7. Predictability



Clyro should behave consistently.



Examples:



\- Autofill should always appear in the same way.

\- Password generation should follow configured preferences.

\- Synchronization should be automatic.

\- Vault search should be fast and predictable.



Consistency builds trust.



\---



\# Design Principles



Every feature added to Clyro should satisfy the following principles.



\### Easy to Learn



A first-time user should understand the basic workflow within minutes.



\---



\### Easy to Trust



Security decisions should be understandable and transparent.



\---



\### Easy to Maintain



The codebase should favor clarity over unnecessary complexity.



\---



\### Easy to Extend



Future browsers, mobile applications, and enterprise functionality should be possible without redesigning the entire architecture.



\---



\### Performance That Feels Instant



Clyro should feel responsive during:



\- Vault unlock

\- Autofill

\- Password generation

\- Vault search

\- Synchronization



Raw benchmark performance is less important than providing a consistently responsive user experience.



\---



\# Success Metrics



The initial release should achieve the following objectives:



\- Reliable password saving

\- Reliable autofill

\- Reliable synchronization

\- Zero plaintext exposure on the backend

\- Fast vault search

\- Stable browser extension

\- Positive user experience

---



\# Target Users



Clyro is designed primarily for individual users who want a secure, modern, and easy-to-use password manager without sacrificing privacy.



The initial release focuses on consumers rather than businesses or enterprise environments.



\---



\# Primary User Personas



\## 1. Everyday Internet Users



Users who:



\- Have accounts on multiple websites.

\- Frequently forget passwords.

\- Want a simple password manager.

\- Value convenience and security.



Typical needs:



\- Password storage

\- Autofill

\- Password generation

\- Synchronization across trusted devices



\---



\## 2. Students



Students often maintain dozens of online accounts across:



\- Universities

\- Learning platforms

\- Email providers

\- Social media

\- Developer tools



Clyro should help students organize credentials without requiring technical expertise.



\---



\## 3. Developers \& Technical Users



Developers typically manage:



\- GitHub accounts

\- Cloud platforms

\- Package registries

\- Development environments

\- Multiple identities for testing



These users often appreciate stronger security and customization options while still expecting a fast workflow.



\---



\## 4. Privacy-Conscious Users



These users actively seek products that:



\- Respect user privacy.

\- Avoid collecting unnecessary data.

\- Provide transparency.

\- Follow a true zero-knowledge architecture.



Clyro's security model should be a major selling point for this audience.



\---



\# Out of Scope Users (Version 1.0)



The initial release is \*\*not\*\* designed for:



\- Large enterprises

\- Corporate identity management

\- Team password sharing

\- Family plans

\- Managed organization accounts

\- Enterprise administration



Support for these use cases may be explored in future releases but is intentionally excluded from Version 1.0.



\---



\# User Journey



A typical user journey is expected to follow this flow:



1\. Create an account using an email address or phone number.

2\. Verify ownership through email verification or SMS verification.

3\. Create a master password.

4\. Unlock the vault.

5\. Begin browsing normally.

6\. Save new credentials when prompted.

7\. Autofill credentials on future visits.

8\. Synchronize encrypted changes across trusted devices.

9\. Search and manage stored credentials from the vault.



The overall experience should require minimal manual effort while maintaining strong security guarantees.

---



\# Functional Requirements



This section defines the functional capabilities required for Version 1.0 of Clyro.



\---



\# 1. Account Management



\## Account Registration



Users shall be able to create a Clyro account using either:



\- A verified email address

\- A verified mobile phone number



Registration requires:



\- Email verification (if email is selected)

\- SMS verification (if phone number is selected)

\- Creation of a master password



The account is considered active only after successful verification.



\---



\## Authentication



Users shall authenticate using:



\- Email or phone number (initial login)

\- Master password



On trusted devices, users should only need to enter their master password after browser restart.



\---



\## Account Verification



The system shall verify ownership of:



\- Email addresses using verification links.

\- Mobile numbers using SMS verification.



Accounts cannot be used until verification succeeds.



\---



\# 2. Master Password



The master password protects the user's encrypted vault.



Requirements:



\- Never transmitted in plaintext.

\- Never stored by the backend.

\- Used only to derive the encryption key.

\- Required whenever the vault is unlocked.



\---



\## Forgotten Master Password



Clyro follows a strict zero-knowledge architecture.



If the master password is forgotten:



\- The encrypted vault cannot be recovered.

\- Existing stored credentials become permanently inaccessible.

\- Users may reset their account.

\- Account reset creates a new empty vault.



This behavior is intentional and fundamental to Clyro's security model.



\---



\# 3. Vault



Each user owns a single encrypted vault.



The vault stores:



\- Website credentials

\- Usernames

\- Email addresses

\- Passwords

\- Website metadata



All vault contents are encrypted before leaving the user's device.



The backend never has access to plaintext vault contents.



\---



\## Vault Search



Users shall be able to search their vault using a search bar.



Search should support:



\- Website names

\- Domains

\- Usernames

\- Account names



Example:



Searching:



Discord



Should return every credential related to Discord, including multiple accounts.



Search should feel immediate even for large vaults.



\---



\## Vault Organization



Credentials are displayed as a searchable list.



Each entry should clearly display:



\- Website

\- Username or email

\- Additional account label (when applicable)



Users should be able to distinguish between multiple accounts for the same website without confusion.

---



\# 4. Password Capture



Clyro shall automatically detect supported authentication forms.



Supported forms include:



\- Login forms

\- Registration forms

\- Password update forms



When a new credential is detected, the user should be prompted to:



\- Save the credential

\- Ignore the credential



Duplicate credentials should be intelligently detected to reduce unnecessary prompts.



\---



\# 5. Autofill



When the user focuses on either the username/email field or the password field on a supported login page, Clyro shall display a credential selection dropdown.



The dropdown should contain all credentials stored for the current website.



Example:



Website:



discord.com



Stored accounts:



\- personal@example.com

\- work@example.com

\- testing@example.com



The user selects one account.



Clyro automatically fills:



\- Username or email

\- Password



No additional interaction should be required.



\---



\## Auto Login



Users may optionally enable Auto Login.



When enabled:



\- Credentials are automatically filled.

\- The login form is automatically submitted.



When disabled:



\- Credentials are filled.

\- The user manually submits the login form.



Auto Login should remain optional and disabled by default unless explicitly enabled by the user.



\---



\# 6. Password Generator



Clyro shall include a built-in password generator.



Users may configure:



\- Password length

\- Uppercase letters

\- Lowercase letters

\- Numbers

\- Symbols



Generated passwords should use a cryptographically secure random source.



The generator should be accessible:



\- During registration

\- During password changes

\- From within the vault interface



\---



\# 7. Synchronization



The encrypted vault shall automatically synchronize across trusted devices.



Synchronization requirements:



\- Automatic

\- Background operation

\- End-to-end encrypted

\- Reliable

\- Conflict aware



Users should not be required to manually synchronize their vault.



\---



\## Conflict Resolution



When synchronization conflicts occur, Clyro shall use the \*\*Last Change Wins\*\* strategy.



Conflicts are expected to be extremely rare.



If incorrect data is synchronized, users may manually edit the credential.



\---



\# 8. Offline Support



Trusted devices shall maintain an encrypted local copy of the vault.



Users should be able to:



\- Unlock the vault

\- View stored credentials

\- Search credentials



while offline.



Changes made while offline shall synchronize automatically once connectivity is restored.



\---



\# 9. Trusted Devices



Users shall be able to:



\- View trusted devices

\- Revoke trusted devices

\- Add newly authenticated devices



Revoking a trusted device shall invalidate future synchronization until the device is authenticated again.



\---



\# 10. Security Notifications



Users should receive notifications for important security events, including:



\- New trusted device added

\- New login from an unrecognized device

\- Email address changed

\- Phone number changed



Notifications should never include sensitive vault information.


---



\# Non-Functional Requirements



This section defines the quality attributes expected from Clyro Version 1.0.



\---



\# Security



Security is the highest priority for Clyro.



Requirements:



\- End-to-end encryption for all vault data.

\- True zero-knowledge architecture.

\- Encryption keys derived using Argon2id.

\- Backend never stores encryption keys.

\- Backend never stores plaintext passwords.

\- Backend never decrypts user vaults.

\- Plaintext credentials must never be written to disk.

\- Decrypted vault data exists only in memory while unlocked.



\---



\# Privacy



Clyro is designed with privacy by default.



Requirements:



\- Collect only the minimum data required to operate the service.

\- Never sell user data.

\- Never analyze vault contents.

\- Never use stored credentials for analytics or advertising.

\- Maintain strict separation between authentication data and encrypted vault data.



\---



\# Performance



The product should feel responsive during normal usage.



Target experience:



\- Fast vault unlock.

\- Fast vault search.

\- Responsive autofill.

\- Automatic synchronization without noticeable delays.

\- Password generation should appear instantaneous.



The focus is on providing a smooth user experience rather than maximizing benchmark performance.



\---



\# Reliability



Clyro should provide reliable day-to-day operation.



Requirements:



\- Stable browser extension.

\- Reliable synchronization.

\- Automatic recovery from temporary network interruptions.

\- Consistent vault behavior across trusted devices.



\---



\# Usability



The user experience should prioritize simplicity.



Requirements:



\- Minimal learning curve.

\- Clear user interface.

\- Predictable workflows.

\- Consistent behavior.

\- Accessible to both technical and non-technical users.



\---



\# Scalability



The architecture should support future growth without major redesign.



Future scalability targets include:



\- Additional Chromium browsers.

\- Firefox support.

\- Safari support.

\- Microsoft Edge support.

\- Mobile applications.

\- Team and enterprise features.



These are not Version 1.0 requirements but should remain possible within the chosen architecture.



\---



\# Maintainability



The codebase should prioritize:



\- Modular architecture.

\- Clear separation of responsibilities.

\- Readable code.

\- Minimal duplication.

\- Straightforward testing.

\- Well-defined interfaces between components.



\---



\# Availability



The backend should be designed for high availability.



If the backend becomes temporarily unavailable:



\- Previously synchronized trusted devices should continue functioning offline.

\- Users should regain synchronization automatically once connectivity is restored.



\---



\# Compatibility



Version 1.0 officially targets:



\- Chromium-based browsers



Future versions may support:



\- Firefox

\- Safari

\- Mobile platforms



The architecture should avoid assumptions that prevent future expansion.



\---



\# Compliance



Where applicable, Clyro should be designed with modern privacy and security regulations in mind, including principles aligned with regulations such as GDPR and similar privacy frameworks.



Compliance requirements will be refined before public release.


---

# Product Roadmap

The Clyro roadmap is divided into multiple planned releases. Each release builds upon the previous one while maintaining backward compatibility where practical.

---

# Version 1.0 – Initial Public Release

The primary objective of Version 1.0 is to deliver a reliable, secure, and easy-to-use password manager focused on individual users.

## Included Features

- Chromium browser extension
- Account registration using email or phone number
- Email verification
- SMS verification
- Master password authentication
- True zero-knowledge encryption
- Cloud synchronization
- Trusted devices
- Password capture
- Password vault
- Vault search
- Autofill
- Optional Auto Login
- Password generator
- Offline access on trusted devices
- Security notifications

Version 1.0 intentionally focuses on doing one thing exceptionally well: secure password management.

---

# Version 1.x – Refinement

After the initial release, development should focus on polishing the overall experience.

Potential improvements include:

- UI and UX improvements
- Accessibility enhancements
- Faster synchronization
- Better onboarding
- Password import tools
- Improved diagnostics
- Performance optimizations

No major architectural changes should occur during this phase.

---

# Version 2.0 – Browser Expansion

Expand beyond Chromium-based browsers.

Planned platforms include:

- Mozilla Firefox
- Microsoft Edge
- Safari

The browser experience should remain consistent across all supported platforms.

---

# Version 3.0 – Mobile Ecosystem

Introduce mobile applications while preserving the same security guarantees.

Potential additions:

- Android application
- iOS application
- Mobile autofill integration
- Biometric authentication
- Secure vault synchronization

The mobile applications must follow the same zero-knowledge architecture as the browser extension.

---

# Long-Term Vision

Clyro aims to become one of the most trusted privacy-first password managers available.

Growth should always remain aligned with the project's core principles:

- Security first
- Privacy by design
- Simplicity
- Maintainability
- User control

Features should only be introduced if they strengthen the product without compromising these principles.


---

# Assumptions

The following assumptions have been made during the design of Clyro Version 1.0.

## User Assumptions

- Users have access to a modern Chromium-based browser.
- Users have either a valid email address or a valid mobile number.
- Users understand the importance of remembering their master password.
- Users are responsible for keeping their master password secure.

---

## Technical Assumptions

- Internet connectivity is available for synchronization.
- Trusted devices maintain an encrypted local vault.
- Modern browsers provide secure cryptographic APIs.
- Backend services remain available for authentication and synchronization.

---

## Security Assumptions

- The user's device is trusted while the vault is unlocked.
- TLS protects communication between clients and backend services.
- Encryption keys never leave the client in plaintext.
- The backend never gains access to decrypted vault data.

---

# Constraints

The following constraints define Version 1.0.

## Platform Constraints

Supported:

- Chromium-based browsers

Not included:

- Firefox
- Safari
- Native desktop applications
- Mobile applications

---

## Product Constraints

Version 1.0 intentionally excludes:

- Secure Notes
- Payment Cards
- File Attachments
- Team Vaults
- Family Plans
- Enterprise Administration
- Password Sharing
- Built-in Authenticator

These may be considered after the initial release.

---

## Security Constraints

The following rules are non-negotiable:

- True zero-knowledge architecture.
- Master passwords are never stored by the backend.
- Encryption keys are never persisted.
- Plaintext credentials never leave the client.
- Forgotten master passwords cannot recover encrypted vaults.

These constraints define the security model of Clyro and must not be compromised for convenience.

---

# Risks & Mitigation

This section identifies the primary risks associated with developing and operating Clyro, along with planned mitigation strategies.

---

## Risk 1 – Forgotten Master Password

### Description

Users may forget their master password, making their encrypted vault permanently inaccessible.

### Impact

High

### Mitigation

- Clearly educate users during account creation.
- Require confirmation that the master password cannot be recovered.
- Encourage users to securely back up their master password.
- Provide an account reset option that creates a new empty vault.

---

## Risk 2 – Browser API Changes

### Description

Future updates to Chromium or the Chrome Extension APIs may affect extension functionality.

### Impact

Medium

### Mitigation

- Follow Manifest V3 best practices.
- Keep browser-specific logic isolated.
- Regularly test against Chromium beta releases.

---

## Risk 3 – Synchronization Conflicts

### Description

The same credential may be modified on multiple devices before synchronization completes.

### Impact

Low

### Mitigation

- Use the **Last Change Wins** conflict resolution strategy.
- Allow users to manually edit credentials if necessary.

---

## Risk 4 – Backend Downtime

### Description

Temporary backend outages may interrupt synchronization.

### Impact

Medium

### Mitigation

- Maintain an encrypted local vault on trusted devices.
- Allow offline vault access.
- Resume synchronization automatically when connectivity is restored.

---

## Risk 5 – Security Vulnerabilities

### Description

New vulnerabilities may be discovered in dependencies, browsers, or cryptographic libraries.

### Impact

High

### Mitigation

- Keep dependencies up to date.
- Perform regular security reviews.
- Follow industry best practices for cryptography.
- Minimize the attack surface through a simple architecture.

---

# Guiding Principle

Whenever a trade-off exists between **security** and **convenience**, Clyro will prioritize security while striving to maintain an intuitive user experience.

---

# Acceptance Criteria

The Clyro Version 1.0 release shall be considered complete when all of the following criteria have been met.

## Account Management

- Users can register using an email address or mobile phone number.
- Email verification functions correctly.
- SMS verification functions correctly.
- Users can authenticate successfully using their chosen identifier and master password.

---

## Vault

- Users can create an encrypted vault.
- Credentials are encrypted before leaving the client.
- Users can search and manage stored credentials.
- Multiple accounts for the same website are supported.

---

## Password Management

- New credentials can be detected and saved.
- Existing credentials can be updated.
- Duplicate detection behaves correctly.

---

## Autofill

- Login forms are detected correctly.
- Credential suggestions appear when focusing a login field.
- Selected credentials autofill accurately.
- Auto Login functions correctly when enabled.
- Manual login remains the default behavior.

---

## Password Generator

- Users can configure password generation options.
- Generated passwords use a cryptographically secure random source.

---

## Synchronization

- Vault changes synchronize automatically between trusted devices.
- Offline changes synchronize after connectivity is restored.
- Conflict resolution follows the Last Change Wins strategy.

---

## Security

- Backend never stores plaintext credentials.
- Backend never stores encryption keys.
- Backend never decrypts vault contents.
- Master passwords are never recoverable by the backend.
- Forgotten master passwords cannot recover encrypted vaults.

---

## Performance

The product should provide a responsive experience during:

- Vault unlock
- Autofill
- Password generation
- Vault search
- Synchronization

---

## Reliability

The browser extension should operate reliably during normal daily usage without frequent crashes or data inconsistencies.

---

# Glossary

This glossary defines important terms used throughout the Clyro documentation.

## Auto Login

An optional feature that automatically submits a login form after credentials have been autofilled.

---

## Autofill

The process of automatically inserting stored credentials into supported login forms.

---

## Chromium

The open-source browser project used by Google Chrome, Microsoft Edge, Brave, Opera, Vivaldi, Arc, and other Chromium-based browsers.

---

## Cloud Synchronization

The process of securely synchronizing an encrypted vault between trusted devices through the backend.

---

## Credential

A stored login record containing information such as:

- Website
- Username or email
- Password
- Metadata

---

## Encrypted Vault

The encrypted collection of credentials owned by a user.

Only the user can decrypt the vault.

---

## End-to-End Encryption

A security model in which data is encrypted on the client before transmission and decrypted only on authorized client devices.

The backend never has access to plaintext data.

---

## Master Password

The password chosen by the user to unlock the vault and derive the encryption key.

The backend never stores or knows the master password.

---

## Trusted Device

A device that has successfully authenticated with the user's account and maintains an encrypted local copy of the vault.

---

## True Zero-Knowledge

An architecture in which the service provider has no ability to read or decrypt user vault data.

Only the user possesses the information required to decrypt the vault.


---

# Conclusion

Clyro is being built with a clear objective:

> Deliver a secure, cloud-first, true zero-knowledge password manager that prioritizes user privacy, simplicity, and long-term maintainability.

This Product Requirements Document defines the scope, goals, functional requirements, non-functional requirements, constraints, and roadmap for Version 1.0 of the product.

Every implementation decision should align with the principles established in this document. Features that fall outside the defined scope should be evaluated carefully to ensure they support Clyro's long-term vision without introducing unnecessary complexity.

As the project evolves, this document should continue to serve as the primary product reference. Significant changes to product behavior, user experience, or feature scope should be reflected here before implementation begins.

By following a documentation-first approach, Clyro aims to maintain a codebase that is consistent, understandable, secure, and scalable for both human contributors and AI-assisted development.

---

# Document Status

| Field | Value |
|-------|-------|
| Document | Product Requirements Document |
| Version | 1.0.0 |
| Status | Complete |
| Owner | ClyroVaultSync |
| Last Reviewed | July 2026 |
| Next Review | Before Version 1.1 Planning |

---

**End of Document**










