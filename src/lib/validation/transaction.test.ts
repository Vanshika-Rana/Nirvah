import { describe, expect, it } from "vitest";
import { transactionSchema } from "@/lib/validation/transaction";

describe("transaction validation", () => {
  it("rejects a zero or negative amount", () => {
    const result = transactionSchema.safeParse({
      amount: 0,
      occurred_on: "2026-10-09",
      type: "expense",
      account_id: "11111111-1111-4111-8111-111111111111",
      payment_method: "upi",
    });
    expect(result.success).toBe(false);
  });

  it("requires a second account for transfers and repayments", () => {
    const transfer = transactionSchema.safeParse({
      amount: 1000,
      occurred_on: "2026-10-09",
      type: "repayment",
      account_id: "11111111-1111-4111-8111-111111111111",
      payment_method: "bank_transfer",
    });
    expect(transfer.success).toBe(false);
  });
});
