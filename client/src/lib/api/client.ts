import axios, { type InternalAxiosRequestConfig } from 'axios';
import { publicEnv } from '@/lib/env';
import { ApiError, isAccountDeactivated, toApiError } from '@/lib/api/errors';
import { endSession, isSessionEnded } from '@/lib/auth/session-guard';
import { clearTokens, getTokens, setTokens } from '@/lib/auth/token-store';
import type { ApiSuccess } from '@/lib/api/types';
import type { AuthUserPayload } from '@/types/auth';

export const apiClient = axios.create({
  baseURL: publicEnv.apiUrl,
  withCredentials: true,
  timeout: 20_000,
  headers: {
    'Content-Type': 'application/json',
  },
});


apiClient.interceptors.request.use((config) => {
  if (isSessionEnded()) {
    throw new ApiError(
      'Your account has been deactivated. Please contact your administrator or the support team.',
      403,
      { code: 'ACCOUNT_DEACTIVATED' },
    );
  }

  const tokens = getTokens();
  if (tokens) config.headers.set('Authorization', `Bearer ${tokens.accessToken}`);

  return config;
});


const CREDENTIAL_PATHS = ['/auth/login', '/auth/verify-email'];

const NO_REFRESH_PATHS = ['/auth/login', '/auth/logout', '/auth/refresh'];

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

let refreshInFlight: Promise<void> | null = null;

async function requestRefresh(): Promise<void> {
  const tokens = getTokens();

  try {

    const { data } = await apiClient.post<ApiSuccess<AuthUserPayload>>(
      '/auth/refresh',
      tokens ? { refreshToken: tokens.refreshToken } : undefined,
      tokens ? { headers: { 'X-Auth-Transport': 'bearer' } } : undefined,
    );
    if (data.data.tokens) setTokens(data.data.tokens);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) clearTokens();
    throw error;
  }
}

export function refreshSession(): Promise<void> {
  refreshInFlight ??= requestRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (axios.isCancel(error)) throw error;

    const apiError = toApiError(error);
    if (isAccountDeactivated(apiError)) {
      const url = axios.isAxiosError(error) ? error.config?.url : undefined;
      if (!CREDENTIAL_PATHS.some((path) => url?.startsWith(path))) endSession('deactivated');
      throw apiError;
    }

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
      } catch (refreshError) {
        throw refreshError instanceof ApiError && refreshError.isNetworkError ? refreshError : apiError;
      }
      // Errors from the retried call are converted by this same interceptor.
      return apiClient.request(config);
    }

    throw apiError;
  },
);
