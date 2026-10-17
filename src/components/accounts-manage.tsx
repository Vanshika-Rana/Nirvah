"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveAccountMonthBalance } from "@/actions/settings";
import { AccountsEditor } from "@/components/accounts-editor";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
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
    <div className="flex flex-col gap-5">
      {rows.map((row) => (
        <Card key={row.id}>
          <CardHeader>
            <div>
              <CardTitle>{row.name}</CardTitle>
              <p className="text-xs text-muted">{ACCOUNT_KIND_LABELS[row.kind]}</p>
            </div>
            <p className={cn("text-sm font-semibold tabular-nums", row.left < 0 ? "text-danger" : "text-accent")}>
              {formatINR(row.left)} left
            </p>
          </CardHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="From last payday">
              <Input
                inputMode="decimal"
                defaultValue={row.previous || ""}
                aria-label={`From last payday for ${row.name}`}
                disabled={pending}
                onBlur={(event) => save(row.id, "opening", event.target.value, row.previous)}
              />
            </Field>
            <Field label="Put in this payday">
              <Input
                inputMode="decimal"
                defaultValue={row.deposited || ""}
                aria-label={`Put in this payday for ${row.name}`}
                disabled={pending}
                onBlur={(event) => save(row.id, "deposited", event.target.value, row.deposited)}
              />
            </Field>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted">Spent</p>
              <p className="font-medium tabular-nums">{formatINR(row.spent)}</p>
            </div>
            {row.moved !== 0 ? (
              <div>
                <p className="text-xs text-muted">Moved</p>
                <p className="font-medium tabular-nums">{formatINR(row.moved)}</p>
              </div>
            ) : (
              <div>
                <p className="text-xs text-muted">Left</p>
                <p className="font-medium tabular-nums">{formatINR(row.left)}</p>
              </div>
            )}
          </div>
          {row.isMostSpent ? (
            <p className="mt-3 text-xs font-medium text-warning">Spending most from here this payday.</p>
          ) : null}
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
        </CardHeader>
        <AccountsEditor accounts={accounts} />
      </Card>
    </div>
  );
}
