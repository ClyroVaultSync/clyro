import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { createVaultSchema, updateVaultSchema } from '../services/vaultValidation';
import { prisma } from '../db';
import { successResponse, errorResponse } from '../utils/response';

function serializeVault(vault: {
  id: string; encryptedVault: string; vaultSalt: string; vaultVersion: number;
  lastModified: Date; createdAt: Date; updatedAt: Date;
}) {
  return {
    id: vault.id,
    encryptedVault: vault.encryptedVault,
    vaultSalt: vault.vaultSalt,
    vaultVersion: vault.vaultVersion,
    lastModified: vault.lastModified.toISOString(),
    createdAt: vault.createdAt.toISOString(),
    updatedAt: vault.updatedAt.toISOString(),
  };
}

export default async function vaultRoutes(fastify: FastifyInstance) {
  // GET /api/v1/vault
  fastify.get('/', async (_request, reply) => {
    try {
      const vault = await prisma.vault.findFirst();

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
      const vault = await prisma.vault.findFirst({
        select: { vaultVersion: true, lastModified: true },
      });

      if (!vault) {
        return reply.status(404).send(errorResponse('NOT_FOUND', 'No vault exists on this server.'));
      }

      return reply.status(200).send(successResponse({
        vaultVersion: vault.vaultVersion,
        lastModified: vault.lastModified.toISOString(),
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

      const existing = await prisma.vault.findFirst();
      if (existing) {
        return reply.status(409).send(errorResponse('CONFLICT', 'A vault already exists on this server. Use PUT to update instead.'));
      }

      const vault = await prisma.vault.create({
        data: {
          encryptedVault: parsed.encryptedVault,
          vaultSalt: parsed.vaultSalt,
          vaultVersion: parsed.vaultVersion,
        },
      });

      return reply.status(201).send(successResponse(serializeVault(vault)));
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

      const existing = await prisma.vault.findFirst();
      if (!existing) {
        return reply.status(404).send(errorResponse('NOT_FOUND', 'No vault exists on this server. Use POST to create one first.'));
      }

      // Optimistic concurrency control: reject stale updates
      if (parsed.vaultVersion <= existing.vaultVersion) {
        return reply.status(409).send(errorResponse(
          'CONFLICT',
          'Version conflict: your vault version is out of date.',
          {
            serverVersion: existing.vaultVersion,
            lastModified: existing.lastModified.toISOString(),
          }
        ));
      }

      const vault = await prisma.vault.update({
        where: { id: existing.id },
        data: {
          encryptedVault: parsed.encryptedVault,
          vaultVersion: parsed.vaultVersion,
          lastModified: new Date(),
        },
      });

      return reply.status(200).send(successResponse(serializeVault(vault)));
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
      const existing = await prisma.vault.findFirst();
      if (!existing) {
        return reply.status(404).send(errorResponse('NOT_FOUND', 'No vault exists on this server.'));
      }

      await prisma.vault.delete({ where: { id: existing.id } });

      return reply.status(200).send(successResponse({ message: 'Vault deleted successfully.' }));
    } catch (error) {
      console.error('Unexpected error deleting vault:', error);
      return reply.status(500).send(errorResponse('INTERNAL_ERROR', 'Something went wrong. Please try again.'));
    }
  });
}
