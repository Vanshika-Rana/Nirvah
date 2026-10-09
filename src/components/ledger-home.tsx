import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { SpendPie } from "@/components/charts";
import { MonthSelector } from "@/components/month-selector";
import { AddAccountCard } from "@/components/month-setup";
import { formatINR } from "@/lib/finance/money";
import { formatDayLabel } from "@/lib/finance/dates";
import type { LedgerSummary } from "@/lib/finance/ledger";
import type { Account, Category, Transaction } from "@/lib/types";
import { categoryById } from "@/lib/finance/classify";
import { TRANSACTION_TYPE_LABELS } from "@/lib/constants";

export function LedgerHome({
  month,
  summary,
  accounts,
  categories,
  recent,
}: {
  month: string;
  summary: LedgerSummary;
  accounts: Account[];
  categories: Category[];
  recent: Transaction[];
}) {
  const overspent = summary.remaining < 0;
  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">This month</h1>
          <p className="text-sm text-muted">Income and expenses. No planned amounts.</p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <MonthSelector month={month} />
          <Button asChild size="lg" className="hidden shrink-0 md:inline-flex">
            <Link href="/add">
              <Plus /> Add
            </Link>
          </Button>
        </div>
      </div>

      <Card className="bg-[linear-gradient(180deg,#fffcf7_0%,#f3faf7_100%)]">
        <p className="text-sm text-muted">{overspent ? "Spent more than came in" : "Left this month"}</p>
        <p className={`text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl ${overspent ? "text-warning" : ""}`}>
          {formatINR(Math.abs(summary.remaining))}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 text-sm sm:grid-cols-4">
          <Stat label="Income" value={summary.income} />
          <Stat label="Spent" value={summary.expenses} />
          <Stat label="Personal" value={summary.personal} />
          <Stat label="Business" value={summary.business} />
        </div>
      </Card>

      {accounts.length === 0 ? <AddAccountCard /> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Where money went</CardTitle>
          </CardHeader>
          <SpendPie data={summary.categoryTotals.map((row) => ({ name: row.name, value: row.amount }))} />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Personal vs business</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            <BarRow label="Personal" amount={summary.personal} max={Math.max(summary.personal, summary.business, 1)} />
            <BarRow label="Business" amount={summary.business} max={Math.max(summary.personal, summary.business, 1)} />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent</CardTitle>
          <Link href="/history" className="text-sm font-medium text-accent">
            History
          </Link>
        </CardHeader>
        {recent.length === 0 ? (
          <p className="text-sm text-muted">
            Nothing yet.{" "}
            <Link href="/add" className="font-medium text-accent">
              Log income or an expense
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((transaction) => (
              <li key={transaction.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {transaction.description ||
                      categoryById(categories, transaction.category_id)?.name ||
                      TRANSACTION_TYPE_LABELS[transaction.type]}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {formatDayLabel(transaction.occurred_on)} · {TRANSACTION_TYPE_LABELS[transaction.type]} ·{" "}
                    {accounts.find((account) => account.id === transaction.account_id)?.name}
                  </p>
                </div>
                <p className={`shrink-0 font-semibold tabular-nums ${transaction.type === "income" ? "text-accent" : ""}`}>
                  {transaction.type === "income" ? "+" : "−"}
                  {formatINR(transaction.amount)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0">
      <p className="text-muted">{label}</p>
      <p className="font-semibold tabular-nums">{formatINR(value)}</p>
    </div>
  );
}

function BarRow({ label, amount, max }: { label: string; amount: number; max: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">{formatINR(amount)}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[#efe8de]">
        <div className="h-full rounded-full bg-accent" style={{ width: `${(amount / max) * 100}%` }} />
      </div>
    </div>
  );
}
