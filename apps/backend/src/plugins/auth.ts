import type { FastifyReply, FastifyRequest } from 'fastify';
import { errorResponse } from '../utils/response';
import { verifyPairingToken } from '../services/pairingTokens';

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'chrome-extension://cdaicnajdmjjdmghjblobeegdbdniiif',
];

function getAllowedOrigins(): string[] {
  const configured = process.env.ALLOWED_ORIGINS;
  return configured ? configured.split(',').map((origin) => origin.trim()) : DEFAULT_ALLOWED_ORIGINS;
}

export async function requirePairing(request: FastifyRequest, reply: FastifyReply) {
  const origin = request.headers.origin;
  if (!origin || !getAllowedOrigins().includes(origin)) {
    return reply.status(401).send(errorResponse('UNAUTHORIZED', 'Request origin is not allowed.'));
  }

  const authHeader = request.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined;

  if (!token || !verifyPairingToken(token)) {
    return reply.status(401).send(errorResponse('UNAUTHORIZED', 'Missing or invalid pairing token.'));
  }
}
