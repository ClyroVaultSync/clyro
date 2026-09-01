import { describe, it, expect, beforeEach } from 'vitest';
import fastify from 'fastify';
import pairingRoutes from './pairing';
import { db } from '../db';

describe('Pairing Routes', () => {
  let app: ReturnType<typeof fastify>;

  beforeEach(async () => {
    db.exec('DELETE FROM pairing_tokens;');
    app = fastify();
    app.register(pairingRoutes, { prefix: '/api/v1/pairing' });
    await app.ready();
  });

  describe('POST /initiate', () => {
    it('issues a pairing token', async () => {
      const response = await app.inject({ method: 'POST', url: '/api/v1/pairing/initiate' });

      expect(response.statusCode).toBe(200);
      const token = response.json().data.pairingToken;
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(20);
    });

    it('stores only a hash of the issued token, never the raw token', async () => {
      const response = await app.inject({ method: 'POST', url: '/api/v1/pairing/initiate' });
      const token = response.json().data.pairingToken;

      const rows = db.prepare('SELECT token_hash FROM pairing_tokens').all() as { token_hash: string }[];
      expect(rows).toHaveLength(1);
      expect(rows[0].token_hash).not.toBe(token);
    });

    it('each call issues a distinct token', async () => {
      const first = await app.inject({ method: 'POST', url: '/api/v1/pairing/initiate' });
      const second = await app.inject({ method: 'POST', url: '/api/v1/pairing/initiate' });

      expect(first.json().data.pairingToken).not.toBe(second.json().data.pairingToken);
    });
  });
});
