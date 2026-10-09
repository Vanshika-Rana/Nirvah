import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyBarChart } from "@/components/charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/finance/money";
import { formatDayLabel, formatWeekRangeLabel } from "@/lib/finance/dates";
import { categoryById } from "@/lib/finance/classify";
import type { WeeklyAvailability } from "@/lib/finance/weekly";
import type { Account, Category, Transaction } from "@/lib/types";
import { TRANSACTION_TYPE_LABELS } from "@/lib/constants";

export function WeeklyView({
  start,
  end,
  availability,
  daily,
  transactions,
  categories,
  accounts,
  categoryTotals,
  prevStart,
  nextStart,
  salaryDate,
  cycleEnd,
}: {
  start: string;
  end: string;
  availability: WeeklyAvailability;
  daily: { date: string; amount: number }[];
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  categoryTotals: { name: string; amount: number }[];
  prevStart: string | null;
  nextStart: string | null;
  salaryDate: string | null;
  cycleEnd: string | null;
}) {
  const kept = Math.max(0, availability.remainingVsWeeklyTarget);
  const target = Math.max(availability.weeklyTarget, 1);
  const percent = availability.weeklyTarget > 0 ? Math.round((kept / target) * 100) : 0;
  const maxCategory = Math.max(1, ...categoryTotals.map((item) => item.amount));

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">This week</h1>
          <p className="text-sm text-muted">{formatWeekRangeLabel(start, end)}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          {prevStart ? (
            <Button asChild variant="secondary" className="w-full sm:w-auto">
              <Link href={`/weekly?week=${prevStart}`}>Previous</Link>
            </Button>
          ) : (
            <Button variant="secondary" className="w-full sm:w-auto" disabled>
              Previous
            </Button>
          )}
          {nextStart ? (
            <Button asChild variant="secondary" className="w-full sm:w-auto">
              <Link href={`/weekly?week=${nextStart}`}>Next</Link>
            </Button>
          ) : (
            <Button variant="secondary" className="w-full sm:w-auto" disabled>
              Next
            </Button>
          )}
        </div>
      </div>

      <Card className="bg-[linear-gradient(180deg,#fffcf7_0%,#f3faf7_100%)]">
        <div className="flex items-center gap-4 sm:gap-5">
          <div
            className="relative size-24 shrink-0 rounded-full sm:size-28"
            style={{
              background: `conic-gradient(#0f766e ${Math.max(0, percent) * 3.6}deg, #efe8de 0)`,
            }}
          >
            <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-card">
              <p className="text-xl font-semibold tracking-tight">{Math.max(0, percent)}%</p>
              <p className="text-[11px] text-muted">{kept >= 0 ? "left" : "over"}</p>
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-sm text-muted">
              {availability.weeklyTarget > 0
                ? kept >= 0
                  ? "Still OK to spend this week"
                  : "Over this week’s target"
                : "Spent this week"}
            </p>
            <p className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
              {formatINR(availability.weeklyTarget > 0 ? Math.abs(kept) : availability.spentThisWeek)}
            </p>
            <p className="mt-1 text-sm text-muted">
              {formatINR(availability.spentThisWeek)} spent
              {availability.weeklyTarget > 0
                ? ` of your ${formatINR(availability.weeklyTarget)} weekly target`
                : ". Set a weekly target on Home."}
            </p>
            {salaryDate ? (
              <p className="mt-1 text-xs text-muted">
                This payday started {formatDayLabel(salaryDate)}
                {cycleEnd ? ` and runs until ${formatDayLabel(cycleEnd)}` : " and runs until you log next month’s salary"}
                . Weeks are 7-day stretches inside that.
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted">
                Log salary on Home. Your month then runs until the next month’s salary.
              </p>
            )}
          </div>
        </div>
        <p className="mt-4 text-sm text-muted">
          {cycleEnd
            ? `To last until ${formatDayLabel(cycleEnd)}, about ${formatINR(availability.suggestedDaily)} a day`
            : `About ${formatINR(availability.suggestedDaily)} a day if this payday lasts around a month`}
          {availability.remainingDaysInCycle > 0
            ? ` (${formatINR(Math.max(0, availability.remainingMonthly))} left over ${availability.remainingDaysInCycle} days)`
            : ""}
          . This is not the weekly target — it is the leftover pot until the next salary.
        </p>
      </Card>

      {availability.warning ? (
        <div className="flex gap-3 rounded-2xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>{availability.warning}</p>
        </div>
      ) : (
        <p className="text-sm text-muted">Stay under the line. Money you don’t spend this week stays in this payday’s pot.</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Daily spending</CardTitle>
        </CardHeader>
        <DailyBarChart data={daily} />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Where it went</CardTitle>
        </CardHeader>
        {categoryTotals.length === 0 ? (
          <p className="text-sm text-muted">No spending this week yet.</p>
        ) : (
          <ul className="space-y-3">
            {categoryTotals.map((item) => (
              <li key={item.name}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{item.name}</span>
                  <span className="font-medium">{formatINR(item.amount)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#efe8de]">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${(item.amount / maxCategory) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted">
            Nothing recorded this week. <Link href="/add" className="font-medium text-accent">Add an expense</Link>.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {transactions.map((transaction) => (
              <li key={transaction.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {transaction.description || categoryById(categories, transaction.category_id)?.name || TRANSACTION_TYPE_LABELS[transaction.type]}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {formatDayLabel(transaction.occurred_on)} · {accounts.find((account) => account.id === transaction.account_id)?.name}
                    {categoryById(categories, transaction.category_id) ? (
                      <Badge className="ml-2">{categoryById(categories, transaction.category_id)?.name}</Badge>
                    ) : null}
                  </p>
                </div>
                <Link href={`/history/${transaction.id}`} className="shrink-0 font-semibold tabular-nums text-accent">
                  {formatINR(transaction.amount)}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
