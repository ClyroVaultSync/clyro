'use client';

import { useState } from 'react';
import type { ExtensionStatus } from '@clyro/shared-types';

/**
 * Stand-in for the real `chrome.runtime.sendMessage` GET_STATUS bridge call
 * (docs/ARCHITECTURE.md "Extension <-> Website Bridge") — that call needs the
 * extension's real `externally_connectable` production origin, which doesn't
 * exist yet (Phase 4/5). Until then, Phase 1 UI is built against the real
 * `ExtensionStatus` type with mock, locally-toggleable data so every render
 * state (not installed / installed-no-provider / installed-with-provider) is
 * reviewable now. Swap this hook's body for a real bridge call in Phase 4/5 —
 * every caller already consumes `ExtensionStatus`, so nothing downstream changes.
 */
export function useExtensionStatus(initial: ExtensionStatus = { installed: false }) {
  const [status, setStatus] = useState<ExtensionStatus>(initial);
  return { status, setStatus };
}
