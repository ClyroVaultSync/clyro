import { z } from 'zod';

export const createVaultSchema = z.object({
  encryptedVault: z.string().min(1),
  vaultVersion: z.number().int().positive(),
});

export const updateVaultSchema = z.object({
  encryptedVault: z.string().min(1),
  vaultVersion: z.number().int().positive(),
});

export type CreateVaultRequest = z.infer<typeof createVaultSchema>;
export type UpdateVaultRequest = z.infer<typeof updateVaultSchema>;
