-- Optional live RLS checks. Run in the SQL editor after creating two users.
-- Replace the UUIDs below with real auth.users ids before running.

-- begin;
-- set local role authenticated;
-- select set_config('request.jwt.claim.sub', 'USER_A_UUID', true);
-- select set_config('request.jwt.claim.role', 'authenticated', true);

-- insert into public.transactions (
--   user_id, occurred_on, amount, type, account_id, payment_method, description
-- )
-- select 'USER_A_UUID', current_date, 100, 'expense', id, 'upi', 'RLS self insert'
-- from public.accounts where user_id = 'USER_A_UUID' limit 1;

-- select count(*) as own_rows from public.transactions where user_id = 'USER_A_UUID';
-- select count(*) as other_rows from public.transactions where user_id = 'USER_B_UUID';
-- -- other_rows must be 0

-- rollback;
