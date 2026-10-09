"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addIncome, deleteIncome, saveEnvelope, saveWeeklyTarget } from "@/actions/plan";
import { saveAccount } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { ENVELOPE_KIND_LABELS, type EnvelopeKind, type Income } from "@/lib/finance/month-plan";
import { formatDayLabel, todayISO } from "@/lib/finance/dates";
import { formatINR } from "@/lib/finance/money";

function defaultIncomeDate(month: string): string {
  const today = todayISO(new Date());
  return today.startsWith(month) ? today : `${month}-01`;
}

export function AddIncomeCard({
  month,
  defaultSalary,
  collapsed = false,
}: {
  month: string;
  defaultSalary: number;
  collapsed?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(!collapsed);
  const [amount, setAmount] = useState(defaultSalary > 0 ? String(defaultSalary) : "");
  const [label, setLabel] = useState("Salary");
  const [occurredOn, setOccurredOn] = useState(() => defaultIncomeDate(month));

  function save(nextAmount: number, nextLabel: string, isSalary: boolean) {
    startTransition(async () => {
      const result = await addIncome({
        yearMonth: month,
        amount: nextAmount,
        label: nextLabel || "Income",
        isSalary,
        occurredOn,
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
        <h2 className="text-base font-semibold">Money received this month</h2>
        <p className="text-sm text-muted">
          Add salary on the day it arrived. Weeks start then and keep going until next month’s salary. Extra money does not move week 1.
        </p>
      </div>
      {defaultSalary > 0 ? (
        <Button className="w-full sm:w-auto" disabled={pending} onClick={() => save(defaultSalary, "Salary", true)}>
          {pending ? "Saving…" : `Add salary ${formatINR(defaultSalary)}`}
        </Button>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Amount">
          <Input inputMode="decimal" value={amount} placeholder="0" onChange={(event) => setAmount(event.target.value)} />
        </Field>
        <Field label="What is this?">
          <Input value={label} onChange={(event) => setLabel(event.target.value)} />
        </Field>
        <Field label="Date received">
          <Input type="date" value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} />
        </Field>
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

export function IncomeChips({ incomes }: { incomes: Income[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (incomes.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {incomes.map((row) => (
        <li key={row.id} className="flex items-center gap-1 rounded-full bg-[#efe8de] pl-3 pr-1 py-1 text-xs">
          <span>
            {row.label}: {formatINR(row.amount)}
            {row.is_salary ? ` · ${formatDayLabel(row.occurred_on)}` : ""}
          </span>
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
          <h2 className="text-base font-semibold">Split this month</h2>
          <p className="text-sm text-muted">Create your own buckets: spending, savings, family, loan, anything.</p>
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
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">Where do you spend from?</h2>
        <p className="text-sm text-muted">Add accounts you actually use, like HDFC, SBI, cash, or a credit card.</p>
      </div>
      <Field label="Account name">
        <Input value={name} placeholder="HDFC, SBI, Cash…" onChange={(event) => setName(event.target.value)} />
      </Field>
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await saveAccount({ name, kind: "bank" });
            if (!result.ok) toast.error(result.error);
            else {
              toast.success("Account added.");
              setName("");
              router.refresh();
            }
          })
        }
      >
        Add account
      </Button>
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
