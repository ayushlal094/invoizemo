import { z } from 'zod';

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  defaultCurrency: z.string().length(3).optional(),
  timezone: z.string().min(1).optional(),
});

// Zod v4 compatible: use .refine() instead of z.literal with errorMap
export const deleteUserSchema = z.object({
  confirmText: z.string(),
}).refine(
  (data) => data.confirmText === 'DELETE MY ACCOUNT',
  { message: 'You must type DELETE MY ACCOUNT exactly', path: ['confirmText'] }
);

export const sessionParamsSchema = z.object({
  id: z.string().min(1, 'Session ID required'),
});
