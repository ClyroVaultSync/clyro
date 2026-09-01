import { describe, it, expect, beforeEach } from 'vitest';
import fastify from 'fastify';
import vaultRoutes from './vault';
import { requirePairing } from '../plugins/auth';
import { createPairingToken } from '../services/pairingTokens';
import { db } from '../db';

const ALLOWED_ORIGIN = 'http://localhost:3000';

async function buildApp() {
  const app = fastify();
  app.register(async (instance) => {
    instance.addHook('preHandler', requirePairing);
    instance.register(vaultRoutes, { prefix: '/api/v1/vault' });
  });
  await app.ready();
  return app;
}

describe('Vault Routes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let token: string;

  const vaultPayload = {
    encryptedVault: 'encrypted-data',
    vaultSalt: 'test-salt',
    vaultVersion: 1,
  };

  function authHeaders() {
    return { origin: ALLOWED_ORIGIN, authorization: `Bearer ${token}` };
  }

  function createVault(overrides: Partial<typeof vaultPayload> = {}) {
    return app.inject({
      method: 'POST',
      url: '/api/v1/vault',
      headers: authHeaders(),
      payload: { ...vaultPayload, ...overrides },
    });
  }

  beforeEach(async () => {
    db.exec('DELETE FROM vault; DELETE FROM pairing_tokens;');
    token = createPairingToken();
    app = await buildApp();
  });

  describe('authentication', () => {
    it('rejects a request with no pairing token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/vault',
        headers: { origin: ALLOWED_ORIGIN },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe('UNAUTHORIZED');
    });

    it('rejects a request with an invalid pairing token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/vault',
        headers: { origin: ALLOWED_ORIGIN, authorization: 'Bearer not-a-real-token' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('rejects a request from a disallowed origin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/vault',
        headers: { origin: 'https://evil.example', authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /', () => {
    it('should return vault successfully', async () => {
      await createVault();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/vault',
        headers: authHeaders(),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data.vaultVersion).toBe(1);
      expect(response.json().data.vaultSalt).toBe('test-salt');
    });

    it('should return 404 if no vault exists', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/vault',
        headers: authHeaders(),
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /metadata', () => {
    it('should return metadata successfully', async () => {
      await createVault();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/vault/metadata',
        headers: authHeaders(),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data.vaultVersion).toBe(1);
    });

    it('should return 404 if no vault exists', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/vault/metadata',
        headers: authHeaders(),
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /', () => {
    it('should create a vault successfully', async () => {
      const response = await createVault();

      expect(response.statusCode).toBe(201);
      expect(response.json().data.vaultVersion).toBe(1);
    });

    it('should return 422 if vaultSalt is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/vault',
        headers: authHeaders(),
        payload: { encryptedVault: 'encrypted-data', vaultVersion: 1 },
      });

      expect(response.statusCode).toBe(422);
      expect(response.json().error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 409 if vault already exists', async () => {
      await createVault();
      const response = await createVault();

      expect(response.statusCode).toBe(409);
      expect(response.json().error.code).toBe('CONFLICT');
    });
  });

  describe('PUT /', () => {
    it('should update vault successfully', async () => {
      await createVault();

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/vault',
        headers: authHeaders(),
        payload: { encryptedVault: 'new-encrypted-data', vaultVersion: 2 },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data.vaultVersion).toBe(2);
      expect(response.json().data.encryptedVault).toBe('new-encrypted-data');
    });

    it('should return 409 if vault version is stale/equal', async () => {
      await createVault();

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/vault',
        headers: authHeaders(),
        payload: { encryptedVault: 'new-encrypted-data', vaultVersion: 1 },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json().error.code).toBe('CONFLICT');
      expect(response.json().error.details.serverVersion).toBe(1);
    });

    it('should return 404 if no vault exists', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/vault',
        headers: authHeaders(),
        payload: { encryptedVault: 'new-encrypted-data', vaultVersion: 2 },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 422 for invalid body', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/vault',
        headers: authHeaders(),
        payload: { vaultVersion: 'not-a-number', encryptedVault: 'test' },
      });

      expect(response.statusCode).toBe(422);
    });
  });

  describe('DELETE /', () => {
    it('should delete vault successfully', async () => {
      await createVault();

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/vault',
        headers: authHeaders(),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().success).toBe(true);
    });

    it('should return 404 if no vault exists', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/vault',
        headers: authHeaders(),
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
