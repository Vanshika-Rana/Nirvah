import type { MonthlyBudget } from "@/lib/types";

export type BudgetTemplate = {
  salary: number;
  personal_limit: number;
  family_limit: number;
  weekly_target: number;
  home_loan: number;
  credit_card_bill: number;
  sip: number;
  savings: number;
  buffer: number;
  opening_balance: number;
};

export const DEFAULT_BUDGET_TEMPLATE: BudgetTemplate = {
  salary: 0,
  personal_limit: 0,
  family_limit: 0,
  weekly_target: 0,
  home_loan: 0,
  credit_card_bill: 0,
  sip: 0,
  savings: 0,
  buffer: 0,
  opening_balance: 0,
};

export function budgetFromTemplate(
  yearMonth: string,
  template: BudgetTemplate = DEFAULT_BUDGET_TEMPLATE,
): Omit<MonthlyBudget, "id" | "user_id" | "created_at" | "updated_at"> {
  return {
    year_month: yearMonth,
    allocations_recorded_at: null,
    ...template,
  };
}

export function applyBudgetPatch(
  budgets: Record<string, BudgetTemplate>,
  yearMonth: string,
  patch: Partial<BudgetTemplate>,
): Record<string, BudgetTemplate> {
  const current = budgets[yearMonth] ?? DEFAULT_BUDGET_TEMPLATE;
  return {
    ...budgets,
    [yearMonth]: { ...current, ...patch },
  };
}
