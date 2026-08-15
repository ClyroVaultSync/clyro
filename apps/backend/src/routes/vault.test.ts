import { describe, it, expect, vi, beforeEach } from 'vitest';
import fastify from 'fastify';
import vaultRoutes from './vault';
import { prisma } from '../db';

vi.mock('../db', () => ({
  prisma: {
    vault: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('Vault Routes', () => {
  let app: ReturnType<typeof fastify>;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = fastify();
    app.register(vaultRoutes, { prefix: '/api/v1/vault' });
    await app.ready();
  });

  const mockVault = {
    id: 'vault-1',
    encryptedVault: 'encrypted-data',
    vaultSalt: 'test-salt',
    vaultVersion: 15,
    lastModified: new Date('2026-07-24T15:00:00.000Z'),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-24T15:00:00.000Z'),
  };

  describe('GET /', () => {
    it('should return vault successfully', async () => {
      vi.mocked(prisma.vault.findFirst).mockResolvedValue(mockVault as never);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/vault',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data.vaultVersion).toBe(15);
      expect(prisma.vault.findFirst).toHaveBeenCalledWith();
    });

    it('should return 404 if no vault exists', async () => {
      vi.mocked(prisma.vault.findFirst).mockResolvedValue(null as never);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/vault',
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /metadata', () => {
    it('should return metadata successfully', async () => {
      vi.mocked(prisma.vault.findFirst).mockResolvedValue({
        vaultVersion: 15,
        lastModified: mockVault.lastModified,
      } as never);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/vault/metadata',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data.vaultVersion).toBe(15);
      expect(response.json().data.lastModified).toBe(mockVault.lastModified.toISOString());
    });

    it('should return 404 if no vault exists', async () => {
      vi.mocked(prisma.vault.findFirst).mockResolvedValue(null as never);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/vault/metadata',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /', () => {
    it('should create a vault successfully', async () => {
      vi.mocked(prisma.vault.findFirst).mockResolvedValue(null as never);
      vi.mocked(prisma.vault.create).mockResolvedValue(mockVault as never);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/vault',
        payload: {
          encryptedVault: 'encrypted-data',
          vaultSalt: 'test-salt',
          vaultVersion: 1,
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().data.vaultVersion).toBe(15); // Returns mocked vault
      expect(prisma.vault.create).toHaveBeenCalledWith({
        data: {
          encryptedVault: 'encrypted-data',
          vaultSalt: 'test-salt',
          vaultVersion: 1,
        },
      });
    });

    it('should return 422 if vaultSalt is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/vault',
        payload: {
          encryptedVault: 'encrypted-data',
          vaultVersion: 1,
          // Missing vaultSalt
        },
      });

      expect(response.statusCode).toBe(422);
      expect(response.json().error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 409 if vault already exists', async () => {
      vi.mocked(prisma.vault.findFirst).mockResolvedValue(mockVault as never);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/vault',
        payload: {
          encryptedVault: 'encrypted-data',
          vaultSalt: 'test-salt',
          vaultVersion: 1,
        },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json().error.code).toBe('CONFLICT');
    });

    it('should return 422 for invalid body', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/vault',
        payload: {
          vaultVersion: 1,
          // Missing encryptedVault
        },
      });

      expect(response.statusCode).toBe(422);
      expect(response.json().error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /', () => {
    it('should update vault successfully', async () => {
      vi.mocked(prisma.vault.findFirst).mockResolvedValue(mockVault as never);
      const updatedVault = { ...mockVault, vaultVersion: 16 };
      vi.mocked(prisma.vault.update).mockResolvedValue(updatedVault as never);

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/vault',
        payload: {
          encryptedVault: 'new-encrypted-data',
          vaultVersion: 16,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data.vaultVersion).toBe(16);
      expect(prisma.vault.update).toHaveBeenCalledWith({
        where: { id: mockVault.id },
        data: {
          encryptedVault: 'new-encrypted-data',
          vaultVersion: 16,
          lastModified: expect.any(Date),
        },
      });
    });

    it('should return 409 if vault version is stale/equal', async () => {
      vi.mocked(prisma.vault.findFirst).mockResolvedValue(mockVault as never);

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/vault',
        payload: {
          encryptedVault: 'new-encrypted-data',
          vaultVersion: 15, // Same as existing
        },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json().error.code).toBe('CONFLICT');
      expect(response.json().error.details.serverVersion).toBe(15);
    });

    it('should return 404 if no vault exists', async () => {
      vi.mocked(prisma.vault.findFirst).mockResolvedValue(null as never);

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/vault',
        payload: {
          encryptedVault: 'new-encrypted-data',
          vaultVersion: 16,
        },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().error.code).toBe('NOT_FOUND');
    });

    it('should return 422 for invalid body', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/vault',
        payload: {
          vaultVersion: 'string-instead-of-number',
          encryptedVault: 'test',
        },
      });

      expect(response.statusCode).toBe(422);
    });
  });

  describe('DELETE /', () => {
    it('should delete vault successfully', async () => {
      vi.mocked(prisma.vault.findFirst).mockResolvedValue(mockVault as never);
      vi.mocked(prisma.vault.delete).mockResolvedValue(mockVault as never);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/vault',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().success).toBe(true);
      expect(prisma.vault.delete).toHaveBeenCalledWith({ where: { id: mockVault.id } });
    });

    it('should return 404 if no vault exists', async () => {
      vi.mocked(prisma.vault.findFirst).mockResolvedValue(null as never);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/vault',
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().error.code).toBe('NOT_FOUND');
    });
  });
});
