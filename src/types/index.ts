export interface IUser {
  _id: string;
  name: string;
  email: string;
  profileImage?: string;
  monthlyFamilyLimit: number;
  investmentGoal: number;
  investmentProfile: number; // 1-5
  familyId?: string | null;
  createdAt: string;
}

export interface IFamilyInvite {
  _id: string;
  fromUserId: string;
  toUserId: string;
  fromUserName?: string;
  fromUserEmail?: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  expiresAt: string;
  createdAt: string;
}

export type TransactionType = "income" | "expense";
export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";

export interface ITransactionRecurrence {
  frequency: RecurrenceFrequency;
  interval: number;
  endDate?: string | null;
}

export interface ITransaction {
  _id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
  createdAt: string;
  isRecurring?: boolean;
  recurringTemplateId?: string;
  recurrence?: ITransactionRecurrence;
}

export interface ITransactionUpdateInput {
  type?: TransactionType;
  amount?: number;
  category?: string;
  description?: string;
  date?: string;
}

export interface IMonthReference {
  key: string;
  year: number;
  month: number;
  label: string;
}

export interface IFinancialSheetRow {
  key: string;
  title: string;
  rowType: "summary" | "category";
  valuesByMonth: Record<string, number>;
}

export type InvestmentType = "acao" | "fundo" | "international" | "renda_fixa";

export interface IInvestment {
  _id: string;
  userId: string;
  ticker: string;
  name: string;
  type: InvestmentType;
  quantity: number;
  averagePrice: number;
  purchaseDate: string;
  createdAt: string;
  // enriched at runtime from brapi
  currentPrice?: number;
  change?: number;
  changePercent?: number;
}

export interface IBrapiQuote {
  symbol: string;
  shortName: string;
  longName: string;
  currency: string;
  regularMarketPrice: number;
  regularMarketChangePercent: number;
  regularMarketChange: number;
}

export interface IDailySummary {
  date: string;
  transactions: ITransaction[];
}

export interface IPeriodSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  daysWithinLimit: number;
  totalDays: number;
}

export interface ICategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface IChartDataPoint {
  label: string;
  value: number;
}

export interface IProjectionMonth {
  monthKey: string;
  label: string;
  income: number;
  expense: number;
  monthBalance: number;
  finalBalance: number;
}

export interface IProjectionSummary {
  totalIncome: number;
  totalExpense: number;
  projectedFinalBalance: number;
}

export interface IProjectionResponse {
  monthsBack: number;
  monthsForward: number;
  currentMonthKey: string;
  initialBalance: number;
  automaticInitialBalance: number;
  includesOneTimeTransactions: boolean;
  rows: IProjectionMonth[];
  summary: IProjectionSummary;
}

export const TRANSACTION_CATEGORIES = [
  { value: "comida", label: "Comida", color: "#00d4aa" },
  { value: "contas", label: "Contas", color: "#a855f7" },
  { value: "lazer", label: "Lazer", color: "#3b82f6" },
  { value: "saude", label: "Saúde", color: "#22c55e" },
  { value: "transporte", label: "Transporte", color: "#f59e0b" },
  { value: "educacao", label: "Educação", color: "#ec4899" },
  { value: "salario", label: "Salário", color: "#22c55e" },
  { value: "investimento", label: "Investimento", color: "#00d4aa" },
  { value: "outros", label: "Outros", color: "#6b7280" },
] as const;

export const RECURRENCE_FREQUENCIES = [
  { value: "daily", label: "Diária" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
  { value: "yearly", label: "Anual" },
] as const;

export const INVESTMENT_PROFILES = [
  { value: 1, label: "Conservador" },
  { value: 2, label: "Moderado Conservador" },
  { value: 3, label: "Moderado" },
  { value: 4, label: "Moderado Agressivo" },
  { value: 5, label: "Agressivo" },
] as const;

export const INVESTMENT_TYPES = [
  { value: "acao", label: "Ação" },
  { value: "fundo", label: "Fundo" },
  { value: "international", label: "Internacional" },
  { value: "renda_fixa", label: "Renda Fixa" },
] as const;
