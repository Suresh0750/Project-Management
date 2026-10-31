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

  // body-parser errors (malformed JSON, payload too large) carry a 4xx status
  if (isBodyParserError(err)) {
    res
      .status(err.status)
      .json(failure(err.status === 413 ? 'Payload too large' : 'Invalid request body'));
    return;
  }

  const message = err instanceof Error ? err.message : 'Internal server error';
  const exposedMessage = env.NODE_ENV === 'production' ? 'Internal server error' : message;

  res.status(500).json(failure(exposedMessage));
}

function isBodyParserError(err: unknown): err is { status: number } {
  if (typeof err !== 'object' || err === null || !('status' in err) || !('type' in err)) {
    return false;
  }
  const { status } = err as { status: unknown };
  return typeof status === 'number' && status >= 400 && status < 500;
}
