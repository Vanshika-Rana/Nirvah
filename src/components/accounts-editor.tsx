"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveAccount, setAccountActive } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { ACCOUNT_KIND_LABELS } from "@/lib/constants";
import type { Account, AccountKind } from "@/lib/types";

export function AccountsEditor({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <>
      <p className="mb-3 text-sm text-muted">
        Starting balance is what was already in the account. Income that lands here is added, and spends from here are
        subtracted.
      </p>
      <ul className="space-y-2">
        {accounts.map((account) => (
          <li key={account.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_8.5rem_7rem_auto] sm:items-center">
            <Input
              className="min-w-0"
              defaultValue={account.name}
              onBlur={(event) =>
                startTransition(async () => {
                  const result = await saveAccount({
                    id: account.id,
                    name: event.target.value,
                    kind: account.kind,
                    opening_balance: account.opening_balance,
                  });
                  if (!result.ok) toast.error(result.error);
                })
              }
            />
            <NativeSelect
              defaultValue={account.kind}
              onChange={(event) =>
                startTransition(async () => {
                  const result = await saveAccount({
                    id: account.id,
                    name: account.name,
                    kind: event.target.value as AccountKind,
                    opening_balance: account.opening_balance,
                  });
                  if (!result.ok) toast.error(result.error);
                  else router.refresh();
                })
              }
            >
              {Object.entries(ACCOUNT_KIND_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
            <Input
              inputMode="decimal"
              defaultValue={account.opening_balance || ""}
              aria-label={`Starting balance for ${account.name}`}
              onBlur={(event) =>
                startTransition(async () => {
                  const result = await saveAccount({
                    id: account.id,
                    name: account.name,
                    kind: account.kind,
                    opening_balance: Number(event.target.value),
                  });
                  if (!result.ok) toast.error(result.error);
                  else router.refresh();
                })
              }
            />
            <Button
              variant="secondary"
              disabled={pending}
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
        className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_8.5rem_7rem_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          const formEl = event.currentTarget;
          const form = new FormData(formEl);
          startTransition(async () => {
            const result = await saveAccount({
              name: String(form.get("name") ?? ""),
              kind: String(form.get("kind") ?? "bank"),
              opening_balance: Number(form.get("opening_balance") || 0),
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
        <Input name="name" placeholder="HDFC 1, SBI, Cash…" required />
        <NativeSelect name="kind" defaultValue="bank">
          {Object.entries(ACCOUNT_KIND_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
        <Input name="opening_balance" inputMode="decimal" placeholder="Starting" />
        <Button type="submit">Add</Button>
      </form>
    </>
  );
}
