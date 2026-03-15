import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getFamilyMemberIds } from "@/lib/family";

const updateSchema = z
  .object({
    monthlyFamilyLimit: z.number().positive().optional(),
    investmentGoal: z.number().positive().optional(),
    investmentProfile: z.number().min(1).max(5).optional(),
  })
  .partial();

function resolveMonthlyFamilyLimit(doc: { monthlyFamilyLimit?: number; dailyLimit?: number }) {
  if (typeof doc.monthlyFamilyLimit === "number" && doc.monthlyFamilyLimit > 0) {
    return doc.monthlyFamilyLimit;
  }
  if (typeof doc.dailyLimit === "number" && doc.dailyLimit > 0) {
    return doc.dailyLimit * 30;
  }
  return 10500;
}

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  await connectDB();
  const user = await User.findById(session.id).select("-passwordHash");
  if (!user) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  if (!user.familyId) {
    return NextResponse.json({
      ...user.toObject(),
      monthlyFamilyLimit: resolveMonthlyFamilyLimit(user.toObject()),
    });
  }

  const members = await User.find({ familyId: user.familyId })
    .select("-passwordHash")
    .sort({ createdAt: 1 });
  const sharedSource = members[0] ?? user;
  return NextResponse.json({
    ...user.toObject(),
    monthlyFamilyLimit: resolveMonthlyFamilyLimit(sharedSource.toObject()),
    investmentGoal: sharedSource.investmentGoal,
    investmentProfile: sharedSource.investmentProfile,
  });
}

export async function PATCH(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  await connectDB();
  const memberIds = await getFamilyMemberIds(session.id);
  const user = await User.findById(session.id).select("_id familyId");
  if (!user) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  if (user.familyId) {
    await User.updateMany(
      { _id: { $in: memberIds } },
      { $set: parsed.data }
    );
    const updated = await User.findById(session.id).select("-passwordHash");
    return NextResponse.json(updated);
  }

  const updated = await User.findByIdAndUpdate(
    session.id,
    { $set: parsed.data },
    { new: true, select: "-passwordHash" }
  );

  return NextResponse.json(updated);
}
