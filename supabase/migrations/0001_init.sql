-- Nirvah personal budget tracker
-- Run this in the Supabase SQL editor or with the Supabase CLI.

create extension if not exists "pgcrypto";

do $$ begin
  create type public.transaction_type as enum ('income', 'expense', 'transfer', 'repayment');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.payment_method as enum ('upi', 'debit_card', 'credit_card', 'cash', 'bank_transfer', 'other');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.category_bucket as enum (
    'personal', 'family', 'home_loan', 'credit_card_bill', 'sip',
    'savings', 'buffer', 'income', 'transfer', 'other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.account_kind as enum ('bank', 'credit_card', 'cash', 'other');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  week_start_day smallint not null default 1 check (week_start_day between 0 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  kind public.account_kind not null default 'bank',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  bucket public.category_bucket not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  year_month date not null,
  salary numeric(14, 2) not null default 282000 check (salary >= 0),
  personal_limit numeric(14, 2) not null default 35000 check (personal_limit >= 0),
  family_limit numeric(14, 2) not null default 20000 check (family_limit >= 0),
  weekly_target numeric(14, 2) not null default 8000 check (weekly_target >= 0),
  home_loan numeric(14, 2) not null default 70000 check (home_loan >= 0),
  credit_card_bill numeric(14, 2) not null default 21000 check (credit_card_bill >= 0),
  sip numeric(14, 2) not null default 10000 check (sip >= 0),
  savings numeric(14, 2) not null default 110000 check (savings >= 0),
  buffer numeric(14, 2) not null default 16000 check (buffer >= 0),
  allocations_recorded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, year_month)
);

create table if not exists public.family_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  year_month date not null,
  name text not null check (char_length(name) between 1 and 80),
  amount numeric(14, 2) not null default 0 check (amount >= 0),
  sort_order integer not null default 0
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  occurred_on date not null,
  amount numeric(14, 2) not null check (amount > 0),
  type public.transaction_type not null,
  category_id uuid references public.categories (id) on delete set null,
  account_id uuid not null references public.accounts (id),
  counterparty_account_id uuid references public.accounts (id),
  payment_method public.payment_method not null,
  description text not null default '' check (char_length(description) <= 120),
  note text not null default '' check (char_length(note) <= 500),
  source text not null default 'manual' check (source in ('manual', 'allocation')),
  client_request_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (type in ('transfer', 'repayment') and counterparty_account_id is not null and counterparty_account_id <> account_id)
    or (type not in ('transfer', 'repayment'))
  )
);

create unique index if not exists transactions_user_client_request_id_idx
  on public.transactions (user_id, client_request_id)
  where client_request_id is not null;

create index if not exists transactions_user_occurred_on_idx
  on public.transactions (user_id, occurred_on desc);

create index if not exists transactions_user_type_idx
  on public.transactions (user_id, type);

create index if not exists monthly_budgets_user_month_idx
  on public.monthly_budgets (user_id, year_month);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists monthly_budgets_set_updated_at on public.monthly_budgets;
create trigger monthly_budgets_set_updated_at
  before update on public.monthly_budgets
  for each row execute procedure public.set_updated_at();

drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute procedure public.set_updated_at();

create or replace function public.seed_user_defaults(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  month_start date := date_trunc('month', (now() at time zone 'Asia/Kolkata'))::date;
begin
  insert into public.profiles (id, week_start_day)
  values (target_user, 1)
  on conflict (id) do nothing;

  if not exists (select 1 from public.accounts where user_id = target_user) then
    insert into public.accounts (user_id, name, kind, sort_order) values
      (target_user, 'HDFC 1', 'bank', 1),
      (target_user, 'HDFC 2', 'bank', 2),
      (target_user, 'SBI', 'bank', 3),
      (target_user, 'Credit Card', 'credit_card', 4),
      (target_user, 'Cash', 'cash', 5),
      (target_user, 'Other', 'other', 6);
  end if;

  if not exists (select 1 from public.categories where user_id = target_user) then
    insert into public.categories (user_id, name, bucket, sort_order) values
      (target_user, 'Food and cafes', 'personal', 10),
      (target_user, 'Groceries', 'personal', 11),
      (target_user, 'Shopping', 'personal', 12),
      (target_user, 'Beauty and personal care', 'personal', 13),
      (target_user, 'Transport', 'personal', 14),
      (target_user, 'Subscriptions', 'personal', 15),
      (target_user, 'Entertainment', 'personal', 16),
      (target_user, 'Health', 'personal', 17),
      (target_user, 'Other personal expenses', 'personal', 18),
      (target_user, 'Household expenses', 'family', 20),
      (target_user, 'Brother''s classes', 'family', 21),
      (target_user, 'Other family expenses', 'family', 22),
      (target_user, 'Home loan', 'home_loan', 30),
      (target_user, 'Credit card bill', 'credit_card_bill', 31),
      (target_user, 'Mutual fund SIP', 'sip', 32),
      (target_user, 'Emergency/future savings', 'savings', 33),
      (target_user, 'Irregular-expense buffer', 'buffer', 34),
      (target_user, 'Salary', 'income', 40),
      (target_user, 'Other income', 'income', 41),
      (target_user, 'Transfer', 'transfer', 50);
  end if;

  insert into public.monthly_budgets (
    user_id, year_month, salary, personal_limit, family_limit, weekly_target,
    home_loan, credit_card_bill, sip, savings, buffer
  )
  values (
    target_user, month_start, 282000, 35000, 20000, 8000,
    70000, 21000, 10000, 110000, 16000
  )
  on conflict (user_id, year_month) do nothing;

  if not exists (
    select 1 from public.family_allocations
    where user_id = target_user and year_month = month_start
  ) then
    insert into public.family_allocations (user_id, year_month, name, amount, sort_order) values
      (target_user, month_start, 'Household expenses', 10000, 1),
      (target_user, month_start, 'Brother''s classes', 10000, 2);
  end if;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_user_defaults(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.monthly_budgets enable row level security;
alter table public.family_allocations enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "accounts_select_own" on public.accounts;
drop policy if exists "accounts_insert_own" on public.accounts;
drop policy if exists "accounts_update_own" on public.accounts;
drop policy if exists "accounts_delete_own" on public.accounts;
create policy "accounts_select_own" on public.accounts for select using (auth.uid() = user_id);
create policy "accounts_insert_own" on public.accounts for insert with check (auth.uid() = user_id);
create policy "accounts_update_own" on public.accounts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "accounts_delete_own" on public.accounts for delete using (auth.uid() = user_id);

drop policy if exists "categories_select_own" on public.categories;
drop policy if exists "categories_insert_own" on public.categories;
drop policy if exists "categories_update_own" on public.categories;
drop policy if exists "categories_delete_own" on public.categories;
create policy "categories_select_own" on public.categories for select using (auth.uid() = user_id);
create policy "categories_insert_own" on public.categories for insert with check (auth.uid() = user_id);
create policy "categories_update_own" on public.categories for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "categories_delete_own" on public.categories for delete using (auth.uid() = user_id);

drop policy if exists "budgets_select_own" on public.monthly_budgets;
drop policy if exists "budgets_insert_own" on public.monthly_budgets;
drop policy if exists "budgets_update_own" on public.monthly_budgets;
drop policy if exists "budgets_delete_own" on public.monthly_budgets;
create policy "budgets_select_own" on public.monthly_budgets for select using (auth.uid() = user_id);
create policy "budgets_insert_own" on public.monthly_budgets for insert with check (auth.uid() = user_id);
create policy "budgets_update_own" on public.monthly_budgets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "budgets_delete_own" on public.monthly_budgets for delete using (auth.uid() = user_id);

drop policy if exists "family_allocations_select_own" on public.family_allocations;
drop policy if exists "family_allocations_insert_own" on public.family_allocations;
drop policy if exists "family_allocations_update_own" on public.family_allocations;
drop policy if exists "family_allocations_delete_own" on public.family_allocations;
create policy "family_allocations_select_own" on public.family_allocations for select using (auth.uid() = user_id);
create policy "family_allocations_insert_own" on public.family_allocations for insert with check (auth.uid() = user_id);
create policy "family_allocations_update_own" on public.family_allocations for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "family_allocations_delete_own" on public.family_allocations for delete using (auth.uid() = user_id);

drop policy if exists "transactions_select_own" on public.transactions;
drop policy if exists "transactions_insert_own" on public.transactions;
drop policy if exists "transactions_update_own" on public.transactions;
drop policy if exists "transactions_delete_own" on public.transactions;
create policy "transactions_select_own" on public.transactions for select using (auth.uid() = user_id);
create policy "transactions_insert_own" on public.transactions for insert with check (auth.uid() = user_id);
create policy "transactions_update_own" on public.transactions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transactions_delete_own" on public.transactions for delete using (auth.uid() = user_id);

revoke all on public.profiles from anon, public;
revoke all on public.accounts from anon, public;
revoke all on public.categories from anon, public;
revoke all on public.monthly_budgets from anon, public;
revoke all on public.family_allocations from anon, public;
revoke all on public.transactions from anon, public;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.accounts to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.monthly_budgets to authenticated;
grant select, insert, update, delete on public.family_allocations to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
