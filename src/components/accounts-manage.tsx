"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveAccountMonthBalance } from "@/actions/settings";
import { AccountsEditor } from "@/components/accounts-editor";
import { AccountSpendBars } from "@/components/charts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ACCOUNT_KIND_LABELS } from "@/lib/constants";
import type { AccountPaydayRow } from "@/lib/finance/accounts";
import { formatINR } from "@/lib/finance/money";
import type { Account } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AccountsManage({
  month,
  accounts,
  rows,
}: {
  month: string;
  accounts: Account[];
  rows: AccountPaydayRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function save(accountId: string, field: "opening" | "deposited", raw: string, current: number) {
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount === current) return;
    startTransition(async () => {
      const result = await saveAccountMonthBalance({
        yearMonth: month,
        accountId,
        [field]: amount,
      });
      if (!result.ok) toast.error(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      {rows.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Where you’re spending from</CardTitle>
          </CardHeader>
          <AccountSpendBars data={rows.map((row) => ({ name: row.name, spent: row.spent, left: row.left }))} />
        </Card>
      ) : null}

      {rows.map((row) => (
        <Card key={row.id} className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold">{row.name}</p>
              <p className="text-xs text-muted">{ACCOUNT_KIND_LABELS[row.kind]}</p>
            </div>
            <p className={cn("text-sm font-semibold tabular-nums", row.left < 0 ? "text-danger" : "text-accent")}>
              {formatINR(row.left)} left
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="min-w-0">
              <span className="mb-1 block text-xs text-muted">From last payday</span>
              <Input
                inputMode="decimal"
                defaultValue={row.previous || ""}
                aria-label={`From last payday for ${row.name}`}
                disabled={pending}
                className="h-11 px-2 text-sm tabular-nums"
                onBlur={(event) => save(row.id, "opening", event.target.value, row.previous)}
              />
            </label>
            <label className="min-w-0">
              <span className="mb-1 block text-xs text-muted">Put in this payday</span>
              <Input
                inputMode="decimal"
                defaultValue={row.deposited || ""}
                aria-label={`Put in this payday for ${row.name}`}
                disabled={pending}
                className="h-11 px-2 text-sm tabular-nums"
                onBlur={(event) => save(row.id, "deposited", event.target.value, row.deposited)}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-muted">Spent</p>
              <p className="font-medium tabular-nums">{formatINR(row.spent)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">{row.moved !== 0 ? "Moved" : "Left"}</p>
              <p className="font-medium tabular-nums">{formatINR(row.moved !== 0 ? row.moved : row.left)}</p>
            </div>
          </div>
          {row.isMostSpent ? (
            <p className="text-xs font-medium text-warning">Spending most from here this payday.</p>
          ) : null}
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Add or hide</CardTitle>
        </CardHeader>
        <AccountsEditor accounts={accounts} />
      </Card>
    </div>
  );
}
