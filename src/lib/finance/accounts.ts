import type { Income } from "@/lib/finance/month-plan";
import { roundMoney } from "@/lib/finance/money";
import type { Account, Transaction } from "@/lib/types";

export type AccountPaydayRow = {
  id: string;
  name: string;
  kind: Account["kind"];
  previous: number;
  income: number;
  spent: number;
  moved: number;
  left: number;
  isMostSpent: boolean;
};

export type AccountPaydaySummary = {
  accounts: AccountPaydayRow[];
  unassignedIncome: number;
  mostSpentId: string | null;
};

type Dated = { occurred_on: string };

function beforeCycle(row: Dated, cycleStart: string | null): boolean {
  return Boolean(cycleStart && row.occurred_on < cycleStart);
}

function inCycle(row: Dated, cycleStart: string | null, cycleEnd: string | null): boolean {
  if (cycleStart && row.occurred_on < cycleStart) return false;
  if (cycleEnd && row.occurred_on > cycleEnd) return false;
  return true;
}

function incomeFor(
  accountId: string,
  incomes: Pick<Income, "amount" | "account_id" | "occurred_on">[],
  cycleStart: string | null,
  cycleEnd: string | null,
  mode: "before" | "during",
): number {
  return roundMoney(
    incomes.reduce((sum, row) => {
      if (row.account_id !== accountId) return sum;
      const match = mode === "before" ? beforeCycle(row, cycleStart) : inCycle(row, cycleStart, cycleEnd);
      return match ? sum + row.amount : sum;
    }, 0),
  );
}

function movementFor(
  accountId: string,
  transactions: Pick<Transaction, "type" | "amount" | "account_id" | "counterparty_account_id" | "occurred_on">[],
  cycleStart: string | null,
  cycleEnd: string | null,
  mode: "before" | "during",
): { spent: number; moved: number } {
  let spent = 0;
  let moved = 0;
  for (const transaction of transactions) {
    const match =
      mode === "before" ? beforeCycle(transaction, cycleStart) : inCycle(transaction, cycleStart, cycleEnd);
    if (!match) continue;
    if (transaction.type === "expense" && transaction.account_id === accountId) {
      spent += transaction.amount;
      continue;
    }
    if (transaction.type === "income" && transaction.account_id === accountId) {
      moved += transaction.amount;
      continue;
    }
    if (transaction.type === "transfer" || transaction.type === "repayment") {
      if (transaction.account_id === accountId) moved -= transaction.amount;
      if (transaction.counterparty_account_id === accountId) moved += transaction.amount;
    }
  }
  return { spent: roundMoney(spent), moved: roundMoney(moved) };
}

export function summarizeAccounts(input: {
  accounts: Pick<Account, "id" | "name" | "kind" | "opening_balance" | "is_active">[];
  incomes: Pick<Income, "amount" | "account_id" | "occurred_on">[];
  transactions: Pick<Transaction, "type" | "amount" | "account_id" | "counterparty_account_id" | "occurred_on">[];
  cycleStart: string | null;
  cycleEnd: string | null;
}): AccountPaydaySummary {
  const visible = input.accounts.filter((account) => account.is_active);
  const rows = visible.map((account) => {
    const priorIncome = incomeFor(account.id, input.incomes, input.cycleStart, input.cycleEnd, "before");
    const priorMove = movementFor(account.id, input.transactions, input.cycleStart, input.cycleEnd, "before");
    const income = incomeFor(account.id, input.incomes, input.cycleStart, input.cycleEnd, "during");
    const during = movementFor(account.id, input.transactions, input.cycleStart, input.cycleEnd, "during");
    const previous = roundMoney(account.opening_balance + priorIncome - priorMove.spent + priorMove.moved);
    const left = roundMoney(previous + income - during.spent + during.moved);
    return {
      id: account.id,
      name: account.name,
      kind: account.kind,
      previous,
      income,
      spent: during.spent,
      moved: during.moved,
      left,
      isMostSpent: false,
    };
  });

  const topSpend = Math.max(0, ...rows.map((row) => row.spent));
  const mostSpentId = topSpend > 0 ? (rows.find((row) => row.spent === topSpend)?.id ?? null) : null;
  const accounts = rows.map((row) => ({ ...row, isMostSpent: row.id === mostSpentId }));

  const unassignedIncome = roundMoney(
    input.incomes.reduce((sum, row) => {
      if (row.account_id) return sum;
      return inCycle(row, input.cycleStart, input.cycleEnd) ? sum + row.amount : sum;
    }, 0),
  );

  return { accounts, unassignedIncome, mostSpentId };
}
