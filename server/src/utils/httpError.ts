export class HttpError extends Error {
  readonly statusCode: number;
  readonly errors: unknown[];
  readonly isOperational: boolean;

  constructor(statusCode: number, message: string, errors: unknown[] = []) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
  }
}
