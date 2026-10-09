import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EnvelopeBars, MoneyFlow, MoneyRing, SpendPie, WeeklyBarChart } from "@/components/charts";
import { MonthSelector } from "@/components/month-selector";
import {
  AddAccountCard,
  AddEnvelopeCard,
  AddIncomeCard,
  IncomeChips,
  WeeklyTargetField,
} from "@/components/month-setup";
import { PAYMENT_METHOD_LABELS, TRANSACTION_TYPE_LABELS } from "@/lib/constants";
import { formatINR } from "@/lib/finance/money";
import { formatDayLabel, todayISO } from "@/lib/finance/dates";
import type { Income, MonthPlanSummary } from "@/lib/finance/month-plan";
import type { Account, Category, Transaction } from "@/lib/types";
import { categoryById } from "@/lib/finance/classify";

export function DashboardView({
  month,
  greeting,
  plan,
  weeklyTarget,
  weeklySpent,
  weekBars,
  salaryDate,
  recent,
  accounts,
  categories,
  incomes,
  defaultSalary,
}: {
  month: string;
  greeting: string;
  plan: MonthPlanSummary;
  weeklyTarget: number;
  weeklySpent: number;
  weekBars: { start: string; end: string; spent: number; target: number }[];
  salaryDate: string | null;
  recent: Transaction[];
  accounts: Account[];
  categories: Category[];
  incomes: Income[];
  defaultSalary: number;
}) {
  const today = todayISO(new Date());
  const currentBar = weekBars.find((week) => today >= week.start && today <= week.end);
  const currentTarget = currentBar?.target ?? weeklyTarget;
  const weeklyLeft = Math.max(0, currentTarget - weeklySpent);
  const needsIncome = !incomes.some((row) => row.is_salary);
  const weeklyPercent =
    currentTarget > 0 ? Math.min(100, Math.round((weeklySpent / currentTarget) * 100)) : 0;

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted">{greeting}</p>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">This month</h1>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <MonthSelector month={month} />
          <Button asChild size="lg" className="hidden shrink-0 md:inline-flex">
            <Link href="/add">
              <Plus /> Add expense
            </Link>
          </Button>
        </div>
      </div>

      <Card className="bg-[linear-gradient(180deg,#fffcf7_0%,#f3faf7_100%)]">
        <MoneyRing spent={plan.expenses} remaining={Math.max(0, plan.remaining)} label="Left in this month’s pot" />
        <p className="mt-4 text-sm leading-6 text-foreground">{plan.motivation}</p>
        {plan.available > 0 ? (
          <div className="mt-5">
            <MoneyFlow
              opening={plan.opening}
              income={plan.income}
              spent={plan.expenses}
              remaining={plan.remaining}
            />
          </div>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 text-sm sm:mt-5 sm:grid-cols-4">
          <Stat label="From last month" value={plan.opening} />
          <Stat label="Added this month" value={plan.income} />
          <Stat label="Spent" value={plan.expenses} />
          <Stat label="Rolls to next month" value={plan.carryToNextMonth} highlight />
        </div>
      </Card>

      {needsIncome ? <AddIncomeCard month={month} defaultSalary={defaultSalary} /> : null}
      {incomes.length > 0 ? <IncomeChips incomes={incomes} /> : null}
      {!needsIncome ? (
        <div className="flex flex-wrap items-center gap-2">
          <AddIncomeCard month={month} defaultSalary={defaultSalary} collapsed />
        </div>
      ) : null}

      {accounts.length === 0 ? <AddAccountCard /> : null}

      {plan.envelopes.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Your envelopes</CardTitle>
          </CardHeader>
          <EnvelopeBars
            data={plan.envelopes.map((row) => ({
              name: row.name,
              spent: row.spent,
              planned: row.planned,
              kind: row.kind,
            }))}
          />
          <div className="mt-4">
            <AddEnvelopeCard month={month} collapsed />
          </div>
        </Card>
      ) : (
        <AddEnvelopeCard month={month} />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Where money went</CardTitle>
          </CardHeader>
          <SpendPie data={plan.envelopes.map((row) => ({ name: row.name, value: row.spent }))} />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>This week</CardTitle>
          </CardHeader>
          {!salaryDate ? (
            <p className="mb-3 text-sm text-muted">
              Add this month’s salary above. Weeks run from that payday until you log the next month’s salary.
            </p>
          ) : weeklyTarget > 0 ? (
            <div className="mb-3">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-muted">
                  {formatINR(weeklySpent)} spent · {formatINR(weeklyLeft)} left
                </span>
                <span className="font-medium">{weeklyPercent}%</span>
              </div>
              <p className="mb-1 text-xs text-muted">Payday {formatDayLabel(salaryDate)} · until next month’s salary</p>
              <div className="h-2.5 overflow-hidden rounded-full bg-[#efe8de]">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${weeklyPercent}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="mb-3 space-y-2">
              <p className="text-sm text-muted">Set a weekly target. Counting already starts from {formatDayLabel(salaryDate)}.</p>
              <WeeklyTargetField month={month} weeklyTarget={weeklyTarget} />
            </div>
          )}
          <WeeklyBarChart data={weekBars} />
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
            No expenses yet.{" "}
            <Link href="/add" className="font-medium text-accent">
              Log the first one
            </Link>{" "}
            when you spend.
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
                    {formatDayLabel(transaction.occurred_on)} · {PAYMENT_METHOD_LABELS[transaction.payment_method]} ·{" "}
                    {accounts.find((account) => account.id === transaction.account_id)?.name}
                  </p>
                </div>
                <p className="shrink-0 font-semibold tabular-nums">{formatINR(transaction.amount)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-muted">{label}</p>
      <p className={`font-semibold tabular-nums ${highlight ? "text-accent" : ""}`}>{formatINR(value)}</p>
    </div>
  );
}
