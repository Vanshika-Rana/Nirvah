"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addIncome, assignIncomeAccount, deleteIncome, saveEnvelope, saveWeeklyTarget } from "@/actions/plan";
import { AddAccountFields } from "@/components/home-accounts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { ENVELOPE_KIND_LABELS, type EnvelopeKind, type Income } from "@/lib/finance/month-plan";
import { formatDayLabel, todayISO } from "@/lib/finance/dates";
import { formatINR } from "@/lib/finance/money";
import type { Account } from "@/lib/types";

function defaultIncomeDate(cycleStart: string | null, cycleEnd: string | null): string {
  const today = todayISO(new Date());
  if (cycleStart && today >= cycleStart && (!cycleEnd || today <= cycleEnd)) return today;
  if (cycleStart) return cycleStart;
  return today;
}

export function AddIncomeCard({
  month,
  defaultSalary,
  cycleStart = null,
  cycleEnd = null,
  collapsed = false,
  accounts = [],
}: {
  month: string;
  defaultSalary: number;
  cycleStart?: string | null;
  cycleEnd?: string | null;
  collapsed?: boolean;
  accounts?: Account[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(!collapsed);
  const [amount, setAmount] = useState(defaultSalary > 0 ? String(defaultSalary) : "");
  const [label, setLabel] = useState("Salary");
  const [occurredOn, setOccurredOn] = useState(() => defaultIncomeDate(cycleStart, cycleEnd));
  const activeAccounts = accounts.filter((account) => account.is_active);
  const [accountId, setAccountId] = useState(activeAccounts[0]?.id ?? "");

  function save(nextAmount: number, nextLabel: string, isSalary: boolean) {
    startTransition(async () => {
      const result = await addIncome({
        yearMonth: month,
        amount: nextAmount,
        label: nextLabel || "Income",
        isSalary,
        occurredOn,
        accountId: accountId || null,
      });
      if (!result.ok) toast.error(result.error);
      else {
        toast.success("Income added.");
        setAmount("");
        setOpen(false);
        router.refresh();
      }
    });
  }

  if (collapsed && !open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Add extra income
      </Button>
    );
  }

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">Money received this payday</h2>
        <p className="text-sm text-muted">
          Add salary on the day it arrived. That day starts your month. Extra money in between does not restart it. Next month starts when you log the next salary.
        </p>
      </div>
      {defaultSalary > 0 ? (
        <Button className="w-full sm:w-auto" disabled={pending} onClick={() => save(defaultSalary, "Salary", true)}>
          {pending ? "Saving…" : `Add salary ${formatINR(defaultSalary)}`}
        </Button>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Amount">
          <Input inputMode="decimal" value={amount} placeholder="0" onChange={(event) => setAmount(event.target.value)} />
        </Field>
        <Field label="What is this?">
          <Input value={label} onChange={(event) => setLabel(event.target.value)} />
        </Field>
        <Field label="Date received">
          <Input type="date" value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} />
        </Field>
        {activeAccounts.length > 0 ? (
          <Field label="Landed in">
            <NativeSelect value={accountId} onChange={(event) => setAccountId(event.target.value)}>
              <option value="">Not assigned</option>
              {activeAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        ) : null}
      </div>
      <div className="flex gap-2">
        <Button
          disabled={pending}
          onClick={() => save(Number(amount), label, label.toLowerCase().includes("salary"))}
        >
          {pending ? "Saving…" : "Add income"}
        </Button>
        {collapsed ? (
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

export function IncomeChips({
  incomes,
  accounts = [],
}: {
  incomes: Income[];
  accounts?: Account[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (incomes.length === 0) return null;
  const activeAccounts = accounts.filter((account) => account.is_active);
  return (
    <ul className="flex flex-wrap gap-2">
      {incomes.map((row) => (
        <li key={row.id} className="flex items-center gap-1 rounded-full bg-[#efe8de] pl-3 pr-1 py-1 text-xs">
          <span>
            {row.label}: {formatINR(row.amount)}
            {row.is_salary ? ` · ${formatDayLabel(row.occurred_on)}` : ""}
          </span>
          {activeAccounts.length > 0 ? (
            <NativeSelect
              className="h-7 w-auto min-w-0 border-0 bg-transparent px-1 pr-6 text-xs"
              value={row.account_id ?? ""}
              aria-label={`Account for ${row.label}`}
              disabled={pending}
              onChange={(event) =>
                startTransition(async () => {
                  const result = await assignIncomeAccount(row.id, event.target.value || null);
                  if (!result.ok) toast.error(result.error);
                  else router.refresh();
                })
              }
            >
              <option value="">Account?</option>
              {activeAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </NativeSelect>
          ) : null}
          <button
            type="button"
            disabled={pending}
            className="rounded-full px-2 py-0.5 text-muted hover:bg-white hover:text-danger"
            aria-label={`Remove ${row.label}`}
            onClick={() =>
              startTransition(async () => {
                const result = await deleteIncome(row.id);
                if (!result.ok) toast.error(result.error);
                else router.refresh();
              })
            }
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}

export function AddEnvelopeCard({
  month,
  collapsed = false,
}: {
  month: string;
  collapsed?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(!collapsed);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<EnvelopeKind>("spend");

  const form = (
    <div className="space-y-3">
      {collapsed ? null : (
        <div>
          <h2 className="text-base font-semibold">Split this payday</h2>
          <p className="text-sm text-muted">
            Assign what you planned. If something new comes up — school fees, Diwali — add another envelope.
          </p>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Name">
          <Input value={name} placeholder="Food, Family, Loan…" onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Amount">
          <Input inputMode="decimal" value={amount} placeholder="0" onChange={(event) => setAmount(event.target.value)} />
        </Field>
        <Field label="Type">
          <NativeSelect value={kind} onChange={(event) => setKind(event.target.value as EnvelopeKind)}>
            {Object.entries(ENVELOPE_KIND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <div className="flex gap-2">
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await saveEnvelope({
                yearMonth: month,
                name,
                kind,
                amount: Number(amount),
              });
              if (!result.ok) toast.error(result.error);
              else {
                toast.success("Envelope added.");
                setName("");
                setAmount("");
                setOpen(false);
                router.refresh();
              }
            })
          }
        >
          {pending ? "Saving…" : "Add envelope"}
        </Button>
        {collapsed ? (
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );

  if (collapsed && !open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Add envelope
      </Button>
    );
  }

  if (collapsed) return form;

  return <Card className="space-y-3">{form}</Card>;
}

export function AddAccountCard() {
  const router = useRouter();
  return (
    <Card className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">Where do you spend from?</h2>
        <p className="text-sm text-muted">
          Add bank accounts, a credit card, or cash, plus what was in each before this payday.
        </p>
      </div>
      <AddAccountFields embedded onDone={() => router.refresh()} />
    </Card>
  );
}

export function WeeklyTargetField({
  month,
  weeklyTarget,
}: {
  month: string;
  weeklyTarget: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(String(weeklyTarget || ""));

  return (
    <div className="flex gap-2">
      <Input
        className="min-w-0 flex-1"
        inputMode="decimal"
        value={value}
        placeholder="Weekly spending target"
        onChange={(event) => setValue(event.target.value)}
      />
      <Button className="shrink-0"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await saveWeeklyTarget(month, Number(value));
            if (!result.ok) toast.error(result.error);
            else {
              toast.success("Weekly target saved.");
              router.refresh();
            }
          })
        }
      >
        Save
      </Button>
    </div>
  );
}
