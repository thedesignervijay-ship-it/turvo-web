import express, { type Express, type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { config } from './config.js';
import type { Container } from './container.js';
import { rateLimited } from './lib/errors.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFound.js';
import { createAuthRoutes } from './routes/auth.routes.js';
import { createOwnerAdminRoutes, createProfileRoutes } from './routes/owner.routes.js';
import { createTurfRoutes } from './routes/turf.routes.js';
import { createTurfImageRoutes } from './routes/turfImage.routes.js';
import { createTurfCourtRoutes, createTopLevelCourtRoutes } from './routes/court.routes.js';
import { createTurfAvailabilityRoutes, createTopLevelAvailabilityRoutes } from './routes/availability.routes.js';
import { createTurfPricingRoutes, createTopLevelPricingRoutes } from './routes/pricing.routes.js';
import { createMasterDataRoutes } from './routes/masterData.routes.js';
import { createTurfMasterItemsRoutes } from './routes/turfMasterItems.routes.js';
import { createBookingRoutes } from './routes/booking.routes.js';
import { createNotificationRoutes } from './routes/notification.routes.js';
import { createReportRoutes } from './routes/report.routes.js';
import { createSettingsRoutes } from './routes/settings.routes.js';
import { createAuthenticate } from './middleware/authenticate.js';
import { openapiSpec } from './openapi/spec.js';

export const API_BASE_PATH = '/api/v1';

export interface AppOptions {
  trustProxy?: boolean;
}

export function createApp(container: Container, options: AppOptions = {}): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', options.trustProxy ?? config.isProd);

  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: false,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  const skipRateLimit = !config.isProd;

  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 1000,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => skipRateLimit,
    handler: (_req, _res, next) => next(rateLimited()),
  });
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => skipRateLimit,
    handler: (_req, _res, next) => next(rateLimited()),
  });

  app.use(globalLimiter);

  // Health checks (spec section 40: health check).
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: { status: 'ok' }, message: 'Health check passed.' });
  });
  app.get(`${API_BASE_PATH}/health`, (_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: { status: 'ok' }, message: 'Health check passed.' });
  });

  // OpenAPI/Swagger documentation (spec section 43).
  app.use(`${API_BASE_PATH}/docs`, swaggerUi.serve, swaggerUi.setup(openapiSpec));
  app.get(`${API_BASE_PATH}/docs.json`, (_req: Request, res: Response) => {
    res.status(200).json(openapiSpec);
  });

  app.use(`${API_BASE_PATH}/auth`, authLimiter, createAuthRoutes(container));

  const api = express.Router();
  api.use(createAuthenticate(container.repos.user, container.repos.owner));
  api.use('/owners', createOwnerAdminRoutes(container));
  api.use('/profile', createProfileRoutes(container));
  api.use('/turfs', createTurfRoutes(container));
  api.use('/turfs', createTurfImageRoutes(container));
  api.use('/turfs', createTurfCourtRoutes(container));
  api.use('/turfs', createTurfAvailabilityRoutes(container));
  api.use('/turfs', createTurfPricingRoutes(container));
  api.use('/turfs', createTurfMasterItemsRoutes(container));
  api.use('/courts', createTopLevelCourtRoutes(container));
  api.use('/availability-blocks', createTopLevelAvailabilityRoutes(container));
  api.use('/pricing', createTopLevelPricingRoutes(container));
  api.use('/master-data', createMasterDataRoutes(container));
  api.use('/bookings', createBookingRoutes(container));
  api.use('/notifications', createNotificationRoutes(container));
  api.use('/reports', createReportRoutes(container));
  api.use(createSettingsRoutes(container));
  app.use(`${API_BASE_PATH}`, api);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
