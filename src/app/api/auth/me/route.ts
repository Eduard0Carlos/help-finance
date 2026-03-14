import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getFamilyPartner } from "@/lib/family";

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  await connectDB();
  const user = await User.findById(session.id).select("-passwordHash");
  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  const familyPartner = await getFamilyPartner(session.id);

  return NextResponse.json({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    profileImage: user.profileImage ?? null,
    dailyLimit: user.dailyLimit,
    investmentGoal: user.investmentGoal,
    investmentProfile: user.investmentProfile,
    familyId: user.familyId ?? null,
    familyPartner,
  });
}
