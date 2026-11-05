import 'dotenv/config';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { corsOptions } from './config/cors.js';
import { success } from './utils/apiResponse.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { csrfProtection } from './middlewares/csrf.js';
import { requestId } from './middlewares/requestId.js';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { swaggerSpec } from './config/swagger.js';

// Route modules
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import projectsRoutes from './modules/projects/projects.routes.js';
import tasksRoutes from './modules/tasks/tasks.routes.js';
import activityRoutes from './modules/activity/activity.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(requestId);

  // Swagger UI loads its own inline scripts and styles, which helmet's default content security
  // policy blocks (the page would be blank). The documentation pages get helmet without that one
  // header; every other path keeps the full policy.
  const secureHeaders = helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } });
  const docsHeaders = helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  });
  app.use((req, res, next) => {
    (req.path.startsWith('/api-docs') ? docsHeaders : secureHeaders)(req, res, next);
  });
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(csrfProtection);

  // Global rate limiter
  const globalLimiter = rateLimit({
    windowMs: 5,
    limit: 600,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  });
  app.use('/api', globalLimiter);

  //  Health check
  app.get('/api/health', (_req, res) => {
    res.json(
      success(
        { status: 'ok', service: 'project-management-api' },
        'API is healthy',
      ),
    );
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/projects', projectsRoutes);
  app.use('/api/tasks', tasksRoutes);
  app.use('/api/activities', activityRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  // API documentation. After the routes it describes, before the 404 and error handlers.
  if (env.SWAGGER_ENABLED) {
    app.get('/api-docs.json', (_req, res) => {
      res.json(swaggerSpec);
    });
    app.use(
      '/api-docs',
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec, {
        customSiteTitle: 'Project Management API',
        swaggerOptions: { persistAuthorization: true, displayRequestDuration: true },
      }),
    );
  }

  // Error handlers
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
