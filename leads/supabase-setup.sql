-- ==========================================================================
-- Dreamland Co. outreach app: database setup
-- Paste this whole file into Supabase > SQL Editor > New query, then click Run.
-- It is safe to run more than once, and it never deletes or changes your leads.
-- ==========================================================================

-- 1. The leads table --------------------------------------------------------

create table if not exists public.leads (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  business_name  text not null check (length(trim(business_name)) > 0),
  business_type  text check (business_type in ('Guesthouse', 'Hotel', 'B&B', 'Lodge')),
  contact_person text,
  phone          text,
  email          text,
  town           text,
  province       text,
  address        text,
  website        text,
  maps_url       text,
  status         text not null default 'Not called'
                 check (status in ('Not called', 'Did not answer', 'Interested', 'Not interested', 'Opted out', 'Customer')),
  notes          text,
  last_contacted timestamptz,
  source         text not null default 'Scraped list'
                 check (source in ('Scraped list', 'Website form'))
);

-- Added after the first version: street address and Google Maps link.
alter table public.leads add column if not exists address text;
alter table public.leads add column if not exists maps_url text;

-- Added later: "Customer" status, for leads that have placed an order.
alter table public.leads drop constraint if exists leads_status_check;
alter table public.leads add constraint leads_status_check
  check (status in ('Not called', 'Did not answer', 'Interested', 'Not interested', 'Opted out', 'Customer'));

create index if not exists leads_status_idx on public.leads (status);

-- 1b. Customers and their orders --------------------------------------------
-- A customer usually started as a lead (lead_id), but can also be added by hand.
-- Deleting the lead keeps the customer; deleting a customer deletes their orders.

create table if not exists public.customers (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  lead_id        uuid references public.leads (id) on delete set null,
  business_name  text not null check (length(trim(business_name)) > 0),
  contact_person text,
  phone          text,
  email          text,
  town           text,
  province       text,
  address        text,
  notes          text
);

create index if not exists customers_lead_idx on public.customers (lead_id);

-- items: a list like [{"product": "Soft – blue", "quantity": 20, "unit_price": 230}]
create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  customer_id      uuid not null references public.customers (id) on delete cascade,
  order_date       date not null default current_date,
  items            jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  total            numeric(12, 2) not null default 0 check (total >= 0),
  delivery_address text,
  notes            text
);

create index if not exists orders_customer_idx on public.orders (customer_id);

-- 2. Security rules ---------------------------------------------------------
-- Row Level Security blocks everything unless a rule below allows it.
-- Only people who are logged in can read, add, change or delete leads.
-- Visitors who are not logged in can't see anything; the website form can only add one.

alter table public.leads enable row level security;

drop policy if exists "Logged-in users can read leads" on public.leads;
create policy "Logged-in users can read leads"
  on public.leads for select to authenticated using (true);

drop policy if exists "Logged-in users can add leads" on public.leads;
create policy "Logged-in users can add leads"
  on public.leads for insert to authenticated with check (true);

drop policy if exists "Logged-in users can update leads" on public.leads;
create policy "Logged-in users can update leads"
  on public.leads for update to authenticated using (true) with check (true);

drop policy if exists "Logged-in users can delete leads" on public.leads;
create policy "Logged-in users can delete leads"
  on public.leads for delete to authenticated using (true);

revoke all on public.leads from anon;
grant select, insert, update, delete on public.leads to authenticated;

-- Customers and orders: the same rules, with no exception for the website.
alter table public.customers enable row level security;
alter table public.orders enable row level security;

drop policy if exists "Logged-in users can do everything with customers" on public.customers;
create policy "Logged-in users can do everything with customers"
  on public.customers for all to authenticated using (true) with check (true);

drop policy if exists "Logged-in users can do everything with orders" on public.orders;
create policy "Logged-in users can do everything with orders"
  on public.orders for all to authenticated using (true) with check (true);

revoke all on public.customers, public.orders from anon;
grant select, insert, update, delete on public.customers, public.orders to authenticated;

-- "Update existing leads" import: changes many leads in one request.
-- Each change looks like {"id": "...", "set": {"address": "...", "phone": "..."}}.
-- Only the contact details listed below can change; status, notes and call history never do.
-- It runs as the logged-in user, so the rules above still apply.
create or replace function public.update_leads(changes jsonb)
returns integer
language sql
security invoker
set search_path = public
as $$
  with c as (
    select (e->>'id')::uuid as id, e->'set' as s
    from jsonb_array_elements(changes) as e
  ), u as (
    update public.leads l set
      business_name  = coalesce(nullif(trim(c.s->>'business_name'), ''), l.business_name),
      business_type  = coalesce(c.s->>'business_type', l.business_type),
      contact_person = coalesce(c.s->>'contact_person', l.contact_person),
      phone          = coalesce(c.s->>'phone', l.phone),
      email          = coalesce(c.s->>'email', l.email),
      town           = coalesce(c.s->>'town', l.town),
      province       = coalesce(c.s->>'province', l.province),
      address        = coalesce(c.s->>'address', l.address),
      website        = coalesce(c.s->>'website', l.website),
      maps_url       = coalesce(c.s->>'maps_url', l.maps_url)
    from c
    where l.id = c.id
    returning 1
  )
  select count(*)::integer from u;
$$;

revoke all on function public.update_leads(jsonb) from public, anon;
grant execute on function public.update_leads(jsonb) to authenticated;

-- The enquiry form on the public website (contact.html) may ADD a lead, and nothing else:
-- it can't read, change or delete leads, it can only fill in the form's own fields,
-- and every lead it adds must be a warm "Interested" lead marked "Website form".

grant insert (business_name, contact_person, phone, email, town, notes, status, source)
  on public.leads to anon;

drop policy if exists "Website form can add warm leads" on public.leads;
create policy "Website form can add warm leads"
  on public.leads for insert to anon
  with check (
    status = 'Interested'
    and source = 'Website form'
    and length(business_name) <= 150
    and coalesce(length(contact_person), 0) <= 150
    and coalesce(length(phone), 0) <= 40
    and coalesce(length(email), 0) <= 150
    and coalesce(length(town), 0) <= 100
    and coalesce(length(notes), 0) <= 2000
  );

-- 3. Live updates -------------------------------------------------------------
-- Lets every open copy of the app see changes as soon as someone saves them.

do $$
declare t text;
begin
  foreach t in array array['leads', 'customers', 'orders'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
