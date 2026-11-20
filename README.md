# GlobalTrust Financial Bank

Open the deployed Site for the account dashboard and staff portal. The account dashboard starts with Avery Morgan's fictional USD balances and stores transfers in the current browser. The staff portal reads assigned customer records from Supabase. Its seeded records are separate from browser-local transfers.

## Set up staff access in Supabase

1. In your project's SQL Editor, run [staff-access.sql](staff-access.sql) once.
2. In Authentication → Users, confirm the staff profile has UID `aa504086-7c78-4de0-93b1-2f0073077681`. Create a separate test profile for Avery Morgan and copy its UID. In Authentication, enable TOTP enrollment and verification.
3. Replace every occurrence of `00000000-0000-0000-0000-000000000001` with Avery's UID, then run the following in SQL Editor. Set either Boolean to false to remove that permission.

```sql
begin;

insert into public.gt_customers (id, display_name)
values ('00000000-0000-0000-0000-000000000001', 'Avery Morgan');

insert into public.gt_staff_access
  (customer_id, staff_id, can_view_accounts, can_review_transactions)
values
  ('00000000-0000-0000-0000-000000000001',
   'aa504086-7c78-4de0-93b1-2f0073077681', true, true);

insert into public.gt_accounts
  (id, customer_id, name, last_four, balance_cents)
values
  ('checking', '00000000-0000-0000-0000-000000000001', 'Everyday Checking', '4821', 482035),
  ('savings', '00000000-0000-0000-0000-000000000001', 'Reserve Savings', '9073', 1500000);

insert into public.gt_transactions
  (customer_id, account_id, posted_on, description, amount_cents)
values
  ('00000000-0000-0000-0000-000000000001', 'checking', '2026-11-19', 'Payroll deposit', 245000),
  ('00000000-0000-0000-0000-000000000001', 'checking', '2026-11-18', 'Harbor Market', -8642),
  ('00000000-0000-0000-0000-000000000001', 'savings', '2026-11-16', 'Savings contribution', 50000),
  ('00000000-0000-0000-0000-000000000001', 'checking', '2026-11-15', 'Cedar Internet', -6900);

commit;
```

4. Select **Staff access** on the site and sign in with the staff profile. Scan the QR code on first sign-in, then enter the six-digit authenticator code. Subsequent sign-ins prompt for the code. Verify that Avery appears and each enabled function shows the corresponding records.

To revoke access, delete the matching row from `gt_staff_access` using SQL Editor. Row Level Security enforces the assigned functions and requires an MFA-verified Supabase session.
