import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/mongodb";
import { Transaction } from "@/models/Transaction";
import { assertCanAccessResourceOwner } from "@/lib/family";

const updateSchema = z
  .object({
    type: z.enum(["income", "expense"]).optional(),
    amount: z.number().positive().optional(),
    category: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    date: z.string().min(1).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Nenhum campo para atualizar",
  });

function parseDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number.parseInt(match[1] ?? "", 10);
  const month = Number.parseInt(match[2] ?? "", 10);
  const day = Number.parseInt(match[3] ?? "", 10);
  if (!year || !month || !day) return null;

  const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  if (id.startsWith("recurring:")) {
    return NextResponse.json(
      { error: "Itens recorrentes virtuais não podem ser editados aqui" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  await connectDB();
  const tx = await Transaction.findById(id).select("_id userId");
  if (!tx) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const canAccess = await assertCanAccessResourceOwner(session.id, tx.userId.toString());
  if (!canAccess) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.date) {
    const parsedDate = parseDateInput(parsed.data.date);
    if (!parsedDate) {
      return NextResponse.json({ error: "Data inválida" }, { status: 400 });
    }
    updateData.date = parsedDate;
  }

  const updated = await Transaction.findByIdAndUpdate(tx._id, updateData, { new: true });
  return NextResponse.json(updated);
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
