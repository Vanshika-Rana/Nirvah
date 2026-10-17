"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveAccount } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { ACCOUNT_KIND_LABELS } from "@/lib/constants";
import type { AccountPaydayRow } from "@/lib/finance/accounts";
import { formatINR } from "@/lib/finance/money";
import type { Account, AccountKind } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HomeAccounts({
  accounts,
  rows,
  unassignedIncome,
}: {
  accounts: Account[];
  rows: AccountPaydayRow[];
  unassignedIncome: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(accounts.length === 0);

  function saveOpening(account: Account, raw: string) {
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount === account.opening_balance) return;
    startTransition(async () => {
      const result = await saveAccount({
        id: account.id,
        name: account.name,
        kind: account.kind,
        opening_balance: amount,
      });
      if (!result.ok) toast.error(result.error);
      else router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your accounts</CardTitle>
      </CardHeader>
      <p className="mb-4 text-sm text-muted">
        Starting balance is what was in the account before this payday’s salary and spends. Leftover from earlier
        paydays is already counted in.
      </p>
      {unassignedIncome > 0 ? (
        <p className="mb-4 rounded-2xl bg-[#efe8de] px-3 py-2 text-sm">
          {formatINR(unassignedIncome)} income is not in an account yet. Assign it on the income chips above so HDFC 1
          vs HDFC 2 stays honest.
        </p>
      ) : null}
      <div className="space-y-4">
        {rows.map((row) => {
          const account = accounts.find((item) => item.id === row.id);
          return (
            <div key={row.id} className="rounded-2xl bg-[#f7f2ea] px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{row.name}</p>
                  <p className="text-xs text-muted">{ACCOUNT_KIND_LABELS[row.kind]}</p>
                </div>
                <p className={cn("text-sm font-semibold tabular-nums", row.left < 0 ? "text-danger" : "text-accent")}>
                  {formatINR(row.left)} left
                </p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted">From before</p>
                  <p className="font-medium tabular-nums">{formatINR(row.previous)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Got this payday</p>
                  <p className="font-medium tabular-nums">{formatINR(row.income)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Spent</p>
                  <p className="font-medium tabular-nums">{formatINR(row.spent)}</p>
                </div>
                {row.moved !== 0 ? (
                  <div>
                    <p className="text-xs text-muted">Moved</p>
                    <p className="font-medium tabular-nums">{formatINR(row.moved)}</p>
                  </div>
                ) : null}
              </div>
              {row.isMostSpent ? (
                <p className="mt-2 text-xs font-medium text-warning">Spending most from here this payday.</p>
              ) : null}
              {account ? (
                <div className="mt-3 max-w-[11rem]">
                  <Field label="Starting balance">
                    <Input
                      inputMode="decimal"
                      defaultValue={account.opening_balance || ""}
                      aria-label={`Starting balance for ${row.name}`}
                      disabled={pending}
                      className="h-9 px-2 text-sm tabular-nums"
                      onBlur={(event) => saveOpening(account, event.target.value)}
                    />
                  </Field>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      {adding ? (
        <AddAccountFields
          onDone={() => {
            setAdding(false);
            router.refresh();
          }}
          onCancel={accounts.length > 0 ? () => setAdding(false) : undefined}
        />
      ) : (
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
            Add account
          </Button>
        </div>
      )}
    </Card>
  );
}

export function AddAccountFields({
  onDone,
  onCancel,
  embedded = false,
}: {
  onDone?: () => void;
  onCancel?: () => void;
  embedded?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<AccountKind>("bank");
  const [opening, setOpening] = useState("");

  const fields = (
    <div className={embedded ? "space-y-3" : "mt-4 space-y-3"}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Account name">
          <Input value={name} placeholder="HDFC 1, SBI, Cash…" onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Type">
          <NativeSelect value={kind} onChange={(event) => setKind(event.target.value as AccountKind)}>
            {Object.entries(ACCOUNT_KIND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Starting balance">
          <Input
            inputMode="decimal"
            value={opening}
            placeholder="0"
            onChange={(event) => setOpening(event.target.value)}
          />
        </Field>
      </div>
      <div className="flex gap-2">
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await saveAccount({
                name,
                kind,
                opening_balance: opening === "" ? 0 : Number(opening),
              });
              if (!result.ok) toast.error(result.error);
              else {
                toast.success("Account added.");
                setName("");
                setOpening("");
                onDone?.();
              }
            })
          }
        >
          {pending ? "Saving…" : "Add account"}
        </Button>
        {onCancel ? (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );

  return fields;
}
