import mongoose, { Document, Schema, Types } from "mongoose";

export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";

export interface IRecurringTransactionDocument extends Document {
  userId: Types.ObjectId;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
  frequency: RecurrenceFrequency;
  interval: number;
  startDate: Date;
  endDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const RecurringTransactionSchema = new Schema<IRecurringTransactionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["income", "expense"], required: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, default: "outros" },
    description: { type: String, required: true },
    frequency: {
      type: String,
      enum: ["daily", "weekly", "monthly", "yearly"],
      required: true,
    },
    interval: { type: Number, required: true, min: 1, default: 1 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
  },
  { timestamps: true }
);

RecurringTransactionSchema.index({ userId: 1, startDate: -1 });
RecurringTransactionSchema.index({ userId: 1, endDate: 1 });

export const RecurringTransaction =
  mongoose.models.RecurringTransaction ??
  mongoose.model<IRecurringTransactionDocument>(
    "RecurringTransaction",
    RecurringTransactionSchema
  );
