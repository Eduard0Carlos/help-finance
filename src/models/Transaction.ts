import mongoose, { Document, Schema, Types } from "mongoose";

export interface ITransactionDocument extends Document {
  userId: Types.ObjectId;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransactionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["income", "expense"], required: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, default: "outros" },
    description: { type: String, required: true },
    date: { type: Date, required: true },
  },
  { timestamps: true }
);

TransactionSchema.index({ userId: 1, date: -1 });

export const Transaction =
  mongoose.models.Transaction ??
  mongoose.model<ITransactionDocument>("Transaction", TransactionSchema);
