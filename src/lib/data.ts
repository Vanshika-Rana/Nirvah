import { HISTORY_PAGE_SIZE } from "@/lib/constants";
import { addMonths, monthRange, parseYearMonth, toYearMonth } from "@/lib/finance/dates";
import { computeCarryOver, expenseOutflows, type Envelope, type Income } from "@/lib/finance/month-plan";
import { createServerSupabase } from "@/lib/supabase/server";
import type {
  Account,
  Category,
  FamilyAllocation,
  MonthlyBudget,
  Profile,
  Transaction,
} from "@/lib/types";
import { redirect } from "next/navigation";

function mapBudget(row: MonthlyBudget): MonthlyBudget {
  return {
    ...row,
    year_month: row.year_month.slice(0, 7),
    salary: Number(row.salary),
    personal_limit: Number(row.personal_limit),
    family_limit: Number(row.family_limit),
    weekly_target: Number(row.weekly_target),
    home_loan: Number(row.home_loan),
    credit_card_bill: Number(row.credit_card_bill),
    sip: Number(row.sip),
    savings: Number(row.savings),
    buffer: Number(row.buffer),
    opening_balance: Number(row.opening_balance ?? 0),
  };
}

function mapEnvelope(row: Envelope): Envelope {
  return {
    ...row,
    year_month: row.year_month.slice(0, 7),
    amount: Number(row.amount),
    kind: row.kind,
  };
}

function mapIncome(row: Income): Income {
  return {
    ...row,
    year_month: row.year_month.slice(0, 7),
    amount: Number(row.amount),
  };
}

function mapAllocation(row: FamilyAllocation): FamilyAllocation {
  return { ...row, year_month: row.year_month.slice(0, 7), amount: Number(row.amount) };
}

function mapTransaction(row: Transaction): Transaction {
  return { ...row, amount: Number(row.amount) };
}

function monthDate(yearMonth: string): string {
  parseYearMonth(yearMonth);
  return `${yearMonth}-01`;
}

function isMissingRelation(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "PGRST205" || /could not find the (table|relation)/i.test(error.message ?? "");
}

export async function isMonthPlanSchemaReady(): Promise<boolean> {
  const { supabase } = await getAuthContext();
  const { error } = await supabase.from("envelopes").select("id").limit(1);
  return !isMissingRelation(error);
}

export async function getAuthContext() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function getProfile() {
  const { supabase, user } = await getAuthContext();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error || !data) {
    await supabase.from("profiles").upsert({ id: user.id, week_start_day: 1, default_salary: 0 });
    return {
      id: user.id,
      week_start_day: 1,
      default_salary: 0,
      created_at: "",
      updated_at: "",
    } satisfies Profile;
  }
  const profile = data as Profile;
  return { ...profile, default_salary: Number(profile.default_salary ?? 0) };
}

export async function getAccounts(): Promise<Account[]> {
  const { supabase, user } = await getAuthContext();
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user.id)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as Account[];
}

export async function getCategories(): Promise<Category[]> {
  const { supabase, user } = await getAuthContext();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", user.id)
    .order("sort_order");
  if (error) throw error;
  return ((data ?? []) as Category[]).map((category) => ({
    ...category,
    kind: category.kind ?? "spend",
  }));
}

export async function getIncomes(yearMonth: string): Promise<Income[]> {
  const { supabase, user } = await getAuthContext();
  const { data, error } = await supabase
    .from("incomes")
    .select("*")
    .eq("user_id", user.id)
    .eq("year_month", monthDate(yearMonth))
    .order("created_at");
  if (error) {
    if (isMissingRelation(error)) return [];
    throw error;
  }
  return ((data ?? []) as Income[]).map(mapIncome);
}

export async function getEnvelopes(yearMonth: string): Promise<Envelope[]> {
  const { supabase, user } = await getAuthContext();
  const { data, error } = await supabase
    .from("envelopes")
    .select("*")
    .eq("user_id", user.id)
    .eq("year_month", monthDate(yearMonth))
    .order("sort_order");
  if (error) {
    if (isMissingRelation(error)) return [];
    throw error;
  }
  return ((data ?? []) as Envelope[]).map(mapEnvelope);
}

async function previousCarryOver(yearMonth: string): Promise<{
  opening: number;
  weeklyTarget: number;
  previousEnvelopes: Envelope[];
}> {
  const { supabase, user } = await getAuthContext();
  const previous = await supabase
    .from("monthly_budgets")
    .select("*")
    .eq("user_id", user.id)
    .lt("year_month", monthDate(yearMonth))
    .order("year_month", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!previous.data) {
    return { opening: 0, weeklyTarget: 0, previousEnvelopes: [] };
  }

  const prev = mapBudget(previous.data as MonthlyBudget);
  const range = monthRange(prev.year_month);
  const [incomes, envelopes, transactions] = await Promise.all([
    getIncomes(prev.year_month),
    getEnvelopes(prev.year_month),
    getTransactionsInRange(range.start, range.end),
  ]);
  return {
    opening: computeCarryOver({
      opening: prev.opening_balance,
      income: incomes.reduce((sum, row) => sum + row.amount, 0),
      expenses: expenseOutflows(transactions),
    }),
    weeklyTarget: prev.weekly_target,
    previousEnvelopes: envelopes,
  };
}

export async function ensureMonthBudget(yearMonth: string): Promise<{
  budget: MonthlyBudget;
  familyAllocations: FamilyAllocation[];
  envelopes: Envelope[];
  incomes: Income[];
}> {
  const { supabase, user } = await getAuthContext();
  const month = monthDate(yearMonth);

  const existing = await supabase
    .from("monthly_budgets")
    .select("*")
    .eq("user_id", user.id)
    .eq("year_month", month)
    .maybeSingle();

  if (existing.data) {
    const [envelopes, incomes] = await Promise.all([getEnvelopes(yearMonth), getIncomes(yearMonth)]);
    return {
      budget: mapBudget(existing.data as MonthlyBudget),
      familyAllocations: [],
      envelopes,
      incomes,
    };
  }

  const previous = await previousCarryOver(yearMonth);
  const inserted = await supabase
    .from("monthly_budgets")
    .insert({
      user_id: user.id,
      year_month: month,
      salary: 0,
      personal_limit: 0,
      family_limit: 0,
      weekly_target: previous.weeklyTarget,
      home_loan: 0,
      credit_card_bill: 0,
      sip: 0,
      savings: 0,
      buffer: 0,
      opening_balance: previous.opening,
    })
    .select("*")
    .single();

  if (inserted.error) throw inserted.error;

  if (previous.previousEnvelopes.length > 0) {
    const copied = await supabase
      .from("envelopes")
      .insert(
        previous.previousEnvelopes.map((row, index) => ({
          user_id: user.id,
          year_month: month,
          name: row.name,
          kind: row.kind,
          amount: row.amount,
          category_id: row.category_id,
          sort_order: row.sort_order ?? index + 1,
        })),
      )
      .select("*");
    if (copied.error && !isMissingRelation(copied.error)) throw copied.error;
  }

  const [envelopes, incomes] = await Promise.all([getEnvelopes(yearMonth), getIncomes(yearMonth)]);
  return {
    budget: mapBudget(inserted.data as MonthlyBudget),
    familyAllocations: [],
    envelopes,
    incomes,
  };
}

export async function getTransactionsInRange(start: string, end: string): Promise<Transaction[]> {
  const { supabase, user } = await getAuthContext();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .gte("occurred_on", start)
    .lte("occurred_on", end)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Transaction[]).map(mapTransaction);
}

export async function getAllExportData() {
  const { supabase, user } = await getAuthContext();
  const [transactions, budgets, familyAllocations, accounts, categories, profile, incomes, envelopes] =
    await Promise.all([
      supabase.from("transactions").select("*").eq("user_id", user.id).order("occurred_on"),
      supabase.from("monthly_budgets").select("*").eq("user_id", user.id).order("year_month"),
      supabase.from("family_allocations").select("*").eq("user_id", user.id).order("year_month"),
      supabase.from("accounts").select("*").eq("user_id", user.id).order("sort_order"),
      supabase.from("categories").select("*").eq("user_id", user.id).order("sort_order"),
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("incomes").select("*").eq("user_id", user.id).order("occurred_on"),
      supabase.from("envelopes").select("*").eq("user_id", user.id).order("year_month"),
    ]);

  if (transactions.error) throw transactions.error;
  if (budgets.error) throw budgets.error;
  if (familyAllocations.error) throw familyAllocations.error;
  if (accounts.error) throw accounts.error;
  if (categories.error) throw categories.error;
  if (profile.error) throw profile.error;
  if (incomes.error && !isMissingRelation(incomes.error)) throw incomes.error;
  if (envelopes.error && !isMissingRelation(envelopes.error)) throw envelopes.error;

  return {
    transactions: ((transactions.data ?? []) as Transaction[]).map(mapTransaction),
    budgets: ((budgets.data ?? []) as MonthlyBudget[]).map(mapBudget),
    familyAllocations: ((familyAllocations.data ?? []) as FamilyAllocation[]).map(mapAllocation),
    accounts: (accounts.data ?? []) as Account[],
    categories: (categories.data ?? []) as Category[],
    profile: profile.data as Profile,
    incomes: ((incomes.data ?? []) as Income[]).map(mapIncome),
    envelopes: ((envelopes.data ?? []) as Envelope[]).map(mapEnvelope),
  };
}

export type HistoryFilters = {
  month?: string;
  weekStart?: string;
  weekEnd?: string;
  categoryId?: string;
  accountId?: string;
  type?: string;
  query?: string;
  page?: number;
};

export async function getHistory(filters: HistoryFilters) {
  const { supabase, user } = await getAuthContext();
  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * HISTORY_PAGE_SIZE;
  const to = from + HISTORY_PAGE_SIZE - 1;

  let request = supabase
    .from("transactions")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.month) {
    const range = monthRange(filters.month);
    request = request.gte("occurred_on", range.start).lte("occurred_on", range.end);
  }
  if (filters.weekStart && filters.weekEnd) {
    request = request.gte("occurred_on", filters.weekStart).lte("occurred_on", filters.weekEnd);
  }
  if (filters.categoryId) request = request.eq("category_id", filters.categoryId);
  if (filters.accountId) request = request.eq("account_id", filters.accountId);
  if (filters.type) request = request.eq("type", filters.type);
  if (filters.query) request = request.ilike("description", `%${filters.query}%`);

  const { data, error, count } = await request;
  if (error) throw error;
  return {
    transactions: ((data ?? []) as Transaction[]).map(mapTransaction),
    total: count ?? 0,
    page,
    pageSize: HISTORY_PAGE_SIZE,
  };
}

export async function getRecentTransactions(limit = 8): Promise<Transaction[]> {
  const { supabase, user } = await getAuthContext();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as Transaction[]).map(mapTransaction);
}

export function currentYearMonth(now: Date): string {
  return toYearMonth(now);
}

export function lookbackStart(yearMonth: string, now: Date, weeks = 8): string {
  const start = monthRange(addMonths(yearMonth, -2)).start;
  const weekLookback = new Date(now);
  weekLookback.setDate(weekLookback.getDate() - weeks * 7);
  const iso = `${weekLookback.getFullYear()}-${String(weekLookback.getMonth() + 1).padStart(2, "0")}-${String(weekLookback.getDate()).padStart(2, "0")}`;
  return iso < start ? iso : start;
}
