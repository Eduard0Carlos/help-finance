import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/mongodb";
import { Transaction } from "@/models/Transaction";
import { RecurringTransaction } from "@/models/RecurringTransaction";
import { getMonthRange } from "@/lib/utils";
import { getFamilyMemberIds } from "@/lib/family";
import { generateRecurringDates, toDateKey } from "@/lib/recurrence";

const recurrenceSchema = z.object({
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  interval: z.number().int().positive().default(1),
  endDate: z
    .string()
    .optional()
    .nullable()
    .transform((value) => (value && value.trim().length > 0 ? value : null)),
});

const createSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().positive(),
  category: z.string().min(1),
  description: z.string().min(1),
  date: z.string().min(1),
  recurrence: recurrenceSchema.optional(),
});

type RecurringTemplate = {
  _id: { toString: () => string };
  userId: { toString: () => string };
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  startDate: Date;
  endDate?: Date | null;
  excludedDates?: string[];
  createdAt: Date;
};

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

function buildRecurringOccurrences(
  template: RecurringTemplate,
  rangeStart: Date,
  rangeEnd: Date
) {
  const generatedDates = generateRecurringDates(
    {
      frequency: template.frequency,
      interval: template.interval,
      startDate: template.startDate,
      endDate: template.endDate ?? null,
    },
    rangeStart,
    rangeEnd
  );
  const excluded = new Set(template.excludedDates ?? []);
  const dates = generatedDates.filter((date) => !excluded.has(toDateKey(date)));

  return dates.map((date) => ({
      _id: `recurring:${template._id.toString()}:${toDateKey(date)}`,
      userId: template.userId.toString(),
      type: template.type,
      amount: template.amount,
      category: template.category,
      description: template.description,
      date: date.toISOString(),
      createdAt: template.createdAt.toISOString(),
      isRecurring: true,
      recurringTemplateId: template._id.toString(),
      recurrence: {
        frequency: template.frequency,
        interval: template.interval > 0 ? template.interval : 1,
        endDate: template.endDate ? new Date(template.endDate).toISOString() : null,
      },
    }));
}

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth()));

  await connectDB();
  const { start, end } = getMonthRange(year, month);
  const memberIds = await getFamilyMemberIds(session.id);

  const [transactions, recurringTemplates] = await Promise.all([
    Transaction.find({
      userId: { $in: memberIds },
      date: { $gte: start, $lte: end },
    }).sort({ date: -1 }),
    RecurringTransaction.find({
      userId: { $in: memberIds },
      startDate: { $lte: end },
      $or: [{ endDate: null }, { endDate: { $exists: false } }, { endDate: { $gte: start } }],
    }).sort({ startDate: -1 }),
  ]);

  const oneTimeTransactions = transactions.map((tx) => ({
    ...tx.toObject(),
    isRecurring: false,
  }));

  const recurringOccurrences = recurringTemplates.flatMap((template) =>
    buildRecurringOccurrences(template as unknown as RecurringTemplate, start, end)
  );

  const merged = [...oneTimeTransactions, ...recurringOccurrences].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return NextResponse.json(merged);
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
  const startDate = parseDateInput(parsed.data.date);
  if (!startDate) {
    return NextResponse.json({ error: "Data inválida" }, { status: 400 });
  }

  if (!parsed.data.recurrence) {
    const transaction = await Transaction.create({
      userId: session.id,
      type: parsed.data.type,
      amount: parsed.data.amount,
      category: parsed.data.category,
      description: parsed.data.description,
      date: startDate,
    });
    return NextResponse.json(transaction, { status: 201 });
  }

  const recurrenceEndDate = parsed.data.recurrence.endDate
    ? parseDateInput(parsed.data.recurrence.endDate)
    : null;

  if (parsed.data.recurrence.endDate && !recurrenceEndDate) {
    return NextResponse.json({ error: "Data final inválida" }, { status: 400 });
  }
  if (recurrenceEndDate && recurrenceEndDate < startDate) {
    return NextResponse.json(
      { error: "Data final da recorrência deve ser maior que a data inicial" },
      { status: 400 }
    );
  }

  const recurringTemplate = await RecurringTransaction.create({
    userId: session.id,
    type: parsed.data.type,
    amount: parsed.data.amount,
    category: parsed.data.category,
    description: parsed.data.description,
    frequency: parsed.data.recurrence.frequency,
    interval: parsed.data.recurrence.interval,
    startDate,
    endDate: recurrenceEndDate,
  });

  return NextResponse.json(
    {
      ...recurringTemplate.toObject(),
      isRecurringTemplate: true,
    },
    { status: 201 }
  );
}
