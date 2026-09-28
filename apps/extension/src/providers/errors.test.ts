import { describe, it, expect, vi } from 'vitest';
import { fetchOrUnreachable, errorCode, ProviderUnreachableError, NETWORK_ERROR } from './errors';

function respondWith(status: number) {
  global.fetch = vi.fn().mockResolvedValue({ status, ok: status >= 200 && status < 300 }) as unknown as typeof fetch;
}

describe('fetchOrUnreachable()', () => {
  it('passes an ordinary response straight through, including client errors', async () => {
    for (const status of [200, 401, 404, 409]) {
      respondWith(status);
      expect((await fetchOrUnreachable('https://example.test', undefined, 'Test')).status).toBe(status);
    }
  });

  it('treats a network failure as unreachable', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch;

    await expect(fetchOrUnreachable('https://example.test', undefined, 'Dropbox')).rejects.toThrow(
      new ProviderUnreachableError('Could not reach Dropbox.')
    );
  });

  it('treats a timeout as unreachable, and always sets one', async () => {
    global.fetch = vi.fn().mockRejectedValue(new DOMException('timed out', 'TimeoutError')) as unknown as typeof fetch;

    await expect(fetchOrUnreachable('https://example.test', { method: 'POST' }, 'Test')).rejects.toBeInstanceOf(ProviderUnreachableError);
    expect(fetch).toHaveBeenCalledWith(
      'https://example.test',
      expect.objectContaining({ method: 'POST', signal: expect.any(AbortSignal) })
    );
  });

  it('treats a service that is down or overloaded as unreachable', async () => {
    for (const status of [500, 503, 429]) {
      respondWith(status);
      await expect(fetchOrUnreachable('https://example.test', undefined, 'Google Drive')).rejects.toThrow(
        `Google Drive is temporarily unavailable (${status}).`
      );
    }
  });
});

describe('errorCode()', () => {
  it('maps unreachability to NETWORK_ERROR and anything else to the fallback', () => {
    expect(errorCode(new ProviderUnreachableError('x'), 'DRIVE_ERROR')).toBe(NETWORK_ERROR);
    expect(errorCode(new Error('x'), 'DRIVE_ERROR')).toBe('DRIVE_ERROR');
  });
});
