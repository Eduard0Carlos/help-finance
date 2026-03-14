import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const tickers = searchParams.get("tickers");

  if (!tickers) {
    return NextResponse.json({ error: "Tickers obrigatórios" }, { status: 400 });
  }

  const token = process.env.BRAPI_TOKEN;
  const url = `https://brapi.dev/api/quote/${tickers}${token ? `?token=${token}` : ""}`;

  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error("Brapi request failed");
    const data = await res.json();
    return NextResponse.json(data.results ?? []);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
