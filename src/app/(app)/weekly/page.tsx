import { Suspense } from "react";
import { shiftWeek, WeeklyView } from "@/components/weekly-view";
import { Skeleton } from "@/components/ui/skeleton";
import {
  currentYearMonth,
  ensureMonthBudget,
  getAccounts,
  getCategories,
  getProfile,
  getTransactionsInRange,
} from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { categoryBreakdown } from "@/lib/finance/summarize";
import {
  computeWeeklyAvailability,
  dailyPersonalSpending,
  personalSpentInRange,
} from "@/lib/finance/weekly";
import { monthRange, todayISO, weekRange, type WeekStartDay } from "@/lib/finance/dates";
import { summarizeMonthPlan } from "@/lib/finance/month-plan";
import { requestNow } from "@/lib/request-now";

export default function WeeklyPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  return (
    <Suspense fallback={<Skeleton className="h-64" />}>
      <Weekly searchParams={searchParams} />
    </Suspense>
  );
}

async function Weekly({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  if (!isSupabaseConfigured()) {
    return <p className="text-sm text-muted">Configure Supabase to load weekly totals.</p>;
  }
  const params = await searchParams;
  const now = await requestNow();
  const today = todayISO(now);
  const profile = await getProfile();
  const weekStartsOn = profile.week_start_day as WeekStartDay;
  const week = weekRange(params.week ?? today, weekStartsOn);
  const month = currentYearMonth(now);
  const [{ budget, envelopes, incomes }, accounts, categories] = await Promise.all([
    ensureMonthBudget(month),
    getAccounts(),
    getCategories(),
  ]);
  const monthDates = monthRange(month);
  const transactions = await getTransactionsInRange(
    week.start < monthDates.start ? week.start : monthDates.start,
    week.end > monthDates.end ? week.end : monthDates.end,
  );
  const monthTransactions = transactions.filter(
    (transaction) => transaction.occurred_on >= monthDates.start && transaction.occurred_on <= monthDates.end,
  );
  const plan = summarizeMonthPlan({
    opening: budget.opening_balance,
    incomes,
    envelopes,
    transactions: monthTransactions,
    categories,
  });
  const spentThisWeek = personalSpentInRange(transactions, categories, week.start, week.end);
  const availability = computeWeeklyAvailability({
    weeklyTarget: budget.weekly_target,
    spentThisWeek,
    personalLimit: plan.available,
    monthToDatePersonal: plan.expenses,
    today: today >= week.start && today <= week.end ? today : week.end,
    weekEnd: week.end,
    monthEnd: monthDates.end,
  });
  const weekTransactions = transactions.filter(
    (transaction) => transaction.occurred_on >= week.start && transaction.occurred_on <= week.end && transaction.type === "expense",
  );
  const categoryTotals = categoryBreakdown(weekTransactions, categories, week.start, week.end).map((item) => ({
    name: item.name,
    amount: item.amount,
  }));

  return (
    <WeeklyView
      start={week.start}
      end={week.end}
      availability={availability}
      daily={dailyPersonalSpending(transactions, categories, week.start, week.end)}
      transactions={weekTransactions}
      categories={categories}
      accounts={accounts}
      categoryTotals={categoryTotals}
      prevStart={shiftWeek(week.start, -1)}
      nextStart={shiftWeek(week.start, 1)}
    />
  );
}
