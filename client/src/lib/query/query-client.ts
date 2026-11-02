import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';

const SESSION_KEY = ['auth', 'me'];

export function createQueryClient(): QueryClient {
  // A 401 that survived the refresh attempt, or a "your account was deactivated" 403, means the
  // session is gone. Re-check the session so the role layout notices and sends the user to
  // /login with the right message.
  const handleUnauthorized = (error: unknown, isSessionQuery: boolean) => {
    if (!(error instanceof ApiError) || isSessionQuery) return;
    const deactivated = error.status === 403 && error.fieldErrors.code === 'ACCOUNT_DEACTIVATED';
    if (error.status === 401 || deactivated) {
      void client.invalidateQueries({ queryKey: SESSION_KEY });
    }
  };

  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => handleUnauthorized(error, query.queryKey[0] === 'auth'),
    }),
    mutationCache: new MutationCache({
      onError: (error) => handleUnauthorized(error, false),
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Never retry client errors; one retry for network/5xx blips.
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status !== null && error.status < 500) &&
          failureCount < 1,
        refetchOnWindowFocus: false,
      },
    },
  });

  return client;
}
