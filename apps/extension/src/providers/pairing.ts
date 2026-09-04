import { setLocalConfig } from './local';

/**
 * Runs once during first-run Local setup: exchanges nothing but the server's
 * own URL for a pairing token (POST /api/v1/pairing/initiate, unauthenticated
 * on a localhost deployment per docs/API.md), then stores both for LocalProvider.
 */
export async function initiatePairing(baseUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${baseUrl}/api/v1/pairing/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Fastify's JSON parser rejects an empty body sent alongside this content-type.
      body: JSON.stringify({}),
    });
    const body = await res.json();

    if (!body?.success || !body?.data?.pairingToken) {
      return { success: false, error: body?.error?.message || 'Failed to pair with the Local Sync Server.' };
    }

    await setLocalConfig({ baseUrl, pairingToken: body.data.pairingToken });
    return { success: true };
  } catch {
    return { success: false, error: 'Could not reach the Local Sync Server. Is it running?' };
  }
}
