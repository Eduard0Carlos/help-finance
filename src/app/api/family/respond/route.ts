import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { FamilyInvite } from "@/models/FamilyInvite";
import { createFamilyId } from "@/lib/family";

const respondSchema = z.object({
  inviteId: z.string().min(1),
  action: z.enum(["accept", "reject"]),
});

export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = respondSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  await connectDB();

  const invite = await FamilyInvite.findById(parsed.data.inviteId);
  if (!invite) {
    return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });
  }
  if (invite.toUserId.toString() !== session.id) {
    return NextResponse.json({ error: "Sem permissão para este convite" }, { status: 403 });
  }
  if (invite.status !== "pending") {
    return NextResponse.json({ error: "Convite já processado" }, { status: 409 });
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    await FamilyInvite.updateOne({ _id: invite._id }, { $set: { status: "cancelled" } });
    return NextResponse.json({ error: "Convite expirado" }, { status: 410 });
  }

  if (parsed.data.action === "reject") {
    await FamilyInvite.updateOne({ _id: invite._id }, { $set: { status: "rejected" } });
    return NextResponse.json({ success: true, status: "rejected" });
  }

  const [fromUser, toUser] = await Promise.all([
    User.findById(invite.fromUserId).select("_id familyId"),
    User.findById(invite.toUserId).select("_id familyId"),
  ]);

  if (!fromUser || !toUser) {
    return NextResponse.json({ error: "Usuários do convite não encontrados" }, { status: 404 });
  }
  if (fromUser.familyId || toUser.familyId) {
    await FamilyInvite.updateOne({ _id: invite._id }, { $set: { status: "cancelled" } });
    return NextResponse.json(
      { error: "Uma das contas já está vinculada a uma família" },
      { status: 409 }
    );
  }

  const familyId = createFamilyId();
  await Promise.all([
    User.updateOne({ _id: fromUser._id }, { $set: { familyId } }),
    User.updateOne({ _id: toUser._id }, { $set: { familyId } }),
    FamilyInvite.updateOne({ _id: invite._id }, { $set: { status: "accepted" } }),
    FamilyInvite.updateMany(
      {
        _id: { $ne: invite._id },
        status: "pending",
        $or: [
          { fromUserId: invite.fromUserId },
          { toUserId: invite.fromUserId },
          { fromUserId: invite.toUserId },
          { toUserId: invite.toUserId },
        ],
      },
      { $set: { status: "cancelled" } }
    ),
  ]);

  return NextResponse.json({ success: true, status: "accepted", familyId });
}
