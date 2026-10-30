export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
  meta: Record<string, unknown> | null;
}

export interface ApiErrorBody {
  success: false;
  message: string;
  errors: unknown[];
}

export function success<T>(
  data: T,
  message = 'Request completed successfully',
  meta: Record<string, unknown> | null = null,
): ApiSuccess<T> {
  return { success: true, message, data, meta };
}

export function failure(message: string, errors: unknown[] = []): ApiErrorBody {
  return { success: false, message, errors };
}
