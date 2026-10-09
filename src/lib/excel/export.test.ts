import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { buildWorkbook } from "@/lib/excel/export";
import { budgetFromTemplate } from "@/lib/finance/budgets";
import type { Account, Category, MonthlyBudget, Profile, Transaction } from "@/lib/types";

const profile: Profile = {
  id: "u",
  week_start_day: 1,
  default_salary: 0,
  created_at: "",
  updated_at: "",
};

const accounts: Account[] = [
  { id: "a1", user_id: "u", name: "HDFC 2", kind: "bank", is_active: true, sort_order: 1, created_at: "" },
];

const categories: Category[] = [
  { id: "p", user_id: "u", name: "Food and cafes", bucket: "personal", kind: "spend", is_active: true, sort_order: 1, created_at: "" },
];

const budget: MonthlyBudget = {
  id: "b",
  user_id: "u",
  created_at: "",
  updated_at: "",
  ...budgetFromTemplate("2026-10"),
};

const transactions: Transaction[] = [
  {
    id: "tx-1",
    user_id: "u",
    occurred_on: "2026-10-09",
    amount: 1250,
    type: "expense",
    category_id: "p",
    account_id: "a1",
    counterparty_account_id: null,
    payment_method: "upi",
    description: "Lunch",
    note: "",
    source: "manual",
    client_request_id: null,
    created_at: "2026-10-09T04:00:00.000Z",
    updated_at: "2026-10-09T04:00:00.000Z",
  },
];

describe("excel export", () => {
  it("includes the full record set with numeric amounts", () => {
    const workbook = buildWorkbook({
      transactions,
      budgets: [budget],
      familyAllocations: [],
      accounts,
      categories,
      profile,
    });

    expect(workbook.SheetNames).toEqual([
      "Transactions",
      "Budgets",
      "Family allocations",
      "Settings",
      "Monthly summary",
      "Weekly summary",
    ]);

    const sheet = workbook.Sheets.Transactions;
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("tx-1");
    expect(rows[0].amount).toBe(1250);
    expect(typeof rows[0].amount).toBe("number");
    expect(rows[0].description).toBe("Lunch");

    const budgets = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets.Budgets);
    expect(typeof budgets[0].personal_limit).toBe("number");
    expect(typeof budgets[0].weekly_target).toBe("number");

    const monthly = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets["Monthly summary"]);
    expect(monthly[0].personal_spent).toBe(1250);
    expect(typeof monthly[0].personal_spent).toBe("number");
  });
});
