import { z } from "zod";

const money = z.coerce
  .number()
  .min(0, "Amount cannot be negative.")
  .max(10_000_000, "Amount is too large.");

export const budgetSchema = z.object({
  year_month: z.string().regex(/^\d{4}-\d{2}$/, "Choose a month."),
  salary: money,
  personal_limit: money,
  family_limit: money,
  weekly_target: money,
  home_loan: money,
  credit_card_bill: money,
  sip: money,
  savings: money,
  buffer: money,
});

export const familyAllocationSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Enter a name.").max(80),
  amount: money,
  sort_order: z.coerce.number().int().optional(),
});

export const accountSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Enter an account name.").max(60),
  kind: z.enum(["bank", "credit_card", "cash", "other"]),
});

export const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Enter a category name.").max(80),
  bucket: z.enum([
    "personal",
    "family",
    "home_loan",
    "credit_card_bill",
    "sip",
    "savings",
    "buffer",
    "income",
    "transfer",
    "other",
  ]),
});

export const profileSchema = z.object({
  week_start_day: z.coerce.number().int().min(0).max(6),
});

export const authSchema = z.object({
  email: z.email("Enter a valid email."),
  password: z.string().min(8, "Use at least 8 characters."),
});
