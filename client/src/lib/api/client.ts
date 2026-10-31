import axios from 'axios';
import { publicEnv } from '@/lib/env';
import { toApiError } from '@/lib/api/errors';

export const apiClient = axios.create({
  baseURL: publicEnv.apiUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    // Cancelled requests are expected (e.g. unmounted components) and must stay distinguishable.
    if (axios.isCancel(error)) return Promise.reject(error);
    return Promise.reject(toApiError(error));
  },
);
