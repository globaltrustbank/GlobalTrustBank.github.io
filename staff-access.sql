begin;

create table public.gt_customers (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null
);

create table public.gt_staff_access (
  customer_id uuid references public.gt_customers(id) on delete cascade,
  staff_id uuid references auth.users(id) on delete cascade,
  can_view_accounts boolean not null default false,
  can_review_transactions boolean not null default false,
  primary key (customer_id, staff_id),
  check (customer_id <> staff_id)
);

create table public.gt_accounts (
  id text not null,
  customer_id uuid references public.gt_customers(id) on delete cascade,
  name text not null,
  last_four text not null check (last_four ~ '^[0-9]{4}$'),
  balance_cents integer not null check (balance_cents >= 0),
  primary key (customer_id, id)
);

create table public.gt_transactions (
  id bigint generated always as identity primary key,
  customer_id uuid not null,
  account_id text not null,
  posted_on date not null,
  description text not null,
  amount_cents integer not null,
  foreign key (customer_id, account_id) references public.gt_accounts(customer_id, id) on delete cascade
);

alter table public.gt_customers enable row level security;
alter table public.gt_staff_access enable row level security;
alter table public.gt_accounts enable row level security;
alter table public.gt_transactions enable row level security;

revoke all on public.gt_customers, public.gt_staff_access, public.gt_accounts, public.gt_transactions
  from public, anon, authenticated;
grant select on public.gt_customers, public.gt_staff_access, public.gt_accounts, public.gt_transactions
  to authenticated;

create policy gt_read_own_assignments on public.gt_staff_access for select to authenticated
  using ((select auth.jwt()->>'aal') = 'aal2' and staff_id = (select auth.uid()));

create policy gt_read_customers on public.gt_customers for select to authenticated
  using ((select auth.jwt()->>'aal') = 'aal2' and (
    id = (select auth.uid()) or exists (
      select 1 from public.gt_staff_access
      where customer_id = gt_customers.id and (can_view_accounts or can_review_transactions)
    )
  ));

create policy gt_read_accounts on public.gt_accounts for select to authenticated
  using ((select auth.jwt()->>'aal') = 'aal2' and (
    customer_id = (select auth.uid()) or exists (
      select 1 from public.gt_staff_access
      where customer_id = gt_accounts.customer_id and can_view_accounts
    )
  ));

create policy gt_read_transactions on public.gt_transactions for select to authenticated
  using ((select auth.jwt()->>'aal') = 'aal2' and (
    customer_id = (select auth.uid()) or exists (
      select 1 from public.gt_staff_access
      where customer_id = gt_transactions.customer_id and can_review_transactions
    )
  ));

commit;
