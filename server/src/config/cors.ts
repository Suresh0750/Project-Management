import type { CorsOptions } from 'cors';
import { env } from './env.js';
import { HttpError } from '../utils/httpError.js';

const allowedOrigins = [env.CLIENT_URL];

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Allow server-to-server requests (no Origin header) in development
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new HttpError(403, 'Origin not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
};
