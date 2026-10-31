import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../middlewares/authenticate.js';
import { validate } from '../../middlewares/validate.js';
import * as authController from './auth.controller.js';
import { loginSchema, registerSchema } from './auth.validation.js';

const router = Router();

// Strict rate limit for auth endpoints — 10 requests per 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again later.' },
});

// POST /api/auth/register
router.post('/register', authLimiter, validate(registerSchema), authController.register);

// POST /api/auth/login
router.post('/login', authLimiter, validate(loginSchema), authController.login);

// POST /api/auth/logout  (revokes tokens + clears cookies; works with an expired access token)
router.post('/logout', authController.logout);

// POST /api/auth/refresh  (uses refresh token cookie)
router.post('/refresh', authController.refreshTokens);

// GET /api/auth/me  (authenticated)
router.get('/me', authenticate, authController.me);

export default router;
