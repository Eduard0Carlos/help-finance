import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { FamilyInvite } from "@/models/FamilyInvite";

export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  await connectDB();
  const user = await User.findById(session.id).select("_id familyId");
  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }
  if (!user.familyId) {
    return NextResponse.json({ error: "Conta não está vinculada a uma família" }, { status: 400 });
  }

  const members = await User.find({ familyId: user.familyId }).select("_id");
  const memberIds = members.map((member) => member._id);

  await Promise.all([
    User.updateMany({ _id: { $in: memberIds } }, { $set: { familyId: null } }),
    FamilyInvite.updateMany(
      {
        status: "pending",
        $or: [{ fromUserId: { $in: memberIds } }, { toUserId: { $in: memberIds } }],
      },
      { $set: { status: "cancelled" } }
    ),
  ]);

  return NextResponse.json({ success: true });
}
