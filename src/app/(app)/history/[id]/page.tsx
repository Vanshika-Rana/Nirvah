import { TransactionForm } from "@/components/transaction-form";
import { getAccounts, getAuthContext, getCategories, getProfile } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import type { Transaction } from "@/lib/types";
import { notFound } from "next/navigation";

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured()) notFound();
  const { id } = await params;
  const { supabase, user } = await getAuthContext();
  const [{ data: transaction }, accounts, categories, profile] = await Promise.all([
    supabase.from("transactions").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(),
    getAccounts(),
    getCategories(),
    getProfile(),
  ]);
  if (!transaction) notFound();
  const row = transaction as Transaction;
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-5 text-2xl font-semibold tracking-tight">Edit transaction</h1>
      <TransactionForm
        accounts={accounts}
        categories={categories}
        transaction={{ ...row, amount: Number(row.amount) }}
        compact={profile.tracker_mode === "ledger"}
        ledger={profile.tracker_mode === "ledger"}
      />
    </div>
  );
}
