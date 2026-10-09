const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrPreciseFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatINR(value: number, precise = false): string {
  const n = roundMoney(value);
  if (precise || Math.abs(n % 1) > 0) {
    return inrPreciseFormatter.format(n);
  }
  return inrFormatter.format(n);
}

export function formatINRCompact(value: number): string {
  return formatINR(value);
}

export function percentUsed(spent: number, limit: number): number {
  if (limit <= 0) {
    return spent > 0 ? 100 : 0;
  }
  return roundMoney((spent / limit) * 100);
}

export type BudgetStatus = "ok" | "warning" | "over";

export function budgetStatus(percent: number): BudgetStatus {
  if (percent >= 100) return "over";
  if (percent >= 80) return "warning";
  return "ok";
}

export function budgetStatusLabel(status: BudgetStatus): string {
  if (status === "over") return "Over budget";
  if (status === "warning") return "Close to limit";
  return "On track";
}
