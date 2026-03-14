import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/mongodb";
import { Transaction } from "@/models/Transaction";
import { RecurringTransaction } from "@/models/RecurringTransaction";
import { getMonthRange } from "@/lib/utils";
import { getFamilyMemberIds } from "@/lib/family";

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
  createdAt: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_STEPS = 5000;

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

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function addMonthsClamped(date: Date, months: number, anchorDay: number): Date {
  const year = date.getFullYear();
  const month = date.getMonth() + months;
  const safeDay = Math.min(anchorDay, getDaysInMonth(year, month));
  return new Date(year, month, safeDay);
}

function addByFrequency(
  date: Date,
  frequency: RecurringTemplate["frequency"],
  interval: number,
  anchorDay: number
): Date {
  if (frequency === "daily") return addDays(date, interval);
  if (frequency === "weekly") return addDays(date, interval * 7);
  if (frequency === "monthly") return addMonthsClamped(date, interval, anchorDay);
  return addMonthsClamped(date, interval * 12, anchorDay);
}

function buildRecurringOccurrences(
  template: RecurringTemplate,
  rangeStart: Date,
  rangeEnd: Date
) {
  const start = toStartOfDay(rangeStart);
  const end = toStartOfDay(rangeEnd);
  const templateStart = toStartOfDay(new Date(template.startDate));
  const templateEnd = template.endDate ? toStartOfDay(new Date(template.endDate)) : null;

  if (templateEnd && templateEnd < start) return [];

  const hardEnd = templateEnd && templateEnd < end ? templateEnd : end;
  const anchorDay = templateStart.getDate();
  const interval = template.interval > 0 ? template.interval : 1;

  let current = templateStart;
  let steps = 0;

  // Fast-forward daily/weekly recurrences to month range start.
  if (template.frequency === "daily" && current < start) {
    const diffDays = Math.floor((start.getTime() - current.getTime()) / DAY_MS);
    const jumps = Math.floor(diffDays / interval);
    if (jumps > 0) current = addDays(current, jumps * interval);
  } else if (template.frequency === "weekly" && current < start) {
    const diffDays = Math.floor((start.getTime() - current.getTime()) / DAY_MS);
    const jumpDays = interval * 7;
    const jumps = Math.floor(diffDays / jumpDays);
    if (jumps > 0) current = addDays(current, jumps * jumpDays);
  }

  while (current < start && steps < MAX_STEPS) {
    current = addByFrequency(current, template.frequency, interval, anchorDay);
    steps++;
  }

  const occurrences = [];
  while (current <= hardEnd && steps < MAX_STEPS) {
    occurrences.push({
      _id: `recurring:${template._id.toString()}:${toDateKey(current)}`,
      userId: template.userId.toString(),
      type: template.type,
      amount: template.amount,
      category: template.category,
      description: template.description,
      date: current.toISOString(),
      createdAt: template.createdAt.toISOString(),
      isRecurring: true,
      recurringTemplateId: template._id.toString(),
      recurrence: {
        frequency: template.frequency,
        interval,
        endDate: templateEnd ? templateEnd.toISOString() : null,
      },
    });

    current = addByFrequency(current, template.frequency, interval, anchorDay);
    steps++;
  }

  return occurrences;
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
