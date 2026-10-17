import { roundMoney } from "@/lib/finance/money";
import type { Account, Transaction } from "@/lib/types";

export type AccountPaydayRow = {
  id: string;
  name: string;
  kind: Account["kind"];
  previous: number;
  deposited: number;
  spent: number;
  moved: number;
  left: number;
  isMostSpent: boolean;
};

export type AccountPaydaySummary = {
  accounts: AccountPaydayRow[];
  mostSpentId: string | null;
};

type Dated = { occurred_on: string };

function inCycle(row: Dated, cycleStart: string | null, cycleEnd: string | null): boolean {
  if (cycleStart && row.occurred_on < cycleStart) return false;
  if (cycleEnd && row.occurred_on > cycleEnd) return false;
  return true;
}

export function accountLeft(opening: number, deposited: number, spent: number, moved = 0): number {
  return roundMoney(opening + deposited - spent + moved);
}

export function accountCycleMovement(
  accountId: string,
  transactions: Pick<Transaction, "type" | "amount" | "account_id" | "counterparty_account_id" | "occurred_on">[],
  cycleStart: string | null,
  cycleEnd: string | null,
): { spent: number; moved: number } {
  let spent = 0;
  let moved = 0;
  for (const transaction of transactions) {
    if (!inCycle(transaction, cycleStart, cycleEnd)) continue;
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
  accounts: Pick<Account, "id" | "name" | "kind" | "is_active">[];
  snapshots: { account_id: string; opening: number; deposited: number }[];
  transactions: Pick<Transaction, "type" | "amount" | "account_id" | "counterparty_account_id" | "occurred_on">[];
  cycleStart: string | null;
  cycleEnd: string | null;
}): AccountPaydaySummary {
  const snapshotByAccount = new Map(input.snapshots.map((row) => [row.account_id, row]));
  const rows = input.accounts
    .filter((account) => account.is_active)
    .map((account) => {
      const snapshot = snapshotByAccount.get(account.id);
      const previous = snapshot?.opening ?? 0;
      const deposited = snapshot?.deposited ?? 0;
      const during = accountCycleMovement(account.id, input.transactions, input.cycleStart, input.cycleEnd);
      return {
        id: account.id,
        name: account.name,
        kind: account.kind,
        previous,
        deposited,
        spent: during.spent,
        moved: during.moved,
        left: accountLeft(previous, deposited, during.spent, during.moved),
        isMostSpent: false,
      };
    });

  const topSpend = Math.max(0, ...rows.map((row) => row.spent));
  const mostSpentId = topSpend > 0 ? (rows.find((row) => row.spent === topSpend)?.id ?? null) : null;
  const accounts = rows.map((row) => ({ ...row, isMostSpent: row.id === mostSpentId }));

  return { accounts, mostSpentId };
}
