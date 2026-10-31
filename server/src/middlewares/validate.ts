import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { z } from 'zod';

/**
 * Generic validation middleware factory.
 * Pass a Zod schema that validates { body, params, query }.
 *
 * Usage:
 *   router.post('/', validate(loginSchema), controller)
 */
export function validate(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      next(result.error); // ZodError caught by errorHandler
      return;
    }

    // Write parsed/coerced values back
    const parsed = result.data as {
      body?: unknown;
      params?: unknown;
      query?: unknown;
    };

    if (parsed.body !== undefined) req.body = parsed.body;
    if (parsed.params !== undefined) req.params = parsed.params as Record<string, string>;
    // Express 5 exposes req.query as a getter, so it can't be assigned directly
    if (parsed.query !== undefined) {
      Object.defineProperty(req, 'query', {
        value: parsed.query,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }

    next();
  };
}

// Convenience: validate only the body
export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return validate(z.object({ body: schema }));
}
