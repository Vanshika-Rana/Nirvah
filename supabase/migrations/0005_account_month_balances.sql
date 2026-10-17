-- Per-payday account snapshots: last leftover in, amount parked this cycle.
-- Run this in the Supabase SQL editor after 0004_account_balances.sql.

create table if not exists public.account_month_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  year_month date not null,
  opening numeric(14, 2) not null default 0,
  deposited numeric(14, 2) not null default 0,
  unique (user_id, account_id, year_month)
);

create index if not exists account_month_balances_user_month_idx
  on public.account_month_balances (user_id, year_month);

alter table public.account_month_balances enable row level security;

drop policy if exists "account_month_balances_select_own" on public.account_month_balances;
drop policy if exists "account_month_balances_insert_own" on public.account_month_balances;
drop policy if exists "account_month_balances_update_own" on public.account_month_balances;
drop policy if exists "account_month_balances_delete_own" on public.account_month_balances;
create policy "account_month_balances_select_own" on public.account_month_balances
  for select using (auth.uid() = user_id);
create policy "account_month_balances_insert_own" on public.account_month_balances
  for insert with check (auth.uid() = user_id);
create policy "account_month_balances_update_own" on public.account_month_balances
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "account_month_balances_delete_own" on public.account_month_balances
  for delete using (auth.uid() = user_id);

revoke all on public.account_month_balances from anon, public;
grant select, insert, update, delete on public.account_month_balances to authenticated;
