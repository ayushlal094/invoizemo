import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import userRoutes from '../modules/users/user.routes.js';
import clientRoutes from '../modules/clients/client.routes.js';
import invoiceRoutes from '../modules/invoices/invoice.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/clients', clientRoutes);
router.use('/invoices', invoiceRoutes);

export default router;
