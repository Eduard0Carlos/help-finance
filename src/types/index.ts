export interface IUser {
  _id: string;
  name: string;
  email: string;
  profileImage?: string;
  dailyLimit: number;
  investmentGoal: number;
  investmentProfile: number; // 1-5
  createdAt: string;
}

export type TransactionType = "income" | "expense";

export interface ITransaction {
  _id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
  createdAt: string;
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
