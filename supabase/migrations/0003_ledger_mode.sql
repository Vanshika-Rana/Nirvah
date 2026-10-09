-- Ledger mode for users who track income and expenses without envelope amounts.
-- Run this in the Supabase SQL editor after 0002_envelopes_income.sql.

do $$ begin
  alter type public.category_bucket add value 'business';
exception
  when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists tracker_mode text;

alter table public.profiles drop constraint if exists profiles_tracker_mode_check;
alter table public.profiles
  add constraint profiles_tracker_mode_check
  check (tracker_mode is null or tracker_mode in ('envelopes', 'ledger'));

-- Existing accounts that already have data stay on the envelope app.
-- Empty / new profiles stay null so they see the chooser.
update public.profiles
set tracker_mode = 'envelopes'
where tracker_mode is null
  and (
    exists (select 1 from public.transactions t where t.user_id = profiles.id)
    or exists (select 1 from public.incomes i where i.user_id = profiles.id)
    or exists (select 1 from public.envelopes e where e.user_id = profiles.id)
    or exists (select 1 from public.monthly_budgets b where b.user_id = profiles.id)
    or exists (select 1 from public.accounts a where a.user_id = profiles.id)
  );

create or replace function public.seed_user_defaults(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, week_start_day, default_salary, tracker_mode)
  values (target_user, 1, 0, null)
  on conflict (id) do nothing;
end;
$$;
