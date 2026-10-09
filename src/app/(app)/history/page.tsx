import { Suspense } from "react";
import { HistoryClient } from "@/components/history-client";
import { MonthSelector } from "@/components/month-selector";
import { Skeleton } from "@/components/ui/skeleton";
import { getAccounts, getCategories, getHistory, getSalaryIncomes } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import {
  currentCycleMonth,
  cycleHorizon,
  cycleSpendEnd,
  maxISODate,
  payCycleForDate,
  payCycleForMonth,
  paydayWeekContaining,
  salaryDates,
  todayISO,
  toYearMonth,
} from "@/lib/finance/dates";
import { requestNow } from "@/lib/request-now";

export default function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return (
    <Suspense fallback={<Skeleton className="h-64" />}>
      <History searchParams={searchParams} />
    </Suspense>
  );
}

async function History({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  if (!isSupabaseConfigured()) {
    return <p className="text-sm text-muted">Configure Supabase to load history.</p>;
  }
  const params = await searchParams;
  const now = await requestNow();
  const today = todayISO(now);
  const salaries = await getSalaryIncomes();
  const dates = salaryDates(salaries);
  const weekCycle = params.week ? payCycleForDate(dates, params.week) : null;
  const month = params.month ?? (weekCycle ? toYearMonth(weekCycle.start) : currentCycleMonth(dates, today));
  const cycle = weekCycle ?? payCycleForMonth(dates, month);
  const lastDay = cycle ? maxISODate(cycleHorizon(cycle, today), cycleHorizon(cycle, params.week ?? today)) : null;
  const week =
    params.week && cycle && lastDay
      ? paydayWeekContaining(params.week, cycle.start, lastDay)
      : params.week
        ? { start: params.week, end: params.week }
        : null;
  const range = cycle
    ? { start: cycle.start, end: cycleSpendEnd(cycle, today) }
    : null;
  const [accounts, categories, history] = await Promise.all([
    getAccounts(),
    getCategories(),
    getHistory({
      month: week || range ? undefined : month,
      from: week ? undefined : range?.start,
      to: week ? undefined : range?.end,
      weekStart: week?.start,
      weekEnd: week?.end,
      categoryId: params.category,
      accountId: params.account,
      type: params.type,
      query: params.q,
      page: Number(params.page ?? "1"),
    }),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">History</h1>
        <p className="text-sm text-muted">Edit a row if you made a mistake.</p>
      </div>
      <MonthSelector month={month} path="/history" salaryDates={dates} />
      <HistoryClient
        transactions={history.transactions}
        accounts={accounts}
        categories={categories}
        total={history.total}
        page={history.page}
        pageSize={history.pageSize}
      />
    </div>
  );
}
