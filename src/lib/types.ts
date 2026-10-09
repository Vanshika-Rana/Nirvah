export const TRANSACTION_TYPES = [
  "income",
  "expense",
  "transfer",
  "repayment",
] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const PAYMENT_METHODS = [
  "upi",
  "debit_card",
  "credit_card",
  "cash",
  "bank_transfer",
  "other",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const CATEGORY_BUCKETS = [
  "personal",
  "family",
  "business",
  "home_loan",
  "credit_card_bill",
  "sip",
  "savings",
  "buffer",
  "income",
  "transfer",
  "other",
] as const;
export type CategoryBucket = (typeof CATEGORY_BUCKETS)[number];

export const ACCOUNT_KINDS = ["bank", "credit_card", "cash", "other"] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export type Account = {
  id: string;
  user_id: string;
  name: string;
  kind: AccountKind;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export type EnvelopeKind = "spend" | "save" | "commit";

export type Category = {
  id: string;
  user_id: string;
  name: string;
  bucket: CategoryBucket;
  kind: EnvelopeKind;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export type MonthlyBudget = {
  id: string;
  user_id: string;
  year_month: string;
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
  allocations_recorded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FamilyAllocation = {
  id: string;
  user_id: string;
  year_month: string;
  name: string;
  amount: number;
  sort_order: number;
};

export type Transaction = {
  id: string;
  user_id: string;
  occurred_on: string;
  amount: number;
  type: TransactionType;
  category_id: string | null;
  account_id: string;
  counterparty_account_id: string | null;
  payment_method: PaymentMethod;
  description: string;
  note: string;
  source: "manual" | "allocation";
  client_request_id: string | null;
  created_at: string;
  updated_at: string;
};

export const TRACKER_MODES = ["envelopes", "ledger"] as const;
export type TrackerMode = (typeof TRACKER_MODES)[number];

export type Profile = {
  id: string;
  week_start_day: number;
  default_salary: number;
  tracker_mode: TrackerMode | null;
  created_at: string;
  updated_at: string;
};

export type TransactionInput = {
  amount: number;
  occurred_on: string;
  type: TransactionType;
  category_id: string | null;
  account_id: string;
  counterparty_account_id: string | null;
  payment_method: PaymentMethod;
  description: string;
  note: string;
  client_request_id?: string | null;
  source?: "manual" | "allocation";
};
