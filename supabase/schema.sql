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
alter table public.plans           enable row level security;
alter table public.countries       enable row level security;

-- Own-row access for user data
create policy "own profile"  on public.profiles        for all using (auth.uid() = id)      with check (auth.uid() = id);
create policy "own numbers"  on public.numbers         for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own ports"    on public.ports           for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own kyc"      on public.kyc_submissions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Catalog is world-readable
create policy "read plans"     on public.plans     for select using (true);
create policy "read countries" on public.countries for select using (true);

-- ── Auto-create a profile on sign-up ──────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
