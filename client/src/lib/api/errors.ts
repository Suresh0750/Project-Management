import axios from 'axios';
import type { ApiErrorBody } from '@/lib/api/types';

export class ApiError extends Error {
  readonly status: number | null;
  readonly fieldErrors: Record<string, string>;

  constructor(message: string, status: number | null, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
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

    const { status, data } = error.response;
    const body = typeof data === 'object' && data !== null ? data : undefined;
    return new ApiError(pickMessage(status, body?.message), status, extractFieldErrors(body?.errors));
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
