import axios from 'axios';
import { publicEnv } from '@/lib/env';

export const apiClient = axios.create({
  baseURL: publicEnv.apiUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});
