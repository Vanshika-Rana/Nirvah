import { Suspense } from "react";
import { DashboardView } from "@/components/dashboard-view";
import { Skeleton } from "@/components/ui/skeleton";
import {
  currentYearMonth,
  ensureMonthBudget,
  getAccounts,
  getCategories,
  getProfile,
  getRecentTransactions,
  getTransactionsInRange,
  isMonthPlanSchemaReady,
  lookbackStart,
} from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { greetingForHour, monthRange, todayISO, type WeekStartDay } from "@/lib/finance/dates";
import { summarizeMonthPlan } from "@/lib/finance/month-plan";
import { recentWeeks, weekSummaries } from "@/lib/finance/weekly";
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
  const month = params.month ?? currentYearMonth(now);
  if (!isSupabaseConfigured()) {
    return <p className="text-sm text-muted">Configure Supabase to load live totals.</p>;
  }

  const today = todayISO(now);
  const profile = await getProfile();
  const weekStartsOn = profile.week_start_day as WeekStartDay;
  const [schemaReady, { budget, envelopes, incomes }, accounts, categories, recent] = await Promise.all([
    isMonthPlanSchemaReady(),
    ensureMonthBudget(month),
    getAccounts(),
    getCategories(),
    getRecentTransactions(),
  ]);
  const range = monthRange(month);
  const transactions = await getTransactionsInRange(lookbackStart(month, now), range.end);
  const monthTransactions = transactions.filter(
    (transaction) => transaction.occurred_on >= range.start && transaction.occurred_on <= range.end,
  );
  const plan = summarizeMonthPlan({
    opening: budget.opening_balance,
    incomes,
    envelopes,
    transactions: monthTransactions,
    categories,
  });
  const weeks = recentWeeks(today, weekStartsOn, 6);
  const weekBars = weekSummaries(transactions, categories, budget, weeks);

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
      greeting={greetingForHour(now.getHours())}
      plan={plan}
      weeklyTarget={budget.weekly_target}
      weeklySpent={weekBars.at(-1)?.spent ?? 0}
      weekBars={weekBars}
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
