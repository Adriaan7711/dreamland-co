-- ==========================================================================
-- Dreamland Co. outreach app: database setup
-- Paste this whole file into Supabase > SQL Editor > New query, then click Run.
-- It is safe to run more than once.
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
  website        text,
  status         text not null default 'Not called'
                 check (status in ('Not called', 'Did not answer', 'Interested', 'Not interested', 'Opted out')),
  notes          text,
  last_contacted timestamptz,
  source         text not null default 'Scraped list'
                 check (source in ('Scraped list', 'Website form'))
);

create index if not exists leads_status_idx on public.leads (status);

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
begin
  alter publication supabase_realtime add table public.leads;
exception when duplicate_object then null;
end $$;
