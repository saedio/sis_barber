import { Request, Response } from 'express';
import { env } from '../config/env';
import { checkAdminPassword, createAdminSession } from '../auth/session';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const attemptsByAddress = new Map<string, { count: number; retryAt: number }>();

export class AuthController {
  login(req: Request, res: Response) {
    if (!env.adminPassword) {
      return res.status(503).json({ error: 'Defina ADMIN_PASSWORD no arquivo backend/.env.' });
    }

    const address = req.ip || 'unknown';
    const attempt = attemptsByAddress.get(address);
    if (attempt && attempt.retryAt > Date.now()) {
      return res.status(429).json({ error: 'Muitas tentativas. Aguarde 15 minutos.' });
    }

    const password = req.body?.password;
    if (typeof password !== 'string' || !checkAdminPassword(password)) {
      const count = attempt && attempt.retryAt <= Date.now() ? 0 : attempt?.count || 0;
      const nextCount = count + 1;
      attemptsByAddress.set(address, {
        count: nextCount,
        retryAt: nextCount >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0,
      });
      return res.status(401).json({ error: 'Senha inválida.' });
    }

    attemptsByAddress.delete(address);
    return res.json({ token: createAdminSession(), expiresIn: 8 * 60 * 60 });
  }
}
