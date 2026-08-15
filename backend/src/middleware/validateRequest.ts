import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { AppError } from './errorHandler.js';

/**
 * Validates req.body against the given zod schema.
 * On success, replaces req.body with the PARSED (typed, defaulted) result.
 * On failure, throws a 400 AppError with the validation issues.
 *
 * Usage in a route file:
 *   router.post('/', validateBody(createRequestSchema), controller.create)
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      next(new AppError(400, `Invalid request body: ${message}`));
      return;
    }

    req.body = result.data;
    next();
  };
}

/**
 * Validates req.query against the given zod schema.
 * Usage: router.get('/', validateQuery(feedFiltersSchema), controller.getFeed)
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      next(new AppError(400, `Invalid query parameters: ${message}`));
      return;
    }

    // Note: req.query is typed as a getter-only property in Express types,
    // so we mutate its contents rather than reassigning req.query itself.
    Object.assign(req.query, result.data);
    next();
  };
}

/**
 * Validates req.params against the given zod schema.
 * Usage: router.get('/:id', validateParams(idParamSchema), controller.getById)
 */
export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      next(new AppError(400, `Invalid route parameters: ${message}`));
      return;
    }

    req.params = result.data as typeof req.params;
    next();
  };
}