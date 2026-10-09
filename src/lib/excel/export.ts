import * as XLSX from "xlsx";
import type {
  Account,
  Category,
  FamilyAllocation,
  MonthlyBudget,
  Profile,
  Transaction,
} from "@/lib/types";
import {
  formatMonthLabel,
  monthRange,
  startOfWeek,
  toISODate,
  toYearMonth,
  type WeekStartDay,
} from "@/lib/finance/dates";
import { summarizeDashboard } from "@/lib/finance/summarize";
import { weekRange } from "@/lib/finance/dates";
import { personalSpentInRange } from "@/lib/finance/weekly";
import { PAYMENT_METHOD_LABELS, TRANSACTION_TYPE_LABELS } from "@/lib/constants";
import { categoryById } from "@/lib/finance/classify";

export type ExportPayload = {
  transactions: Transaction[];
  budgets: MonthlyBudget[];
  familyAllocations: FamilyAllocation[];
  accounts: Account[];
  categories: Category[];
  profile: Profile;
  incomes?: { year_month: string; label: string; amount: number; is_salary: boolean; occurred_on: string }[];
  envelopes?: { year_month: string; name: string; kind: string; amount: number }[];
};

function accountName(accounts: Account[], id: string | null): string {
  if (!id) return "";
  return accounts.find((account) => account.id === id)?.name ?? "";
}

export function buildWorkbook(payload: ExportPayload): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();
  const weekStartsOn = payload.profile.week_start_day as WeekStartDay;

  const transactionRows = payload.transactions.map((transaction) => {
    const category = categoryById(payload.categories, transaction.category_id);
    return {
      id: transaction.id,
      occurred_on: transaction.occurred_on,
      amount: Number(transaction.amount),
      type: transaction.type,
      type_label: TRANSACTION_TYPE_LABELS[transaction.type],
      category: category?.name ?? "",
      category_bucket: category?.bucket ?? "",
      account: accountName(payload.accounts, transaction.account_id),
      counterparty_account: accountName(payload.accounts, transaction.counterparty_account_id),
      payment_method: PAYMENT_METHOD_LABELS[transaction.payment_method],
      description: transaction.description,
      note: transaction.note,
      source: transaction.source,
      created_at: transaction.created_at,
      updated_at: transaction.updated_at,
    };
  });

  const budgetRows = payload.budgets.map((budget) => ({
    year_month: budget.year_month.slice(0, 7),
    salary: Number(budget.salary),
    personal_limit: Number(budget.personal_limit),
    family_limit: Number(budget.family_limit),
    weekly_target: Number(budget.weekly_target),
    home_loan: Number(budget.home_loan),
    credit_card_bill: Number(budget.credit_card_bill),
    sip: Number(budget.sip),
    savings: Number(budget.savings),
    buffer: Number(budget.buffer),
    allocations_recorded_at: budget.allocations_recorded_at ?? "",
  }));

  const familyRows = payload.familyAllocations.map((allocation) => ({
    year_month: allocation.year_month.slice(0, 7),
    name: allocation.name,
    amount: Number(allocation.amount),
    sort_order: allocation.sort_order,
  }));

  const settingsRows = [
    { key: "week_start_day", value: payload.profile.week_start_day },
    ...payload.accounts.map((account) => ({
      key: `account:${account.id}`,
      value: `${account.name} (${account.kind}, ${account.is_active ? "active" : "inactive"})`,
    })),
    ...payload.categories.map((category) => ({
      key: `category:${category.id}`,
      value: `${category.name} (${category.bucket}, ${category.is_active ? "active" : "inactive"})`,
    })),
  ];

  const monthlySummary = payload.budgets.map((budget) => {
    const month = monthRange(budget.year_month.slice(0, 7));
    const summary = summarizeDashboard({
      budget: { ...budget, year_month: budget.year_month.slice(0, 7) },
      transactions: payload.transactions,
      categories: payload.categories,
      today: month.end,
      weekStartsOn,
    });
    return {
      month: formatMonthLabel(budget.year_month.slice(0, 7)),
      year_month: budget.year_month.slice(0, 7),
      personal_spent: summary.personalSpent,
      personal_remaining: summary.personalRemaining,
      family_spent: summary.familySpent,
      family_remaining: summary.familyRemaining,
      combined_spent: summary.combinedSpent,
      home_loan: summary.homeLoanSpent,
      credit_card_repayments: summary.creditCardBillSpent,
      sip: summary.sipSpent,
      savings: summary.savingsMoved,
      buffer: summary.bufferSpent,
      income_recorded: summary.incomeRecorded,
    };
  });

  const weekKeys = new Set<string>();
  const weeklySummary: {
    week_start: string;
    week_end: string;
    personal_spent: number;
    weekly_target: number;
  }[] = [];

  const sorted = [...payload.transactions].sort((a, b) =>
    a.occurred_on.localeCompare(b.occurred_on),
  );
  if (sorted.length > 0) {
    let cursor = startOfWeek(sorted[0].occurred_on, weekStartsOn);
    const last = startOfWeek(sorted[sorted.length - 1].occurred_on, weekStartsOn);
    while (cursor <= last) {
      const range = weekRange(cursor, weekStartsOn);
      const key = range.start;
      if (!weekKeys.has(key)) {
        weekKeys.add(key);
        const monthKey = toYearMonth(range.start);
        const budget =
          payload.budgets.find((item) => item.year_month.slice(0, 7) === monthKey) ??
          payload.budgets[0];
        weeklySummary.push({
          week_start: range.start,
          week_end: range.end,
          personal_spent: personalSpentInRange(
            payload.transactions,
            payload.categories,
            range.start,
            range.end,
          ),
          weekly_target: Number(budget?.weekly_target ?? 8000),
        });
      }
      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() + 7);
    }
  }

  const incomeRows = (payload.incomes ?? []).map((row) => ({
    year_month: row.year_month.slice(0, 7),
    label: row.label,
    amount: Number(row.amount),
    is_salary: row.is_salary,
    occurred_on: row.occurred_on,
  }));
  const envelopeRows = (payload.envelopes ?? []).map((row) => ({
    year_month: row.year_month.slice(0, 7),
    name: row.name,
    kind: row.kind,
    amount: Number(row.amount),
  }));

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(transactionRows), "Transactions");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(budgetRows), "Budgets");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(familyRows), "Family allocations");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(settingsRows), "Settings");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(monthlySummary), "Monthly summary");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(weeklySummary), "Weekly summary");
  if (incomeRows.length > 0) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(incomeRows), "Income");
  }
  if (envelopeRows.length > 0) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(envelopeRows), "Envelopes");
  }
  return workbook;
}

export function workbookToBuffer(workbook: XLSX.WorkBook): Buffer {
  const encoded = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(encoded);
}

export function exportFileName(now = new Date()): string {
  return `nirvah-backup-${toISODate(now)}.xlsx`;
}
