\# Contributing to Clyro



Version: 1.0.0



Status: Draft



\---



\# Welcome



Thank you for your interest in contributing to Clyro.



Clyro is a cloud-first, zero-knowledge password manager focused on security, simplicity, and privacy.



Every contribution should align with these principles.



\---



\# Project Philosophy



The project follows the philosophy:



Design First



↓



Build Second



↓



Optimize Third



Architecture decisions must be documented before implementation.



\---



\# Core Principles



Contributors should prioritize:



\- Security over convenience

\- Simplicity over unnecessary complexity

\- Readability over clever code

\- Maintainability over shortcuts

\- Privacy by design

\- Zero-knowledge architecture



\---



\# Before Writing Code



Before implementing any feature:



\- Read the PRD.

\- Read the Architecture document.

\- Read the Database document.

\- Read the API document.

\- Review PROJECT\_CONTEXT.md.



Implementation should never contradict documented decisions.



\---



\# Branching Strategy



Feature work should be performed using feature branches.



Example:



feature/browser-extension



feature/backend-auth



feature/vault-sync



feature/ui-settings



Each feature should be reviewed before merging.



\---



\# Commit Messages



Use clear, descriptive commit messages.



Examples:



feat: implement vault synchronization



fix: resolve login token refresh issue



docs: update API documentation



refactor: simplify encryption workflow



Avoid vague commit messages such as:



update



fix



changes



\---



\# Pull Requests



Each pull request should:



\- Solve one logical problem.

\- Include a clear description.

\- Explain architectural decisions when necessary.

\- Update documentation if behavior changes.



\---



\# Documentation



Documentation is considered part of the project.



Whenever architecture, database design, or APIs change:



\- Update the relevant document.

\- Update PROJECT\_CONTEXT.md.

\- Ensure consistency across all documentation.



\---



\# Code Style



General expectations:



\- Write readable code.

\- Prefer descriptive names.

\- Keep functions focused.

\- Avoid unnecessary complexity.

\- Remove dead code.

\- Comment only when necessary.



\---



\# Security Guidelines



Never:



\- Log plaintext passwords.

\- Store decrypted vault contents.

\- Store encryption keys.

\- Expose sensitive information in API responses.

\- Bypass authentication or authorization.



All cryptographic operations must occur on trusted client devices.



\---



\# Reporting Issues



When reporting bugs, include:



\- Steps to reproduce

\- Expected behavior

\- Actual behavior

\- Browser version

\- Operating system

\- Relevant logs (if available)



\---



\# Future Contributors



As the project grows:



\- Keep documentation updated.

\- Preserve the zero-knowledge architecture.

\- Avoid introducing breaking changes without discussion.

\- Favor long-term maintainability.



\---



\# Conclusion



Every contribution should improve Clyro while maintaining its core principles of:



\- Security

\- Privacy

\- Simplicity

\- Maintainability

\- Zero-knowledge design

