import mongoose, { Document, Schema, Types } from "mongoose";

export type FamilyInviteStatus = "pending" | "accepted" | "rejected" | "cancelled";

export interface IFamilyInviteDocument extends Document {
  fromUserId: Types.ObjectId;
  toUserId: Types.ObjectId;
  status: FamilyInviteStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FamilyInviteSchema = new Schema<IFamilyInviteDocument>(
  {
    fromUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    toUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled"],
      default: "pending",
      required: true,
      index: true,
    },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

FamilyInviteSchema.index({ fromUserId: 1, toUserId: 1, status: 1 });

export const FamilyInvite =
  mongoose.models.FamilyInvite ??
  mongoose.model<IFamilyInviteDocument>("FamilyInvite", FamilyInviteSchema);
