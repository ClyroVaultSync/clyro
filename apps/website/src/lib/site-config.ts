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
 * directly, so it must stay in sync with the manifest. Never regenerate the
 * manifest key: that would change this ID. */
const EXTENSION_ID = process.env.NEXT_PUBLIC_CLYRO_EXTENSION_ID || 'cdaicnajdmjjdmghjblobeegdbdniiif';

const GITHUB_REPO = process.env.NEXT_PUBLIC_CLYRO_GITHUB_URL || 'https://github.com/ClyroVaultSync/clyro';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://clyrovault.pages.dev';

/** Files attached to the current GitHub Release. The tag fixes their URLs, so the
 * fallbacks below are committed and a deployment needs no env var for them. */
const RELEASE_DOWNLOADS = `${GITHUB_REPO}/releases/download/v1.0.0`;

/**
 * Downloads come from the GitHub Release: `localServerDownloadUrl` is the Local
 * Sync Server's Windows installer, and `extensionDownloadUrl` is the extension as
 * a zip for chrome://extensions → Load unpacked (see extension-install.ts).
 *
 * PLACEHOLDER — not a real destination yet:
 *   - `chromeWebStoreUrl`: no extension listing is published. Points at the Web
 *     Store homepage, and is kept for when a real Clyro listing exists.
 *
 * `siteUrl` is real: the site is deployed on Cloudflare Pages at
 * clyrovault.pages.dev. It must stay listed in `externally_connectable` in
 * apps/extension/manifest.json — change or add a domain in both places together.
 */
export const siteConfig = {
  name: 'Clyro',
  description:
    'A local-first, zero-knowledge password manager with bring-your-own-storage sync. No account, no Clyro server — your vault lives where you choose.',
  siteUrl: SITE_URL,

  extensionId: EXTENSION_ID,
  chromeWebStoreUrl:
    process.env.NEXT_PUBLIC_CHROME_WEBSTORE_URL || 'https://chromewebstore.google.com/',
  localServerDownloadUrl:
    process.env.NEXT_PUBLIC_LOCAL_SERVER_DOWNLOAD_URL ||
    `${RELEASE_DOWNLOADS}/ClyroLocalSyncServer-Setup-1.0.0.exe`,
  extensionDownloadUrl:
    process.env.NEXT_PUBLIC_EXTENSION_DOWNLOAD_URL || `${RELEASE_DOWNLOADS}/Clyro-Extension-1.0.0.zip`,

  githubUrl: GITHUB_REPO,
  contributingUrl: `${GITHUB_REPO}/blob/main/docs/CONTRIBUTING.md`,
  issuesUrl: `${GITHUB_REPO}/issues`,
  securityPolicyUrl: `${GITHUB_REPO}/blob/main/docs/SECURITY.md`
} as const;
