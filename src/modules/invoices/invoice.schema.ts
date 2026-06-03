import { z } from 'zod';

const lineItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().min(0.01),
  unitPriceCents: z.number().int().min(0),
});

export const createInvoiceSchema = z.object({
  clientId: z.string().regex(/^[a-f\d]{24}$/i),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  lineItems: z.array(lineItemSchema).min(1),
  taxRate: z.number().min(0).max(1).default(0),
  currency: z.string().length(3).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateInvoiceSchema = z.object({
  clientId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  issueDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  lineItems: z.array(lineItemSchema).min(1).optional(),
  taxRate: z.number().min(0).max(1).optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateInvoiceStatusSchema = z.object({
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']),
});

export const invoiceParamsSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid invoice id'),
});

export const listInvoicesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).optional(),
  clientId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;
