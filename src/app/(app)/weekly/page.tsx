import { Suspense } from "react";
import { WeeklyView } from "@/components/weekly-view";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ensureMonthBudget,
  getAccounts,
  getCategories,
  getSalaryIncomes,
  getTransactionsInRange,
} from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { categoryBreakdown } from "@/lib/finance/summarize";
import {
  computeWeeklyAvailability,
  dailyPersonalSpending,
  personalSpentInRange,
  weekTarget,
} from "@/lib/finance/weekly";
import {
  adjacentPaydayWeek,
  cycleHorizon,
  cycleSpendEnd,
  maxISODate,
  payCycleForDate,
  paydayWeekContaining,
  salaryDates,
  todayISO,
  toYearMonth,
  typicalCycleEnd,
} from "@/lib/finance/dates";
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
  const requested = params.week ?? today;
  const [salaries, accounts, categories] = await Promise.all([
    getSalaryIncomes(),
    getAccounts(),
    getCategories(),
  ]);
  const cycle = payCycleForDate(salaryDates(salaries), requested) ?? payCycleForDate(salaryDates(salaries), today);
  const lastDay = cycle ? maxISODate(cycleHorizon(cycle, today), cycleHorizon(cycle, requested)) : null;
  const week = cycle && lastDay ? paydayWeekContaining(requested, cycle.start, lastDay) : null;

  if (!cycle || !week) {
    return (
      <WeeklyView
        start={today}
        end={today}
        availability={computeWeeklyAvailability({
          weeklyTarget: 0,
          spentThisWeek: 0,
          personalLimit: 0,
          monthToDatePersonal: 0,
          today,
          weekEnd: today,
          cycleEnd: today,
        })}
        daily={[]}
        transactions={[]}
        categories={categories}
        accounts={accounts}
        categoryTotals={[]}
        prevStart={null}
        nextStart={null}
        salaryDate={null}
        cycleEnd={null}
      />
    );
  }

  const spendEnd = cycleSpendEnd(cycle, today);
  const [{ budget, envelopes, incomes }, transactions] = await Promise.all([
    ensureMonthBudget(toYearMonth(cycle.start)),
    getTransactionsInRange(cycle.start, spendEnd),
  ]);
  const cycleTransactions = transactions.filter(
    (transaction) => transaction.occurred_on >= cycle.start && transaction.occurred_on <= spendEnd,
  );
  const plan = summarizeMonthPlan({
    opening: budget.opening_balance,
    incomes,
    envelopes,
    transactions: cycleTransactions,
    categories,
  });
  const spentThisWeek = personalSpentInRange(transactions, categories, week.start, week.end);
  const availability = computeWeeklyAvailability({
    weeklyTarget: weekTarget(budget.weekly_target, week.start, week.end),
    spentThisWeek,
    personalLimit: plan.available,
    monthToDatePersonal: plan.expenses,
    today: today >= week.start && today <= week.end ? today : week.end,
    weekEnd: week.end,
    cycleEnd: cycle.end ?? week.end,
    paceEnd: cycle.end ?? typicalCycleEnd(cycle.start),
  });
  const weekTransactions = transactions.filter(
    (transaction) => transaction.occurred_on >= week.start && transaction.occurred_on <= week.end && transaction.type === "expense",
  );
  const categoryTotals = categoryBreakdown(weekTransactions, categories, week.start, week.end).map((item) => ({
    name: item.name,
    amount: item.amount,
  }));
  const prev = adjacentPaydayWeek(week, -1, cycle);
  const next = adjacentPaydayWeek(week, 1, cycle);

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
      prevStart={prev?.start ?? null}
      nextStart={next?.start ?? null}
      salaryDate={cycle.start}
      cycleEnd={cycle.end}
    />
  );
}
