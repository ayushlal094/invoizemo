import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.schema.js';
import * as authController from './auth.controller.js';
import { isGoogleOAuthEnabled } from '../../config/env.js';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

if (isGoogleOAuthEnabled) {
  router.get('/google', authController.googleAuth);
  router.get('/google/callback', authController.googleCallback);
}

export default router;
