# Contributing to Clyro

Thanks for wanting to help. Clyro is a free, open-source, zero-knowledge password manager for Chrome. Your vault is encrypted inside the extension and stored wherever you choose, and nobody else can read it.

Clyro has one maintainer, so small, focused contributions are the quickest to review. A clear bug report helps just as much as a pull request.

## Ways to help

| You want to… | Do this |
|---|---|
| Report a security problem | Report it **privately**. See [Reporting a security problem](#reporting-a-security-problem) |
| Report a bug | [Open an issue](https://github.com/ClyroVaultSync/clyro/issues/new) |
| Suggest a feature | Open an issue that describes the problem first |
| Fix a typo or an unclear doc | Send a pull request. No issue needed |
| Change code | Open an issue for anything bigger than a small fix, then send a pull request |

## Reporting a security problem

**Please don't open a public issue.** Report it privately on the [security advisory form](https://github.com/ClyroVaultSync/clyro/security/advisories/new). You can also reach it from the repo's **Security** tab → **Report a vulnerability**. Only you and the maintainer can see the report, so a fix can ship before the details go public.

Tell us:

- what you did,
- what you expected to happen,
- what happened instead, and
- how bad you think it is: what could an attacker read, change or delete?

There's no bug bounty, because Clyro is an unfunded open-source project. Every report is still taken seriously, and you'll be credited in the fix unless you'd rather not be.

## Reporting a bug

First, search the [open issues](https://github.com/ClyroVaultSync/clyro/issues), because someone may have reported it already. If nobody has, open a new issue with:

- **Steps to reproduce:** what you clicked or typed, in order.
- **Expected:** what should have happened.
- **Actual:** what happened instead. Screenshots help.
- **Versions:**
  - the extension version, from `chrome://extensions`;
  - the Local Sync Server version if you use it, from Windows **Settings → Apps → Installed apps**;
  - your Chrome version;
  - your operating system.
- **Storage:** Local Sync Server, Google Drive or Dropbox.
- **Errors:** anything red in the console.
  - For the background worker, open `chrome://extensions`, find Clyro and click **service worker**.
  - For the popup or the vault page, right-click it and choose **Inspect**.

> [!CAUTION]
> Never paste a password, your master password, a vault export or a pairing token into an issue. That includes old ones and test ones. Issues are public and permanent. If a log line contains one of these, cut it out or replace it with `[redacted]`.

## Suggesting a feature

Open an issue that starts with the **problem**, not the solution: what you were trying to do, and where Clyro got in the way. For anything bigger than a small fix, wait for a reply before you start writing code, so nobody's work goes to waste.

Some things are left out on purpose:

- **A Clyro account or a Clyro-run server.** Clyro has no backend, and that's the point.
- **Password recovery.** Nobody holds a key that could reset your master password. That includes us.
- **Anything that moves decrypted data out of the extension**, even to your own storage.

Other things aren't in v1 but may come later: mobile apps, non-Chromium browsers, sharing and team vaults, and secure notes or card storage. The full list is under *Non-Goals* in [PRD.md](PRD.md).

## Setting up

You need **Node 22.13+** (for `node:sqlite`), **pnpm 11** and Chrome.

1. [Fork the repo](https://github.com/ClyroVaultSync/clyro/fork), then clone your fork.
2. Install and start everything:

   ```bash
   pnpm install
   pnpm dev   # extension (Vite, :5173), website (:3000) and Local Sync Server (:47821), together
   ```

3. In `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and choose `apps/extension/dist`. It reloads as you edit.

> [!NOTE]
> The installed Clyro Local Sync Server also uses port **47821**. If you have it installed, quit it from its tray icon first, or start the dev server with a different `PORT`.

The README's [Run it](../README.md#-run-it-developers) section covers how to build the Windows installer.

### Where things live

| Folder | What's in it |
|---|---|
| `apps/extension/` | The Chrome extension (Manifest V3): vault UI, autofill, storage providers, offline queue |
| `apps/website/` | The Next.js site: a static launcher that never sees what's in your vault |
| `apps/backend/` | The Local Sync Server (Fastify + SQLite), the Windows tray app and the installer |
| `packages/crypto/` | Argon2id key derivation and XChaCha20-Poly1305 encryption |
| `packages/shared-types/` | The `SyncProvider` interface and the website ↔ extension bridge types |
| `packages/config/` | Shared ESLint, Prettier and TypeScript presets |
| `docs/` | The specs: [architecture](ARCHITECTURE.md), [security](SECURITY.md), [API](API.md) and [database](DATABASE.md) |

## Making a change

- **Branch from `main`** in your fork. Name the branch after the change, like `fix-autofill-in-iframes`.
- **Make one change per pull request.** A bug fix and an unrelated refactor belong in two pull requests.
- **Read the spec first.** Before you change how something behaves, read the doc in `docs/` that covers it. If your change makes that doc wrong, update the doc in the same pull request. The docs are part of the project, not an afterthought.
- **Write code the next person can read.**
  - Use clear names and small functions.
  - Write comments that explain *why*, not *what*.
  - Don't leave dead code behind.
  - Formatting follows the shared ESLint and Prettier presets in `packages/config`.
- **Add a test** when you fix a bug or change behavior. Tests use [Vitest](https://vitest.dev) and sit next to the code they cover as `*.test.ts`. For examples, see `apps/extension/src/providers/` and `packages/crypto/src/`.
- **Explain any new dependency** in the pull request. In a password manager, every package is code that runs next to your secrets.

## The zero-knowledge rules

These rules are what make Clyro Clyro. A pull request that breaks one won't be merged, however useful it is otherwise.

1. **Secrets never leave the extension.** Your master password, the vault key and decrypted logins never reach the website, the Local Sync Server, Google Drive, Dropbox or any log. That applies to debug code too.
2. **Storage only sees the sealed vault.** Every storage provider gets the encrypted blob and its version number, and nothing more.
3. **The website bridge carries status only.** None of the message types in `packages/shared-types` has a field that could hold a secret. Keep it that way.
4. **Use `packages/crypto`.** Don't write your own cryptography. Don't replace Argon2id or XChaCha20-Poly1305 without discussing it in an issue first.
5. **Don't loosen the Local Sync Server's checks.** Every vault request needs the pairing token and an allowed Origin.

[SECURITY.md](SECURITY.md) explains the model and the reasoning behind each rule.

## Before you open a pull request

Run these from the repo root. All three should pass:

```bash
pnpm lint       # ESLint across every package
pnpm -r test    # every test in the monorepo
pnpm build      # builds every package, and type-checks the extension
```

If your change affects something you can see, try it by hand too:

- load the extension and click through what you changed;
- if you touched the website, check it at `localhost:3000`.

## Commit messages

- Write one short sentence, in the imperative, that says what the change does.
- Start it with a capital letter.
- Don't add a prefix like `feat:`, and don't end it with a full stop.
- If the *why* isn't obvious, explain it in a body after a blank line.

✅ Good, from this repo's history:

```
Retry vault writes on conflict by re-applying the change
Keep the Local setup stepper from covering the page heading
Add Dropbox as a working SyncProvider
```

❌ Too vague to help anyone later: `update`, `fix`, `changes`, `wip`.

## Pull requests

In the description, include:

- **What and why:** what changed, and what problem it solves. Link the issue, for example `Fixes #12`.
- **How you tested it:** the commands you ran and what you clicked.
- **Screenshots** for anything visual, before and after.
- **Docs:** which specs you updated, or why none needed it.

Every merge to `main` updates the live site, [clyrovault.pages.dev](https://clyrovault.pages.dev), within a couple of minutes, so `main` must always work. You may be asked for changes before a merge. That's a normal part of review, not a rejection.

## License

Clyro is [MIT-licensed](../LICENSE). By contributing, you agree that your contributions are released under the same license.
