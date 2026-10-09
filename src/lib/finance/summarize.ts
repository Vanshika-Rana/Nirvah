import type { Category, MonthlyBudget, Transaction } from "@/lib/types";
import {
  budgetStatus,
  percentUsed,
  roundMoney,
} from "@/lib/finance/money";
import {
  bucketTotal,
  categoryById,
  countsAsCombinedSpending,
  countsAsFamilySpending,
  countsAsPersonalSpending,
} from "@/lib/finance/classify";
import { computeWeeklyAvailability } from "@/lib/finance/weekly";
import { monthRange, paydayWeekContaining, weekRange, type WeekStartDay } from "@/lib/finance/dates";

export type CategorySpend = {
  categoryId: string;
  name: string;
  bucket: Category["bucket"];
  amount: number;
};

export type DashboardSummary = {
  yearMonth: string;
  personalLimit: number;
  personalSpent: number;
  personalRemaining: number;
  personalPercent: number;
  personalStatus: ReturnType<typeof budgetStatus>;
  familyLimit: number;
  familySpent: number;
  familyRemaining: number;
  familyPercent: number;
  familyStatus: ReturnType<typeof budgetStatus>;
  combinedLimit: number;
  combinedSpent: number;
  combinedRemaining: number;
  combinedPercent: number;
  combinedStatus: ReturnType<typeof budgetStatus>;
  weeklySpent: number;
  weeklyTarget: number;
  weeklyRemaining: number;
  weeklyPercent: number;
  weeklyStatus: ReturnType<typeof budgetStatus>;
  weeklyAvailability: ReturnType<typeof computeWeeklyAvailability>;
  homeLoanSpent: number;
  creditCardBillSpent: number;
  sipSpent: number;
  savingsMoved: number;
  bufferSpent: number;
  incomeRecorded: number;
  categoryBreakdown: CategorySpend[];
  cashEstimate: number;
};

function inRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

export function sumByKind(
  transactions: Pick<Transaction, "type" | "amount" | "category_id" | "occurred_on">[],
  categories: Pick<Category, "id" | "bucket" | "name">[],
  start: string,
  end: string,
  kind: "personal" | "family" | "combined",
): number {
  return roundMoney(
    transactions.reduce((sum, transaction) => {
      if (!inRange(transaction.occurred_on, start, end)) return sum;
      const category = categoryById(categories, transaction.category_id);
      const bucket = category?.bucket;
      if (kind === "personal" && countsAsPersonalSpending(transaction.type, bucket)) {
        return sum + transaction.amount;
      }
      if (kind === "family" && countsAsFamilySpending(transaction.type, bucket)) {
        return sum + transaction.amount;
      }
      if (kind === "combined" && countsAsCombinedSpending(transaction.type, bucket)) {
        return sum + transaction.amount;
      }
      return sum;
    }, 0),
  );
}

export function categoryBreakdown(
  transactions: Pick<Transaction, "type" | "amount" | "category_id" | "occurred_on">[],
  categories: Pick<Category, "id" | "bucket" | "name">[],
  start: string,
  end: string,
): CategorySpend[] {
  const totals = new Map<string, CategorySpend>();
  for (const transaction of transactions) {
    if (transaction.type !== "expense") continue;
    if (!inRange(transaction.occurred_on, start, end)) continue;
    const category = categoryById(categories, transaction.category_id);
    if (!category) continue;
    const current = totals.get(category.id) ?? {
      categoryId: category.id,
      name: category.name,
      bucket: category.bucket,
      amount: 0,
    };
    current.amount = roundMoney(current.amount + transaction.amount);
    totals.set(category.id, current);
  }
  return [...totals.values()].sort((a, b) => b.amount - a.amount);
}

export function cashEstimateFromTransactions(
  transactions: Pick<Transaction, "type" | "amount">[],
): number {
  return roundMoney(
    transactions.reduce((sum, transaction) => {
      if (transaction.type === "income") return sum + transaction.amount;
      if (transaction.type === "expense") return sum - transaction.amount;
      return sum;
    }, 0),
  );
}

export function summarizeDashboard(input: {
  budget: MonthlyBudget;
  transactions: Transaction[];
  categories: Category[];
  today: string;
  weekStartsOn: WeekStartDay;
  cycleStart?: string | null;
}): DashboardSummary {
  const month = monthRange(input.budget.year_month);
  const week = input.cycleStart
    ? paydayWeekContaining(input.today, input.cycleStart, month.end) ?? {
        start: input.today,
        end: input.today,
      }
    : weekRange(input.today, input.weekStartsOn);
  const monthTransactions = input.transactions.filter((transaction) =>
    inRange(transaction.occurred_on, month.start, month.end),
  );

  const personalSpent = sumByKind(
    monthTransactions,
    input.categories,
    month.start,
    month.end,
    "personal",
  );
  const familySpent = sumByKind(
    monthTransactions,
    input.categories,
    month.start,
    month.end,
    "family",
  );
  const combinedSpent = roundMoney(personalSpent + familySpent);
  const weeklySpent = sumByKind(
    input.transactions,
    input.categories,
    week.start,
    week.end,
    "personal",
  );

  const personalRemaining = roundMoney(input.budget.personal_limit - personalSpent);
  const familyRemaining = roundMoney(input.budget.family_limit - familySpent);
  const combinedLimit = roundMoney(input.budget.personal_limit + input.budget.family_limit);
  const combinedRemaining = roundMoney(combinedLimit - combinedSpent);
  const personalPercent = percentUsed(personalSpent, input.budget.personal_limit);
  const familyPercent = percentUsed(familySpent, input.budget.family_limit);
  const combinedPercent = percentUsed(combinedSpent, combinedLimit);
  const weeklyPercent = percentUsed(weeklySpent, input.budget.weekly_target);

  const weeklyAvailability = computeWeeklyAvailability({
    weeklyTarget: input.budget.weekly_target,
    spentThisWeek: weeklySpent,
    personalLimit: input.budget.personal_limit,
    monthToDatePersonal: personalSpent,
    today: input.today,
    weekEnd: week.end,
    monthEnd: month.end,
  });

  return {
    yearMonth: input.budget.year_month,
    personalLimit: input.budget.personal_limit,
    personalSpent,
    personalRemaining,
    personalPercent,
    personalStatus: budgetStatus(personalPercent),
    familyLimit: input.budget.family_limit,
    familySpent,
    familyRemaining,
    familyPercent,
    familyStatus: budgetStatus(familyPercent),
    combinedLimit,
    combinedSpent,
    combinedRemaining,
    combinedPercent,
    combinedStatus: budgetStatus(combinedPercent),
    weeklySpent,
    weeklyTarget: input.budget.weekly_target,
    weeklyRemaining: weeklyAvailability.availableThisWeek,
    weeklyPercent,
    weeklyStatus: budgetStatus(
      percentUsed(weeklySpent, Math.max(weeklyAvailability.availableThisWeek + weeklySpent, 1)),
    ),
    weeklyAvailability,
    homeLoanSpent: bucketTotal(monthTransactions, input.categories, "home_loan"),
    creditCardBillSpent: monthTransactions
      .filter((transaction) => transaction.type === "repayment")
      .reduce((sum, transaction) => sum + transaction.amount, 0),
    sipSpent: bucketTotal(monthTransactions, input.categories, "sip"),
    savingsMoved:
      bucketTotal(monthTransactions, input.categories, "savings") +
      monthTransactions
        .filter((transaction) => {
          const category = categoryById(input.categories, transaction.category_id);
          return transaction.type === "transfer" && category?.bucket === "savings";
        })
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    bufferSpent: bucketTotal(monthTransactions, input.categories, "buffer"),
    incomeRecorded: monthTransactions
      .filter((transaction) => transaction.type === "income")
      .reduce((sum, transaction) => sum + transaction.amount, 0),
    categoryBreakdown: categoryBreakdown(
      monthTransactions,
      input.categories,
      month.start,
      month.end,
    ),
    cashEstimate: cashEstimateFromTransactions(monthTransactions),
  };
}
