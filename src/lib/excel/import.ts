import * as XLSX from "xlsx";
import { transactionSchema } from "@/lib/validation/transaction";
import { PAYMENT_METHODS, TRANSACTION_TYPES, type PaymentMethod, type TransactionType } from "@/lib/types";

export type ImportPreview = {
  rows: ImportRow[];
  duplicates: string[];
  errors: string[];
};

export type ImportRow = {
  id?: string;
  occurred_on: string;
  amount: number;
  type: TransactionType;
  category: string;
  account: string;
  counterparty_account: string;
  payment_method: PaymentMethod;
  description: string;
  note: string;
};

function cellString(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function cellNumber(value: unknown): number {
  if (typeof value === "number") return value;
  const parsed = Number(String(value).replace(/[,₹\s]/g, ""));
  return parsed;
}

function normalizeType(value: string): TransactionType | null {
  const lower = value.toLowerCase().replace(/\s+/g, "_");
  if ((TRANSACTION_TYPES as readonly string[]).includes(lower)) {
    return lower as TransactionType;
  }
  if (value.toLowerCase().includes("repay")) return "repayment";
  return null;
}

function normalizeMethod(value: string): PaymentMethod | null {
  const lower = value.toLowerCase().replace(/\s+/g, "_");
  if ((PAYMENT_METHODS as readonly string[]).includes(lower)) {
    return lower as PaymentMethod;
  }
  return null;
}

export function previewWorkbook(
  buffer: ArrayBuffer | Buffer,
  existingIds: string[],
): ImportPreview {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets.Transactions;
  if (!sheet) {
    return { rows: [], duplicates: [], errors: ["The workbook is missing a Transactions sheet."] };
  }

  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  const existing = new Set(existingIds);
  const rows: ImportRow[] = [];
  const duplicates: string[] = [];
  const errors: string[] = [];

  raw.forEach((item, index) => {
    const line = index + 2;
    const type = normalizeType(cellString(item.type ?? item.type_label));
    const paymentMethod = normalizeMethod(cellString(item.payment_method));
    const amount = cellNumber(item.amount);
    const occurredOn = cellString(item.occurred_on);
    const parsed = transactionSchema.safeParse({
      amount,
      occurred_on: occurredOn.length === 10 ? occurredOn : occurredOn.slice(0, 10),
      type: type ?? "expense",
      account_id: "00000000-0000-4000-8000-000000000001",
      payment_method: paymentMethod ?? "other",
      description: cellString(item.description),
      note: cellString(item.note),
    });

    if (!type) {
      errors.push(`Row ${line}: unknown transaction type.`);
      return;
    }
    if (!parsed.success) {
      errors.push(`Row ${line}: ${parsed.error.issues[0]?.message ?? "invalid row"}.`);
      return;
    }

    const id = cellString(item.id) || undefined;
    if (id && existing.has(id)) {
      duplicates.push(id);
    }

    rows.push({
      id,
      occurred_on: parsed.data.occurred_on,
      amount: parsed.data.amount,
      type,
      category: cellString(item.category),
      account: cellString(item.account),
      counterparty_account: cellString(item.counterparty_account),
      payment_method: paymentMethod ?? "other",
      description: parsed.data.description,
      note: parsed.data.note,
    });
  });

  return { rows, duplicates, errors };
}
