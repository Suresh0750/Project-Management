import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * What is known about the request currently being handled. Kept in AsyncLocalStorage so any code
 * that runs because of the request (services, mail sending, realtime publishing) can log with the
 * request id without it being passed down through every function.
 */
export interface RequestContext {
  requestId: string;
  method: string;
  path: string;
  userId?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithRequest<T>(context: RequestContext, callback: () => T): T {
  return storage.run(context, callback);
}

export function currentRequest(): RequestContext | undefined {
  return storage.getStore();
}

/** Called once the caller is known (after authentication) so later errors name the user. */
export function setRequestUser(userId: string): void {
  const context = storage.getStore();
  if (context) context.userId = userId;
}
