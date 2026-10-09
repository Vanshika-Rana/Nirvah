# Nirvah

A private personal budget tracker for one person. It records expenses quickly on a phone, tracks weekly personal spending against ₹8,000, and keeps a monthly personal cap of ₹35,000 plus a separate family budget.

The app does **not** connect to a bank. Totals come only from transactions and budgets you enter. Any cash figure is an estimate from those records, not a live account balance.

## What works

- Email/password sign-in with Supabase Auth
- Row Level Security so each user only sees their own records
- Dashboard with personal, family, combined, and weekly totals
- One-handed add-expense form
- Weekly Monday–Sunday tracker (week start is configurable)
- Transaction history with filters, edit, and delete
- Month-specific budgets that do not rewrite history
- Excel export of all records and optional import that skips existing IDs
- Installable PWA (browser use is still fully supported)
- No offline sync in this version

## Prerequisites

- Node.js 20.9 or later
- A [Supabase](https://supabase.com) project (free plan is enough)
- A [Vercel](https://vercel.com) account for hosting (optional for local use)

## Install and run locally

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key
```

Use the **anon public** key only. Never put the service-role key in this app, in Vercel client env, or in git.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Until Supabase is configured, the UI loads with a setup notice. Financial data will not sync.

## Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Copy **Project URL** and **anon public** key from **Project Settings → API**.
3. In **Authentication → Providers**, keep Email enabled.
4. For a personal app, you can disable “Confirm email” under **Authentication → Providers → Email** so the first account can sign in immediately.

## Run SQL migrations

In the Supabase SQL editor, paste and run `supabase/migrations/0001_init.sql`.

That script:

- Creates tables for profiles, accounts, categories, monthly budgets, family allocations, and transactions
- Enables Row Level Security on every user-owned table
- Restricts select/insert/update/delete to `auth.uid() = user_id`
- Seeds default accounts, categories, and the current month’s allocation when a user signs up

Default accounts: HDFC 1, HDFC 2, SBI, Credit Card, Cash, Other.

Default monthly plan (₹2,82,000 salary):

| Item | Amount | Account |
| --- | ---: | --- |
| Home loan | ₹70,000 | HDFC 1 |
| Credit card bill (this month) | ₹21,000 | HDFC 1 |
| Mutual fund SIP | ₹10,000 | HDFC 2 |
| Personal spending | ₹35,000 | HDFC 2 |
| Family support | ₹20,000 | HDFC 2 |
| Emergency/future savings | ₹1,10,000 | SBI |
| Irregular-expense buffer | ₹16,000 | SBI |

The credit card amount is editable each month. SIP stays at ₹10,000 unless you change it.

## Create the first user

Use **Sign in → Create account** in the app, or add a user under **Authentication → Users** in Supabase.

## Budget rules

- Personal spending: `expense` transactions in personal categories
- Family spending: `expense` transactions in family categories
- Transfers, savings moves, SIP transfers, and credit card **repayments** are not personal/family expenses
- A credit card **purchase** is an expense; paying the card later is a repayment, not a second expense
- Weeks are Monday–Sunday by default, using your local calendar dates
- The monthly personal cap always wins over the weekly target
- Totals are calculated from transaction dates. Nothing resets to zero on Monday or the 1st
- Editing November’s budget does not change October’s stored budget

## Deploy to Vercel

1. Push this repository to GitHub (or import the folder in Vercel).
2. Create a Vercel project from the repo.
3. Add the same two environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. In Supabase **Authentication → URL configuration**, add:
   - Site URL: `https://YOUR_VERCEL_DOMAIN`
   - Redirect URLs: `https://YOUR_VERCEL_DOMAIN/**`
5. Deploy.

## Install the PWA

The app works in a normal browser. Installation is optional.

**iPhone:** Safari → Share → Add to Home Screen.

**Android:** Chrome → menu → Install app / Add to Home Screen.

This version does not keep a local copy of your finances for offline editing.

## Excel backup

**Settings → Download Excel** exports every transaction, budget, setting, and monthly/weekly summary. Amounts are numbers. Downloading does not change the database.

Import is optional: preview the workbook, review duplicate IDs, then confirm. Existing transaction IDs are skipped, never silently overwritten. Supabase remains the live source of truth.

## Tests and checks

```bash
npm test
npm run typecheck
npm run lint
```

Tests cover month/week boundaries, dashboard add/edit/delete totals, family vs personal spending, transfers, savings, credit card repayments, monthly cap vs weekly target, historical budget isolation, Excel numeric export, failed-save error handling, and SQL RLS policy presence.

Live two-user RLS checks can be run with the comments in `supabase/tests/rls.sql` after you have two accounts.

## Project layout

- `src/lib/finance` — date, currency, classification, and budget math
- `src/lib/validation` — Zod schemas used by server actions
- `src/actions` — authenticated writes
- `src/app/(app)` — dashboard, add, weekly, history, settings
- `supabase/migrations` — schema and policies
