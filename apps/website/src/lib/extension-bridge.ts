/**
 * The website's half of the extension bridge (docs/API.md → "Extension ↔ Website
 * Bridge"). This is the only channel between the site and the Clyro extension,
 * and it carries **status only** — never a credential, master password, vault
 * key, or decrypted blob. The message union in `@clyro/shared-types` has no
 * field capable of carrying one; do not add one here.
 *
 * The extension is built separately (docs/EXTENSION_HANDOFF.md) and may not
 * exist on a given machine at all, so every failure mode — no Chromium, no
 * extension, extension present but no handler, malformed reply, hang — collapses
 * to the same honest answer: `{ installed: false }`. Callers never see an error
 * state they'd have to distinguish, because the product answer is identical in
 * all of them: prompt the visitor to install it.
 */

import type {
  BridgeMessage,
  ExtensionStatus,
  OpenVaultResponse,
  SyncProviderId
} from '@clyro/shared-types';
import { siteConfig } from './site-config';

/** Chrome answers a message to an unknown extension ID almost instantly, so this
 * only guards against a handler that accepts the message and never replies. */
const BRIDGE_TIMEOUT_MS = 1200;

const NOT_INSTALLED: ExtensionStatus = { installed: false };

const PROVIDER_IDS: readonly SyncProviderId[] = ['local', 'google-drive', 'dropbox'];

/** `chrome` is undefined on non-Chromium browsers, during SSR, and on Chromium
 * when no installed extension lists this origin in `externally_connectable`. */
function canReachExtension(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    typeof chrome.runtime !== 'undefined' &&
    typeof chrome.runtime.sendMessage === 'function'
  );
}

/**
 * Sends one bridge message and resolves with the raw reply, or `null` if the
 * extension could not be reached for any reason. Never rejects.
 */
function send(message: BridgeMessage): Promise<unknown> {
  if (!canReachExtension()) return Promise.resolve(null);

  return new Promise(resolve => {
    let settled = false;
    const finish = (value: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };

    const timer = setTimeout(() => finish(null), BRIDGE_TIMEOUT_MS);

    try {
      chrome.runtime.sendMessage(siteConfig.extensionId, message, response => {
        // Must be read inside the callback — leaving it unread makes Chrome log
        // an "Unchecked runtime.lastError" warning on every miss, which is the
        // normal case here (no extension installed).
        if (chrome.runtime.lastError) {
          finish(null);
          return;
        }
        finish(response);
      });
    } catch {
      // sendMessage throws synchronously if the extension ID is malformed.
      finish(null);
    }
  });
}

/**
 * Narrows an untrusted reply to `ExtensionStatus`. The payload crosses a process
 * boundary from code this page does not control, so every field is checked
 * rather than cast — a malformed reply is treated as "not installed" instead of
 * being rendered.
 */
function parseStatus(raw: unknown): ExtensionStatus {
  if (typeof raw !== 'object' || raw === null) return NOT_INSTALLED;

  const reply = raw as Record<string, unknown>;
  if (reply.installed !== true) return NOT_INSTALLED;
  if (typeof reply.locked !== 'boolean') return NOT_INSTALLED;

  const provider = reply.provider;
  const providerIsValid = provider === null || PROVIDER_IDS.includes(provider as SyncProviderId);
  if (!providerIsValid) return NOT_INSTALLED;

  return {
    installed: true,
    provider: provider as SyncProviderId | null,
    locked: reply.locked
  };
}

/** Asks the extension whether it is installed, which storage provider is active,
 * and whether the vault is currently locked. Resolves `{ installed: false }`
 * whenever the extension cannot be reached. */
export async function getExtensionStatus(): Promise<ExtensionStatus> {
  return parseStatus(await send({ type: 'GET_STATUS' }));
}

/**
 * Asks the extension to open its own full-page vault tab. It has to work this
 * way round: a web page cannot navigate to a `chrome-extension://` URL, so the
 * extension must open the tab itself via `chrome.tabs.create`.
 *
 * Resolves `false` if the extension did not open it — caller decides what to
 * show, since "not installed" and "declined" are the same outcome to a visitor.
 */
export async function openVault(): Promise<boolean> {
  const raw = await send({ type: 'OPEN_VAULT' });
  if (typeof raw !== 'object' || raw === null) return false;
  return (raw as OpenVaultResponse).opened === true;
}
