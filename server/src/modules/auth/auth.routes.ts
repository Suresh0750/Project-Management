import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { createRateLimiter, minutes } from '../../middlewares/rateLimit.js';
import { validate } from '../../middlewares/validate.js';
import * as authController from './auth.controller.js';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendOtpSchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyEmailSchema,
} from './auth.validation.js';

const router = Router();

const authLimiter = createRateLimiter({
  windowMs: minutes(15),
  limit: 15,
  message: 'Too many attempts. Please try again later.',
});

const otpLimiter = createRateLimiter({
  windowMs: minutes(5),
  limit: 100,
  message: 'Too many attempts. Please try again later.',
});

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register a new account
 *     description: >-
 *       Public sign-up. Always creates an **unverified MEMBER** and emails a
 *       6-digit code (valid 10 minutes). No session is issued until the code is
 *       verified with `POST /api/auth/verify-email`.
 *
 *
 *       Registering again with an address that is still unverified only re-sends the code (the stored password is not replaced). An address that already belongs to a verified account is refused with 409.
 *
 *
 *       Rate limited per IP address to 100 requests per 5 minutes (in production, or when RATE_LIMIT_ENABLED=true).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/RegisterRequest"
 *           example:
 *             name: jane doe
 *             email: jane.doe@example.com
 *             password: Str0ng!Passw0rd
 *     responses:
 *       "201":
 *         $ref: "#/components/responses/OtpSentOk"
 *       "400":
 *         $ref: "#/components/responses/BadRequest"
 *       "409":
 *         $ref: "#/components/responses/Conflict"
 *       "429":
 *         $ref: "#/components/responses/TooManyRequests"
 *       "500":
 *         $ref: "#/components/responses/ServerError"
 *       "503":
 *         $ref: "#/components/responses/ServiceUnavailable"
 */
// POST /api/auth/register  (creates an unverified MEMBER and emails a one-time code)
router.post('/register', otpLimiter, validate(registerSchema), authController.register);

/**
 * @openapi
 * /api/auth/verify-email:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Verify an email address with the emailed code
 *     description: >-
 *       Consumes the 6-digit code (single use, at most 5 wrong attempts). Proving
 *       the mailbox is also the sign-in: on success the session cookies are set
 *       and the user is signed in.
 *
 *
 *       Errors: 400 for a wrong, expired or used code (`errors[].path` = `otp`); 403 `ACCOUNT_DEACTIVATED` for a deactivated account; 409 `EMAIL_ALREADY_VERIFIED` when the address was already verified (for example on another device).
 *
 *
 *       Rate limited per IP address to 100 requests per 5 minutes (in production, or when RATE_LIMIT_ENABLED=true).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/VerifyEmailRequest"
 *           example:
 *             email: jane.doe@example.com
 *             otp: "482913"
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/AuthSessionOk"
 *       "400":
 *         $ref: "#/components/responses/BadRequest"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *       "409":
 *         $ref: "#/components/responses/Conflict"
 *       "429":
 *         $ref: "#/components/responses/TooManyRequests"
 *       "500":
 *         $ref: "#/components/responses/ServerError"
 */
// POST /api/auth/verify-email  (consumes the code, then signs the user in)
router.post('/verify-email', otpLimiter, validate(verifyEmailSchema), authController.verifyEmail);

/**
 * @openapi
 * /api/auth/resend-otp:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Send a new verification code
 *     description: >-
 *       Sends a fresh sign-up code to an unverified account. For an unknown,
 *       verified or deactivated address the answer is the same normal 200, so the
 *       endpoint cannot be used to discover accounts. A new code can be requested
 *       every 60 seconds (`resendAfterSeconds`); sooner gets 429.
 *
 *
 *       Rate limited per IP address to 100 requests per 5 minutes (in production, or when RATE_LIMIT_ENABLED=true).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/EmailRequest"
 *           example:
 *             email: jane.doe@example.com
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/ResendAfterOk"
 *       "400":
 *         $ref: "#/components/responses/BadRequest"
 *       "429":
 *         $ref: "#/components/responses/TooManyRequests"
 *       "500":
 *         $ref: "#/components/responses/ServerError"
 *       "503":
 *         $ref: "#/components/responses/ServiceUnavailable"
 */
// POST /api/auth/resend-otp
router.post('/resend-otp', otpLimiter, validate(resendOtpSchema), authController.resendOtp);

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Request a password reset code
 *     description: >-
 *       Emails a 6-digit code (valid 10 minutes) to an active account. The answer
 *       is always the same normal 200, whether or not the account exists, the
 *       cooldown is running or the email could be sent.
 *
 *
 *       Rate limited per IP address to 100 requests per 5 minutes (in production, or when RATE_LIMIT_ENABLED=true).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/EmailRequest"
 *           example:
 *             email: jane.doe@example.com
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/ResendAfterOk"
 *       "400":
 *         $ref: "#/components/responses/BadRequest"
 *       "429":
 *         $ref: "#/components/responses/TooManyRequests"
 *       "500":
 *         $ref: "#/components/responses/ServerError"
 */
// POST /api/auth/forgot-password  (emails a one-time code; the answer never reveals if the account exists)
router.post('/forgot-password', otpLimiter, validate(forgotPasswordSchema), authController.forgotPassword);

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Set a new password with the emailed code
 *     description: >-
 *       Consumes the reset code and sets the new password. **Every session of the
 *       user ends**, so anyone holding the old password is signed out. The user is
 *       not signed in by this call; they log in with the new password. An
 *       unverified account is marked verified (the code proved the mailbox).
 *
 *
 *       A wrong, expired or used code gives 400 (`errors[].path` = `otp`); unknown and deactivated accounts get the same answer as a wrong code.
 *
 *
 *       Rate limited per IP address to 100 requests per 5 minutes (in production, or when RATE_LIMIT_ENABLED=true).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ResetPasswordRequest"
 *           example:
 *             email: jane.doe@example.com
 *             otp: "482913"
 *             newPassword: N3w!Passw0rd#
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/NoDataOk"
 *       "400":
 *         $ref: "#/components/responses/BadRequest"
 *       "429":
 *         $ref: "#/components/responses/TooManyRequests"
 *       "500":
 *         $ref: "#/components/responses/ServerError"
 */
// POST /api/auth/reset-password  (consumes the code and sets the new password)
router.post('/reset-password', otpLimiter, validate(resetPasswordSchema), authController.resetPassword);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Sign in
 *     description: >-
 *       Checks the email and password and starts a session for this browser or
 *       device. The response sets the `access_token` and `refresh_token` cookies.
 *       Use this once in Swagger UI: the browser then sends the cookies on every
 *       later request.
 *
 *
 *       Errors: 401 for a wrong email or password (the same answer for both); 403 with `errors[].message` = `EMAIL_NOT_VERIFIED` (a fresh code was just sent) or `ACCOUNT_DEACTIVATED`.
 *
 *
 *       Rate limited per IP address to 15 requests per 15 minutes (in production, or when RATE_LIMIT_ENABLED=true).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/LoginRequest"
 *           example:
 *             email: jane.doe@example.com
 *             password: Str0ng!Passw0rd
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/AuthSessionOk"
 *       "400":
 *         $ref: "#/components/responses/BadRequest"
 *       "401":
 *         $ref: "#/components/responses/Unauthorized"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *       "429":
 *         $ref: "#/components/responses/TooManyRequests"
 *       "500":
 *         $ref: "#/components/responses/ServerError"
 */
// POST /api/auth/login
router.post('/login', authLimiter, validate(loginSchema), authController.login);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Sign out this device
 *     description: >-
 *       Ends **only this device's session**; the user's other devices stay signed
 *       in. The session is found from the refresh cookie or the access token
 *       (cookie or Bearer), and the cookies are cleared in the response.
 *
 *
 *       Deliberately public: it works with an expired or missing access token, and always answers 200 so a stale browser can clean up.
 *     security:
 *       - refreshCookieAuth: []
 *       - cookieAuth: []
 *       - bearerAuth: []
 *       - {}
 *     requestBody:
 *       required: false
 *       description: Only needed by clients that cannot send the refresh cookie.
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Fallback for the `refresh_token` cookie.
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/NoDataOk"
 *       "500":
 *         $ref: "#/components/responses/ServerError"
 */
// POST /api/auth/logout  (revokes tokens + clears cookies; works with an expired access token)
router.post('/logout', authController.logout);

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Renew the session
 *     description: >-
 *       Uses the `refresh_token` cookie (sent only to `/api/auth/*` URLs) to issue
 *       a new access and refresh token and extend the device's session; the new
 *       cookies are set in the response. The refresh token changes on every use.
 *
 *
 *       401: the refresh token is missing, invalid or expired, or the session was ended (logout, password change). 403: the account was deactivated or its role was changed (`errors[].message` = `ACCOUNT_DEACTIVATED` / `ROLE_CHANGED`), or its email is unverified. When the session is over for good, the cookies are cleared.
 *     security:
 *       - refreshCookieAuth: []
 *     requestBody:
 *       required: false
 *       description: Only needed by clients that cannot send the refresh cookie.
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Fallback for the `refresh_token` cookie.
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/AuthSessionOk"
 *       "401":
 *         $ref: "#/components/responses/Unauthorized"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *       "500":
 *         $ref: "#/components/responses/ServerError"
 */
// POST /api/auth/refresh  (uses refresh token cookie)
router.post('/refresh', authController.refreshTokens);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Get the signed-in user
 *     description: |-
 *       **Who:** any signed-in user.
 *
 *       Also used by the app to find out whether a session is still valid.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/UserOk"
 *       "401":
 *         $ref: "#/components/responses/Unauthorized"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *       "500":
 *         $ref: "#/components/responses/ServerError"
 */
// GET /api/auth/me  (authenticated)
router.get('/me', authenticate, authController.me);

/**
 * @openapi
 * /api/auth/profile:
 *   patch:
 *     tags:
 *       - Authentication
 *     summary: Update the signed-in user's own profile
 *     description: >-
 *       **Who:** any signed-in user.
 *
 *
 *       Change the name and/or email. Changing the **email requires `currentPassword`**. A wrong current password is 400 (not 401, which would sign the user out). An address used by another account is 409.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/UpdateProfileRequest"
 *           example:
 *             name: Jane A. Doe
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/UserOk"
 *       "400":
 *         $ref: "#/components/responses/BadRequest"
 *       "401":
 *         $ref: "#/components/responses/Unauthorized"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *       "409":
 *         $ref: "#/components/responses/Conflict"
 *       "500":
 *         $ref: "#/components/responses/ServerError"
 */
// PATCH /api/auth/profile  (authenticated; name, and email with the current password)
router.patch('/profile', authenticate, validate(updateProfileSchema), authController.updateProfile);

/**
 * @openapi
 * /api/auth/password:
 *   patch:
 *     tags:
 *       - Authentication
 *     summary: Change the signed-in user's password
 *     description: >-
 *       **Who:** any signed-in user.
 *
 *
 *       Requires the current password; the new one must differ from it. **Every other device is signed out**; this device gets a fresh session (new cookies are set).
 *
 *
 *       Rate limited per IP address to 15 requests per 15 minutes (in production, or when RATE_LIMIT_ENABLED=true).
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ChangePasswordRequest"
 *           example:
 *             currentPassword: Str0ng!Passw0rd
 *             newPassword: N3w!Passw0rd#
 *     responses:
 *       "200":
 *         $ref: "#/components/responses/AuthSessionOk"
 *       "400":
 *         $ref: "#/components/responses/BadRequest"
 *       "401":
 *         $ref: "#/components/responses/Unauthorized"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *       "429":
 *         $ref: "#/components/responses/TooManyRequests"
 *       "500":
 *         $ref: "#/components/responses/ServerError"
 */
// PATCH /api/auth/password  (authenticated; rate limited like login to slow password guessing)
router.patch(
  '/password',
  authLimiter,
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword,
);

export default router;
