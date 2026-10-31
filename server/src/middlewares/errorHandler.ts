import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { failure } from '../utils/apiResponse.js';
import { HttpError } from '../utils/httpError.js';

const GENERIC_SERVER_MESSAGE = 'Something went wrong on our side. Please try again later.';
const UNAVAILABLE_MESSAGE = 'The service is temporarily unavailable. Please try again in a moment.';

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(new HttpError(404, 'Route not found'));
}

interface PublicError {
  status: number;
  message: string;
  errors?: unknown[];
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const publicError = toPublicError(err);

  // Only unexpected failures are logged; full details stay on the server.
  if (publicError.status >= 500) {
    console.error(`[${req.requestId}] ${req.method} ${req.originalUrl} -> ${publicError.status}`, err);
  }

  if (res.headersSent) return;
  res.status(publicError.status).json(failure(publicError.message, publicError.errors ?? []));
}

/**
 * Maps any thrown value to something safe to show a client. Messages from database drivers,
 * Prisma and unknown exceptions are never forwarded: they leak schema and query details.
 */
function toPublicError(err: unknown): PublicError {
  if (err instanceof ZodError) {
    return {
      status: 400,
      message: 'Validation failed',
      errors: err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    };
  }

  if (err instanceof HttpError) {
    return { status: err.statusCode, message: err.message, errors: err.errors };
  }

  // body-parser errors (malformed JSON, payload too large) carry a 4xx status
  if (isBodyParserError(err)) {
    return {
      status: err.status,
      message: err.status === 413 ? 'Payload too large' : 'Invalid request body',
    };
  }

  const prismaError = fromPrisma(err);
  if (prismaError) return prismaError;

  if (isDatabaseUnavailable(err)) {
    return { status: 503, message: UNAVAILABLE_MESSAGE };
  }

  return { status: 500, message: GENERIC_SERVER_MESSAGE };
}

function fromPrisma(err: unknown): PublicError | null {
  if (typeof err !== 'object' || err === null) return null;
  const { name, code } = err as { name?: unknown; code?: unknown };

  if (name === 'PrismaClientKnownRequestError' && typeof code === 'string') {
    switch (code) {
      case 'P2002':
        return { status: 409, message: 'A record with these details already exists' };
      case 'P2025':
        return { status: 404, message: 'The requested record was not found' };
      case 'P2003':
      case 'P2014':
        return { status: 409, message: 'This action conflicts with related data' };
      case 'P2000':
        return { status: 400, message: 'One of the values is too long' };
      case 'P2024':
        return { status: 503, message: UNAVAILABLE_MESSAGE };
      default:
        return isDatabaseUnavailable(err)
          ? { status: 503, message: UNAVAILABLE_MESSAGE }
          : { status: 500, message: GENERIC_SERVER_MESSAGE };
    }
  }

  if (name === 'PrismaClientInitializationError') {
    return { status: 503, message: UNAVAILABLE_MESSAGE };
  }

  // Validation / panic / unknown request errors indicate a bug on our side.
  if (typeof name === 'string' && name.startsWith('PrismaClient')) {
    return { status: 500, message: GENERIC_SERVER_MESSAGE };
  }

  return null;
}

const UNAVAILABLE_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EPIPE',
  'ENOTFOUND',
  'PROTOCOL_CONNECTION_LOST',
  'ER_CON_COUNT_ERROR',
  'P1001',
  'P1002',
  'P1008',
  'P1017',
]);

const UNAVAILABLE_PATTERN = /pool timeout|connection (refused|reset|lost|timeout)|can't reach database/i;

/** True for connection-level failures (database down, pool exhausted, network drop). */
function isDatabaseUnavailable(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const { code, message, cause } = err as { code?: unknown; message?: unknown; cause?: unknown };

  if (typeof code === 'string' && UNAVAILABLE_CODES.has(code)) return true;
  if (typeof message === 'string' && UNAVAILABLE_PATTERN.test(message)) return true;
  return cause !== undefined && cause !== err && isDatabaseUnavailable(cause);
}

function isBodyParserError(err: unknown): err is { status: number } {
  if (typeof err !== 'object' || err === null || !('status' in err) || !('type' in err)) {
    return false;
  }
  const { status } = err as { status: unknown };
  return typeof status === 'number' && status >= 400 && status < 500;
}
