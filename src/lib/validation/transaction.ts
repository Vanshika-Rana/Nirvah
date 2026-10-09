import { z } from "zod";
import { PAYMENT_METHODS, TRANSACTION_TYPES } from "@/lib/types";
import { isISODate } from "@/lib/finance/dates";

const uuid = z.string().uuid("Choose a valid item.");

export const transactionSchema = z
  .object({
    amount: z.coerce
      .number({ error: "Enter an amount." })
      .positive("Amount must be greater than zero.")
      .max(10_000_000, "Amount is too large."),
    occurred_on: z
      .string()
      .refine(isISODate, "Enter a valid date."),
    type: z.enum(TRANSACTION_TYPES),
    category_id: z.union([uuid, z.literal(""), z.null()]).optional(),
    account_id: uuid,
    counterparty_account_id: z.union([uuid, z.literal(""), z.null()]).optional(),
    payment_method: z.enum(PAYMENT_METHODS),
    description: z.string().trim().max(120, "Description is too long.").default(""),
    note: z.string().trim().max(500, "Note is too long.").default(""),
    client_request_id: z.string().uuid().optional().nullable(),
    source: z.enum(["manual", "allocation"]).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "transfer" || value.type === "repayment") {
      const counterparty = value.counterparty_account_id;
      if (!counterparty) {
        ctx.addIssue({
          code: "custom",
          path: ["counterparty_account_id"],
          message:
            value.type === "repayment"
              ? "Choose the card account you are paying."
              : "Choose the account you are transferring to.",
        });
      } else if (counterparty === value.account_id) {
        ctx.addIssue({
          code: "custom",
          path: ["counterparty_account_id"],
          message: "Choose two different accounts.",
        });
      }
    }
  });

export type TransactionFormValues = z.infer<typeof transactionSchema>;

export function emptyCategoryId(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  return value;
}

export function safeErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message && !/supabase|service.role|anon key|api key/i.test(error.message)) {
    return error.message;
  }
  return fallback;
}
