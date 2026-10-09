import { Suspense } from "react";
import { signOut } from "@/actions/auth";
import { SettingsForm } from "@/components/settings-form";
import { LedgerSettingsForm } from "@/components/ledger-settings";
import { MonthSelector } from "@/components/month-selector";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ensureMonthBudget,
  getAccounts,
  getCategories,
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
  const [salaries, profile, accounts, categories] = await Promise.all([
    getSalaryIncomes(),
    getProfile(),
    getAccounts(),
    getCategories(),
  ]);
  const dates = salaryDates(salaries);
  const month = params.month ?? currentCycleMonth(dates, todayISO(now));
  const ledger = profile.tracker_mode === "ledger";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Settings</h1>
          <p className="text-sm text-muted">
            {ledger ? "Categories, accounts, reset." : "Salary, weekly target, accounts."}
          </p>
        </div>
        <form action={signOut}>
          <Button variant="secondary" className="shrink-0">
            Sign out
          </Button>
        </form>
      </div>
      {ledger ? (
        <LedgerSettingsForm accounts={accounts} categories={categories} />
      ) : (
        <Suspense fallback={<Skeleton className="h-64" />}>
          <EnvelopeSettings month={month} accounts={accounts} defaultSalary={profile.default_salary} salaryDates={dates} />
        </Suspense>
      )}
    </div>
  );
}

async function EnvelopeSettings({
  month,
  accounts,
  defaultSalary,
  salaryDates,
}: {
  month: string;
  accounts: Awaited<ReturnType<typeof getAccounts>>;
  defaultSalary: number;
  salaryDates: string[];
}) {
  const { budget, envelopes } = await ensureMonthBudget(month);
  return (
    <>
      <MonthSelector month={month} path="/settings" salaryDates={salaryDates} />
      <SettingsForm
        month={month}
        budget={budget}
        envelopes={envelopes}
        accounts={accounts}
        defaultSalary={defaultSalary}
      />
    </>
  );
}
