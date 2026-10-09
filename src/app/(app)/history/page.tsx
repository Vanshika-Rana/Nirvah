import { Suspense } from "react";
import { HistoryClient } from "@/components/history-client";
import { MonthSelector } from "@/components/month-selector";
import { Skeleton } from "@/components/ui/skeleton";
import { currentYearMonth, getAccounts, getCategories, getHistory, getIncomes } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { firstSalaryDate, monthRange, paydayWeekContaining, toYearMonth } from "@/lib/finance/dates";
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
  const month = params.month ?? (params.week ? toYearMonth(params.week) : currentYearMonth(await requestNow()));
  const weekMonth = params.week ? toYearMonth(params.week) : month;
  const incomes = params.week ? await getIncomes(weekMonth) : [];
  const salaryDate = firstSalaryDate(incomes);
  const monthDates = monthRange(weekMonth);
  const week =
    params.week && salaryDate
      ? paydayWeekContaining(params.week, salaryDate, monthDates.end)
      : params.week
        ? { start: params.week, end: params.week }
        : null;
  const [accounts, categories, history] = await Promise.all([
    getAccounts(),
    getCategories(),
    getHistory({
      month: week ? undefined : month,
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
      <MonthSelector month={month} path="/history" />
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
