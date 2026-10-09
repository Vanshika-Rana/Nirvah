import type { Category, CategoryBucket, Transaction, TransactionType } from "@/lib/types";

export function categoryById<T extends { id: string }>(
  categories: T[],
  categoryId: string | null,
): T | null {
  if (!categoryId) return null;
  return categories.find((category) => category.id === categoryId) ?? null;
}

export function countsAsPersonalSpending(
  type: TransactionType,
  bucket: CategoryBucket | null | undefined,
): boolean {
  return type === "expense" && bucket === "personal";
}

export function countsAsFamilySpending(
  type: TransactionType,
  bucket: CategoryBucket | null | undefined,
): boolean {
  return type === "expense" && bucket === "family";
}

export function countsAsCombinedSpending(
  type: TransactionType,
  bucket: CategoryBucket | null | undefined,
): boolean {
  return countsAsPersonalSpending(type, bucket) || countsAsFamilySpending(type, bucket);
}

export function isNonDiscretionaryOutflow(
  type: TransactionType,
  bucket: CategoryBucket | null | undefined,
): boolean {
  if (type !== "expense") return false;
  return (
    bucket === "home_loan" ||
    bucket === "credit_card_bill" ||
    bucket === "sip" ||
    bucket === "savings" ||
    bucket === "buffer" ||
    bucket === "other"
  );
}

export function isTransfer(type: TransactionType): boolean {
  return type === "transfer";
}

export function isCreditCardRepayment(type: TransactionType): boolean {
  return type === "repayment";
}

export function isIncome(type: TransactionType): boolean {
  return type === "income";
}

export function spendingAmount(
  transaction: Pick<Transaction, "type" | "amount" | "category_id">,
  category: Pick<Category, "bucket"> | null,
  kind: "personal" | "family" | "combined",
): number {
  const bucket = category?.bucket ?? null;
  if (kind === "personal" && countsAsPersonalSpending(transaction.type, bucket)) {
    return transaction.amount;
  }
  if (kind === "family" && countsAsFamilySpending(transaction.type, bucket)) {
    return transaction.amount;
  }
  if (kind === "combined" && countsAsCombinedSpending(transaction.type, bucket)) {
    return transaction.amount;
  }
  return 0;
}

export function bucketTotal(
  transactions: Pick<Transaction, "type" | "amount" | "category_id">[],
  categories: Pick<Category, "id" | "bucket">[],
  bucket: CategoryBucket,
): number {
  return transactions.reduce((sum, transaction) => {
    if (transaction.type !== "expense") return sum;
    const category = categoryById(categories, transaction.category_id);
    if (category?.bucket !== bucket) return sum;
    return sum + transaction.amount;
  }, 0);
}
