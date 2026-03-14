import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/mongodb";
import { Investment } from "@/models/Investment";

const createSchema = z.object({
  ticker: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["acao", "fundo", "international", "renda_fixa"]),
  quantity: z.number().positive(),
  averagePrice: z.number().positive(),
  purchaseDate: z.string(),
});

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  await connectDB();
  const investments = await Investment.find({ userId: session.id }).sort({ createdAt: -1 });
  return NextResponse.json(investments);
}

export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  await connectDB();
  const investment = await Investment.create({
    userId: session.id,
    ...parsed.data,
    ticker: parsed.data.ticker.toUpperCase(),
    purchaseDate: new Date(parsed.data.purchaseDate),
  });

  return NextResponse.json(investment, { status: 201 });
}
