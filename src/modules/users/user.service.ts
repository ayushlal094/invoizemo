import { User } from './user.model.js';
import { Client } from '../clients/client.model.js';
import { Invoice } from '../invoices/invoice.model.js';
import { AppError } from '../../utils/appError.js';
import { sanitizeUser, listSessions, revokeSession } from '../auth/auth.service.js';
import type { UpdateUserInput } from './user.schema.js';

export async function getMe(userId: string) {
  const user = await User.findOne({ _id: userId, isDeleted: false });
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
  return sanitizeUser(user);
}

export async function updateMe(userId: string, input: UpdateUserInput) {
  const user = await User.findOne({ _id: userId, isDeleted: false });
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');

  if (input.name !== undefined) user.name = input.name;
  if (input.timezone !== undefined) user.timezone = input.timezone;
  if (input.defaultCurrency !== undefined) user.defaultCurrency = input.defaultCurrency;

  await user.save();
  return sanitizeUser(user);
}

export async function deleteMe(userId: string) {
  const user = await User.findOne({ _id: userId, isDeleted: false });
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');

  user.isDeleted = true;
  user.refreshSessions = [];
  await user.save();

  await Client.updateMany({ userId }, { isDeleted: true });
  await Invoice.updateMany({ userId }, { isDeleted: true });
}

export async function exportMe(userId: string) {
  const user = await User.findOne({ _id: userId, isDeleted: false }).lean();
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');

  const clients = await Client.find({ userId, isDeleted: false }).lean();
  const invoices = await Invoice.find({ userId, isDeleted: false }).lean();

  return {
    exportedAt: new Date().toISOString(),
    user: {
      email: user.email,
      name: user.name,
      role: user.role,
      defaultCurrency: user.defaultCurrency,
      timezone: user.timezone,
      createdAt: user.createdAt,
    },
    clients,
    invoices,
  };
}

export { listSessions, revokeSession };
