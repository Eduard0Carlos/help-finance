export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";

export interface RecurringDateInput {
  frequency: RecurrenceFrequency;
  interval: number;
  startDate: Date;
  endDate?: Date | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_STEPS = 5000;

export function toStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
  frequency: RecurrenceFrequency,
  interval: number,
  anchorDay: number
): Date {
  if (frequency === "daily") return addDays(date, interval);
  if (frequency === "weekly") return addDays(date, interval * 7);
  if (frequency === "monthly") return addMonthsClamped(date, interval, anchorDay);
  return addMonthsClamped(date, interval * 12, anchorDay);
}

export function generateRecurringDates(
  input: RecurringDateInput,
  rangeStart: Date,
  rangeEnd: Date
): Date[] {
  const start = toStartOfDay(rangeStart);
  const end = toStartOfDay(rangeEnd);
  const templateStart = toStartOfDay(new Date(input.startDate));
  const templateEnd = input.endDate ? toStartOfDay(new Date(input.endDate)) : null;

  if (templateEnd && templateEnd < start) return [];

  const hardEnd = templateEnd && templateEnd < end ? templateEnd : end;
  const anchorDay = templateStart.getDate();
  const interval = input.interval > 0 ? input.interval : 1;

  let current = templateStart;
  let steps = 0;

  if (input.frequency === "daily" && current < start) {
    const diffDays = Math.floor((start.getTime() - current.getTime()) / DAY_MS);
    const jumps = Math.floor(diffDays / interval);
    if (jumps > 0) current = addDays(current, jumps * interval);
  } else if (input.frequency === "weekly" && current < start) {
    const diffDays = Math.floor((start.getTime() - current.getTime()) / DAY_MS);
    const jumpDays = interval * 7;
    const jumps = Math.floor(diffDays / jumpDays);
    if (jumps > 0) current = addDays(current, jumps * jumpDays);
  }

  while (current < start && steps < MAX_STEPS) {
    current = addByFrequency(current, input.frequency, interval, anchorDay);
    steps++;
  }

  const dates: Date[] = [];
  while (current <= hardEnd && steps < MAX_STEPS) {
    dates.push(current);
    current = addByFrequency(current, input.frequency, interval, anchorDay);
    steps++;
  }

  return dates;
}
