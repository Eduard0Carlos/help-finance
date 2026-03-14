import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { FamilyInvite } from "@/models/FamilyInvite";

const inviteSchema = z.object({
  email: z.string().email(),
});

const INVITE_EXPIRATION_DAYS = 7;

export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }

  await connectDB();

  const [fromUser, toUser] = await Promise.all([
    User.findById(session.id).select("_id email familyId"),
    User.findOne({ email: parsed.data.email.toLowerCase() }).select("_id email familyId"),
  ]);

  if (!fromUser) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }
  if (!toUser) {
    return NextResponse.json({ error: "Conta de destino não encontrada" }, { status: 404 });
  }
  if (fromUser._id.toString() === toUser._id.toString()) {
    return NextResponse.json({ error: "Você não pode convidar a si mesmo" }, { status: 400 });
  }
  if (fromUser.familyId || toUser.familyId) {
    return NextResponse.json(
      { error: "Uma das contas já está vinculada a uma família" },
      { status: 409 }
    );
  }

  const now = new Date();
  await FamilyInvite.updateMany(
    {
      $or: [
        { fromUserId: fromUser._id, toUserId: toUser._id, status: "pending" },
        { fromUserId: toUser._id, toUserId: fromUser._id, status: "pending" },
      ],
      expiresAt: { $gt: now },
    },
    { $set: { status: "cancelled" } }
  );

  const invite = await FamilyInvite.create({
    fromUserId: fromUser._id,
    toUserId: toUser._id,
    status: "pending",
    expiresAt: new Date(now.getTime() + INVITE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000),
  });

  return NextResponse.json(
    {
      _id: invite._id.toString(),
      status: invite.status,
      expiresAt: invite.expiresAt.toISOString(),
      toUserEmail: toUser.email,
    },
    { status: 201 }
  );
}

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  await connectDB();
  const now = new Date();

  await FamilyInvite.updateMany(
    { status: "pending", expiresAt: { $lt: now } },
    { $set: { status: "cancelled" } }
  );

  const [incoming, outgoing] = await Promise.all([
    FamilyInvite.find({
      toUserId: session.id,
      status: "pending",
      expiresAt: { $gt: now },
    })
      .sort({ createdAt: -1 })
      .populate("fromUserId", "name email"),
    FamilyInvite.find({
      fromUserId: session.id,
      status: "pending",
      expiresAt: { $gt: now },
    })
      .sort({ createdAt: -1 })
      .populate("toUserId", "name email"),
  ]);

  return NextResponse.json({
    incoming: incoming.map((invite) => ({
      _id: invite._id.toString(),
      fromUserId: invite.fromUserId._id.toString(),
      fromUserName: (invite.fromUserId as { name?: string }).name ?? "",
      fromUserEmail: (invite.fromUserId as { email?: string }).email ?? "",
      status: invite.status,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString(),
    })),
    outgoing: outgoing.map((invite) => ({
      _id: invite._id.toString(),
      toUserId: invite.toUserId._id.toString(),
      toUserName: (invite.toUserId as { name?: string }).name ?? "",
      toUserEmail: (invite.toUserId as { email?: string }).email ?? "",
      status: invite.status,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString(),
    })),
  });
}
