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

export interface HealthPayload {
  status: string;
  service: string;
}
