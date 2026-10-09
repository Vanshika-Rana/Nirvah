import { describe, expect, it } from "vitest";
import { computeCarryOver, summarizeMonthPlan } from "@/lib/finance/month-plan";

describe("month carry-over", () => {
  it("starts at zero when nothing was received or spent", () => {
    expect(computeCarryOver({ opening: 0, income: 0, expenses: 0 })).toBe(0);
  });

  it("carries leftover money into the next month", () => {
    expect(computeCarryOver({ opening: 0, income: 100000, expenses: 40000 })).toBe(60000);
  });

  it("adds last month leftover to this month's income", () => {
    const brought = computeCarryOver({ opening: 0, income: 100000, expenses: 40000 });
    const next = summarizeMonthPlan({
      opening: brought,
      incomes: [{ amount: 100000 }],
      envelopes: [],
      transactions: [],
      categories: [],
    });
    expect(next.available).toBe(160000);
    expect(next.opening).toBe(60000);
  });

  it("does not treat overspending as negative savings to roll forward", () => {
    expect(computeCarryOver({ opening: 1000, income: 0, expenses: 5000 })).toBe(0);
  });
});

describe("month plan", () => {
  it("treats unspent money as the amount that can roll forward", () => {
    const summary = summarizeMonthPlan({
      opening: 5000,
      incomes: [{ amount: 50000 }],
      envelopes: [
        {
          id: "e1",
          user_id: "u",
          year_month: "2026-10",
          name: "Personal",
          kind: "spend",
          amount: 20000,
          category_id: "c1",
          sort_order: 1,
        },
        {
          id: "e2",
          user_id: "u",
          year_month: "2026-10",
          name: "Savings",
          kind: "save",
          amount: 25000,
          category_id: "c2",
          sort_order: 2,
        },
      ],
      transactions: [
        {
          type: "expense",
          amount: 8000,
          category_id: "c1",
        },
      ],
      categories: [
        { id: "c1", name: "Personal", kind: "spend", bucket: "personal" },
        { id: "c2", name: "Savings", kind: "save", bucket: "savings" },
      ],
    });
    expect(summary.available).toBe(55000);
    expect(summary.expenses).toBe(8000);
    expect(summary.remaining).toBe(47000);
    expect(summary.carryToNextMonth).toBe(47000);
    expect(summary.envelopes[0].spent).toBe(8000);
    expect(summary.envelopes[0].remaining).toBe(12000);
  });
});
