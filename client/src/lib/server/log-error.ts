import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

/**
 * Error log for the app's own server (the /api gateway). Errors only, one JSON line each, in
 * `<LOG_DIR>/gateway-error-YYYY-MM-DD.log` (default folder `logs` in the client folder).
 * Every entry has the request id, which is the same id the API logs for that request, so a
 * failure can be followed across both. Never pass tokens, cookies or bodies here.
 */

// turbopackIgnore: the folder is chosen at run time; do not bundle the project because of it.
const LOG_DIR = path.resolve(/* turbopackIgnore: true */ process.env.LOG_DIR ?? 'logs');
let writes: Promise<void> = Promise.resolve();

interface GatewayErrorEntry {
  requestId: string;
  method: string;
  path: string;
  message: string;
  error?: unknown;
}

function describe(error: unknown): { name?: string; message: string; code?: string } {
  if (error instanceof Error) {
    const cause = (error as { cause?: { code?: unknown } }).cause;
    return {
      name: error.name,
      message: error.message,
      ...(typeof cause?.code === 'string' ? { code: cause.code } : {}),
    };
  }
  return { message: String(error) };
}

export function logGatewayError(entry: GatewayErrorEntry): void {
  const now = new Date();
  const line = JSON.stringify({
    time: now.toISOString(),
    level: 'error',
    requestId: entry.requestId,
    method: entry.method,
    path: entry.path,
    message: entry.message,
    ...(entry.error === undefined ? {} : { error: describe(entry.error) }),
  });

  console.error(`[${entry.requestId}] ${entry.message}`);

  // One queue keeps the lines in order; a failed write must never break a request.
  writes = writes
    .then(async () => {
      await mkdir(LOG_DIR, { recursive: true });
      await appendFile(
        path.join(LOG_DIR, `gateway-error-${now.toISOString().slice(0, 10)}.log`),
        `${line}\n`,
        'utf8',
      );
    })
    .catch((failure: unknown) => {
      console.error('Could not write the gateway error log', failure);
    });
}
