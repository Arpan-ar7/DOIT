import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { AppError } from './errorHandler.js';
import { env } from '../config/env.js';

/**
 * Shape of the payload inside a Supabase-issued JWT.
 * `sub` is the user's UUID (matches auth.users.id / profiles.id).
 */
interface SupabaseJwtPayload {
  sub: string;
  email?: string;
  role?: string;
}

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
 * Supabase (newer projects) signs JWTs asymmetrically (ES256), not with a
 * shared secret. To verify, we fetch the correct PUBLIC key from Supabase's
 * JWKS endpoint, matched by the `kid` in the token header. jwks-rsa caches
 * keys internally so this isn't a network call on every single request.
 */
const client = jwksClient({
  jwksUri: `${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
  cache: true,
  rateLimit: true,
});

function getSigningKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback): void {
  if (!header.kid) {
    callback(new Error('Token header missing kid'));
    return;
  }

  client.getSigningKey(header.kid, (err, key) => {
    if (err || !key) {
      callback(err ?? new Error('Signing key not found'));
      return;
    }
    callback(null, key.getPublicKey());
  });
}

/**
 * Verifies the Authorization header's Bearer token against Supabase's
 * JWKS public keys (ES256). On success, attaches req.user = { id, email }.
 * On failure, passes an AppError(401, ...) to the error handler.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new AppError(401, 'Missing or malformed Authorization header'));
    return;
  }

  const token = authHeader.slice('Bearer '.length);

  jwt.verify(token, getSigningKey, { algorithms: ['ES256'] }, (err, decoded) => {
    if (err || !decoded) {
      next(new AppError(401, 'Invalid or expired token'));
      return;
    }

    const payload = decoded as SupabaseJwtPayload;

    req.user = {
      id: payload.sub,
      ...(payload.email !== undefined && { email: payload.email }),
    };

    next();
  });
}