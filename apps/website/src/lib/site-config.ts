/**
 * Every externally-facing URL and identifier the site depends on, in one place.
 *
 * Several of these are deliberate placeholders (see PLACEHOLDERS below) — keeping
 * them here rather than inline in pages means the deploy-time swap is one file,
 * and it's obvious at a glance what is still unresolved.
 *
 * Each reads a NEXT_PUBLIC_* env var with a committed fallback, so a deployment
 * can override without a code change. They must be referenced as full literals
 * (`process.env.NEXT_PUBLIC_X`, never a computed key) — Next inlines them at
 * build time by textual substitution.
 */

/** Stable extension ID, derived from the public `key` committed to
 * apps/extension/manifest.json. The bridge in `extension-bridge.ts` targets it
 * directly, so it must stay in sync with the manifest — see
 * docs/EXTENSION_HANDOFF.md, which forbids regenerating it. */
const EXTENSION_ID = process.env.NEXT_PUBLIC_CLYRO_EXTENSION_ID || 'cdaicnajdmjjdmghjblobeegdbdniiif';

const GITHUB_REPO = process.env.NEXT_PUBLIC_CLYRO_GITHUB_URL || 'https://github.com/ClyroVaultSync/clyro';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://clyro.app';

/**
 * PLACEHOLDERS — not real destinations yet:
 *   - `chromeWebStoreUrl`: no extension listing is published. Points at the Web
 *     Store homepage so the button isn't dead, not at a real Clyro listing.
 *   - `localServerDownloadUrl`: the Local Sync Server (Phase 5) doesn't exist.
 *     Empty string means "no download yet" and callers render a disabled control
 *     rather than a link to nowhere.
 *   - `siteUrl`: clyro.app is not a registered domain. It matches the
 *     `externally_connectable` placeholder in apps/extension/manifest.json; both
 *     must be swapped together at deploy time.
 */
export const siteConfig = {
  name: 'Clyro',
  description:
    'A local-first, zero-knowledge password manager with bring-your-own-storage sync. No account, no Clyro server — your vault lives where you choose.',
  siteUrl: SITE_URL,

  extensionId: EXTENSION_ID,
  chromeWebStoreUrl:
    process.env.NEXT_PUBLIC_CHROME_WEBSTORE_URL || 'https://chromewebstore.google.com/',
  localServerDownloadUrl: process.env.NEXT_PUBLIC_LOCAL_SERVER_DOWNLOAD_URL || '',

  githubUrl: GITHUB_REPO,
  contributingUrl: `${GITHUB_REPO}/blob/main/docs/CONTRIBUTING.md`,
  issuesUrl: `${GITHUB_REPO}/issues`,
  securityPolicyUrl: `${GITHUB_REPO}/blob/main/docs/SECURITY.md`
} as const;
