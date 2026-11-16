-- Applied to production 2026-11-16 (audit 2026-11-14, Critical).
--
-- "own profile" / "own kyc" were FOR ALL with full table grants, so a signed-in
-- user could write subscription_status, tier, kyc_status etc. on their own row
-- (or delete + re-insert it past the guard_privileged UPDATE trigger). Now:
-- own-row read, and writes limited by column grants. Status fields are written
-- only by service-role / security-definer code.

-- profiles: read own row; update only harmless columns; no insert/delete
-- (rows are created by the handle_new_user trigger).
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, current_country) on public.profiles to authenticated;

drop policy if exists "own profile" on public.profiles;
drop policy if exists "own profile read" on public.profiles;
drop policy if exists "own profile update" on public.profiles;
create policy "own profile read" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "own profile update" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- kyc_submissions: read own rows; insert own submission without choosing its
-- status (takes the 'in_review' default); no update/delete.
revoke all on public.kyc_submissions from anon, authenticated;
grant select on public.kyc_submissions to authenticated;
grant insert (user_id, first_name, last_name, dob, doc_type, document_ref)
  on public.kyc_submissions to authenticated;

drop policy if exists "own kyc" on public.kyc_submissions;
drop policy if exists "own kyc read" on public.kyc_submissions;
drop policy if exists "own kyc insert" on public.kyc_submissions;
create policy "own kyc read" on public.kyc_submissions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "own kyc insert" on public.kyc_submissions
  for insert to authenticated with check ((select auth.uid()) = user_id);
