"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteEnvelope, saveDefaultSalary, saveEnvelope, saveWeeklyTarget } from "@/actions/plan";
import { saveAccount, setAccountActive } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, NativeSelect } from "@/components/ui/input";
import { ExcelTools } from "@/components/excel-tools";
import type { Envelope } from "@/lib/finance/month-plan";
import type { Account, MonthlyBudget } from "@/lib/types";

export function SettingsForm({
  month,
  budget,
  envelopes,
  accounts,
  defaultSalary,
}: {
  month: string;
  budget: MonthlyBudget;
  envelopes: Envelope[];
  accounts: Account[];
  defaultSalary: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [salary, setSalary] = useState(String(defaultSalary || ""));
  const [weekly, setWeekly] = useState(String(budget.weekly_target || ""));

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Usual salary</CardTitle>
        </CardHeader>
        <p className="mb-3 text-sm text-muted">Saved so next payday you can add it in one tap. Extra income is added separately on Home.</p>
        <div className="flex gap-2">
          <Input className="min-w-0 flex-1" inputMode="decimal" value={salary} onChange={(event) => setSalary(event.target.value)} />
          <Button className="shrink-0"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await saveDefaultSalary(Number(salary));
                if (!result.ok) toast.error(result.error);
                else toast.success("Usual salary saved.");
              })
            }
          >
            Save
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weekly target</CardTitle>
        </CardHeader>
        <p className="mb-3 text-sm text-muted">Optional. Counts in 7-day blocks from payday until you log next month’s salary. A leftover stub at the end of that cycle gets a smaller slice. Leftover money rolls to the next payday.</p>
        <div className="flex gap-2">
          <Input className="min-w-0 flex-1" inputMode="decimal" value={weekly} onChange={(event) => setWeekly(event.target.value)} />
          <Button className="shrink-0"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await saveWeeklyTarget(month, Number(weekly));
                if (!result.ok) toast.error(result.error);
                else toast.success("Weekly target saved for this month.");
              })
            }
          >
            Save
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>This payday’s envelopes</CardTitle>
        </CardHeader>
        <p className="mb-3 text-sm text-muted">Edit amounts here. Next month copies these names so you are not starting from scratch.</p>
        <ul className="space-y-2">
          {envelopes.map((envelope) => (
            <li key={envelope.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_7rem_auto] sm:items-center">
              <Input
                defaultValue={envelope.name}
                onBlur={(event) =>
                  startTransition(async () => {
                    const result = await saveEnvelope({
                      id: envelope.id,
                      yearMonth: month,
                      name: event.target.value,
                      kind: envelope.kind,
                      amount: envelope.amount,
                    });
                    if (!result.ok) toast.error(result.error);
                  })
                }
              />
              <Input
                inputMode="decimal"
                defaultValue={envelope.amount}
                onBlur={(event) =>
                  startTransition(async () => {
                    const result = await saveEnvelope({
                      id: envelope.id,
                      yearMonth: month,
                      name: envelope.name,
                      kind: envelope.kind,
                      amount: Number(event.target.value),
                    });
                    if (!result.ok) toast.error(result.error);
                  })
                }
              />
              <Button
                variant="secondary"
                onClick={() =>
                  startTransition(async () => {
                    const result = await deleteEnvelope(envelope.id);
                    if (!result.ok) toast.error(result.error);
                  })
                }
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weekly cycle</CardTitle>
        </CardHeader>
        <p className="text-sm text-muted">
          Your month starts the day you log salary and runs until the next month’s salary, even if that crosses the 1st. Leftover money rolls into the next payday. Extra income in between does not restart the cycle.
        </p>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
        </CardHeader>
        <ul className="space-y-2">
          {accounts.map((account) => (
            <li key={account.id} className="flex items-center gap-2">
              <Input className="min-w-0 flex-1"
                defaultValue={account.name}
                onBlur={(event) =>
                  startTransition(async () => {
                    const result = await saveAccount({ id: account.id, name: event.target.value, kind: account.kind });
                    if (!result.ok) toast.error(result.error);
                  })
                }
              />
              <Button
                variant="secondary"
                onClick={() =>
                  startTransition(() => {
                    void setAccountActive(account.id, !account.is_active);
                  })
                }
              >
                {account.is_active ? "Hide" : "Show"}
              </Button>
            </li>
          ))}
        </ul>
        <form
          className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_8.5rem_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            const formEl = event.currentTarget;
            const form = new FormData(formEl);
            startTransition(async () => {
              const result = await saveAccount({
                name: String(form.get("name") ?? ""),
                kind: String(form.get("kind") ?? "bank"),
              });
              if (!result.ok) toast.error(result.error);
              else {
                toast.success("Account added.");
                formEl.reset();
                router.refresh();
              }
            });
          }}
        >
          <Input name="name" placeholder="New account" required />
          <NativeSelect name="kind" defaultValue="bank">
            <option value="bank">Bank</option>
            <option value="credit_card">Credit card</option>
            <option value="cash">Cash</option>
            <option value="other">Other</option>
          </NativeSelect>
          <Button type="submit">Add</Button>
        </form>
      </Card>

      <ExcelTools />
    </div>
  );
}
