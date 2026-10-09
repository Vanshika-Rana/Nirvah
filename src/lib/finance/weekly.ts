import type { Category, MonthlyBudget, Transaction } from "@/lib/types";
import { spendInRange } from "@/lib/finance/month-plan";
import { formatINR, roundMoney } from "@/lib/finance/money";
import {
  diffDays,
  eachDay,
  minISODate,
  monthRange,
} from "@/lib/finance/dates";

export type WeeklyAvailability = {
  weeklyTarget: number;
  spentThisWeek: number;
  remainingVsWeeklyTarget: number;
  remainingMonthly: number;
  remainingDaysInCycle: number;
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
  cycleEnd: string;
  paceEnd?: string;
}): WeeklyAvailability {
  const remainingMonthly = roundMoney(input.personalLimit - input.monthToDatePersonal);
  const paceEnd = input.paceEnd ?? input.cycleEnd;
  const remainingDaysInCycle = Math.max(0, diffDays(input.today, paceEnd) + 1);
  const cappedWeekEnd = minISODate(input.weekEnd, input.cycleEnd);
  const remainingDaysInWeek = Math.max(0, diffDays(input.today, cappedWeekEnd) + 1);
  const remainingVsWeeklyTarget = roundMoney(input.weeklyTarget - input.spentThisWeek);
  const availableThisWeek = roundMoney(
    Math.max(0, Math.min(remainingVsWeeklyTarget, remainingMonthly)),
  );
  const suggestedDaily =
    remainingDaysInCycle > 0 ? roundMoney(Math.max(0, remainingMonthly) / remainingDaysInCycle) : 0;
  const monthlyCapApplies = remainingMonthly < Math.max(remainingVsWeeklyTarget, 0);

  let warning: string | null = null;
  if (remainingMonthly <= 0) {
    warning =
      "This payday’s remaining money is used up. The leftover pot takes priority over the weekly target.";
  } else if (monthlyCapApplies) {
    warning = `You have ${formatINR(Math.max(0, remainingMonthly))} left this payday. That leftover takes priority over the usual weekly target.`;
  }

  return {
    weeklyTarget: input.weeklyTarget,
    spentThisWeek: roundMoney(input.spentThisWeek),
    remainingVsWeeklyTarget,
    remainingMonthly,
    remainingDaysInCycle,
    remainingDaysInWeek,
    availableThisWeek,
    suggestedDaily,
    monthlyCapApplies,
    warning,
  };
}

export function weekTarget(weeklyTarget: number, start: string, end: string): number {
  const days = diffDays(start, end) + 1;
  if (days >= 7) return roundMoney(weeklyTarget);
  return roundMoney((weeklyTarget * days) / 7);
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
    target: weekTarget(budget.weekly_target, week.start, week.end),
  }));
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
