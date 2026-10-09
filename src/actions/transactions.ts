"use server";

import { fail, withAction, type ActionResult } from "@/lib/action-result";
import { getAuthContext } from "@/lib/data";
import {
  emptyCategoryId,
  transactionSchema,
} from "@/lib/validation/transaction";
import { revalidatePath } from "next/cache";

function refresh() {
  revalidatePath("/");
  revalidatePath("/add");
  revalidatePath("/weekly");
  revalidatePath("/history");
  revalidatePath("/settings");
}

export async function saveTransaction(
  input: unknown,
  id?: string,
): Promise<ActionResult<{ id: string }>> {
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Check the expense details.");
  }

  return withAction(async () => {
    const { supabase, user } = await getAuthContext();
    const values = {
      user_id: user.id,
      occurred_on: parsed.data.occurred_on,
      amount: parsed.data.amount,
      type: parsed.data.type,
      category_id: emptyCategoryId(parsed.data.category_id),
      account_id: parsed.data.account_id,
      counterparty_account_id: emptyCategoryId(parsed.data.counterparty_account_id),
      payment_method: parsed.data.payment_method,
      description: parsed.data.description ?? "",
      note: parsed.data.note ?? "",
      source: parsed.data.source ?? "manual",
      client_request_id: parsed.data.client_request_id ?? null,
    };

    if (id) {
      const { data, error } = await supabase
        .from("transactions")
        .update(values)
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id")
        .single();
      if (error) throw error;
      refresh();
      return { id: data.id };
    }

    if (values.client_request_id) {
      const existing = await supabase
        .from("transactions")
        .select("id")
        .eq("user_id", user.id)
        .eq("client_request_id", values.client_request_id)
        .maybeSingle();
      if (existing.data) {
        return { id: existing.data.id };
      }
    }

    const { data, error } = await supabase
      .from("transactions")
      .insert(values)
      .select("id")
      .single();

    if (error?.code === "23505" && values.client_request_id) {
      const existing = await supabase
        .from("transactions")
        .select("id")
        .eq("user_id", user.id)
        .eq("client_request_id", values.client_request_id)
        .maybeSingle();
      if (existing.data) return { id: existing.data.id };
    }
    if (error) throw error;
    refresh();
    return { id: data.id };
  }, "Could not save the transaction.");
}

export async function deleteTransaction(id: string): Promise<ActionResult<{ id: string }>> {
  if (!id) return fail("Missing transaction.");
  return withAction(async () => {
    const { supabase, user } = await getAuthContext();
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) throw error;
    refresh();
    return { id };
  }, "Could not delete the transaction.");
}
