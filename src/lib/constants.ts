import type { PaymentMethod } from "@/lib/types";

export const APP_NAME = "Nirvah";
export const APP_TAGLINE = "Personal budget tracker";

export const DEFAULT_WEEK_START_DAY = 1;

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  upi: "UPI",
  debit_card: "Debit card",
  credit_card: "Credit card",
  cash: "Cash",
  bank_transfer: "Bank transfer",
  other: "Other",
};

export const TRANSACTION_TYPE_LABELS: Record<
  "income" | "expense" | "transfer" | "repayment",
  string
> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
  repayment: "Card repayment",
};

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const HISTORY_PAGE_SIZE = 50;
