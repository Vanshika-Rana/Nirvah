"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { saveDefaultSalary, saveWeeklyTarget } from "@/actions/plan";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ExcelTools } from "@/components/excel-tools";
import { ResetAccountCard } from "@/components/reset-account-card";
import type { MonthlyBudget } from "@/lib/types";

export function SettingsForm({
  month,
  budget,
  defaultSalary,
}: {
  month: string;
  budget: MonthlyBudget;
  defaultSalary: number;
}) {
  const [pending, startTransition] = useTransition();
  const [salary, setSalary] = useState(String(defaultSalary || ""));
  const [weekly, setWeekly] = useState(String(budget.weekly_target || ""));

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Usual salary</CardTitle>
        </CardHeader>
        <p className="mb-3 text-sm text-muted">Saved so next payday you can add it in one tap. Extra income is added on Home.</p>
        <div className="flex gap-2">
          <Input className="min-w-0 flex-1" inputMode="decimal" value={salary} onChange={(event) => setSalary(event.target.value)} />
          <Button
            className="shrink-0"
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
        <p className="mb-3 text-sm text-muted">
          Optional. Counts in 7-day blocks from payday. Leftover money rolls to the next payday.
        </p>
        <div className="flex gap-2">
          <Input className="min-w-0 flex-1" inputMode="decimal" value={weekly} onChange={(event) => setWeekly(event.target.value)} />
          <Button
            className="shrink-0"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await saveWeeklyTarget(month, Number(weekly));
                if (!result.ok) toast.error(result.error);
                else toast.success("Weekly target saved for this payday.");
              })
            }
          >
            Save
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Where to edit the rest</CardTitle>
        </CardHeader>
        <p className="text-sm text-muted">
          Envelopes live on{" "}
          <Link href="/" className="font-medium text-accent">
            Home
          </Link>
          . Bank and card amounts live on{" "}
          <Link href="/accounts" className="font-medium text-accent">
            Accounts
          </Link>
          .
        </p>
      </Card>

      <ExcelTools />
      <ResetAccountCard />
    </div>
  );
}
