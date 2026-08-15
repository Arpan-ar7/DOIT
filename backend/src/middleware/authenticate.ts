import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler.js';
import { env } from '../config/env.js';

/**
 * Shape of the payload inside a Supabase-issued JWT.
 * `sub` is the user's UUID (matches auth.users.id / profiles.id).
 * There are more fields on the real token (email, role, etc.) —
 * add them here as you need them.
 */
interface SupabaseJwtPayload {
  sub: string;
  email?: string;
  role?: string;
}

// Extend Express's Request type so `req.user` is recognized everywhere,
// instead of every controller needing to cast or redeclare it.
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
      };
    }
  }
}

/**
 * Verifies the Authorization header's Bearer token against Supabase's
 * JWT secret (HS256). On success, attaches `req.user = { id, email }`.
 * On failure, passes an AppError(401, ...) to the error handler.
 *
 * Mount this on any route that requires a logged-in user:
 *   router.post('/', authenticate, controller.create)
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new AppError(401, 'Missing or malformed Authorization header'));
    return;
  }

  const token = authHeader.slice('Bearer '.length);

  try {
    const decoded = jwt.verify(token, env.SUPABASE_JWT_SECRET, {
      algorithms: ['HS256'],
    }) as SupabaseJwtPayload;

    req.user = {
      id: decoded.sub,
      ...(decoded.email !== undefined && { email: decoded.email }),
    };

    next();
  } catch (err) {
    next(new AppError(401, 'Invalid or expired token'));
  }
}