-- Orchestration Layer core (Workstream A, Increment 2).
-- Additive only — extends the MVP schema with the documented state machines:
-- identity levels L0-L3, number lifecycle, order fulfillment w/ rollback,
-- eSIM profile states (SGP.22), consents, and a partner webhook event log.

-- ── Identity (profiles) ───────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists ringo_id        text unique default ('rng_' || substr(gen_random_uuid()::text, 1, 12)),
  add column if not exists identity_level  int  not null default 0 check (identity_level between 0 and 3),
  add column if not exists status          text not null default 'pending'; -- pending|active|suspended

-- ── Versioned consents ────────────────────────────────────────────────────────
create table if not exists public.consents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null,             -- terms|privacy|gdpr|marketing|push|voice_recording
  version     text not null,             -- e.g. '2026-07'
  granted     boolean not null,
  recorded_at timestamptz not null default now()
);
alter table public.consents enable row level security;
create policy "own consents" on public.consents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Number lifecycle (4-phase DID flow: reserve → allocate → activate → release)
alter table public.numbers
  add column if not exists lifecycle   text not null default 'activated', -- reserved|allocated|activated|released
  add column if not exists network     text,           -- serving partner network (CMP)
  add column if not exists ran         text,           -- 5G|4G+|...
  add column if not exists mcc_mnc     text,           -- IMSI donor network
  add column if not exists reserved_at timestamptz,
  add column if not exists activated_at timestamptz;

-- ── Orders + fulfillment orchestrator (async parallel provisioning w/ rollback)
create table if not exists public.orders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  plan_id     text not null,
  currency    text not null default 'EUR',
  amount      numeric,
  state       text not null default 'pending_payment',
    -- pending_payment|payment_authorized|provisioning|provisioned|active|failed|rolled_back
  stripe_ref  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.orders enable row level security;
create policy "own orders" on public.orders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  service     text not null,             -- did|port_in|esim|voice|sms|data
  state       text not null default 'pending', -- pending|provisioning|done|failed|rolled_back
  provider    text,                      -- adapter that fulfilled it (mock|mobilise|telna|1global|...)
  provider_ref text,
  detail      jsonb,
  updated_at  timestamptz not null default now()
);
alter table public.order_items enable row level security;
create policy "own order items" on public.order_items
  for all using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- ── eSIM profiles (SGP.22 consumer flow states) ───────────────────────────────
create table if not exists public.esim_profiles (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  order_id          uuid references public.orders(id),
  iccid             text,
  matching_id       text,
  smdp_plus_address text,
  state             text not null default 'reserved',
    -- reserved|released|downloaded|installed|enabled|disabled|deleted
  provider          text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.esim_profiles enable row level security;
create policy "own esim profiles" on public.esim_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Partner webhook event log (service-role only: RLS on, no policies) ────────
create table if not exists public.webhook_events (
  id          uuid primary key default gen_random_uuid(),
  provider    text not null,
  event_type  text,
  payload     jsonb,
  processed   boolean not null default false,
  received_at timestamptz not null default now()
);
alter table public.webhook_events enable row level security;
