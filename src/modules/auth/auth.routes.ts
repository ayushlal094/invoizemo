import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { registerSchema, loginSchema } from './auth.schema.js';
import * as authController from './auth.controller.js';
import { isGoogleOAuthEnabled } from '../../config/env.js';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

if (isGoogleOAuthEnabled) {
  router.get('/google', authController.googleAuth);
  router.get('/google/callback', authController.googleCallback);
}

export default router;
