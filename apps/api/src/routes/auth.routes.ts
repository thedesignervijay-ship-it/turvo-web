import { Router } from 'express';
import type { Container } from '../container.js';
import { createAuthController } from '../controllers/auth.controller.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { createAuthenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { registerSchema } from '../validations/auth.schema.js';

export function createAuthRoutes(container: Container): Router {
  const router = Router();
  const authenticate = createAuthenticate(container.repos.user, container.repos.owner);
  const controller = createAuthController(container.services.auth);

  router.post('/register', validate.body(registerSchema), asyncHandler(controller.register));
  router.get('/me', authenticate, asyncHandler(controller.me));
  router.post('/logout', authenticate, asyncHandler(controller.logout));

  return router;
}
