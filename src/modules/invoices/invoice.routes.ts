import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  updateInvoiceStatusSchema,
  invoiceParamsSchema,
  listInvoicesQuerySchema,
} from './invoice.schema.js';
import * as invoiceController from './invoice.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', validate(listInvoicesQuerySchema, 'query'), invoiceController.list);
router.post('/', validate(createInvoiceSchema), invoiceController.create);
router.get('/:id', validate(invoiceParamsSchema, 'params'), invoiceController.getById);
router.patch('/:id/status', validate(invoiceParamsSchema, 'params'), validate(updateInvoiceStatusSchema), invoiceController.updateStatus);
router.patch('/:id', validate(invoiceParamsSchema, 'params'), validate(updateInvoiceSchema), invoiceController.update);
router.delete('/:id', validate(invoiceParamsSchema, 'params'), invoiceController.remove);

export default router;
