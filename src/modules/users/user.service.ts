import { User, type UserDocument } from './user.model.js';

export async function getUserById(userId: string): Promise<UserDocument> {
  const user = await User.findOne({ _id: userId, isDeleted: false }) as UserDocument | null;
  if (!user) {
    const err = new Error('User not found') as Error & { statusCode: number; code: string };
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return user;
}

export function safeUser(user: UserDocument) {
  return {
    _id: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
    defaultCurrency: user.defaultCurrency,
    timezone: user.timezone,
    createdAt: user.createdAt,
  };
}

export async function updateUser(
  userId: string,
  updates: { name?: string; defaultCurrency?: string; timezone?: string }
): Promise<UserDocument> {
  const user = await getUserById(userId);
  if (updates.name !== undefined) user.name = updates.name;
  if (updates.defaultCurrency !== undefined) user.defaultCurrency = updates.defaultCurrency;
  if (updates.timezone !== undefined) user.timezone = updates.timezone;
  await user.save();
  return user;
}

export async function deleteUser(userId: string): Promise<void> {
  const user = await getUserById(userId);
  user.isDeleted = true;
  user.refreshSessions = [];
  await user.save();
}

export async function exportUser(userId: string) {
  const user = await getUserById(userId);
  return {
    profile: safeUser(user),
    exportedAt: new Date().toISOString(),
  };
}

export async function getSessions(userId: string) {
  const user = await getUserById(userId);
  return user.refreshSessions
    .filter((s) => s.expiresAt > new Date())
    .map((s) => ({
      _id: s._id,
      userAgent: s.userAgent ?? 'Unknown',
      ip: s.ipAddress ?? 'Unknown',
      createdAt: s.createdAt,
      lastUsedAt: s.createdAt,
      isCurrent: false, // frontend marks current based on context
    }));
}

export async function revokeSession(userId: string, sessionObjectId: string): Promise<void> {
  const user = await getUserById(userId);
  const before = user.refreshSessions.length;
  user.refreshSessions = user.refreshSessions.filter(
    (s) => s._id?.toString() !== sessionObjectId
  );
  if (user.refreshSessions.length === before) {
    const err = new Error('Session not found') as Error & { statusCode: number; code: string };
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  await user.save();
}
