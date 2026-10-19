import { getDomain } from 'tldts';

/**
 * What counts as "the same site", shared by autofill, the save-password prompt
 * and imports. VaultItem.url may be a bare hostname or a full URL, so both are
 * reduced to a hostname, then to its registrable domain from the Public Suffix
 * List: accounts.steelseries.com and steelseries.com are the same site, while
 * amazon.co.uk and evil.co.uk are not. Private suffixes count too, so
 * alice.github.io and bob.github.io stay apart.
 */

/** Strips a leading "www." so "www.example.com" and "example.com" are treated as the same site. */
export function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/^www\./, '');
}

/** VaultItem.url may be a bare hostname or a full URL; extracts a comparable hostname either way. */
export function extractDomain(url: string): string {
  try {
    return normalizeHost(new URL(url).hostname);
  } catch {
    return normalizeHost(url.split('/')[0]);
  }
}

/** The registrable domain of a URL or hostname, or the hostname itself when it has none (an IP address, localhost). */
export function siteOf(urlOrHost: string): string {
  const host = extractDomain(urlOrHost);
  return getDomain(host, { allowPrivateDomains: true }) ?? host;
}

/** An item with no website address matches no page. */
export function domainMatches(itemUrl: string, domain: string): boolean {
  const site = siteOf(itemUrl);
  return site !== '' && site === siteOf(domain);
}
