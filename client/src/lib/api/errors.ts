import axios from 'axios';
import type { ApiErrorBody } from '@/lib/api/types';

export class ApiError extends Error {
  readonly status: number | null;
  readonly fieldErrors: Record<string, string>;
  /** The request id of the failed call (the same id is in the server's error log), if known. */
  readonly requestId: string | null;

  constructor(
    message: string,
    status: number | null,
    fieldErrors: Record<string, string> = {},
    requestId: string | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.requestId = requestId;
  }

  get isNetworkError(): boolean {
    return this.status === null;
  }
}

const NETWORK_MESSAGE =
  'Unable to reach the server. Check your connection, or try again in a moment.';
const TIMEOUT_MESSAGE = 'The server took too long to respond. Please try again.';
const SERVER_MESSAGE = 'Something went wrong on our side. Please try again later.';
const UNAVAILABLE_MESSAGE = 'The service is temporarily unavailable. Please try again in a moment.';

const STATUS_MESSAGES: Record<number, string> = {
  400: 'The request was not valid. Please check your input.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to do this.',
  404: 'We could not find what you were looking for.',
  409: 'This conflicts with existing data.',
  413: 'The data you sent is too large.',
  429: 'Too many attempts. Please wait a moment and try again.',
  500: SERVER_MESSAGE,
  502: UNAVAILABLE_MESSAGE,
  503: UNAVAILABLE_MESSAGE,
  504: TIMEOUT_MESSAGE,
};

function fallbackMessage(status: number): string {
  return STATUS_MESSAGES[status] ?? (status >= 500 ? SERVER_MESSAGE : 'Something went wrong.');
}

function extractFieldErrors(errors: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (!Array.isArray(errors)) return result;

  for (const entry of errors) {
    if (typeof entry !== 'object' || entry === null) continue;
    const { path, message } = entry as { path?: unknown; message?: unknown };
    if (typeof path !== 'string' || typeof message !== 'string') continue;
    const field = path.split('.').pop();
    if (field && !(field in result)) result[field] = message;
  }
  return result;
}

/**
 * Server text is trusted only for client errors (4xx) and 503. A 500 always gets the generic
 * message so internal details can never surface, even from an older or misconfigured backend.
 */
function pickMessage(status: number, bodyMessage: unknown): string {
  const useBody =
    typeof bodyMessage === 'string' &&
    bodyMessage.length > 0 &&
    bodyMessage.length <= 300 &&
    ((status >= 400 && status < 500) || status === 503);
  return useBody ? bodyMessage : fallbackMessage(status);
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isAxiosError<Partial<ApiErrorBody>>(error)) {
    if (!error.response) {
      const timedOut = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
      return new ApiError(timedOut ? TIMEOUT_MESSAGE : NETWORK_MESSAGE, null);
    }

    const { status, data, headers } = error.response;
    const body = typeof data === 'object' && data !== null ? data : undefined;
    const rawId: unknown = headers?.['x-request-id'];
    const requestId = typeof rawId === 'string' && rawId.length > 0 ? rawId : null;

    // For a server failure (5xx) show a short reference. The person can quote it, and support can
    // search the log for it (the log holds the full id).
    const reference = status >= 500 && requestId ? ` (Ref: ${requestId.slice(0, 8)})` : '';
    return new ApiError(
      `${pickMessage(status, body?.message)}${reference}`,
      status,
      extractFieldErrors(body?.errors),
      requestId,
    );
  }

  return new ApiError(SERVER_MESSAGE, null);
}

/**
 * Normalises whatever a mutation callback receives. TanStack Query also routes an exception
 * thrown inside a per-call `onSuccess` to `onError`, so the value is not always an ApiError.
 * The original is logged so a real bug is never hidden behind a generic message.
 */
export function asApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  console.error('Unexpected error in a mutation callback', error);
  return toApiError(error);
}

/** The server's "an administrator changed your role, sign in again" answer. */
export function isRoleChanged(error: ApiError): boolean {
  return error.status === 403 && error.fieldErrors.code === 'ROLE_CHANGED';
}

/** The server's "this account was deactivated" answer (see server/src/utils/accountErrors.ts). */
export function isAccountDeactivated(error: ApiError): boolean {
  return error.status === 403 && error.fieldErrors.code === 'ACCOUNT_DEACTIVATED';
}
