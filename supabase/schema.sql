-- Ringo — Supabase schema.
-- Run in the Supabase SQL editor (or `supabase db push`). Mirrors the backend
-- orchestration model: Identity, Number Management, Connectivity, Billing.
-- Row-Level Security restricts every user to their own rows.

-- ── Profiles (1:1 with auth.users) ───────────────────────────────────────────
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text,
  full_name       text,
  tier            text    not null default 'orange',
  score           int     not null default 0,
  kyc_status      text    not null default 'pending',   -- pending|in_review|verified
  current_country text    not null default 'GB',
  plan_id         text    not null default 'essentials',
  data_pct        numeric not null default 0,
  -- Subscription state (Apple IAP), written by the App Store Server Notifications
  -- webhook and read on app startup. See migrations/20260708_subscription_status.sql.
  subscription_status                  text default 'none',  -- none|active|in_grace|expired|revoked
  subscription_product_id              text,
  subscription_expires_at              timestamptz,
  subscription_original_transaction_id text,
  subscription_environment             text,
  created_at      timestamptz not null default now()
);

-- ── Number Management ─────────────────────────────────────────────────────────
create table if not exists public.numbers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  msisdn      text not null,
  country     text not null,
  source      text not null default 'ringo',     -- ringo|ported
  status      text not null default 'active',     -- active|porting|pending
  is_main     boolean not null default false,
  port_eta    text,
  created_at  timestamptz not null default now()
);

create table if not exists public.ports (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  number           text not null,
  country          text not null,
  current_provider text,
  pac              text,
  status           text not null default 'processing',
  created_at       timestamptz not null default now()
);

-- ── Identity (KYC) ────────────────────────────────────────────────────────────
create table if not exists public.kyc_submissions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  first_name   text,
  last_name    text,
  dob          text,
  doc_type     text,
  document_ref text,
  status       text not null default 'in_review',
  created_at   timestamptz not null default now()
);

-- ── Country waitlist (demand signal — which countries users want next) ────────
create table if not exists public.waitlist_signups (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  country_code text not null,
  created_at   timestamptz not null default now(),
  unique (user_id, country_code)
);

-- ── Catalog (public, read-only) ───────────────────────────────────────────────
create table if not exists public.plans (
  id        text primary key,
  name      text not null,
  price     int  not null,
  highspeed text not null,
  tagline   text,
  popular   boolean default false,
  feats     jsonb not null default '[]'
);

create table if not exists public.countries (
  code          text primary key,
  name          text not null,
  capital       text,
  flag          text,
  region        text,
  dial          int,
  number_market boolean default false,
  mnp           jsonb
);

-- ── Row-Level Security ────────────────────────────────────────────────────────
alter table public.profiles        enable row level security;
alter table public.numbers         enable row level security;
alter table public.ports           enable row level security;
alter table public.kyc_submissions enable row level security;
alter table public.waitlist_signups enable row level security;
alter table public.plans           enable row level security;
alter table public.countries       enable row level security;

-- Drop-then-create so the script is safe to re-run.
drop policy if exists "own profile"    on public.profiles;
drop policy if exists "own numbers"    on public.numbers;
drop policy if exists "own ports"      on public.ports;
drop policy if exists "own kyc"        on public.kyc_submissions;
drop policy if exists "own waitlist"   on public.waitlist_signups;
drop policy if exists "read plans"     on public.plans;
drop policy if exists "read countries" on public.countries;

-- Own-row access for user data
create policy "own profile"  on public.profiles        for all using (auth.uid() = id)      with check (auth.uid() = id);
create policy "own numbers"  on public.numbers         for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own ports"    on public.ports           for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own kyc"      on public.kyc_submissions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own waitlist" on public.waitlist_signups for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Catalog is world-readable
create policy "read plans"     on public.plans     for select using (true);
create policy "read countries" on public.countries for select using (true);

-- ── Auto-create a profile on sign-up ──────────────────────────────────────────
-- search_path is pinned and EXECUTE is revoked from API roles (the function is a
-- trigger; it must never be callable via /rest/v1/rpc). Keeps the linter clean.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  return new;
end; $$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Catalog seed (plans + countries) ──────────────────────────────────────────
insert into public.plans (id, name, price, highspeed, tagline, popular, feats) values
  ('essentials','Essentials',19,'15 GB','For light trips & backups',false,'["15 GB high-speed, then unlimited standard","180+ countries","1 number included"]'::jsonb),
  ('plus','Plus',35,'50 GB','For regular travelers',false,'["50 GB high-speed","180+ countries","2 numbers included","Personal hotspot"]'::jsonb),
  ('pro','Pro',59,'150 GB','For digital nomads',true,'["150 GB high-speed","180+ countries","3 numbers included","Priority 5G/4G+"]'::jsonb),
  ('unlimited','Unlimited',89,'Unlimited','No caps, ever',false,'["Truly unlimited 5G — no throttle","180+ countries","5 numbers included","Always-on hotspot"]'::jsonb)
on conflict (id) do update set name=excluded.name, price=excluded.price, highspeed=excluded.highspeed, tagline=excluded.tagline, popular=excluded.popular, feats=excluded.feats;

insert into public.countries (code, name, capital, flag, region, dial, number_market, mnp) values
  ('GB','United Kingdom','London','🇬🇧','Europe',44,true,'{"regulator":"Ofcom","flow":"donor-led","needsPac":true,"sla":"Within 1 business day (PAC before 4pm)"}'::jsonb),
  ('IE','Ireland','Dublin','🇮🇪','Europe',353,true,'{"regulator":"ComReg","flow":"recipient-led","needsPac":false,"sla":"Completes within ~2 hours"}'::jsonb),
  ('ES','Spain','Madrid','🇪🇸','Europe',34,true,'{"regulator":"AOPM","flow":"recipient-led","needsPac":false,"sla":"Within 1 business day (before 2pm)"}'::jsonb),
  ('DE','Germany','Berlin','🇩🇪','Europe',49,true,'{"regulator":"Bundesnetzagentur","flow":"recipient-led","needsPac":false,"sla":"Up to 6 business days"}'::jsonb),
  ('NL','Netherlands','Amsterdam','🇳🇱','Europe',31,true,'{"regulator":"ACM","flow":"recipient-led","needsPac":false,"sla":"Completes almost immediately"}'::jsonb),
  ('US','United States','Washington','🇺🇸','Americas',1,false,null),
  ('JP','Japan','Tokyo','🇯🇵','Asia',81,false,null),
  ('PT','Portugal','Lisbon','🇵🇹','Europe',351,false,null),
  ('AE','UAE','Abu Dhabi','🇦🇪','Middle East',971,false,null),
  ('SG','Singapore','Singapore','🇸🇬','Asia',65,false,null)
on conflict (code) do update set name=excluded.name, capital=excluded.capital, flag=excluded.flag, region=excluded.region, dial=excluded.dial, number_market=excluded.number_market, mnp=excluded.mnp;
