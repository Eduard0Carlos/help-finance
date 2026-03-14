import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/mongodb";
import { Investment } from "@/models/Investment";

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

  const inv = await Investment.findOneAndDelete({
    _id: id,
    userId: session.id,
  });

  if (!inv) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json({ success: true });
}
