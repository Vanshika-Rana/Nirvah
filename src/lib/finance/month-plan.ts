import type { Category, Transaction } from "@/lib/types";
import { categoryById } from "@/lib/finance/classify";
import { budgetStatus, formatINR, percentUsed, roundMoney } from "@/lib/finance/money";

export const ENVELOPE_KINDS = ["spend", "save", "commit"] as const;
export type EnvelopeKind = (typeof ENVELOPE_KINDS)[number];

export const ENVELOPE_KIND_LABELS: Record<EnvelopeKind, string> = {
  spend: "Spending",
  save: "Savings",
  commit: "Bills & loans",
};

export type Envelope = {
  id: string;
  user_id: string;
  year_month: string;
  name: string;
  kind: EnvelopeKind;
  amount: number;
  category_id: string | null;
  sort_order: number;
};

export type Income = {
  id: string;
  user_id: string;
  year_month: string;
  label: string;
  amount: number;
  is_salary: boolean;
  occurred_on: string;
  created_at: string;
};

export function isSpendCategory(
  category: Pick<Category, "kind" | "bucket"> | null | undefined,
): boolean {
  if (!category) return false;
  if (category.kind === "save" || category.kind === "commit") return false;
  if (category.kind === "spend") return true;
  return category.bucket === "personal";
}

export function expenseOutflows(
  transactions: Pick<Transaction, "type" | "amount">[],
): number {
  return roundMoney(
    transactions.reduce((sum, transaction) => {
      if (transaction.type === "expense") return sum + transaction.amount;
      return sum;
    }, 0),
  );
}

export function spendInRange(
  transactions: Pick<Transaction, "type" | "amount" | "category_id" | "occurred_on">[],
  categories: Pick<Category, "id" | "kind" | "bucket">[],
  start: string,
  end: string,
): number {
  return roundMoney(
    transactions.reduce((sum, transaction) => {
      if (transaction.type !== "expense") return sum;
      if (transaction.occurred_on < start || transaction.occurred_on > end) return sum;
      const category = categoryById(categories, transaction.category_id);
      if (!isSpendCategory(category)) return sum;
      return sum + transaction.amount;
    }, 0),
  );
}

export function spentOnEnvelope(
  transactions: Pick<Transaction, "type" | "amount" | "category_id">[],
  envelope: Pick<Envelope, "category_id" | "name">,
  categories: Pick<Category, "id" | "name">[],
): number {
  return roundMoney(
    transactions.reduce((sum, transaction) => {
      if (transaction.type !== "expense") return sum;
      if (envelope.category_id && transaction.category_id === envelope.category_id) {
        return sum + transaction.amount;
      }
      const category = categoryById(categories, transaction.category_id);
      if (category && category.name.toLowerCase() === envelope.name.toLowerCase()) {
        return sum + transaction.amount;
      }
      return sum;
    }, 0),
  );
}

export function computeCarryOver(input: {
  opening: number;
  income: number;
  expenses: number;
}): number {
  return roundMoney(Math.max(0, input.opening + input.income - input.expenses));
}

export type MonthPlanSummary = {
  opening: number;
  income: number;
  available: number;
  allocated: number;
  expenses: number;
  remaining: number;
  remainingPercent: number;
  remainingStatus: ReturnType<typeof budgetStatus>;
  unallocated: number;
  carryToNextMonth: number;
  savedThisMonth: number;
  saveRate: number;
  weeklySpendCap: number;
  motivation: string;
  envelopes: {
    id: string;
    name: string;
    kind: EnvelopeKind;
    planned: number;
    spent: number;
    remaining: number;
    percent: number;
    status: ReturnType<typeof budgetStatus>;
  }[];
};

export function summarizeMonthPlan(input: {
  opening: number;
  incomes: Pick<Income, "amount">[];
  envelopes: Envelope[];
  transactions: Pick<Transaction, "type" | "amount" | "category_id">[];
  categories: Pick<Category, "id" | "name" | "kind" | "bucket">[];
}): MonthPlanSummary {
  const income = roundMoney(input.incomes.reduce((sum, row) => sum + row.amount, 0));
  const expenses = expenseOutflows(input.transactions);
  const available = roundMoney(input.opening + income);
  const allocated = roundMoney(input.envelopes.reduce((sum, row) => sum + row.amount, 0));
  const remaining = roundMoney(available - expenses);
  const carryToNextMonth = computeCarryOver({ opening: input.opening, income, expenses });
  const savedThisMonth = roundMoney(Math.max(0, income - expenses));
  const saveRate = income > 0 ? percentUsed(savedThisMonth, income) : 0;
  const remainingPercent = percentUsed(expenses, Math.max(available, 1));
  const weeklySpendCap = roundMoney(
    input.envelopes.filter((row) => row.kind === "spend").reduce((sum, row) => sum + row.amount, 0),
  );

  const envelopes = input.envelopes.map((envelope) => {
    const spent = spentOnEnvelope(input.transactions, envelope, input.categories);
    const leftover = roundMoney(envelope.amount - spent);
    const percent = percentUsed(spent, envelope.amount);
    return {
      id: envelope.id,
      name: envelope.name,
      kind: envelope.kind,
      planned: envelope.amount,
      spent,
      remaining: leftover,
      percent,
      status: budgetStatus(percent),
    };
  });

  let motivation = "Add salary on the day it arrived, then split it into envelopes. Your month runs until the next salary.";
  if (available > 0 && expenses === 0) {
    motivation = `You have ${formatINR(available)} to work with. Split it, then spend less than you planned — leftovers move to the next payday.`;
  } else if (remaining > 0 && saveRate >= 20) {
    motivation = `Strong payday so far. ${formatINR(carryToNextMonth)} is on track to roll into the next salary cycle.`;
  } else if (remaining > 0) {
    motivation = `${formatINR(remaining)} still in this payday’s pot. Every rupee you don't spend becomes the next cycle’s head start.`;
  } else if (available > 0) {
    motivation = "This payday’s pot is used up. Pause extra spending so the next salary can start with savings, not a hole.";
  }

  return {
    opening: input.opening,
    income,
    available,
    allocated,
    expenses,
    remaining,
    remainingPercent,
    remainingStatus: budgetStatus(remainingPercent),
    unallocated: roundMoney(available - allocated),
    carryToNextMonth,
    savedThisMonth,
    saveRate,
    weeklySpendCap,
    motivation,
    envelopes,
  };
}
