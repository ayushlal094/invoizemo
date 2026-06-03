import { Schema, model, type Document } from 'mongoose';

export interface ILoginAttempt extends Document {
  email: string;
  attempts: number;
  lockedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const loginAttemptSchema = new Schema<ILoginAttempt>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    attempts: { type: Number, default: 0 },
    lockedUntil: Date,
  },
  { timestamps: true }
);

loginAttemptSchema.index({ email: 1 }, { unique: true });
loginAttemptSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 86400 });

export const LoginAttempt = model<ILoginAttempt>('LoginAttempt', loginAttemptSchema);
