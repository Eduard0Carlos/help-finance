import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

const updateSchema = z
  .object({
    dailyLimit: z.number().positive().optional(),
    investmentGoal: z.number().positive().optional(),
    investmentProfile: z.number().min(1).max(5).optional(),
  })
  .partial();

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  await connectDB();
  const user = await User.findById(session.id).select("-passwordHash");
  if (!user) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  return NextResponse.json(user);
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
  const user = await User.findByIdAndUpdate(
    session.id,
    { $set: parsed.data },
    { new: true, select: "-passwordHash" }
  );

  return NextResponse.json(user);
}
