import mongoose, { Document, Schema, Types } from "mongoose";

export interface IInvestmentDocument extends Document {
  userId: Types.ObjectId;
  ticker: string;
  name: string;
  type: "acao" | "fundo" | "international" | "renda_fixa";
  quantity: number;
  averagePrice: number;
  purchaseDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvestmentSchema = new Schema<IInvestmentDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ticker: { type: String, required: true, uppercase: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["acao", "fundo", "international", "renda_fixa"],
      required: true,
    },
    quantity: { type: Number, required: true, min: 0 },
    averagePrice: { type: Number, required: true, min: 0 },
    purchaseDate: { type: Date, required: true },
  },
  { timestamps: true }
);

InvestmentSchema.index({ userId: 1, ticker: 1 });

export const Investment =
  mongoose.models.Investment ??
  mongoose.model<IInvestmentDocument>("Investment", InvestmentSchema);
