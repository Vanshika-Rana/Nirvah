-- Blank-start month plan: income you enter, envelopes you split, leftover carries forward.
-- Run this in the Supabase SQL editor after 0001_init.sql.

alter table public.profiles
  add column if not exists default_salary numeric(14, 2) not null default 0 check (default_salary >= 0);

alter table public.monthly_budgets
  add column if not exists opening_balance numeric(14, 2) not null default 0 check (opening_balance >= 0);

alter table public.monthly_budgets alter column salary set default 0;
alter table public.monthly_budgets alter column personal_limit set default 0;
alter table public.monthly_budgets alter column family_limit set default 0;
alter table public.monthly_budgets alter column weekly_target set default 0;
alter table public.monthly_budgets alter column home_loan set default 0;
alter table public.monthly_budgets alter column credit_card_bill set default 0;
alter table public.monthly_budgets alter column sip set default 0;
alter table public.monthly_budgets alter column savings set default 0;
alter table public.monthly_budgets alter column buffer set default 0;

alter table public.categories
  add column if not exists kind text not null default 'spend';

alter table public.categories drop constraint if exists categories_kind_check;
alter table public.categories
  add constraint categories_kind_check check (kind in ('spend', 'save', 'commit'));

update public.categories
set kind = case bucket
  when 'savings' then 'save'
  when 'buffer' then 'save'
  when 'sip' then 'save'
  when 'home_loan' then 'commit'
  when 'credit_card_bill' then 'commit'
  else 'spend'
end;

create table if not exists public.incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  year_month date not null,
  label text not null default 'Income' check (char_length(label) between 1 and 80),
  amount numeric(14, 2) not null check (amount > 0),
  is_salary boolean not null default false,
  occurred_on date not null,
  created_at timestamptz not null default now()
);

create index if not exists incomes_user_month_idx
  on public.incomes (user_id, year_month);

create table if not exists public.envelopes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  year_month date not null,
  name text not null check (char_length(name) between 1 and 80),
  kind text not null default 'spend' check (kind in ('spend', 'save', 'commit')),
  amount numeric(14, 2) not null default 0 check (amount >= 0),
  category_id uuid references public.categories (id) on delete set null,
  sort_order integer not null default 0
);

create index if not exists envelopes_user_month_idx
  on public.envelopes (user_id, year_month);

alter table public.incomes enable row level security;
alter table public.envelopes enable row level security;

drop policy if exists "incomes_select_own" on public.incomes;
drop policy if exists "incomes_insert_own" on public.incomes;
drop policy if exists "incomes_update_own" on public.incomes;
drop policy if exists "incomes_delete_own" on public.incomes;
create policy "incomes_select_own" on public.incomes for select using (auth.uid() = user_id);
create policy "incomes_insert_own" on public.incomes for insert with check (auth.uid() = user_id);
create policy "incomes_update_own" on public.incomes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "incomes_delete_own" on public.incomes for delete using (auth.uid() = user_id);

drop policy if exists "envelopes_select_own" on public.envelopes;
drop policy if exists "envelopes_insert_own" on public.envelopes;
drop policy if exists "envelopes_update_own" on public.envelopes;
drop policy if exists "envelopes_delete_own" on public.envelopes;
create policy "envelopes_select_own" on public.envelopes for select using (auth.uid() = user_id);
create policy "envelopes_insert_own" on public.envelopes for insert with check (auth.uid() = user_id);
create policy "envelopes_update_own" on public.envelopes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "envelopes_delete_own" on public.envelopes for delete using (auth.uid() = user_id);

revoke all on public.incomes from anon, public;
revoke all on public.envelopes from anon, public;
grant select, insert, update, delete on public.incomes to authenticated;
grant select, insert, update, delete on public.envelopes to authenticated;

create or replace function public.seed_user_defaults(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, week_start_day, default_salary)
  values (target_user, 1, 0)
  on conflict (id) do nothing;
end;
$$;

-- Clear the old starter plan so existing accounts start blank.
update public.monthly_budgets
set
  salary = 0,
  personal_limit = 0,
  family_limit = 0,
  weekly_target = 0,
  home_loan = 0,
  credit_card_bill = 0,
  sip = 0,
  savings = 0,
  buffer = 0,
  opening_balance = 0,
  allocations_recorded_at = null;

delete from public.family_allocations;

delete from public.categories c
where not exists (
  select 1 from public.transactions t where t.category_id = c.id
);

delete from public.accounts a
where not exists (
  select 1 from public.transactions t
  where t.account_id = a.id or t.counterparty_account_id = a.id
);
