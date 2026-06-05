import { z } from 'zod';

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  defaultCurrency: z.string().length(3).optional(),
  timezone: z.string().min(1).optional(),
});

export const deleteUserSchema = z.object({
  confirmText: z.literal('DELETE MY ACCOUNT', {
    errorMap: () => ({ message: 'You must type DELETE MY ACCOUNT exactly' }),
  }),
});

export const sessionParamsSchema = z.object({
  id: z.string().min(1, 'Session ID required'),
});
