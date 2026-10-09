"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteTransaction, saveTransaction } from "@/actions/transactions";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { PAYMENT_METHOD_LABELS, TRANSACTION_TYPE_LABELS } from "@/lib/constants";
import { todayISO } from "@/lib/finance/dates";
import type { Account, Category, PaymentMethod, Transaction, TransactionType } from "@/lib/types";

const PREFS_KEY = "nirvah-add-prefs";

type Prefs = {
  account_id?: string;
  payment_method?: PaymentMethod;
  category_id?: string;
};

function loadPrefs(): Prefs {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") as Prefs;
  } catch {
    return {};
  }
}

export function TransactionForm({
  accounts,
  categories,
  transaction,
  defaultType = "expense",
  compact = false,
  ledger = false,
}: {
  accounts: Account[];
  categories: Category[];
  transaction?: Transaction;
  defaultType?: TransactionType;
  compact?: boolean;
  ledger?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const activeAccounts = accounts.filter((account) => account.is_active || account.id === transaction?.account_id);
  const activeCategories = categories.filter((category) => category.is_active || category.id === transaction?.category_id);

  const defaults = useMemo(() => {
    const prefs = typeof window === "undefined" ? {} : loadPrefs();
    return {
      amount: transaction ? String(transaction.amount) : "",
      occurred_on: transaction?.occurred_on ?? todayISO(new Date()),
      type: transaction?.type ?? defaultType,
      category_id: transaction?.category_id ?? prefs.category_id ?? activeCategories.find((c) => c.bucket === "personal")?.id ?? "",
      account_id: transaction?.account_id ?? prefs.account_id ?? activeAccounts[0]?.id ?? "",
      counterparty_account_id: transaction?.counterparty_account_id ?? "",
      payment_method: transaction?.payment_method ?? prefs.payment_method ?? "upi",
      description: transaction?.description ?? "",
      note: transaction?.note ?? "",
    };
  }, [transaction, defaultType, activeAccounts, activeCategories]);

  const [values, setValues] = useState(defaults);

  const needsCounterparty = values.type === "transfer" || values.type === "repayment";
  const incomeSelected = values.type === "income";
  const visibleCategories = ledger
    ? activeCategories.filter((category) =>
        incomeSelected ? category.bucket === "income" : category.bucket === "personal" || category.bucket === "business",
      )
    : activeCategories;

  function update<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    startTransition(async () => {
      const result = await saveTransaction(
        {
          ...values,
          amount: Number(values.amount),
          category_id: values.category_id || null,
          counterparty_account_id: values.counterparty_account_id || null,
          client_request_id: transaction ? undefined : requestId,
        },
        transaction?.id,
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(transaction ? "Transaction updated." : values.type === "income" ? "Income saved." : "Expense saved.");
      localStorage.setItem(
        PREFS_KEY,
        JSON.stringify({
          account_id: values.account_id,
          payment_method: values.payment_method,
          category_id: values.category_id,
        } satisfies Prefs),
      );
      if (!transaction) {
        setRequestId(crypto.randomUUID());
        setValues((current) => ({
          ...current,
          amount: "",
          description: "",
          note: "",
          occurred_on: todayISO(new Date()),
        }));
      }
      router.refresh();
      if (transaction) router.push("/history");
    });
  }

  function onDelete() {
    if (!transaction) return;
    if (!confirm("Delete this transaction? This cannot be undone.")) return;
    startTransition(async () => {
      const result = await deleteTransaction(transaction.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Transaction deleted.");
      router.push("/history");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {ledger ? (
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={incomeSelected ? "default" : "secondary"}
            onClick={() => setValues((current) => ({ ...current, type: "income", category_id: "" }))}
          >
            Income
          </Button>
          <Button
            type="button"
            variant={!incomeSelected ? "default" : "secondary"}
            onClick={() => setValues((current) => ({ ...current, type: "expense", category_id: "" }))}
          >
            Expense
          </Button>
        </div>
      ) : null}
      <Field label="Amount">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-muted">₹</span>
          <Input
            inputMode="decimal"
            pattern="[0-9]*"
            type="text"
            required
            autoFocus={!transaction}
            className="h-16 pl-8 text-3xl font-semibold tracking-tight"
            placeholder="0"
            value={values.amount}
            onChange={(event) => update("amount", event.target.value.replace(/[^\d.]/g, ""))}
          />
        </div>
      </Field>

      <Field label={incomeSelected ? "Received in" : "Spent from"}>
        <NativeSelect value={values.account_id} required onChange={(event) => update("account_id", event.target.value)}>
          <option value="">Choose account</option>
          {activeAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <Field label="What for">
        <NativeSelect value={values.category_id} onChange={(event) => update("category_id", event.target.value)}>
          <option value="">No category</option>
          {visibleCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {ledger && (category.bucket === "personal" || category.bucket === "business")
                ? `${category.bucket === "business" ? "Business" : "Personal"} · ${category.name}`
                : category.name}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <Input type="date" required value={values.occurred_on} onChange={(event) => update("occurred_on", event.target.value)} />
        </Field>
        {!compact ? (
          <Field label="Type">
            <NativeSelect value={values.type} onChange={(event) => update("type", event.target.value as TransactionType)}>
              {Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </Field>
        ) : (
          <Field label="Payment">
            <NativeSelect value={values.payment_method} onChange={(event) => update("payment_method", event.target.value as PaymentMethod)}>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </Field>
        )}
      </div>

      {!compact ? (
        <Field label="Payment method">
          <NativeSelect value={values.payment_method} onChange={(event) => update("payment_method", event.target.value as PaymentMethod)}>
            {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      ) : null}

      {needsCounterparty ? (
        <Field label={values.type === "repayment" ? "Card account" : "To account"}>
          <NativeSelect
            value={values.counterparty_account_id}
            required
            onChange={(event) => update("counterparty_account_id", event.target.value)}
          >
            <option value="">Select account</option>
            {activeAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      ) : null}

      <Field label="Description">
        <Input value={values.description} maxLength={120} placeholder="Optional" onChange={(event) => update("description", event.target.value)} />
      </Field>
      {!compact ? (
        <Field label="Note">
          <Textarea value={values.note} maxLength={500} placeholder="Optional" onChange={(event) => update("note", event.target.value)} />
        </Field>
      ) : null}

      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="sticky bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-20 w-full shadow-[0_-10px_24px_rgba(246,241,234,0.95)] md:bottom-0"
      >
        {pending ? "Saving…" : transaction ? "Save changes" : incomeSelected ? "Save income" : "Save expense"}
      </Button>
      {transaction ? (
        <Button type="button" variant="danger" disabled={pending} onClick={onDelete}>
          Delete transaction
        </Button>
      ) : null}
    </form>
  );
}
