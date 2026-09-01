import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { createVaultSchema, updateVaultSchema } from '../services/vaultValidation';
import { db } from '../db';
import { successResponse, errorResponse } from '../utils/response';

interface VaultRow {
  id: number;
  encrypted_vault: string;
  vault_version: number;
  vault_salt: string;
  last_modified: string;
  created_at: string;
  updated_at: string;
}

function getVault(): VaultRow | undefined {
  return db.prepare('SELECT * FROM vault WHERE id = 1').get() as VaultRow | undefined;
}

function serializeVault(vault: VaultRow) {
  return {
    encryptedVault: vault.encrypted_vault,
    vaultVersion: vault.vault_version,
    vaultSalt: vault.vault_salt,
    lastModified: vault.last_modified,
    createdAt: vault.created_at,
    updatedAt: vault.updated_at,
  };
}

export default async function vaultRoutes(fastify: FastifyInstance) {
  // GET /api/v1/vault
  fastify.get('/', async (_request, reply) => {
    try {
      const vault = getVault();

      if (!vault) {
        return reply.status(404).send(errorResponse('NOT_FOUND', 'No vault exists on this server.'));
      }

      return reply.status(200).send(successResponse(serializeVault(vault)));
    } catch (error) {
      console.error('Unexpected error retrieving vault:', error);
      return reply.status(500).send(errorResponse('INTERNAL_ERROR', 'Something went wrong. Please try again.'));
    }
  });

  // GET /api/v1/vault/metadata
  fastify.get('/metadata', async (_request, reply) => {
    try {
      const vault = getVault();

      if (!vault) {
        return reply.status(404).send(errorResponse('NOT_FOUND', 'No vault exists on this server.'));
      }

      return reply.status(200).send(successResponse({
        vaultVersion: vault.vault_version,
        lastModified: vault.last_modified,
      }));
    } catch (error) {
      console.error('Unexpected error retrieving vault metadata:', error);
      return reply.status(500).send(errorResponse('INTERNAL_ERROR', 'Something went wrong. Please try again.'));
    }
  });

  // POST /api/v1/vault
  fastify.post('/', async (request, reply) => {
    try {
      const parsed = createVaultSchema.parse(request.body);

      if (getVault()) {
        return reply.status(409).send(errorResponse('CONFLICT', 'A vault already exists on this server. Use PUT to update instead.'));
      }

      const now = new Date().toISOString();
      db.prepare(
        `INSERT INTO vault (id, encrypted_vault, vault_version, vault_salt, last_modified, created_at, updated_at)
         VALUES (1, ?, ?, ?, ?, ?, ?)`
      ).run(parsed.encryptedVault, parsed.vaultVersion, parsed.vaultSalt, now, now, now);

      return reply.status(201).send(successResponse(serializeVault(getVault()!)));
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(422).send(errorResponse('VALIDATION_ERROR', error.issues[0]?.message || 'Validation error'));
      }
      console.error('Unexpected error creating vault:', error);
      return reply.status(500).send(errorResponse('INTERNAL_ERROR', 'Something went wrong. Please try again.'));
    }
  });

  // PUT /api/v1/vault
  fastify.put('/', async (request, reply) => {
    try {
      const parsed = updateVaultSchema.parse(request.body);

      const existing = getVault();
      if (!existing) {
        return reply.status(404).send(errorResponse('NOT_FOUND', 'No vault exists on this server. Use POST to create one first.'));
      }

      // Optimistic concurrency control: reject stale updates
      if (parsed.vaultVersion <= existing.vault_version) {
        return reply.status(409).send(errorResponse(
          'CONFLICT',
          'Version conflict: your vault version is out of date.',
          {
            serverVersion: existing.vault_version,
            lastModified: existing.last_modified,
          }
        ));
      }

      const now = new Date().toISOString();
      db.prepare(
        `UPDATE vault SET encrypted_vault = ?, vault_version = ?, last_modified = ?, updated_at = ? WHERE id = 1`
      ).run(parsed.encryptedVault, parsed.vaultVersion, now, now);

      return reply.status(200).send(successResponse(serializeVault(getVault()!)));
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(422).send(errorResponse('VALIDATION_ERROR', error.issues[0]?.message || 'Validation error'));
      }
      console.error('Unexpected error updating vault:', error);
      return reply.status(500).send(errorResponse('INTERNAL_ERROR', 'Something went wrong. Please try again.'));
    }
  });

  // DELETE /api/v1/vault
  fastify.delete('/', async (_request, reply) => {
    try {
      if (!getVault()) {
        return reply.status(404).send(errorResponse('NOT_FOUND', 'No vault exists on this server.'));
      }

      db.prepare('DELETE FROM vault WHERE id = 1').run();

      return reply.status(200).send(successResponse({ message: 'Vault deleted successfully.' }));
    } catch (error) {
      console.error('Unexpected error deleting vault:', error);
      return reply.status(500).send(errorResponse('INTERNAL_ERROR', 'Something went wrong. Please try again.'));
    }
  });
}
