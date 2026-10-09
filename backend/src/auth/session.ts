import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const sessionSecret = env.adminSessionSecret || randomBytes(32).toString('base64url');

function sign(value: string) {
  return createHmac('sha256', sessionSecret).update(value).digest('base64url');
}

function equalSecret(provided: string, expected: string) {
  const key = 'barbezap-password-check';
  const providedDigest = createHmac('sha256', key).update(provided).digest();
  const expectedDigest = createHmac('sha256', key).update(expected).digest();
  return timingSafeEqual(providedDigest, expectedDigest);
}

export function checkAdminPassword(provided: string) {
  return Boolean(env.adminPassword) && equalSecret(provided, env.adminPassword);
}

export function createAdminSession() {
  const payload = Buffer.from(JSON.stringify({ sub: 'admin', exp: Date.now() + SESSION_TTL_MS }))
    .toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function isValidAdminSession(token: string) {
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return false;

  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return false;

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub?: string;
      exp?: number;
    };
    return claims.sub === 'admin' && typeof claims.exp === 'number' && claims.exp > Date.now();
  } catch {
    return false;
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match || !isValidAdminSession(match[1])) {
    return res.status(401).json({ error: 'Autenticação administrativa necessária.' });
  }

  return next();
}
