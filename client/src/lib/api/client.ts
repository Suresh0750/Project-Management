import axios, { type InternalAxiosRequestConfig } from 'axios';
import { publicEnv } from '@/lib/env';
import { toApiError } from '@/lib/api/errors';

export const apiClient = axios.create({
  baseURL: publicEnv.apiUrl,
  withCredentials: true,
  timeout: 20_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth endpoints answer 401 for legitimate reasons (bad credentials, no session), so they
// must never trigger a refresh-and-retry.
const NO_REFRESH_PATHS = ['/auth/login', '/auth/logout', '/auth/refresh'];

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

let refreshInFlight: Promise<void> | null = null;

/** Single-flight: concurrent 401s share one refresh call (refresh tokens rotate). */
function refreshSession(): Promise<void> {
  refreshInFlight ??= apiClient
    .post('/auth/refresh')
    .then(() => undefined)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    // Cancelled requests are expected (e.g. unmounted components) and must stay distinguishable.
    if (axios.isCancel(error)) throw error;

    const config = axios.isAxiosError(error) ? (error.config as RetriableConfig | undefined) : undefined;
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    const canRefresh =
      status === 401 &&
      config !== undefined &&
      !config._retried &&
      !NO_REFRESH_PATHS.some((path) => config.url?.startsWith(path));

    if (canRefresh) {
      config._retried = true;
      try {
        await refreshSession();
      } catch {
        // Session truly expired: surface the original 401.
        throw toApiError(error);
      }
      // Errors from the retried call are converted by this same interceptor.
      return apiClient.request(config);
    }

    throw toApiError(error);
  },
);
