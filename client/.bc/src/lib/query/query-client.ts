import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';

const SESSION_KEY = ['auth', 'me'];

export function createQueryClient(): QueryClient {
  // A 401 that survived the refresh attempt, or a "your account was deactivated" 403, means the
  // session is gone. Re-check the session so the role layout notices and sends the user to
  // /login with the right message.
  const handleUnauthorized = (error: unknown, isSessionQuery: boolean) => {
    // A deactivated account never gets here: the API client has already ended the session and
    // left for /login, so no re-check is needed (or allowed).
    if (!(error instanceof ApiError) || isSessionQuery) return;
    if (error.status === 401) {
      // One failing page can have a dozen requests error at once. Re-check the session only if
      // that is not already happening or already known to have failed; invalidating per request
      // would cancel and restart the same check again and again.
      const state = client.getQueryState(SESSION_KEY);
      if (state?.fetchStatus === 'fetching' || state?.status === 'error') return;
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
