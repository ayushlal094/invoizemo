import { z } from 'zod';

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  timezone: z.string().min(1).max(64).optional(),
  defaultCurrency: z.string().length(3).optional(),
});

export const deleteUserSchema = z.object({
  confirmText: z.literal('DELETE MY ACCOUNT'),
});

export const sessionParamsSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid session id'),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type DeleteUserInput = z.infer<typeof deleteUserSchema>;
