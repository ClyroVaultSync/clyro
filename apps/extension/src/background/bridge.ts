import { isVaultUnlocked } from './vaultManager';
import { getActiveProviderId } from '../providers';
import type { BridgeMessage, GetStatusResponse, OpenVaultResponse } from '@clyro/shared-types';

/**
 * The website ↔ extension bridge, frozen per docs/EXTENSION_HANDOFF.md §5.
 * Status only, never secrets — this listener must never gain a case that
 * returns anything beyond GetStatusResponse/OpenVaultResponse.
 */
async function buildStatus(): Promise<GetStatusResponse> {
  const provider = await getActiveProviderId();
  const locked = !(await isVaultUnlocked());
  return { installed: true, provider, locked };
}

if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessageExternal) {
  chrome.runtime.onMessageExternal.addListener((message: BridgeMessage, _sender, sendResponse) => {
    if (message?.type === 'GET_STATUS') {
      void buildStatus().then(sendResponse);
      return true; // required: keeps the channel open for the async reply
    }

    if (message?.type === 'OPEN_VAULT') {
      void chrome.tabs
        .create({ url: chrome.runtime.getURL('vault.html') })
        .then(() => sendResponse({ opened: true } satisfies OpenVaultResponse))
        .catch(() => sendResponse({ opened: false } satisfies OpenVaultResponse));
      return true;
    }

    return false; // unknown message: no reply
  });
}
