import mongoose from "mongoose";
import { User } from "@/models/User";

function normalizeId(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toString" in value) {
    return (value as { toString: () => string }).toString();
  }
  return "";
}

export async function getFamilyMemberIds(userId: string): Promise<string[]> {
  const currentUser = await User.findById(userId).select("_id familyId");
  if (!currentUser) return [];

  const familyId = currentUser.familyId ?? null;
  if (!familyId) return [normalizeId(currentUser._id)];

  const members = await User.find({ familyId }).select("_id");
  return members.map((member) => normalizeId(member._id));
}

export async function areUsersInSameFamily(userAId: string, userBId: string): Promise<boolean> {
  if (userAId === userBId) return true;
  const [userA, userB] = await Promise.all([
    User.findById(userAId).select("_id familyId"),
    User.findById(userBId).select("_id familyId"),
  ]);
  if (!userA || !userB) return false;
  return Boolean(userA.familyId && userA.familyId === userB.familyId);
}

export async function assertCanAccessResourceOwner(
  sessionUserId: string,
  resourceOwnerId: string
): Promise<boolean> {
  if (sessionUserId === resourceOwnerId) return true;
  return areUsersInSameFamily(sessionUserId, resourceOwnerId);
}

export async function getFamilyPartner(userId: string) {
  const currentUser = await User.findById(userId).select("_id familyId name email");
  if (!currentUser || !currentUser.familyId) return null;

  const partner = await User.findOne({
    familyId: currentUser.familyId,
    _id: { $ne: currentUser._id },
  }).select("_id name email");

  if (!partner) return null;
  return {
    id: normalizeId(partner._id),
    name: partner.name,
    email: partner.email,
  };
}

export function createFamilyId(): string {
  return new mongoose.Types.ObjectId().toString();
}
