/**
 * Every provider sorts its failures into two kinds: "the storage couldn't be
 * reached right now" and everything else (bad credentials, a missing vault, a
 * version conflict). vaultManager keeps a change queued on this device for the
 * first kind and reports the second, so the distinction has to be made the same
 * way everywhere. See docs/ARCHITECTURE.md "Offline Synchronization".
 */

/** SyncResult error code for "unreachable right now". A plain string, so packages/shared-types stays untouched. */
export const NETWORK_ERROR = 'NETWORK_ERROR';

/** Thrown (rather than returned) by the paths that throw, such as getVault(). */
export class ProviderUnreachableError extends Error {}

/**
 * Long enough for a slow upload of a small vault, short enough that a
 * connection which hangs rather than fails reads as offline, instead of as a
 * Save button that never finishes.
 */
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * fetch(), except that anything meaning "try again later" throws
 * ProviderUnreachableError: no network, a timeout, or the service answering that
 * it is overloaded or down (5xx, 429). Any other response is returned for the
 * caller to judge, exactly as fetch() would.
 */
export async function fetchOrUnreachable(url: string, init: RequestInit | undefined, serviceName: string): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), ...init });
  } catch {
    throw new ProviderUnreachableError(`Could not reach ${serviceName}.`);
  }

  if (res.status >= 500 || res.status === 429) {
    throw new ProviderUnreachableError(`${serviceName} is temporarily unavailable (${res.status}).`);
  }
  return res;
}

/** The SyncResult error code for a caught error: NETWORK_ERROR if it was unreachability, `otherwise` if not. */
export function errorCode(error: unknown, otherwise: string): string {
  return error instanceof ProviderUnreachableError ? NETWORK_ERROR : otherwise;
}
