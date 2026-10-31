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

const NETWORK_MESSAGE = 'Unable to reach the server. Check your connection and try again.';

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

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isAxiosError<Partial<ApiErrorBody>>(error)) {
    if (!error.response) return new ApiError(NETWORK_MESSAGE, null);

    const { status, data } = error.response;
    const message =
      typeof data?.message === 'string' ? data.message : 'Something went wrong. Please try again.';
    return new ApiError(message, status, extractFieldErrors(data?.errors));
  }

  return new ApiError(error instanceof Error ? error.message : 'Unexpected error', null);
}
