"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveAccount, saveCategory, setAccountActive, setCategoryActive } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, NativeSelect } from "@/components/ui/input";
import { ExcelTools } from "@/components/excel-tools";
import { ResetAccountCard } from "@/components/reset-account-card";
import type { Account, Category } from "@/lib/types";

const LEDGER_BUCKETS = [
  { value: "personal", label: "Personal" },
  { value: "business", label: "Business" },
  { value: "income", label: "Income" },
] as const;

export function LedgerSettingsForm({
  accounts,
  categories,
}: {
  accounts: Account[];
  categories: Category[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const visible = categories.filter(
    (category) => category.bucket === "personal" || category.bucket === "business" || category.bucket === "income",
  );

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
        </CardHeader>
        <p className="mb-3 text-sm text-muted">
          Names only — no amounts. Mark each as personal, business, or income.
        </p>
        <ul className="space-y-2">
          {visible.map((category) => (
            <li key={category.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_8.5rem_auto] sm:items-center">
              <Input
                defaultValue={category.name}
                onBlur={(event) =>
                  startTransition(async () => {
                    const result = await saveCategory({
                      id: category.id,
                      name: event.target.value,
                      bucket: category.bucket,
                    });
                    if (!result.ok) toast.error(result.error);
                  })
                }
              />
              <NativeSelect
                defaultValue={category.bucket}
                onChange={(event) =>
                  startTransition(async () => {
                    const result = await saveCategory({
                      id: category.id,
                      name: category.name,
                      bucket: event.target.value,
                    });
                    if (!result.ok) toast.error(result.error);
                    else router.refresh();
                  })
                }
              >
                {LEDGER_BUCKETS.map((bucket) => (
                  <option key={bucket.value} value={bucket.value}>
                    {bucket.label}
                  </option>
                ))}
              </NativeSelect>
              <Button
                variant="secondary"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await setCategoryActive(category.id, !category.is_active);
                    if (!result.ok) toast.error(result.error);
                    else router.refresh();
                  })
                }
              >
                {category.is_active ? "Hide" : "Show"}
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
              const result = await saveCategory({
                name: String(form.get("name") ?? ""),
                bucket: String(form.get("bucket") ?? "personal"),
              });
              if (!result.ok) toast.error(result.error);
              else {
                toast.success("Category added.");
                formEl.reset();
                router.refresh();
              }
            });
          }}
        >
          <Input name="name" placeholder="New category" required />
          <NativeSelect name="bucket" defaultValue="personal">
            {LEDGER_BUCKETS.map((bucket) => (
              <option key={bucket.value} value={bucket.value}>
                {bucket.label}
              </option>
            ))}
          </NativeSelect>
          <Button type="submit">Add</Button>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
        </CardHeader>
        <ul className="space-y-2">
          {accounts.map((account) => (
            <li key={account.id} className="flex items-center gap-2">
              <Input
                className="min-w-0 flex-1"
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
      <ResetAccountCard />
    </div>
  );
}
