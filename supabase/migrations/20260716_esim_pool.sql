-- eSIM profile pool + atomic self-service assignment.
--
-- esim_profiles holds real installable profiles (ICCID + SM-DP+ address +
-- matching id + confirmation code — the LPA activation data). Profiles are
-- inserted as state='available' with no user; a user claims one via claim_esim().
-- The raw activation codes live ONLY here (private DB), never in the app repo.

alter table public.esim_profiles add column if not exists confirmation_code text;
-- Pooled profiles are unassigned until claimed, so user_id must be nullable.
alter table public.esim_profiles alter column user_id drop not null;
create unique index if not exists esim_profiles_iccid_key on public.esim_profiles (iccid);

alter table public.esim_profiles enable row level security;
drop policy if exists "own esim" on public.esim_profiles;
create policy "own esim" on public.esim_profiles
  for select using (auth.uid() = user_id);

-- Atomically hand the caller an available profile (or return the one they already
-- hold). SECURITY DEFINER so it can assign a row the caller doesn't yet own;
-- `for update skip locked` prevents two users grabbing the same profile.
create or replace function public.claim_esim()
returns public.esim_profiles
language plpgsql
security definer
set search_path = public
as $$
declare result public.esim_profiles;
begin
  select * into result from public.esim_profiles
    where user_id = auth.uid() and state in ('assigned', 'installed')
    limit 1;
  if found then return result; end if;

  update public.esim_profiles
    set user_id = auth.uid(), state = 'assigned', updated_at = now()
  where id = (
    select id from public.esim_profiles
    where state = 'available' and user_id is null
    order by created_at
    limit 1
    for update skip locked
  )
  returning * into result;

  return result; -- NULL row if the pool is exhausted
end $$;

revoke all on function public.claim_esim() from anon, public;
grant execute on function public.claim_esim() to authenticated;
