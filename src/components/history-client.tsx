"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PAYMENT_METHOD_LABELS, TRANSACTION_TYPE_LABELS } from "@/lib/constants";
import { formatINR } from "@/lib/finance/money";
import { formatDayLabel } from "@/lib/finance/dates";
import type { Account, Category, Transaction } from "@/lib/types";
import { NativeSelect, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { categoryById } from "@/lib/finance/classify";

export function HistoryClient({
  transactions,
  accounts,
  categories,
  total,
  page,
  pageSize,
}: {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  total: number;
  page: number;
  pageSize: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const pages = Math.max(1, Math.ceil(total / pageSize));

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`/history?${next.toString()}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Input
          className="col-span-2"
          defaultValue={params.get("q") ?? ""}
          placeholder="Search descriptions"
          onBlur={(event) => setFilter("q", event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") setFilter("q", (event.target as HTMLInputElement).value);
          }}
        />
        <NativeSelect value={params.get("category") ?? ""} onChange={(event) => setFilter("category", event.target.value)}>
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect value={params.get("account") ?? ""} onChange={(event) => setFilter("account", event.target.value)}>
          <option value="">All accounts</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect value={params.get("type") ?? ""} onChange={(event) => setFilter("type", event.target.value)}>
          <option value="">All types</option>
          {Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </div>

      {transactions.length === 0 ? (
        <p className="text-sm text-muted">
          No matching transactions. <Link href="/add" className="font-medium text-accent">Add an expense</Link>.
        </p>
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {transactions.map((transaction) => (
              <li key={transaction.id}>
                <Link href={`/history/${transaction.id}`} className="block rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{transaction.description || categoryById(categories, transaction.category_id)?.name || TRANSACTION_TYPE_LABELS[transaction.type]}</p>
                      <p className="text-xs text-muted">
                        {formatDayLabel(transaction.occurred_on)} ·{" "}
                        {accounts.find((account) => account.id === transaction.account_id)?.name ??
                          TRANSACTION_TYPE_LABELS[transaction.type]}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold tabular-nums">{formatINR(transaction.amount)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto rounded-2xl border border-border bg-card md:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-border text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Account</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">{transaction.occurred_on}</td>
                    <td className="px-4 py-3">
                      <Link href={`/history/${transaction.id}`} className="font-medium text-accent">
                        {transaction.description || "Open"}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{categoryById(categories, transaction.category_id)?.name ?? "—"}</td>
                    <td className="px-4 py-3">{TRANSACTION_TYPE_LABELS[transaction.type]}</td>
                    <td className="px-4 py-3">{accounts.find((account) => account.id === transaction.account_id)?.name}</td>
                    <td className="px-4 py-3">{PAYMENT_METHOD_LABELS[transaction.payment_method]}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatINR(transaction.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="flex items-center justify-between text-sm">
        <p className="text-muted">{total} records</p>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setFilter("page", String(page - 1))}>
            Previous
          </Button>
          <Button variant="secondary" disabled={page >= pages} onClick={() => setFilter("page", String(page + 1))}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
