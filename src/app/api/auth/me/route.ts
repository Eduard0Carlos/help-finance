import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getFamilyPartner } from "@/lib/family";

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
  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  const familyPartner = await getFamilyPartner(session.id);
  let sharedSource = user;
  if (user.familyId) {
    const firstFamilyMember = await User.findOne({ familyId: user.familyId })
      .select("monthlyFamilyLimit dailyLimit createdAt")
      .sort({ createdAt: 1 });
    if (firstFamilyMember) sharedSource = firstFamilyMember;
  }

  return NextResponse.json({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    profileImage: user.profileImage ?? null,
    monthlyFamilyLimit: resolveMonthlyFamilyLimit(sharedSource.toObject()),
    investmentGoal: user.investmentGoal,
    investmentProfile: user.investmentProfile,
    familyId: user.familyId ?? null,
    familyPartner,
  });
}
