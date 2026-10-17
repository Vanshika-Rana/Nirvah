import { describe, expect, it } from "vitest";
import { accountLeft, summarizeAccounts } from "@/lib/finance/accounts";

const hdfc1 = {
  id: "a1",
  name: "HDFC 1",
  kind: "bank" as const,
  is_active: true,
};
const hdfc2 = {
  id: "a2",
  name: "HDFC 2",
  kind: "bank" as const,
  is_active: true,
};
const card = {
  id: "a3",
  name: "Credit card",
  kind: "credit_card" as const,
  is_active: true,
};

describe("accountLeft", () => {
  it("is last leftover plus what was put in minus spend", () => {
    expect(accountLeft(20000, 100000, 12000)).toBe(108000);
  });

  it("becomes the next payday opening", () => {
    const left = accountLeft(20000, 100000, 12000);
    expect(accountLeft(left, 0, 0)).toBe(108000);
  });
});

describe("summarizeAccounts", () => {
  it("uses the payday snapshot plus spend from that account", () => {
    const summary = summarizeAccounts({
      accounts: [hdfc1, hdfc2],
      snapshots: [
        { account_id: "a1", opening: 20000, deposited: 100000 },
        { account_id: "a2", opening: 5000, deposited: 8000 },
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
      deposited: 100000,
      spent: 12000,
      left: 108000,
    });
    expect(summary.accounts[1]).toMatchObject({
      previous: 5000,
      deposited: 8000,
      spent: 3000,
      left: 10000,
    });
    expect(summary.mostSpentId).toBe("a1");
    expect(summary.accounts[0].isMostSpent).toBe(true);
  });

  it("does not mix last payday leftover into this payday's put-in", () => {
    const lastLeft = accountLeft(20000, 50000, 10000);
    const summary = summarizeAccounts({
      accounts: [hdfc1],
      snapshots: [{ account_id: "a1", opening: lastLeft, deposited: 100000 }],
      transactions: [
        { type: "expense", amount: 4000, account_id: "a1", counterparty_account_id: null, occurred_on: "2026-10-12" },
        { type: "expense", amount: 10000, account_id: "a1", counterparty_account_id: null, occurred_on: "2026-09-20" },
      ],
      cycleStart: "2026-10-09",
      cycleEnd: "2026-11-11",
    });

    expect(lastLeft).toBe(60000);
    expect(summary.accounts[0].previous).toBe(60000);
    expect(summary.accounts[0].deposited).toBe(100000);
    expect(summary.accounts[0].spent).toBe(4000);
    expect(summary.accounts[0].left).toBe(156000);
  });

  it("moves money between accounts on transfer and repayment", () => {
    const summary = summarizeAccounts({
      accounts: [hdfc1, card],
      snapshots: [
        { account_id: "a1", opening: 20000, deposited: 0 },
        { account_id: "a3", opening: 0, deposited: 0 },
      ],
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
