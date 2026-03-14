export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(date));
}

export function getMonthName(month: number): string {
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  return months[month] ?? "";
}

export function groupTransactionsByDay<T extends { date: string }>(
  transactions: T[]
): { date: string; items: T[] }[] {
  const groups: Record<string, T[]> = {};

  for (const tx of transactions) {
    const day = tx.date.split("T")[0] ?? tx.date;
    if (!groups[day]) groups[day] = [];
    groups[day].push(tx);
  }

  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({ date, items }));
}

type ClassValue = string | undefined | null | false | Record<string, boolean>;

export function cn(...classes: ClassValue[]): string {
  return classes
    .flatMap((c) => {
      if (!c) return [];
      if (typeof c === "string") return [c];
      return Object.entries(c)
        .filter(([, v]) => v)
        .map(([k]) => k);
    })
    .join(" ");
}

export function maskValue(value: string, hidden: boolean): string {
  if (!hidden) return value;
  return "R$ ***********";
}

export function getMonthRange(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export function getLast12Months(): { year: number; month: number; label: string }[] {
  const months = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: getMonthName(d.getMonth()),
    });
  }
  return months;
}

export function getCategoryColor(category: string): string {
  const map: Record<string, string> = {
    comida: "#00d4aa",
    contas: "#a855f7",
    lazer: "#3b82f6",
    saude: "#22c55e",
    transporte: "#f59e0b",
    educacao: "#ec4899",
    salario: "#22c55e",
    investimento: "#00d4aa",
    outros: "#6b7280",
  };
  return map[category] ?? "#6b7280";
}
