'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExtensionStatus } from '@clyro/shared-types';
import { getExtensionStatus } from '../lib/extension-bridge';

/**
 * Live extension status via the `GET_STATUS` bridge call (src/lib/extension-bridge.ts).
 *
 * Re-checks when the tab regains focus, because the two things this reports —
 * which storage provider is active, and whether the vault is locked — are both
 * changed from inside the extension, in a different tab or popup. Without that,
 * a visitor who unlocks their vault and comes back would still see "Locked".
 */
export function useExtensionStatus() {
  const [status, setStatus] = useState<ExtensionStatus>({ installed: false });
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    const next = await getExtensionStatus();
    if (mounted.current) {
      setStatus(next);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();

    const onFocus = () => {
      if (document.visibilityState === 'visible') void refresh();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      mounted.current = false;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [refresh]);

  return { status, loading, refresh, setStatus };
}
