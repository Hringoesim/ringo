-- Applied to production 2026-11-16 (sweep after the 2026-11-14 audit).
-- Two problems in the pre-September-2026 backend, which the current app no
-- longer calls but which stayed reachable with the public key plus any
-- signed-in session (anyone can sign in with Google).

-- 1. redeem_pioneer_code granted pioneer status for ANY string: with no
--    matching code, `returning true into ok` leaves ok NULL, and
--    `if not ok` is then not true, so the function carried on.
create or replace function public.redeem_pioneer_code(p_code text)
 returns boolean
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_code text; ok boolean := false;
begin
  if auth.uid() is null then return false; end if;
  v_code := upper(trim(coalesce(p_code, '')));
  if v_code = '' then return false; end if;
  update public.pioneer_codes
    set uses = uses + 1
    where code = v_code and active = true and (max_uses is null or uses < max_uses)
    returning true into ok;
  if ok is not true then return false; end if;
  update public.profiles set pioneer = true, pioneer_code = v_code where id = auth.uid();
  return true;
end $function$;

-- 2. Every table carried full grants (insert/update/delete/truncate) for anon
--    and authenticated, with "own row, for all" policies. A signed-in user
--    could write their own orders (any amount, any state), eSIM rows and
--    numbers, and the orchestrator function used that same access to create a
--    provider eSIM order with no payment check. Now: least privilege. Order,
--    eSIM and number rows are written by service-role code only. The
--    orchestrator's order and provision routes therefore fail at their first
--    insert, before any provider is called; they need a payment check and a
--    service-role client before they can ever be used again.
revoke all on all tables in schema public from anon, authenticated;

-- public catalogue
grant select on public.countries, public.plans to anon, authenticated;
-- "tell me when it launches" interest form (policy "register interest")
grant insert (user_id, email, feature) on public.plan_interest to anon, authenticated;
grant select on public.plan_interest to authenticated;

-- own profile / KYC (same as 20261116_lock_profiles_kyc_privileged_columns)
grant select on public.profiles to authenticated;
grant update (full_name, current_country) on public.profiles to authenticated;
grant select on public.kyc_submissions to authenticated;
grant insert (user_id, first_name, last_name, dob, doc_type, document_ref)
  on public.kyc_submissions to authenticated;

-- own rows, read only
grant select on public.orders, public.order_items, public.esim_profiles,
  public.numbers, public.ports to authenticated;

-- consent records: append only
grant select on public.consents to authenticated;
grant insert (user_id, kind, version, granted) on public.consents to authenticated;

-- country waitlist: join and leave
grant select, delete on public.waitlist_signups to authenticated;
grant insert (user_id, country_code) on public.waitlist_signups to authenticated;
