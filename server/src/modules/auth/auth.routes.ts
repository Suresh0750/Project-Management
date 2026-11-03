import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { createRateLimiter, minutes } from '../../middlewares/rateLimit.js';
import { validate } from '../../middlewares/validate.js';
import * as authController from './auth.controller.js';
import {
  changePasswordSchema,
  loginSchema,
  optionalRefreshTokenSchema,
  registerSchema,
  resendOtpSchema,
  updateProfileSchema,
  verifyEmailSchema,
} from './auth.validation.js';

const router = Router();

// Login and password changes: 10 attempts per 15 minutes per IP.
const authLimiter = createRateLimiter({
  windowMs: minutes(5),
  limit: 100,
  message: 'Too many attempts. Please try again later.',
});

const otpLimiter = createRateLimiter({
  windowMs: minutes(5),
  limit: 100,
  message: 'Too many attempts. Please try again later.',
});

// POST /api/auth/register  (creates an unverified MEMBER and emails a one-time code)
router.post('/register', otpLimiter, validate(registerSchema), authController.register);

// POST /api/auth/verify-email  (consumes the code, then signs the user in)
router.post('/verify-email', otpLimiter, validate(verifyEmailSchema), authController.verifyEmail);

// POST /api/auth/resend-otp
router.post('/resend-otp', otpLimiter, validate(resendOtpSchema), authController.resendOtp);

// POST /api/auth/login
router.post('/login', authLimiter, validate(loginSchema), authController.login);

// POST /api/auth/logout  (revokes tokens + clears cookies; works with an expired access token)
router.post('/logout', validate(optionalRefreshTokenSchema), authController.logout);

// POST /api/auth/refresh  (refresh token from its cookie, or from the body for bearer clients)
router.post('/refresh', validate(optionalRefreshTokenSchema), authController.refreshTokens);

// GET /api/auth/cookie-probe  (do login cookies work in this browser? call twice, read the second)
router.get('/cookie-probe', authController.cookieProbe);

// GET /api/auth/me  (authenticated)
router.get('/me', authenticate, authController.me);

// PATCH /api/auth/profile  (authenticated; name, and email with the current password)
router.patch('/profile', authenticate, validate(updateProfileSchema), authController.updateProfile);

// PATCH /api/auth/password  (authenticated; rate limited like login to slow password guessing)
router.patch(
  '/password',
  authLimiter,
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword,
);

export default router;
