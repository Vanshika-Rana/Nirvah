import { Suspense } from "react";
import { signOut } from "@/actions/auth";
import { SettingsForm } from "@/components/settings-form";
import { MonthSelector } from "@/components/month-selector";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ensureMonthBudget,
  getAccounts,
  getProfile,
  getSalaryIncomes,
} from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { currentCycleMonth, salaryDates, todayISO } from "@/lib/finance/dates";
import { requestNow } from "@/lib/request-now";

export default function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  return (
    <Suspense fallback={<Skeleton className="h-64" />}>
      <Settings searchParams={searchParams} />
    </Suspense>
  );
}

async function Settings({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const now = await requestNow();
  if (!isSupabaseConfigured()) {
    return <p className="text-sm text-muted">Configure Supabase to manage budgets.</p>;
  }
  const salaries = await getSalaryIncomes();
  const dates = salaryDates(salaries);
  const month = params.month ?? currentCycleMonth(dates, todayISO(now));
  const [{ budget, envelopes }, accounts, profile] = await Promise.all([
    ensureMonthBudget(month),
    getAccounts(),
    getProfile(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Settings</h1>
          <p className="text-sm text-muted">Salary, weekly target, accounts.</p>
        </div>
        <form action={signOut}>
          <Button variant="secondary" className="shrink-0">
            Sign out
          </Button>
        </form>
      </div>
      <MonthSelector month={month} path="/settings" salaryDates={dates} />
      <SettingsForm
        month={month}
        budget={budget}
        envelopes={envelopes}
        accounts={accounts}
        defaultSalary={profile.default_salary}
      />
    </div>
  );
}
