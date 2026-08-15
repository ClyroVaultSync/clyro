# Product Requirements Document (PRD)

| Field | Value |
|-------|-------|
| Project | Clyro |
| Organization | ClyroVaultSync |
| Document Version | 2.0.0 |
| Status | Draft (Under Review) |
| Phase | Design & Architecture |
| Primary Platform | Chromium Browser Extension |
| Secondary Platform | Companion Website (marketing + launcher) |
| Future Platforms | Firefox, Safari, Edge, Mobile Applications |
| Last Updated | August 2026 |

---

# Executive Summary

Clyro is a local-first, zero-knowledge password manager designed to provide secure password storage, synchronization, and autofill while ensuring that only the user can access their data — and that no Clyro-run service ever holds a copy.

Unlike traditional password managers, Clyro operates **no shared backend and no user accounts**. Instead, the user chooses where their encrypted vault lives — a self-run local server on their own machine, or their own Google Drive or Dropbox — once during setup. Whichever storage is active only ever receives encrypted vault data; it never has access to plaintext credentials, encryption keys, or master passwords.

The first release targets Chromium-based browsers as a browser extension, which hosts the entire vault experience. A companion website provides marketing, setup guidance, and a launcher that opens the extension — it never displays vault contents itself. Future releases will expand support to additional browsers and mobile platforms.

---

# Vision

Build the simplest, most trustworthy local-first password manager that combines modern security, intuitive user experience, and true zero-knowledge privacy — without asking users to trust Clyro with a copy of their data.

Clyro aims to provide users with confidence that:

- Their passwords belong only to them.
- Their data never passes through infrastructure Clyro operates.
- They choose where their vault lives, and can move it at any time.
- Security never comes at the expense of usability.

---

# Problem Statement

Managing passwords has become increasingly difficult.

Users often:

- Reuse weak passwords.
- Forget credentials.
- Store passwords insecurely.
- Maintain passwords across multiple devices manually.

Existing password managers frequently overwhelm users with unnecessary features or require trust in a company's servers holding their most sensitive data — even when that data is encrypted, the account and the sync infrastructure are still a single, centrally-operated target.

Clyro aims to solve these problems through a focused, security-first product that lets the user own their storage entirely, while remaining easy to use.

---

# Product Goals

The primary goals of Clyro are:

- Provide secure password storage.
- Enable automatic password saving.
- Provide intelligent autofill.
- Synchronize encrypted vaults to a storage location the user chooses and owns.
- Operate using a true zero-knowledge architecture with no Clyro-run backend.
- Deliver a clean and intuitive user experience.
- Support full offline vault access.
- Maintain strong security without unnecessary complexity.

---

# Non-Goals

The initial release of Clyro will **not** include:

- A Clyro-run cloud account or backend
- VPN services
- Identity theft monitoring
- Secure file storage
- Secure notes
- Credit card storage
- Two-factor authenticator generation
- Team or enterprise vaults
- Password sharing
- Mobile applications
- Non-Chromium browser extensions
- A bring-your-own-database wizard for the Local Sync Server (SQLite only in V1)

These features may be considered in future versions but are intentionally excluded from Version 1.0 to keep the product focused.

---

# Product Philosophy

Clyro is built around a small number of principles that guide every product and engineering decision.

## 1. Security Before Convenience

Convenience should never compromise user security. Where a trade-off exists, security takes priority while maintaining a user experience that remains intuitive and approachable.

## 2. True Zero-Knowledge

Clyro is designed so that only the user can decrypt their vault. No storage — Local Sync Server, Google Drive, or Dropbox — ever has access to:

- Master passwords
- Encryption keys
- Plaintext credentials
- Decrypted vault contents

## 3. Simplicity Over Feature Bloat

Version 1 focuses on solving one problem exceptionally well: **password management.**

Features unrelated to password management are intentionally excluded from the initial release.

## 4. User Ownership of Storage

Users choose where their vault lives — Local or Cloud (Google Drive / Dropbox) — during setup, and this choice is theirs, not Clyro's. Synchronization to that chosen storage should feel automatic while preserving end-to-end encryption. There is no Clyro-operated account or database standing between the user and their data.

## 5. Offline First

The extension maintains an encrypted local copy of the vault regardless of which storage provider is active. Users should continue accessing passwords even when temporarily offline.

## 6. User Control

Users remain in control of:

- Their vault
- Which storage provider is active, and when to switch
- Password generation preferences
- Auto-login preferences
- Backup and recovery, via encrypted export

The product should never remove meaningful user control for the sake of automation.

## 7. Predictability

Clyro should behave consistently. Examples:

- Autofill should always appear in the same way.
- Password generation should follow configured preferences.
- Synchronization to the active storage provider should be automatic.
- Vault search should be fast and predictable.

Consistency builds trust.

---

# Design Principles

Every feature added to Clyro should satisfy the following principles.

### Easy to Learn

A first-time user should understand the basic workflow — including choosing Local or Cloud storage — within minutes.

### Easy to Trust

Security decisions should be understandable and transparent, including exactly where a user's vault physically lives.

### Easy to Maintain

The codebase should favor clarity over unnecessary complexity.

### Easy to Extend

Future browsers, mobile applications, and additional storage providers should be possible without redesigning the entire architecture.

### Performance That Feels Instant

Clyro should feel responsive during:

- Vault unlock
- Autofill
- Password generation
- Vault search
- Synchronization

Raw benchmark performance is less important than providing a consistently responsive user experience.

---

# Success Metrics

The initial release should achieve the following objectives:

- Reliable password saving
- Reliable autofill
- Reliable synchronization to whichever storage provider is active
- Zero plaintext exposure at any storage provider
- Fast vault search
- Stable browser extension
- A working Local Sync Server that installs and pairs with zero configuration
- Positive user experience

---

# Target Users

Clyro is designed primarily for individual users who want a secure, modern, and easy-to-use password manager without having to trust a company's servers with their vault.

The initial release focuses on consumers rather than businesses or enterprise environments.

---

# Primary User Personas

## 1. Everyday Internet Users

Users who:

- Have accounts on multiple websites.
- Frequently forget passwords.
- Want a simple password manager.
- Value convenience and security.

Typical needs:

- Password storage
- Autofill
- Password generation
- Synchronization to a storage location they already trust (their own PC, or their existing Google/Dropbox account)

## 2. Students

Students often maintain dozens of online accounts across universities, learning platforms, email providers, social media, and developer tools. Clyro should help students organize credentials without requiring technical expertise — including a Cloud storage option (Google Drive/Dropbox) for those without a personal server to run.

## 3. Developers & Technical Users

Developers typically manage GitHub accounts, cloud platforms, package registries, development environments, and multiple identities for testing. These users often appreciate stronger security and customization options — and are the most likely to run the Local Sync Server on a home server or VPS for DIY multi-device sync — while still expecting a fast workflow.

## 4. Privacy-Conscious Users

These users actively seek products that:

- Respect user privacy.
- Avoid collecting unnecessary data.
- Provide transparency.
- Follow a true zero-knowledge architecture with no central account to be compromised, subpoenaed, or breached.

Clyro's local-first, bring-your-own-storage model should be a major selling point for this audience.

---

# Out of Scope Users (Version 1.0)

The initial release is **not** designed for:

- Large enterprises
- Corporate identity management
- Team password sharing
- Family plans
- Managed organization accounts
- Enterprise administration

Support for these use cases may be explored in future releases but is intentionally excluded from Version 1.0.

---

# User Journey

A typical user journey is expected to follow this flow:

1. Install the Clyro browser extension.
2. Choose where the vault lives: **Local** (install and pair the Local Sync Server) or **Cloud** (connect Google Drive or Dropbox).
3. Create a master password.
4. The vault is created, encrypted, and stored via the chosen storage provider.
5. Begin browsing normally.
6. Save new credentials when prompted.
7. Autofill credentials on future visits.
8. The encrypted vault synchronizes automatically to the active storage provider.
9. Search and manage stored credentials from the extension's full-page vault tab.
10. Take periodic encrypted exports as a backup — the only recovery path, since there is no account to reset.

The overall experience should require minimal manual effort while maintaining strong security guarantees, and at no point should the user need to create a Clyro account.

---

# Functional Requirements

This section defines the functional capabilities required for Version 1.0 of Clyro.

---

# 1. Storage Provider Selection

## First-Run Setup

On first run, users shall choose exactly one Storage Provider:

- **Local** — install and pair the Local Sync Server (a self-run background application storing the vault in a bundled SQLite database).
- **Cloud** — connect Google Drive or Dropbox via OAuth (`chrome.identity`).

There is no login screen for either path, because there is no Clyro account.

## Switching Providers

Users shall be able to switch their active Storage Provider at any time, via encrypted export from the current provider followed by import into the new one. Only one provider is ever active at a time.

## Local Sync Server Pairing

When Local is chosen, the extension shall obtain a pairing token from the Local Sync Server and use it to authenticate all subsequent requests. Unpaired or mismatched-token requests shall be rejected by the server.

---

# 2. Master Password

The master password protects the user's encrypted vault.

Requirements:

- Never transmitted in plaintext.
- Never stored by any Storage Provider.
- Used only to derive the encryption key.
- Required whenever the vault is unlocked.

## Forgotten Master Password

Clyro follows a strict zero-knowledge architecture, made stricter by the absence of an account.

If the master password is forgotten:

- The encrypted vault cannot be recovered.
- Existing stored credentials become permanently inaccessible.
- There is no account to reset — recovery is only possible from a previously taken encrypted export (`.clyro` file), if one exists.

This behavior is intentional and fundamental to Clyro's security model.

---

# 3. Vault

Each user owns a single encrypted vault, stored via exactly one active Storage Provider.

The vault stores:

- Website credentials
- Usernames
- Email addresses
- Passwords
- Website metadata

All vault contents are encrypted before leaving the extension. No Storage Provider ever has access to plaintext vault contents.

## Vault UI

The vault interface is a **full-page extension tab**, not a page on the website. The website's Dashboard only launches it (see Requirement 9).

## Vault Search

Users shall be able to search their vault using a search bar. Search should support:

- Website names
- Domains
- Usernames
- Account names

Example: searching "Discord" should return every credential related to Discord, including multiple accounts. Search should feel immediate even for large vaults.

## Vault Organization

Credentials are displayed as a searchable list. Each entry should clearly display:

- Website
- Username or email
- Additional account label (when applicable)

Users should be able to distinguish between multiple accounts for the same website without confusion.

---

# 4. Password Capture

Clyro shall automatically detect supported authentication forms: login forms, registration forms, and password update forms.

When a new credential is detected, the user should be prompted to save or ignore it.

Duplicate credentials should be intelligently detected to reduce unnecessary prompts.

---

# 5. Autofill

When the user focuses on either the username/email field or the password field on a supported login page, Clyro shall display a credential selection dropdown containing all credentials stored for the current website.

Example: on `discord.com`, with stored accounts `personal@example.com`, `work@example.com`, and `testing@example.com`, the user selects one and Clyro automatically fills the username/email and password. No additional interaction should be required.

## Auto Login

Users may optionally enable Auto Login. When enabled, credentials are automatically filled and the login form is automatically submitted. When disabled, credentials are filled and the user manually submits the form. Auto Login remains optional and disabled by default.

---

# 6. Password Generator

Clyro shall include a built-in password generator. Users may configure password length, uppercase letters, lowercase letters, numbers, and symbols. Generated passwords use a cryptographically secure random source.

The generator should be accessible from within the vault interface, during setup, and as a standalone tool on the website (no vault or storage provider required for that surface).

---

# 7. Synchronization

The encrypted vault shall automatically synchronize with the active Storage Provider.

Requirements:

- Automatic
- Background operation
- End-to-end encrypted
- Reliable
- Conflict aware

Users should not be required to manually synchronize their vault.

## Conflict Resolution

Synchronization uses optimistic concurrency based on `vaultVersion`:

- **Local Sync Server and Dropbox**: a stale-version write is atomically rejected and retried after re-fetching.
- **Google Drive**: lacking a native compare-and-swap primitive, a stale-version write produces a **conflict copy** instead of overwriting, so no data is silently lost. The user resolves the conflict manually.

Conflicts are expected to be rare in normal single-user, few-device use.

---

# 8. Offline Support

The extension shall maintain an encrypted local copy of the vault, independent of which Storage Provider is active.

Users should be able to unlock the vault, view stored credentials, and search credentials while offline. Changes made while offline shall synchronize automatically to the active Storage Provider once connectivity is restored.

---

# 9. Website Dashboard (Launcher)

The website's Dashboard is a **launcher**, not a vault interface.

Requirements:

- Detect whether the extension is installed by sending it a `GET_STATUS` message.
- If installed: show the current status (`locked`/`unlocked`, active provider) and a button that sends `OPEN_VAULT`, which the extension responds to by opening its own vault tab.
- If not installed: show an install prompt, never an error or stale/fake data.
- Never render credentials or any vault content. Never receive any message capable of carrying one.

---

# 10. Encrypted Export / Import

Users shall be able to export their vault as an encrypted `.clyro` file, and import one to restore or migrate a vault.

Requirements:

- Export produces the same encrypted blob format used for synchronization — never a separately-encrypted or weaker format.
- Import decrypts and restores a vault, requiring the correct master password.
- This is the **only** backup and recovery mechanism, since there is no account to reset.
- This is the **only** mechanism for moving a vault from one Storage Provider to another.

---

# Non-Functional Requirements

This section defines the quality attributes expected from Clyro Version 1.0.

---

# Security

Security is the highest priority for Clyro.

Requirements:

- End-to-end encryption for all vault data.
- True zero-knowledge architecture, with no Clyro-run backend to compromise.
- Encryption keys derived using Argon2id.
- No Storage Provider ever stores encryption keys, plaintext passwords, or decrypts a vault.
- Plaintext credentials must never be written to disk.
- Decrypted vault data exists only in memory while unlocked.
- Plaintext vault data and the master password never cross from the extension into a web page — see `docs/SECURITY.md`.

---

# Privacy

Clyro is designed with privacy by default.

Requirements:

- Collect no account data — there is no account.
- Never sell user data.
- Never analyze vault contents.
- Never use stored credentials for analytics or advertising.
- The Local Sync Server retains no user-identifying information beyond a pairing token.

---

# Performance

The product should feel responsive during normal usage. Target experience:

- Fast vault unlock.
- Fast vault search.
- Responsive autofill.
- Automatic synchronization without noticeable delays.
- Password generation should appear instantaneous.

The focus is on providing a smooth user experience rather than maximizing benchmark performance.

---

# Reliability

Clyro should provide reliable day-to-day operation.

Requirements:

- Stable browser extension.
- Reliable synchronization with each of the three Storage Providers.
- Automatic recovery from temporary network interruptions.
- Consistent vault behavior regardless of active Storage Provider.
- The Local Sync Server auto-starts in the background and requires no manual restarts.

---

# Usability

The user experience should prioritize simplicity.

Requirements:

- Minimal learning curve, including for the Local vs. Cloud storage decision.
- Clear user interface.
- Predictable workflows.
- Consistent behavior.
- Accessible to both technical and non-technical users — the Local Sync Server installs with zero configuration.

---

# Scalability

The architecture should support future growth without major redesign. Future scalability targets include additional Chromium browsers, Firefox, Safari, Edge, mobile applications, and additional Storage Providers. These are not Version 1.0 requirements but should remain possible within the chosen architecture.

---

# Maintainability

The codebase should prioritize modular architecture, clear separation of responsibilities, readable code, minimal duplication, straightforward testing, and well-defined interfaces between components — particularly the `SyncProvider` interface that isolates storage-provider-specific logic.

---

# Availability

There is no Clyro-run backend to keep available. If a user's own Storage Provider is temporarily unreachable (their local server is off, or Drive/Dropbox is down), the extension continues functioning fully offline via its local encrypted cache, and resumes synchronization automatically once the provider is reachable again.

---

# Compatibility

Version 1.0 officially targets Chromium-based browsers. Future versions may support Firefox, Safari, and mobile platforms. The architecture should avoid assumptions that prevent future expansion.

---

# Compliance

Because Clyro holds no user accounts and operates no backend that processes personal data for regular use, its compliance surface is substantially smaller than a cloud-account product. Where applicable, Clyro should still be designed with modern privacy and security regulations in mind. Compliance requirements will be refined before public release.

---

# Product Roadmap

The Clyro roadmap is divided into multiple planned releases. Each release builds upon the previous one while maintaining backward compatibility where practical.

---

# Version 1.0 – Initial Public Release

The primary objective of Version 1.0 is to deliver a reliable, secure, local-first password manager focused on individual users, with no Clyro-run backend for regular use.

## Included Features

- Chromium browser extension, hosting the full vault UI
- First-run Storage Provider picker (Local or Cloud)
- Local Sync Server (bundled SQLite, pairing-token authenticated)
- Google Drive and Dropbox storage providers
- Master password authentication (no account)
- True zero-knowledge encryption
- Synchronization to the active storage provider, with conflict handling
- Encrypted export / import
- Website Dashboard launcher
- Password capture
- Password vault
- Vault search
- Autofill
- Optional Auto Login
- Password generator (in-vault and standalone on the website)
- Full offline access

Version 1.0 intentionally focuses on doing one thing exceptionally well: secure, self-owned password management.

---

# Version 1.x – Refinement

After the initial release, development should focus on polishing the overall experience.

Potential improvements include:

- UI and UX improvements
- Accessibility enhancements
- Faster synchronization
- Better onboarding for the Local Sync Server install/pairing flow
- Password import tools (from other managers)
- Improved diagnostics
- Performance optimizations

No major architectural changes should occur during this phase.

---

# Version 2.0 – Browser Expansion

Expand beyond Chromium-based browsers.

Planned platforms include Mozilla Firefox, Microsoft Edge, and Safari. The browser experience should remain consistent across all supported platforms.

---

# Version 3.0 – Mobile Ecosystem

Introduce mobile applications while preserving the same security guarantees and the same local-first, bring-your-own-storage model.

Potential additions:

- Android application
- iOS application
- Mobile autofill integration
- Biometric authentication
- Storage-provider synchronization identical in principle to the extension's

The mobile applications must follow the same zero-knowledge architecture as the browser extension, including the "no Clyro-run backend" property.

---

# Long-Term Vision

Clyro aims to become one of the most trusted privacy-first password managers available.

Growth should always remain aligned with the project's core principles:

- Security first
- Privacy by design
- User ownership of storage
- Simplicity
- Maintainability
- User control

Features should only be introduced if they strengthen the product without compromising these principles — in particular, without reintroducing a Clyro-run account or backend for regular use.

---

# Assumptions

The following assumptions have been made during the design of Clyro Version 1.0.

## User Assumptions

- Users have access to a modern Chromium-based browser.
- Users are willing to choose and set up a Storage Provider (self-run local server, or an existing Google/Dropbox account) at first run.
- Users understand the importance of remembering their master password.
- Users are responsible for taking their own encrypted backups.

## Technical Assumptions

- Internet connectivity is available for synchronization to Cloud storage providers (not required for Local).
- The extension maintains an encrypted local cache regardless of active provider.
- Modern browsers provide secure cryptographic APIs.
- The user's chosen Storage Provider (their own machine, or their Google/Dropbox account) remains reachable when they expect to sync.

## Security Assumptions

- The user's device is trusted while the vault is unlocked.
- TLS protects communication with cloud Storage Providers; the pairing token and Origin allowlist protect communication with the Local Sync Server.
- Encryption keys never leave the extension in plaintext.
- No Storage Provider ever gains access to decrypted vault data.

---

# Constraints

The following constraints define Version 1.0.

## Platform Constraints

Supported: Chromium-based browsers.

Not included: Firefox, Safari, native desktop applications, mobile applications.

## Product Constraints

Version 1.0 intentionally excludes:

- A Clyro-run account or backend for regular use
- A bring-your-own-database wizard for the Local Sync Server (SQLite only)
- Secure Notes
- Payment Cards
- File Attachments
- Team Vaults
- Family Plans
- Enterprise Administration
- Password Sharing
- Built-in Authenticator

These may be considered after the initial release.

## Security Constraints

The following rules are non-negotiable:

- True zero-knowledge architecture.
- Master passwords are never stored anywhere.
- Encryption keys are never persisted.
- Plaintext credentials never leave the extension.
- Plaintext vault data and the master password never cross into a web page, including Clyro's own website.
- Forgotten master passwords cannot recover encrypted vaults.
- The Local Sync Server always requires pairing-token authentication.

These constraints define the security model of Clyro and must not be compromised for convenience.

---

# Risks & Mitigation

This section identifies the primary risks associated with developing and operating Clyro, along with planned mitigation strategies.

---

## Risk 1 – Lost Vault with No Backup

### Description

Because there is no account, a user who loses their only copy of the vault — a corrupted or deleted `clyro.db` with no recent export, or a forgotten master password — cannot recover it through any support channel.

### Impact

High

### Mitigation

- Clearly educate users during first-run setup about the absence of account-based recovery.
- Prompt users to take an encrypted export soon after vault creation and periodically thereafter.
- Make export/import a first-class, easy-to-find feature rather than a buried setting.

---

## Risk 2 – Forgotten Master Password

### Description

Users may forget their master password, making their encrypted vault permanently inaccessible.

### Impact

High

### Mitigation

- Clearly educate users during vault creation.
- Require confirmation that the master password cannot be recovered.
- Encourage users to securely back up their master password separately from the vault itself.

---

## Risk 3 – Browser API Changes

### Description

Future updates to Chromium or the Chrome Extension APIs may affect extension functionality, including `externally_connectable` and `chrome.identity`.

### Impact

Medium

### Mitigation

- Follow Manifest V3 best practices.
- Keep browser-specific logic isolated.
- Regularly test against Chromium beta releases.

---

## Risk 4 – Synchronization Conflicts

### Description

The same credential may be modified on multiple devices before synchronization completes, and Google Drive has no atomic compare-and-swap to prevent a lost write.

### Impact

Low to Medium (higher on Google Drive specifically)

### Mitigation

- Use optimistic concurrency (`vaultVersion`) on every provider.
- Write a conflict copy on Google Drive version mismatch rather than overwriting.
- Allow users to manually resolve conflicts and edit credentials if necessary.

---

## Risk 5 – Storage Provider Unavailability

### Description

A user's Local Sync Server may be off, or Google Drive/Dropbox may be temporarily unreachable.

### Impact

Medium

### Mitigation

- Maintain an encrypted local vault cache regardless of active provider.
- Allow full offline vault access.
- Resume synchronization automatically when the provider becomes reachable again.

---

## Risk 6 – Security Vulnerabilities

### Description

New vulnerabilities may be discovered in dependencies, browsers, or cryptographic libraries.

### Impact

High

### Mitigation

- Keep dependencies up to date.
- Perform regular security reviews.
- Follow industry best practices for cryptography.
- Minimize the attack surface through a simple architecture with no centrally-operated account database to breach.

---

# Guiding Principle

Whenever a trade-off exists between **security** and **convenience**, Clyro will prioritize security while striving to maintain an intuitive user experience.

---

# Acceptance Criteria

The Clyro Version 1.0 release shall be considered complete when all of the following criteria have been met.

## Storage Provider Setup

- Users can complete first-run setup choosing Local or Cloud storage.
- The Local Sync Server installs and pairs with zero manual configuration.
- Google Drive and Dropbox connect successfully via OAuth.
- Users can switch storage providers via export/import.

## Vault

- Users can create an encrypted vault.
- Credentials are encrypted before leaving the extension.
- Users can search and manage stored credentials from the full-page vault tab.
- Multiple accounts for the same website are supported.

## Password Management

- New credentials can be detected and saved.
- Existing credentials can be updated.
- Duplicate detection behaves correctly.

## Autofill

- Login forms are detected correctly.
- Credential suggestions appear when focusing a login field.
- Selected credentials autofill accurately.
- Auto Login functions correctly when enabled.
- Manual login remains the default behavior.

## Password Generator

- Users can configure password generation options.
- Generated passwords use a cryptographically secure random source.
- The standalone website password generator works without any storage provider connected.

## Synchronization

- Vault changes synchronize automatically with the active Storage Provider.
- Offline changes synchronize after connectivity is restored.
- A Google Drive version conflict produces a conflict copy, never a lost write.
- The Local Sync Server rejects unpaired callers.

## Export / Import

- Export produces a valid encrypted `.clyro` file.
- Import correctly restores a vault from that file, including into a different Storage Provider than it was exported from.

## Website Dashboard

- Correctly detects installed/not-installed extension state via `GET_STATUS`.
- `OPEN_VAULT` opens the extension's vault tab.
- Never displays vault contents or an error state when the extension is simply absent.

## Security

- No Storage Provider ever stores plaintext credentials, encryption keys, or decrypts vault contents.
- Master passwords are never recoverable by anything.
- Forgotten master passwords cannot recover encrypted vaults.
- No bridge message can carry a credential, master password, or decrypted blob.

## Performance

The product should provide a responsive experience during vault unlock, autofill, password generation, vault search, and synchronization.

## Reliability

The browser extension should operate reliably during normal daily usage without frequent crashes or data inconsistencies.

---

# Glossary

This glossary defines important terms used throughout the Clyro documentation.

## Auto Login

An optional feature that automatically submits a login form after credentials have been autofilled.

## Autofill

The process of automatically inserting stored credentials into supported login forms.

## Chromium

The open-source browser project used by Google Chrome, Microsoft Edge, Brave, Opera, Vivaldi, Arc, and other Chromium-based browsers.

## Credential

A stored login record containing information such as website, username or email, password, and metadata.

## Encrypted Vault

The encrypted collection of credentials owned by a user. Only the user can decrypt the vault.

## End-to-End Encryption

A security model in which data is encrypted on the client before transmission and decrypted only by that same client. No Storage Provider ever has access to plaintext data.

## Local Sync Server

A small, self-run background application that stores the encrypted vault in a bundled SQLite database, authenticated via a pairing token. One of the two Storage Provider categories, alongside Cloud.

## Master Password

The password chosen by the user to unlock the vault and derive the encryption key. No Storage Provider ever stores or knows the master password.

## Storage Provider

The single active destination for a user's encrypted vault: Local (the Local Sync Server), Google Drive, or Dropbox. Exactly one is active at a time, implementing the shared `SyncProvider` interface.

## Vault Export / Import

The mechanism for producing and restoring an encrypted `.clyro` backup file — the only recovery path and the only way to move a vault between Storage Providers.

## True Zero-Knowledge

An architecture in which no storage provider — Clyro-run or otherwise — has any ability to read or decrypt user vault data. Only the user possesses the information required to decrypt the vault.

---

# Conclusion

Clyro is being built with a clear objective:

> Deliver a secure, local-first, true zero-knowledge password manager that prioritizes user ownership of storage, privacy, simplicity, and long-term maintainability.

This Product Requirements Document defines the scope, goals, functional requirements, non-functional requirements, constraints, and roadmap for Version 1.0 of the product.

Every implementation decision should align with the principles established in this document. Features that fall outside the defined scope should be evaluated carefully to ensure they support Clyro's long-term vision without introducing unnecessary complexity — and, in particular, without reintroducing a Clyro-run account or backend for regular use.

As the project evolves, this document should continue to serve as the primary product reference. Significant changes to product behavior, user experience, or feature scope should be reflected here before implementation begins.

By following a documentation-first approach, Clyro aims to maintain a codebase that is consistent, understandable, secure, and scalable for both human contributors and AI-assisted development.

---

# Document Status

| Field | Value |
|-------|-------|
| Document | Product Requirements Document |
| Version | 2.0.0 |
| Status | Draft (Under Review) |
| Owner | ClyroVaultSync |
| Last Reviewed | August 2026 |
| Next Review | Before Version 1.1 Planning |

---

**End of Document**
