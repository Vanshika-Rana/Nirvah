"use server";

import { fail, withAction, type ActionResult } from "@/lib/action-result";
import { getAccounts, getAuthContext, getCategories } from "@/lib/data";
import type { ImportRow } from "@/lib/excel/import";
import { revalidatePath } from "next/cache";

export async function confirmImport(rows: ImportRow[]): Promise<ActionResult<{ created: number }>> {
  if (!Array.isArray(rows) || rows.length === 0) {
    return fail("Nothing to import.");
  }
  return withAction(async () => {
    const { supabase, user } = await getAuthContext();
    const [accounts, categories] = await Promise.all([getAccounts(), getCategories()]);
    const accountByName = new Map(accounts.map((account) => [account.name.toLowerCase(), account.id]));
    const categoryByName = new Map(categories.map((category) => [category.name.toLowerCase(), category.id]));
    const fallbackAccount = accounts[0];
    if (!fallbackAccount) throw new Error("Add an account before importing.");

    const existing = await supabase.from("transactions").select("id").eq("user_id", user.id);
    const existingIds = new Set((existing.data ?? []).map((row) => row.id));
    const toInsert = rows.filter((row) => !row.id || !existingIds.has(row.id));

    if (toInsert.length === 0) return { created: 0 };

    const { error } = await supabase.from("transactions").insert(
      toInsert.map((row) => ({
        id: row.id && !existingIds.has(row.id) ? row.id : undefined,
        user_id: user.id,
        occurred_on: row.occurred_on,
        amount: row.amount,
        type: row.type,
        category_id: categoryByName.get(row.category.toLowerCase()) ?? null,
        account_id: accountByName.get(row.account.toLowerCase()) ?? fallbackAccount.id,
        counterparty_account_id: row.counterparty_account
          ? (accountByName.get(row.counterparty_account.toLowerCase()) ?? null)
          : null,
        payment_method: row.payment_method,
        description: row.description,
        note: row.note,
        source: "manual" as const,
      })),
    );
    if (error) throw error;
    revalidatePath("/");
    revalidatePath("/history");
    return { created: toInsert.length };
  }, "Could not import the workbook. Existing records were not overwritten.");
}
