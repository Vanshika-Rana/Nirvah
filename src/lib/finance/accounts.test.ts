import { describe, expect, it } from "vitest";
import { summarizeAccounts } from "@/lib/finance/accounts";

const hdfc1 = {
  id: "a1",
  name: "HDFC 1",
  kind: "bank" as const,
  opening_balance: 20000,
  is_active: true,
};
const hdfc2 = {
  id: "a2",
  name: "HDFC 2",
  kind: "bank" as const,
  opening_balance: 5000,
  is_active: true,
};
const card = {
  id: "a3",
  name: "Credit card",
  kind: "credit_card" as const,
  opening_balance: 0,
  is_active: true,
};

describe("summarizeAccounts", () => {
  it("carries the starting balance and then adds payday income minus spend", () => {
    const summary = summarizeAccounts({
      accounts: [hdfc1, hdfc2],
      incomes: [
        { amount: 100000, account_id: "a1", occurred_on: "2026-10-09" },
        { amount: 8000, account_id: "a2", occurred_on: "2026-10-15" },
      ],
      transactions: [
        { type: "expense", amount: 12000, account_id: "a1", counterparty_account_id: null, occurred_on: "2026-10-12" },
        { type: "expense", amount: 3000, account_id: "a2", counterparty_account_id: null, occurred_on: "2026-10-18" },
      ],
      cycleStart: "2026-10-09",
      cycleEnd: "2026-11-11",
    });

    expect(summary.accounts[0]).toMatchObject({
      previous: 20000,
      income: 100000,
      spent: 12000,
      left: 108000,
    });
    expect(summary.accounts[1]).toMatchObject({
      previous: 5000,
      income: 8000,
      spent: 3000,
      left: 10000,
    });
    expect(summary.mostSpentId).toBe("a1");
    expect(summary.accounts[0].isMostSpent).toBe(true);
  });

  it("rolls activity from before this payday into previous", () => {
    const summary = summarizeAccounts({
      accounts: [hdfc1],
      incomes: [
        { amount: 50000, account_id: "a1", occurred_on: "2026-09-09" },
        { amount: 100000, account_id: "a1", occurred_on: "2026-10-09" },
      ],
      transactions: [
        { type: "expense", amount: 10000, account_id: "a1", counterparty_account_id: null, occurred_on: "2026-09-20" },
        { type: "expense", amount: 4000, account_id: "a1", counterparty_account_id: null, occurred_on: "2026-10-12" },
      ],
      cycleStart: "2026-10-09",
      cycleEnd: "2026-11-11",
    });

    expect(summary.accounts[0].previous).toBe(60000);
    expect(summary.accounts[0].income).toBe(100000);
    expect(summary.accounts[0].spent).toBe(4000);
    expect(summary.accounts[0].left).toBe(156000);
  });

  it("keeps unassigned income off every account", () => {
    const summary = summarizeAccounts({
      accounts: [hdfc1],
      incomes: [{ amount: 100000, account_id: null, occurred_on: "2026-10-09" }],
      transactions: [],
      cycleStart: "2026-10-09",
      cycleEnd: "2026-11-11",
    });

    expect(summary.accounts[0].income).toBe(0);
    expect(summary.accounts[0].left).toBe(20000);
    expect(summary.unassignedIncome).toBe(100000);
  });

  it("moves money between accounts on transfer and repayment", () => {
    const summary = summarizeAccounts({
      accounts: [hdfc1, card],
      incomes: [],
      transactions: [
        { type: "expense", amount: 6000, account_id: "a3", counterparty_account_id: null, occurred_on: "2026-10-12" },
        { type: "repayment", amount: 6000, account_id: "a1", counterparty_account_id: "a3", occurred_on: "2026-10-20" },
      ],
      cycleStart: "2026-10-09",
      cycleEnd: "2026-11-11",
    });

    expect(summary.accounts[0].left).toBe(14000);
    expect(summary.accounts[1].spent).toBe(6000);
    expect(summary.accounts[1].left).toBe(0);
    expect(summary.mostSpentId).toBe("a3");
  });
});
