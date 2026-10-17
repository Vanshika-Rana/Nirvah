-- Per-account starting balances, and which account income landed in.
-- Run this in the Supabase SQL editor after 0003_ledger_mode.sql.

alter table public.accounts
  add column if not exists opening_balance numeric(14, 2) not null default 0;

alter table public.incomes
  add column if not exists account_id uuid references public.accounts (id) on delete set null;
