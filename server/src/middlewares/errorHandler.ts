import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { failure } from '../utils/apiResponse.js';
import { HttpError } from '../utils/httpError.js';

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(new HttpError(404, 'Route not found'));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json(
      failure(
        'Validation failed',
        err.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      ),
    );
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.statusCode).json(failure(err.message, err.errors));
    return;
  }

  const message = err instanceof Error ? err.message : 'Internal server error';
  const exposedMessage = env.NODE_ENV === 'production' ? 'Internal server error' : message;

  res.status(500).json(failure(exposedMessage));
}
