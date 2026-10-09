import type {
  Account,
  Category,
  FamilyAllocation,
  MonthlyBudget,
  Profile,
  Transaction,
} from "@/lib/types";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
      };
      accounts: {
        Row: Account;
        Insert: Omit<Account, "created_at"> & { created_at?: string };
        Update: Partial<Account>;
      };
      categories: {
        Row: Category;
        Insert: Omit<Category, "created_at"> & { created_at?: string };
        Update: Partial<Category>;
      };
      monthly_budgets: {
        Row: MonthlyBudget;
        Insert: Omit<MonthlyBudget, "created_at" | "updated_at" | "id"> & {
          id?: string;
        };
        Update: Partial<MonthlyBudget>;
      };
      family_allocations: {
        Row: FamilyAllocation;
        Insert: Omit<FamilyAllocation, "id"> & { id?: string };
        Update: Partial<FamilyAllocation>;
      };
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, "created_at" | "updated_at" | "id"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Transaction>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
