import type { Category, MonthlyBudget, Transaction } from "@/lib/types";
import { spendInRange } from "@/lib/finance/month-plan";
import { formatINR, roundMoney } from "@/lib/finance/money";
import {
  diffDays,
  eachDay,
  minISODate,
  monthRange,
  weekRange,
  type WeekStartDay,
} from "@/lib/finance/dates";

export type WeeklyAvailability = {
  weeklyTarget: number;
  spentThisWeek: number;
  remainingVsWeeklyTarget: number;
  remainingMonthly: number;
  remainingDaysInMonth: number;
  remainingDaysInWeek: number;
  availableThisWeek: number;
  suggestedDaily: number;
  monthlyCapApplies: boolean;
  warning: string | null;
};

export function personalSpentInRange(
  transactions: Pick<Transaction, "type" | "amount" | "category_id" | "occurred_on">[],
  categories: Pick<Category, "id" | "bucket" | "kind">[],
  start: string,
  end: string,
): number {
  return spendInRange(transactions, categories, start, end);
}

export function dailyPersonalSpending(
  transactions: Pick<Transaction, "type" | "amount" | "category_id" | "occurred_on">[],
  categories: Pick<Category, "id" | "bucket" | "kind">[],
  start: string,
  end: string,
): { date: string; amount: number }[] {
  return eachDay(start, end).map((date) => ({
    date,
    amount: personalSpentInRange(transactions, categories, date, date),
  }));
}

export function computeWeeklyAvailability(input: {
  weeklyTarget: number;
  spentThisWeek: number;
  personalLimit: number;
  monthToDatePersonal: number;
  today: string;
  weekEnd: string;
  monthEnd: string;
}): WeeklyAvailability {
  const remainingMonthly = roundMoney(input.personalLimit - input.monthToDatePersonal);
  const remainingDaysInMonth = Math.max(0, diffDays(input.today, input.monthEnd) + 1);
  const cappedWeekEnd = minISODate(input.weekEnd, input.monthEnd);
  const remainingDaysInWeek = Math.max(0, diffDays(input.today, cappedWeekEnd) + 1);
  const remainingVsWeeklyTarget = roundMoney(input.weeklyTarget - input.spentThisWeek);
  const availableThisWeek = roundMoney(
    Math.max(0, Math.min(remainingVsWeeklyTarget, remainingMonthly)),
  );
  const suggestedDaily =
    remainingDaysInMonth > 0 ? roundMoney(Math.max(0, remainingMonthly) / remainingDaysInMonth) : 0;
  const monthlyCapApplies = remainingMonthly < Math.max(remainingVsWeeklyTarget, 0);

  let warning: string | null = null;
  if (remainingMonthly <= 0) {
    warning =
      "This month's remaining money is used up. The monthly pot takes priority over the weekly target.";
  } else if (monthlyCapApplies) {
    warning = `You have ${formatINR(Math.max(0, remainingMonthly))} left this month. That leftover takes priority over the usual weekly target.`;
  }

  return {
    weeklyTarget: input.weeklyTarget,
    spentThisWeek: roundMoney(input.spentThisWeek),
    remainingVsWeeklyTarget,
    remainingMonthly,
    remainingDaysInMonth,
    remainingDaysInWeek,
    availableThisWeek,
    suggestedDaily,
    monthlyCapApplies,
    warning,
  };
}

export function weekSummaries(
  transactions: Pick<Transaction, "type" | "amount" | "category_id" | "occurred_on">[],
  categories: Pick<Category, "id" | "bucket" | "kind">[],
  budget: Pick<MonthlyBudget, "weekly_target" | "personal_limit" | "year_month">,
  weeks: { start: string; end: string }[],
): { start: string; end: string; spent: number; target: number }[] {
  return weeks.map((week) => ({
    ...week,
    spent: personalSpentInRange(transactions, categories, week.start, week.end),
    target: budget.weekly_target,
  }));
}

export function recentWeeks(
  today: string,
  weekStartsOn: WeekStartDay,
  count: number,
): { start: string; end: string }[] {
  const current = weekRange(today, weekStartsOn);
  const weeks: { start: string; end: string }[] = [];
  const startDate = new Date(
    Number(current.start.slice(0, 4)),
    Number(current.start.slice(5, 7)) - 1,
    Number(current.start.slice(8, 10)),
  );
  for (let i = count - 1; i >= 0; i -= 1) {
    const cursor = new Date(startDate);
    cursor.setDate(startDate.getDate() - i * 7);
    weeks.push(weekRange(cursor, weekStartsOn));
  }
  return weeks;
}

export function monthToDatePersonalSpending(
  transactions: Pick<Transaction, "type" | "amount" | "category_id" | "occurred_on">[],
  categories: Pick<Category, "id" | "bucket" | "kind">[],
  yearMonth: string,
  today: string,
): number {
  const { start } = monthRange(yearMonth);
  const end = minISODate(monthRange(yearMonth).end, today);
  return personalSpentInRange(transactions, categories, start, end);
}
