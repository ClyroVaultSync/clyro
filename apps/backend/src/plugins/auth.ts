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

function isOriginAllowed(origin: string | undefined, { allowMissing }: { allowMissing: boolean }): boolean {
  return origin ? getAllowedOrigins().includes(origin) : allowMissing;
}

/**
 * Guards pairing: only the Clyro extension may obtain a token. Chrome always
 * sends Origin on the extension's POST, so a missing one means a caller that
 * isn't the extension — web pages and other extensions send their own.
 */
export async function requireAllowedOrigin(request: FastifyRequest, reply: FastifyReply) {
  if (!isOriginAllowed(request.headers.origin, { allowMissing: false })) {
    return reply.status(401).send(errorResponse('UNAUTHORIZED', 'Request origin is not allowed.'));
  }
}

export async function requirePairing(request: FastifyRequest, reply: FastifyReply) {
  // Chrome omits the Origin header on plain GET fetches from an extension
  // service worker to a host_permissions-covered target (confirmed against
  // the real extension), even though it reliably sends it on POST/PUT/DELETE.
  // Only reject a *mismatched* origin; a missing one falls through to the
  // pairing-token check below, which is the real authentication boundary —
  // a hostile cross-origin page can't reach this handler at all without a
  // token, since the browser's own CORS preflight blocks it first.
  if (!isOriginAllowed(request.headers.origin, { allowMissing: true })) {
    return reply.status(401).send(errorResponse('UNAUTHORIZED', 'Request origin is not allowed.'));
  }

  const authHeader = request.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined;

  if (!token || !verifyPairingToken(token)) {
    return reply.status(401).send(errorResponse('UNAUTHORIZED', 'Missing or invalid pairing token.'));
  }
}
