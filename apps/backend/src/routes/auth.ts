import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { registerSchema } from '../services/authValidation';
import { hashPassword } from '../services/authPassword';
import { prisma } from '../db';
import { successResponse, errorResponse } from '../utils/response';

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/register', async (request, reply) => {
    try {
      const parsedBody = registerSchema.parse(request.body);
      const passwordHash = await hashPassword(parsedBody.password);
      
      await prisma.user.create({
        data: {
          email: parsedBody.email,
          phone: parsedBody.phone,
          passwordHash,
        }
      });
      
      return reply.status(201).send(successResponse({ message: 'Account created successfully.' }));
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.issues[0]?.message || 'Validation error';
        return reply.status(422).send(errorResponse('VALIDATION_ERROR', message));
      }
      
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = (error.meta?.target as unknown) || [];
        const isPhone = Array.isArray(target) ? target.includes('phone') : String(target).includes('phone');
        
        if (isPhone) {
           return reply.status(409).send(errorResponse('PHONE_ALREADY_EXISTS', 'An account with this phone number already exists.'));
        }
        return reply.status(409).send(errorResponse('EMAIL_ALREADY_EXISTS', 'An account with this email already exists.'));
      }

      console.error('Unexpected error during registration:', error);
      return reply.status(500).send(errorResponse('INTERNAL_ERROR', 'Something went wrong. Please try again.'));
    }
  });
}
