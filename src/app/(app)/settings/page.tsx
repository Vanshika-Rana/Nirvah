import { Suspense } from "react";
import { signOut } from "@/actions/auth";
import { SettingsForm } from "@/components/settings-form";
import { MonthSelector } from "@/components/month-selector";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  currentYearMonth,
  ensureMonthBudget,
  getAccounts,
  getProfile,
} from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
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
  const month = params.month ?? currentYearMonth(await requestNow());
  if (!isSupabaseConfigured()) {
    return <p className="text-sm text-muted">Configure Supabase to manage budgets.</p>;
  }
  const [{ budget, envelopes }, accounts, profile] = await Promise.all([
    ensureMonthBudget(month),
    getAccounts(),
    getProfile(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted">Salary, weekly target, accounts. Split money on Home.</p>
        </div>
        <form action={signOut}>
          <Button variant="secondary">Sign out</Button>
        </form>
      </div>
      <MonthSelector month={month} path="/settings" />
      <SettingsForm
        month={month}
        budget={budget}
        envelopes={envelopes}
        accounts={accounts}
        weekStartDay={profile.week_start_day}
        defaultSalary={profile.default_salary}
      />
    </div>
  );
}
