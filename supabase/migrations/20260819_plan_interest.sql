-- Register-your-interest waitlist for capabilities that are not on sale yet
-- (number porting, calls/SMS bundles, larger data). Mirrors the waitlist the
-- marketing site already runs, but inside the app.
--
-- A guest can register with just an email, exactly like the web waitlist, so
-- interest is captured before anyone has an account. Signed-in users get their
-- user_id attached instead.
create table if not exists public.plan_interest (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  email      text,
  feature    text not null,
  created_at timestamptz not null default now(),
  constraint plan_interest_identified check (user_id is not null or email is not null)
);

create unique index if not exists plan_interest_user_feature
  on public.plan_interest (user_id, feature) where user_id is not null;
create unique index if not exists plan_interest_email_feature
  on public.plan_interest (lower(email), feature) where user_id is null;

alter table public.plan_interest enable row level security;

-- Write-only from the client: anyone may register interest, nobody may read
-- the list back, so it cannot be scraped for emails.
drop policy if exists "register interest" on public.plan_interest;
create policy "register interest" on public.plan_interest
  for insert to anon, authenticated
  with check (
    (auth.uid() is not null and user_id = auth.uid())
    or (auth.uid() is null and user_id is null and email is not null)
  );

drop policy if exists "read own interest" on public.plan_interest;
create policy "read own interest" on public.plan_interest
  for select to authenticated using (user_id = auth.uid());

revoke all on public.plan_interest from anon;
grant insert on public.plan_interest to anon;
grant insert, select on public.plan_interest to authenticated;
