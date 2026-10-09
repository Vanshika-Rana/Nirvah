import { describe, expect, it } from "vitest";
import { summarizeLedger } from "@/lib/finance/ledger";

describe("ledger summary", () => {
  it("lets expenses exceed income", () => {
    const summary = summarizeLedger(
      [
        { type: "income", amount: 50000, category_id: "sal" },
        { type: "expense", amount: 20000, category_id: "groc" },
        { type: "expense", amount: 40000, category_id: "mat" },
      ],
      [
        { id: "sal", name: "Salary", bucket: "income" },
        { id: "groc", name: "Groceries", bucket: "personal" },
        { id: "mat", name: "Materials", bucket: "business" },
      ],
    );
    expect(summary.income).toBe(50000);
    expect(summary.expenses).toBe(60000);
    expect(summary.remaining).toBe(-10000);
    expect(summary.personal).toBe(20000);
    expect(summary.business).toBe(40000);
  });
});
