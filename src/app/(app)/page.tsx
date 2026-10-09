import { Suspense } from "react";
import { DashboardView } from "@/components/dashboard-view";
import { LedgerHome } from "@/components/ledger-home";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ensureMonthBudget,
  getAccounts,
  getCategories,
  getProfile,
  getRecentTransactions,
  getSalaryIncomes,
  getTransactionsInRange,
  isMonthPlanSchemaReady,
} from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import {
  currentCycleMonth,
  cycleHorizon,
  cycleSpendEnd,
  greetingForHour,
  hourInIndia,
  payCycleForMonth,
  paydayWeekContaining,
  paydayWeeks,
  salaryDates,
  monthRange,
  todayISO,
} from "@/lib/finance/dates";
import { summarizeLedger } from "@/lib/finance/ledger";
import { summarizeMonthPlan } from "@/lib/finance/month-plan";
import { weekSummaries } from "@/lib/finance/weekly";
import { requestNow } from "@/lib/request-now";

export default function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard searchParams={searchParams} />
    </Suspense>
  );
}

async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const now = await requestNow();
  if (!isSupabaseConfigured()) {
    return <p className="text-sm text-muted">Configure Supabase to load live totals.</p>;
  }

  const today = todayISO(now);
  const [schemaReady, salaries, accounts, categories, recent, profile] = await Promise.all([
    isMonthPlanSchemaReady(),
    getSalaryIncomes(),
    getAccounts(),
    getCategories(),
    getRecentTransactions(),
    getProfile(),
  ]);
  if (profile.tracker_mode === "ledger") {
    const month = params.month ?? today.slice(0, 7);
    const range = monthRange(month);
    const monthTransactions = await getTransactionsInRange(range.start, range.end);
    return (
      <LedgerHome
        month={month}
        summary={summarizeLedger(monthTransactions, categories)}
        accounts={accounts}
        categories={categories}
        recent={monthTransactions.slice(0, 8)}
      />
    );
  }

  const dates = salaryDates(salaries);
  const month = params.month ?? currentCycleMonth(dates, today);
  const cycle = payCycleForMonth(dates, month);
  const { budget, envelopes, incomes } = await ensureMonthBudget(month);
  const spendEnd = cycle ? cycleSpendEnd(cycle, today) : today;
  const horizon = cycle ? cycleHorizon(cycle, today) : today;
  const transactions = cycle ? await getTransactionsInRange(cycle.start, spendEnd) : [];
  const plan = summarizeMonthPlan({
    opening: budget.opening_balance,
    incomes,
    envelopes,
    transactions,
    categories,
  });
  const salaryDate = cycle?.start ?? null;
  const weeks = cycle ? paydayWeeks(cycle.start, horizon) : [];
  const weekBars = weekSummaries(transactions, categories, budget, weeks);
  const currentWeek = cycle ? paydayWeekContaining(today, cycle.start, horizon) : null;
  const weeklySpent = currentWeek
    ? (weekBars.find((week) => week.start === currentWeek.start)?.spent ?? 0)
    : 0;

  return (
    <>
      {!schemaReady ? (
        <div className="mb-4 rounded-2xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
          Run <code className="font-medium">supabase/migrations/0002_envelopes_income.sql</code> in the
          Supabase SQL editor so income, envelopes, and month-to-month savings can save.
        </div>
      ) : null}
    <DashboardView
      month={month}
      greeting={greetingForHour(hourInIndia(now))}
      plan={plan}
      weeklyTarget={budget.weekly_target}
      weeklySpent={weeklySpent}
      weekBars={weekBars}
      salaryDate={salaryDate}
      cycleEnd={cycle?.end ?? null}
      salaryDates={dates}
      recent={recent}
      accounts={accounts}
      categories={categories}
      incomes={incomes}
      defaultSalary={profile.default_salary}
    />
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-32" />
      ))}
    </div>
  );
}
