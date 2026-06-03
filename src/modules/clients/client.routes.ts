import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import {
  createClientSchema,
  updateClientSchema,
  clientParamsSchema,
  listClientsQuerySchema,
} from './client.schema.js';
import * as clientController from './client.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', validate(listClientsQuerySchema, 'query'), clientController.list);
router.post('/', validate(createClientSchema), clientController.create);
router.get('/:id', validate(clientParamsSchema, 'params'), clientController.getById);
router.patch('/:id', validate(clientParamsSchema, 'params'), validate(updateClientSchema), clientController.update);
router.delete('/:id', validate(clientParamsSchema, 'params'), clientController.remove);

export default router;
