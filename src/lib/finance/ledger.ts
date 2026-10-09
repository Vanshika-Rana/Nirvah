import type { Category, Transaction } from "@/lib/types";
import { categoryById } from "@/lib/finance/classify";
import { roundMoney } from "@/lib/finance/money";

export const LEDGER_STARTER_CATEGORIES: { name: string; bucket: "income" | "personal" | "business"; sort_order: number }[] = [
  { name: "Salary", bucket: "income", sort_order: 10 },
  { name: "Customer payment", bucket: "income", sort_order: 11 },
  { name: "Other income", bucket: "income", sort_order: 12 },
  { name: "Groceries", bucket: "personal", sort_order: 20 },
  { name: "Fuel", bucket: "personal", sort_order: 21 },
  { name: "Medical", bucket: "personal", sort_order: 22 },
  { name: "Materials", bucket: "business", sort_order: 30 },
  { name: "Staff", bucket: "business", sort_order: 31 },
  { name: "Travel", bucket: "business", sort_order: 32 },
];

export type LedgerSummary = {
  income: number;
  expenses: number;
  remaining: number;
  personal: number;
  business: number;
  categoryTotals: { name: string; amount: number; bucket: string }[];
};

export function summarizeLedger(
  transactions: Pick<Transaction, "type" | "amount" | "category_id">[],
  categories: Pick<Category, "id" | "name" | "bucket">[],
): LedgerSummary {
  let income = 0;
  let expenses = 0;
  let personal = 0;
  let business = 0;
  const byCategory = new Map<string, { name: string; amount: number; bucket: string }>();

  for (const transaction of transactions) {
    const amount = Number(transaction.amount);
    if (transaction.type === "income") {
      income += amount;
      continue;
    }
    if (transaction.type !== "expense") continue;
    expenses += amount;
    const category = categoryById(categories, transaction.category_id);
    const bucket = category?.bucket ?? "other";
    if (bucket === "personal") personal += amount;
    if (bucket === "business") business += amount;
    const key = category?.id ?? "uncategorized";
    const current = byCategory.get(key) ?? {
      name: category?.name ?? "Uncategorized",
      amount: 0,
      bucket,
    };
    current.amount += amount;
    byCategory.set(key, current);
  }

  return {
    income: roundMoney(income),
    expenses: roundMoney(expenses),
    remaining: roundMoney(income - expenses),
    personal: roundMoney(personal),
    business: roundMoney(business),
    categoryTotals: [...byCategory.values()]
      .map((row) => ({ ...row, amount: roundMoney(row.amount) }))
      .sort((a, b) => b.amount - a.amount),
  };
}
