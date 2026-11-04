import { appendFile, mkdir, readdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import type { Request } from 'express';
import { env } from '../config/env.js';
import { currentRequest } from './requestContext.js';

/**
 * Error-only logger. Nothing but errors is recorded: no request logging, no info, no debug.
 *
 * Each error becomes one JSON line in `<LOG_DIR>/error-YYYY-MM-DD.log` and a short line on the
 * console. Every entry carries the request id (also returned to the client in the `x-request-id`
 * header), so a report like "it failed at 10:32" can be traced to the exact error.
 *
 * Files rotate by day and by size, and files older than LOG_RETENTION_DAYS are deleted.
 * Request bodies, headers, cookies and anything that looks like a token or password are never
 * written; see `redact`.
 */

const LOG_DIR = path.resolve(env.LOG_DIR);
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_STACK_LINES = 25;
const FILE_PATTERN = /^error-\d{4}-\d{2}-\d{2}(\.\d+)?\.log$/;

// ─── Redaction ────────────────────────────────────────────────────────────────
const JWT = /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]*/g;
const BEARER = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi;
// password: "x"   passwordHash=x   "otp":"123456"   authorization: x ...
const SENSITIVE_PAIR =
  /((?:password|passwordhash|newpassword|currentpassword|codehash|otp|token|accesstoken|refreshtoken|authorization|cookie|secret)["']?\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,}]+)/gi;

/** Removes secrets from text before it reaches a log file (database errors can echo values). */
export function redact(text: string): string {
  return text
    .replace(JWT, '[jwt]')
    .replace(BEARER, 'Bearer [redacted]')
    .replace(SENSITIVE_PAIR, '$1"[redacted]"');
}

// ─── Error description ────────────────────────────────────────────────────────
interface ErrorInfo {
  name?: string;
  message: string;
  code?: string;
  stack?: string;
  cause?: ErrorInfo;
}

function describe(error: unknown, depth = 0): ErrorInfo {
  if (error instanceof Error) {
    const { code } = error as { code?: unknown };
    return {
      name: error.name,
      message: redact(error.message),
      ...(typeof code === 'string' ? { code } : {}),
      ...(error.stack
        ? { stack: redact(error.stack.split('\n').slice(0, MAX_STACK_LINES).join('\n')) }
        : {}),
      ...(depth < 3 && error.cause !== undefined ? { cause: describe(error.cause, depth + 1) } : {}),
    };
  }
  return { message: redact(typeof error === 'string' ? error : JSON.stringify(error) ?? String(error)) };
}

// ─── File output ──────────────────────────────────────────────────────────────
let writes: Promise<void> = Promise.resolve();

const dayStamp = (date: Date): string => date.toISOString().slice(0, 10);

async function fileFor(date: Date): Promise<string> {
  await mkdir(LOG_DIR, { recursive: true });
  const day = dayStamp(date);
  // error-2026-11-04.log, then error-2026-11-04.1.log once the first reaches the size cap, ...
  for (let part = 0; ; part += 1) {
    const file = path.join(LOG_DIR, part === 0 ? `error-${day}.log` : `error-${day}.${part}.log`);
    try {
      if ((await stat(file)).size < MAX_FILE_BYTES) return file;
    } catch {
      return file; // does not exist yet
    }
  }
}

function writeLine(line: string): void {
  // One queue keeps lines in order and never lets a failed write break the app: the error was
  // already printed to the console, which is the fallback.
  writes = writes
    .then(async () => appendFile(await fileFor(new Date()), `${line}\n`, 'utf8'))
    .catch((failure: unknown) => {
      console.error('[logger] could not write the log file', failure);
    });
}

/** Resolves once every queued line is on disk (call before the process exits). */
export function flushLogs(): Promise<void> {
  return writes;
}

// ─── Public API ───────────────────────────────────────────────────────────────
type Extra = Record<string, string | number | boolean | null | undefined>;

function record(message: string, error: unknown, extra: Extra, request?: Partial<NonNullable<ReturnType<typeof currentRequest>>>) {
  const context = currentRequest();
  const requestId = request?.requestId ?? context?.requestId;
  const info = error === undefined ? undefined : describe(error);

  const entry = {
    time: new Date().toISOString(),
    level: 'error',
    requestId: requestId ?? null,
    userId: request?.userId ?? context?.userId ?? null,
    method: request?.method ?? context?.method ?? null,
    path: request?.path ?? context?.path ?? null,
    message,
    ...Object.fromEntries(
      Object.entries(extra).map(([key, value]) => [key, typeof value === 'string' ? redact(value) : value]),
    ),
    ...(info ? { error: info } : {}),
  };

  writeLine(JSON.stringify(entry));

  // Console: one short line (plus the stack while developing).
  const where = requestId ? `[${requestId}] ` : '';
  const what = info ? `: ${info.name ?? 'Error'}: ${info.message.split('\n')[0]}` : '';
  console.error(`${where}${message}${what}`);
  if (info?.stack && env.NODE_ENV !== 'production') console.error(info.stack);
}

/**
 * Logs one error. The request id (and signed-in user) of the request that caused it are added
 * automatically; pass `extra` for a few safe identifiers (never request bodies or secrets).
 */
export function logError(message: string, error?: unknown, extra: Extra = {}): void {
  try {
    record(message, error, extra);
  } catch (failure) {
    console.error('[logger] failed', failure);
  }
}

/** The error handler's entry: an unexpected failure while serving `req`. */
export function logRequestError(req: Request, status: number, error: unknown): void {
  try {
    record(
      'Request failed',
      error,
      { status },
      {
        requestId: req.requestId,
        method: req.method,
        // The path only: query strings can carry search text or ids that are not needed here.
        path: req.originalUrl.split('?')[0] ?? req.originalUrl,
        ...(req.user ? { userId: req.user.id } : {}),
      },
    );
  } catch (failure) {
    console.error('[logger] failed', failure);
  }
}

// ─── Retention ────────────────────────────────────────────────────────────────
async function pruneOldLogs(): Promise<void> {
  const cutoff = Date.now() - env.LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  let names: string[];
  try {
    names = await readdir(LOG_DIR);
  } catch {
    return; // nothing has been logged yet
  }
  for (const name of names) {
    if (!FILE_PATTERN.test(name)) continue; // never touch files this logger did not create
    const file = path.join(LOG_DIR, name);
    try {
      if ((await stat(file)).mtimeMs < cutoff) await unlink(file);
    } catch {
      // another process may have removed it; nothing to do
    }
  }
}

/** Deletes expired log files now and once a day. Returns a function that stops it. */
export function startLogMaintenance(): () => void {
  void pruneOldLogs();
  const timer = setInterval(() => void pruneOldLogs(), 24 * 60 * 60 * 1000);
  timer.unref();
  return () => clearInterval(timer);
}
