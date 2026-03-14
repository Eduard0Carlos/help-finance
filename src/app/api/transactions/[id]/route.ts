import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/mongodb";
import { Transaction } from "@/models/Transaction";
import { assertCanAccessResourceOwner } from "@/lib/family";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  await connectDB();

  const tx = await Transaction.findById(id).select("_id userId");
  if (!tx) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const canAccess = await assertCanAccessResourceOwner(session.id, tx.userId.toString());
  if (!canAccess) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  await Transaction.deleteOne({ _id: tx._id });

  return NextResponse.json({ success: true });
}
