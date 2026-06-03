import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import { updateUserSchema, deleteUserSchema, sessionParamsSchema } from './user.schema.js';
import * as userController from './user.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/me', userController.getMe);
router.patch('/me', validate(updateUserSchema), userController.updateMe);
router.delete('/me', validate(deleteUserSchema), userController.deleteMe);
router.get('/me/export', userController.exportMe);
router.get('/me/sessions', userController.getSessions);
router.delete('/me/sessions/:id', validate(sessionParamsSchema, 'params'), userController.revokeSession);

export default router;
