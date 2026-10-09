import { Suspense } from "react";
import { WeeklyView } from "@/components/weekly-view";
import { Skeleton } from "@/components/ui/skeleton";
import {
  currentYearMonth,
  ensureMonthBudget,
  getAccounts,
  getCategories,
  getIncomes,
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
  addMonths,
  adjacentPaydayWeek,
  firstSalaryDate,
  monthRange,
  paydayWeekContaining,
  paydayWeeks,
  todayISO,
  toYearMonth,
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
  const month = params.week ? toYearMonth(params.week) : currentYearMonth(now);
  const [{ budget, envelopes, incomes }, accounts, categories, previousIncomes, nextIncomes] = await Promise.all([
    ensureMonthBudget(month),
    getAccounts(),
    getCategories(),
    getIncomes(addMonths(month, -1)),
    getIncomes(addMonths(month, 1)),
  ]);
  const monthDates = monthRange(month);
  const salaryDate = firstSalaryDate(incomes);
  const weeks = salaryDate ? paydayWeeks(salaryDate, monthDates.end) : [];
  const requested = params.week ?? today;
  const week =
    (salaryDate ? paydayWeekContaining(requested, salaryDate, monthDates.end) : null) ?? weeks[0] ?? null;

  function cycleStartForMonth(yearMonth: string): string | null {
    if (yearMonth === month) return salaryDate;
    if (yearMonth === addMonths(month, -1)) return firstSalaryDate(previousIncomes);
    if (yearMonth === addMonths(month, 1)) return firstSalaryDate(nextIncomes);
    return null;
  }

  const prev = week ? adjacentPaydayWeek(week, -1, cycleStartForMonth) : null;
  const next = week ? adjacentPaydayWeek(week, 1, cycleStartForMonth) : null;

  if (!week) {
    return (
      <WeeklyView
        start={monthDates.start}
        end={monthDates.end}
        availability={computeWeeklyAvailability({
          weeklyTarget: 0,
          spentThisWeek: 0,
          personalLimit: 0,
          monthToDatePersonal: 0,
          today,
          weekEnd: monthDates.end,
          monthEnd: monthDates.end,
        })}
        daily={[]}
        transactions={[]}
        categories={categories}
        accounts={accounts}
        categoryTotals={[]}
        prevStart={null}
        nextStart={null}
        salaryDate={null}
      />
    );
  }

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
    weeklyTarget: weekTarget(budget.weekly_target, week.start, week.end),
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
      prevStart={prev?.start ?? null}
      nextStart={next?.start ?? null}
      salaryDate={salaryDate}
    />
  );
}
