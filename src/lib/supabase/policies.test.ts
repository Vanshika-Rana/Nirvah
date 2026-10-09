import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = [
  readFileSync(resolve(process.cwd(), "supabase/migrations/0001_init.sql"), "utf8"),
  readFileSync(resolve(process.cwd(), "supabase/migrations/0002_envelopes_income.sql"), "utf8"),
  readFileSync(resolve(process.cwd(), "supabase/migrations/0003_ledger_mode.sql"), "utf8"),
].join("\n");

const tables = [
  "profiles",
  "accounts",
  "categories",
  "monthly_budgets",
  "family_allocations",
  "transactions",
  "incomes",
  "envelopes",
];

describe("Supabase policies keep financial rows private", () => {
  it("enables row level security on every user-owned table", () => {
    for (const table of tables) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it("scopes each policy to the signed-in user", () => {
    expect(sql).toContain("auth.uid() = user_id");
    expect(sql).toContain("auth.uid() = id");
    expect(sql).not.toContain("using (true)");
    expect(sql).not.toContain("for select using (true)");
  });

  it("does not grant table access to anon", () => {
    expect(sql).toContain("revoke all on public.transactions from anon, public");
    expect(sql).toContain("grant select, insert, update, delete on public.transactions to authenticated");
  });

  it("never exposes a service-role workflow in the migration", () => {
    expect(sql.toLowerCase()).not.toContain("service_role");
  });
});
