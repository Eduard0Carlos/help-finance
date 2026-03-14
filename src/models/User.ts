import mongoose, { Document, Schema } from "mongoose";

export interface IUserDocument extends Document {
  name: string;
  email: string;
  passwordHash: string;
  profileImage?: string;
  dailyLimit: number;
  investmentGoal: number;
  investmentProfile: number;
  familyId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    profileImage: { type: String },
    dailyLimit: { type: Number, default: 350 },
    investmentGoal: { type: Number, default: 4000 },
    investmentProfile: { type: Number, default: 1, min: 1, max: 5 },
    familyId: { type: String, index: true, default: null },
  },
  { timestamps: true }
);

export const User =
  mongoose.models.User ?? mongoose.model<IUserDocument>("User", UserSchema);
