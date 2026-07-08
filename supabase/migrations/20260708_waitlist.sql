-- Ringo — country waitlist. Captures which countries users want Ringo to launch
-- next (a demand signal), written from the Browse screen's per-country toggle.

create table if not exists public.waitlist_signups (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  country_code text not null,
  created_at   timestamptz not null default now(),
  unique (user_id, country_code)
);

alter table public.waitlist_signups enable row level security;

drop policy if exists "own waitlist" on public.waitlist_signups;
create policy "own waitlist" on public.waitlist_signups
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Aggregate demand per country (for prioritising launches). Readable by anyone;
-- exposes only counts, never who signed up.
create or replace view public.waitlist_counts as
  select country_code, count(*)::int as signups
  from public.waitlist_signups
  group by country_code;
