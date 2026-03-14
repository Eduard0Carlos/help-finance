import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/mongodb";
import { getFamilyMemberIds } from "@/lib/family";
import { Transaction } from "@/models/Transaction";
import { RecurringTransaction } from "@/models/RecurringTransaction";
import { generateRecurringDates } from "@/lib/recurrence";

function getMonthBounds(baseYear: number, baseMonth: number, offset: number) {
  const start = new Date(baseYear, baseMonth + offset, 1, 0, 0, 0, 0);
  const end = new Date(baseYear, baseMonth + offset + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
  })
    .format(date)
    .replace(".", "")
    .toUpperCase();
}

function parseMonths(value: string | null): number {
  const parsed = Number.parseInt(value ?? "0", 10);
  if (Number.isNaN(parsed)) return 0;
  return Math.min(120, Math.max(0, parsed));
}

function parseInitialBalance(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const monthsBack = parseMonths(searchParams.get("monthsBack"));
  const monthsForward = parseMonths(searchParams.get("monthsForward"));
  const initialBalanceParam = parseInitialBalance(searchParams.get("initialBalance"));

  await connectDB();
  const memberIds = await getFamilyMemberIds(session.id);
  const now = new Date();

  const firstProjectedMonthStart = getMonthBounds(now.getFullYear(), now.getMonth(), -monthsBack).start;
  const lastProjectedMonth = getMonthBounds(now.getFullYear(), now.getMonth(), monthsForward).end;
  const beforeRangeEnd = new Date(firstProjectedMonthStart.getTime() - 1);

  const [rangeTransactions, beforeRangeTransactions, recurringTemplates, recurringTemplatesBeforeRange] =
    await Promise.all([
    Transaction.find({
      userId: { $in: memberIds },
      date: { $gte: firstProjectedMonthStart, $lte: lastProjectedMonth },
    }),
    Transaction.find({
      userId: { $in: memberIds },
      date: { $lt: firstProjectedMonthStart },
    }),
    RecurringTransaction.find({
      userId: { $in: memberIds },
      startDate: { $lte: lastProjectedMonth },
      $or: [
        { endDate: null },
        { endDate: { $exists: false } },
        { endDate: { $gte: firstProjectedMonthStart } },
      ],
    }),
    RecurringTransaction.find({
      userId: { $in: memberIds },
      startDate: { $lte: beforeRangeEnd },
    }),
    ]);

  const recurringBeforeRangeBalance = recurringTemplatesBeforeRange.reduce((sum, template) => {
    const dates = generateRecurringDates(
      {
        frequency: template.frequency,
        interval: template.interval,
        startDate: template.startDate,
        endDate: template.endDate ?? null,
      },
      template.startDate,
      beforeRangeEnd
    );
    const factor = template.type === "income" ? 1 : -1;
    return sum + dates.length * template.amount * factor;
  }, 0);

  const oneTimeBeforeRangeBalance = beforeRangeTransactions.reduce((sum, tx) => {
    return sum + (tx.type === "income" ? tx.amount : -tx.amount);
  }, 0);

  const automaticInitialBalance = oneTimeBeforeRangeBalance + recurringBeforeRangeBalance;
  const initialBalance = initialBalanceParam ?? automaticInitialBalance;

  const oneTimeByMonth = rangeTransactions.reduce<Record<string, { income: number; expense: number }>>(
    (acc, tx) => {
      const date = new Date(tx.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!acc[key]) acc[key] = { income: 0, expense: 0 };
      if (tx.type === "income") acc[key]!.income += tx.amount;
      else acc[key]!.expense += tx.amount;
      return acc;
    },
    {}
  );

  const rows = [];
  let runningBalance = initialBalance;

  for (let offset = -monthsBack; offset <= monthsForward; offset++) {
    const { start, end } = getMonthBounds(now.getFullYear(), now.getMonth(), offset);
    const recurringIncome = recurringTemplates.reduce((sum, template) => {
      if (template.type !== "income") return sum;
      const dates = generateRecurringDates(
        {
          frequency: template.frequency,
          interval: template.interval,
          startDate: template.startDate,
          endDate: template.endDate ?? null,
        },
        start,
        end
      );
      return sum + dates.length * template.amount;
    }, 0);

    const recurringExpense = recurringTemplates.reduce((sum, template) => {
      if (template.type !== "expense") return sum;
      const dates = generateRecurringDates(
        {
          frequency: template.frequency,
          interval: template.interval,
          startDate: template.startDate,
          endDate: template.endDate ?? null,
        },
        start,
        end
      );
      return sum + dates.length * template.amount;
    }, 0);

    const monthKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
    const oneTimeIncome = oneTimeByMonth[monthKey]?.income ?? 0;
    const oneTimeExpense = oneTimeByMonth[monthKey]?.expense ?? 0;
    const income = recurringIncome + oneTimeIncome;
    const expense = recurringExpense + oneTimeExpense;

    const monthBalance = income - expense;
    runningBalance += monthBalance;

    rows.push({
      monthKey,
      label: monthLabel(start),
      income,
      expense,
      monthBalance,
      finalBalance: runningBalance,
    });
  }

  const summary = {
    totalIncome: rows.reduce((sum, row) => sum + row.income, 0),
    totalExpense: rows.reduce((sum, row) => sum + row.expense, 0),
    projectedFinalBalance: rows.length > 0 ? rows[rows.length - 1]?.finalBalance ?? initialBalance : initialBalance,
  };

  return NextResponse.json({
    monthsBack,
    monthsForward,
    currentMonthKey: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    initialBalance,
    automaticInitialBalance,
    includesOneTimeTransactions: true,
    rows,
    summary,
  });
}
