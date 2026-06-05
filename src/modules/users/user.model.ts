import { Schema, model, type Document, type Types } from 'mongoose';

export interface IRefreshSession {
  _id?: Types.ObjectId;
  sessionId: string;
  tokenHash: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface IUser extends Document {
  email: string;
  passwordHash?: string;
  name: string;
  role: 'owner' | 'admin' | 'member';
  defaultCurrency: string;
  timezone: string;
  googleId?: string;
  refreshSessions: IRefreshSession[];
  isDeleted: boolean;
  // Password reset fields
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const refreshSessionSchema = new Schema<IRefreshSession>(
  {
    sessionId: { type: String, required: true },
    tokenHash: { type: String, required: true },
    userAgent: String,
    ipAddress: String,
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { _id: true }
);

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    name: { type: String, default: '' },
    role: { type: String, enum: ['owner', 'admin', 'member'], default: 'owner' },
    defaultCurrency: { type: String, default: 'USD' },
    timezone: { type: String, default: 'UTC' },
    googleId: { type: String, sparse: true },
    refreshSessions: [refreshSessionSchema],
    isDeleted: { type: Boolean, default: false },
    // Password reset (hashed token + expiry)
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
  },
  { timestamps: true }
);

userSchema.index({ passwordResetToken: 1 }, { sparse: true });

export const User = model<IUser>('User', userSchema);
export type UserDocument = IUser & { _id: Types.ObjectId };
