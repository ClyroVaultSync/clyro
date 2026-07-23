import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const deviceSchema = z.object({
  deviceIdentifier: z.string().min(1),
  deviceName: z.string().min(1),
  platform: z.string().min(1),
  browser: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  device: deviceSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
