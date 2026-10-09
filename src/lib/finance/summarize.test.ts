import { describe, expect, it } from "vitest";
import { summarizeDashboard } from "@/lib/finance/summarize";
import { applyBudgetPatch, DEFAULT_BUDGET_TEMPLATE } from "@/lib/finance/budgets";
import { computeWeeklyAvailability } from "@/lib/finance/weekly";
import { budgetFromTemplate } from "@/lib/finance/budgets";
import type { Category, MonthlyBudget, Transaction } from "@/lib/types";

const categories: Category[] = [
  { id: "p", user_id: "u", name: "Food", bucket: "personal", kind: "spend", is_active: true, sort_order: 1, created_at: "" },
  { id: "f", user_id: "u", name: "Household", bucket: "family", kind: "spend", is_active: true, sort_order: 2, created_at: "" },
  { id: "s", user_id: "u", name: "Savings", bucket: "savings", kind: "save", is_active: true, sort_order: 3, created_at: "" },
  { id: "sip", user_id: "u", name: "SIP", bucket: "sip", kind: "save", is_active: true, sort_order: 4, created_at: "" },
  { id: "inc", user_id: "u", name: "Salary", bucket: "income", kind: "spend", is_active: true, sort_order: 5, created_at: "" },
];

function tx(
  partial: Partial<Transaction> & Pick<Transaction, "amount" | "type" | "occurred_on">,
): Transaction {
  return {
    id: partial.id ?? crypto.randomUUID(),
    user_id: "u",
    category_id: partial.category_id ?? "p",
    account_id: "a1",
    counterparty_account_id: partial.counterparty_account_id ?? null,
    payment_method: partial.payment_method ?? "upi",
    description: partial.description ?? "",
    note: "",
    source: "manual",
    client_request_id: null,
    created_at: "",
    updated_at: "",
    ...partial,
  };
}

function budget(yearMonth = "2026-10"): MonthlyBudget {
  return {
    id: "b",
    user_id: "u",
    created_at: "",
    updated_at: "",
    ...budgetFromTemplate(yearMonth, {
      ...DEFAULT_BUDGET_TEMPLATE,
      personal_limit: 35000,
      family_limit: 20000,
      weekly_target: 8000,
    }),
  };
}

describe("dashboard totals follow saved transactions", () => {
  it("adding an expense updates personal spending and remaining budget", () => {
    const empty = summarizeDashboard({
      budget: budget(),
      transactions: [],
      categories,
      today: "2026-10-09",
      weekStartsOn: 1,
    });
    expect(empty.personalSpent).toBe(0);
    expect(empty.personalRemaining).toBe(35000);

    const withExpense = summarizeDashboard({
      budget: budget(),
      transactions: [tx({ amount: 1250, type: "expense", occurred_on: "2026-10-09", category_id: "p" })],
      categories,
      today: "2026-10-09",
      weekStartsOn: 1,
    });
    expect(withExpense.personalSpent).toBe(1250);
    expect(withExpense.personalRemaining).toBe(33750);
    expect(withExpense.weeklySpent).toBe(1250);
  });

  it("editing a transaction updates totals", () => {
    const original = tx({
      id: "t1",
      amount: 500,
      type: "expense",
      occurred_on: "2026-10-08",
      category_id: "p",
    });
    const before = summarizeDashboard({
      budget: budget(),
      transactions: [original],
      categories,
      today: "2026-10-09",
      weekStartsOn: 1,
    });
    const after = summarizeDashboard({
      budget: budget(),
      transactions: [{ ...original, amount: 2000 }],
      categories,
      today: "2026-10-09",
      weekStartsOn: 1,
    });
    expect(before.personalSpent).toBe(500);
    expect(after.personalSpent).toBe(2000);
    expect(after.personalRemaining).toBe(33000);
  });

  it("deleting a transaction restores totals", () => {
    const row = tx({ amount: 900, type: "expense", occurred_on: "2026-10-09" });
    const withRow = summarizeDashboard({
      budget: budget(),
      transactions: [row],
      categories,
      today: "2026-10-09",
      weekStartsOn: 1,
    });
    const withoutRow = summarizeDashboard({
      budget: budget(),
      transactions: [],
      categories,
      today: "2026-10-09",
      weekStartsOn: 1,
    });
    expect(withRow.personalSpent).toBe(900);
    expect(withoutRow.personalSpent).toBe(0);
    expect(withoutRow.personalRemaining).toBe(35000);
  });
});

describe("spending classification", () => {
  it("does not let family expenses reduce the personal budget", () => {
    const summary = summarizeDashboard({
      budget: budget(),
      transactions: [
        tx({ amount: 4000, type: "expense", occurred_on: "2026-10-03", category_id: "f" }),
        tx({ amount: 1000, type: "expense", occurred_on: "2026-10-03", category_id: "p" }),
      ],
      categories,
      today: "2026-10-09",
      weekStartsOn: 1,
    });
    expect(summary.personalSpent).toBe(1000);
    expect(summary.personalRemaining).toBe(34000);
    expect(summary.familySpent).toBe(4000);
    expect(summary.combinedSpent).toBe(5000);
  });

  it("does not count transfers as expenses", () => {
    const summary = summarizeDashboard({
      budget: budget(),
      transactions: [
        tx({
          amount: 110000,
          type: "transfer",
          occurred_on: "2026-10-01",
          category_id: "s",
          counterparty_account_id: "sbi",
        }),
      ],
      categories,
      today: "2026-10-09",
      weekStartsOn: 1,
    });
    expect(summary.personalSpent).toBe(0);
    expect(summary.familySpent).toBe(0);
    expect(summary.combinedSpent).toBe(0);
  });

  it("does not count savings allocations as personal expenses", () => {
    const summary = summarizeDashboard({
      budget: budget(),
      transactions: [
        tx({ amount: 110000, type: "expense", occurred_on: "2026-10-01", category_id: "s" }),
        tx({ amount: 10000, type: "expense", occurred_on: "2026-10-01", category_id: "sip" }),
      ],
      categories,
      today: "2026-10-09",
      weekStartsOn: 1,
    });
    expect(summary.personalSpent).toBe(0);
    expect(summary.savingsMoved).toBe(110000);
    expect(summary.sipSpent).toBe(10000);
  });

  it("does not double-count credit card repayments of recorded purchases", () => {
    const summary = summarizeDashboard({
      budget: budget(),
      transactions: [
        tx({
          amount: 1000,
          type: "expense",
          occurred_on: "2026-10-02",
          category_id: "p",
          payment_method: "credit_card",
          account_id: "card",
        }),
        tx({
          amount: 1000,
          type: "repayment",
          occurred_on: "2026-10-20",
          category_id: null,
          account_id: "hdfc1",
          counterparty_account_id: "card",
          payment_method: "bank_transfer",
        }),
      ],
      categories,
      today: "2026-10-20",
      weekStartsOn: 1,
    });
    expect(summary.personalSpent).toBe(1000);
    expect(summary.creditCardBillSpent).toBe(1000);
    expect(summary.combinedSpent).toBe(1000);
  });
});

describe("weekly vs monthly cap", () => {
  it("lets the monthly personal cap override the weekly target", () => {
    const availability = computeWeeklyAvailability({
      weeklyTarget: 8000,
      spentThisWeek: 0,
      personalLimit: 35000,
      monthToDatePersonal: 33800,
      today: "2026-10-26",
      weekEnd: "2026-11-01",
      cycleEnd: "2026-10-31",
    });
    expect(availability.availableThisWeek).toBe(1200);
    expect(availability.monthlyCapApplies).toBe(true);
    expect(availability.warning).toContain("₹1,200");
    expect(availability.warning).toContain("left this payday");
  });
});

describe("historical budgets", () => {
  it("keeps historical months unchanged when a future month is edited", () => {
    const start = {
      "2026-10": { ...DEFAULT_BUDGET_TEMPLATE, personal_limit: 35000, credit_card_bill: 21000 },
      "2026-11": { ...DEFAULT_BUDGET_TEMPLATE, personal_limit: 35000, credit_card_bill: 21000 },
    };
    const next = applyBudgetPatch(start, "2026-11", { personal_limit: 40000, credit_card_bill: 15000 });
    expect(next["2026-10"].personal_limit).toBe(35000);
    expect(next["2026-10"].credit_card_bill).toBe(21000);
    expect(next["2026-11"].personal_limit).toBe(40000);
    expect(next["2026-11"].credit_card_bill).toBe(15000);
  });
});
