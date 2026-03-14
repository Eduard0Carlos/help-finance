import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/mongodb";
import { RecurringTransaction } from "@/models/RecurringTransaction";
import { assertCanAccessResourceOwner } from "@/lib/family";

function isValidDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const mode = req.nextUrl.searchParams.get("mode");

  if (mode !== "series" && mode !== "occurrence") {
    return NextResponse.json({ error: "Modo inválido" }, { status: 400 });
  }

  await connectDB();

  const template = await RecurringTransaction.findById(id).select("_id userId");
  if (!template) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  const canAccess = await assertCanAccessResourceOwner(session.id, template.userId.toString());
  if (!canAccess) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  if (mode === "series") {
    await RecurringTransaction.deleteOne({ _id: template._id });
    return NextResponse.json({ success: true, mode: "series" });
  }

  const dateKey = req.nextUrl.searchParams.get("dateKey");
  if (!dateKey || !isValidDateKey(dateKey)) {
    return NextResponse.json({ error: "dateKey inválido" }, { status: 400 });
  }

  await RecurringTransaction.updateOne(
    { _id: template._id },
    { $addToSet: { excludedDates: dateKey } }
  );

  return NextResponse.json({ success: true, mode: "occurrence", dateKey });
}
