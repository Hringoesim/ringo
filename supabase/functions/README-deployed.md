# Supabase edge functions (earlier product generation)

## Status, 2026-11-16

Everything under `supabase/` (schema, migrations, edge functions) was built
for the product as it was before September 2026: Supabase accounts, KYC,
phone numbers, eSIM orders through an orchestrator.

- The app in `src/` calls none of it. Its only backend is
  `https://ringoesim.com/api` (see the root `README.md`). The one Supabase
  address in the app is the auth page used as a Google sign-in proxy
  (`SUPABASE_AUTH_URL` in `src/lib/auth.ts`). Whether that project is the
  same one these functions were deployed to is not stated anywhere in this
  repository.
- What is deployed on the live Supabase project today cannot be seen from
  this repository. Before relying on anything below, list the deployed
  functions and compare.
- `supabase/migrations/20261116_lock_profiles_kyc_privileged_columns.sql`
  narrows what a signed-in user can do on `profiles` and `kyc_submissions`:
  read their own row, update only `full_name` and `current_country`, insert a
  KYC submission without choosing its status. Its header says it was applied
  to production on 2026-11-16. `supabase/schema.sql` carries the same grants
  and policies.

## Functions with source in this folder

### signup

Creates a Supabase user from an email and a password with the service-role
key, already confirmed, so no confirmation email is sent. Deployed without
JWT verification according to its header. The current app has no passwords
and does not call it.

### orchestrator

The earlier order flow: eSIM provisioning, usage, eSIM state, consent, and a
combined eSIM and phone number order. Requires a Supabase user JWT. The eSIM
provider is `mock` unless `ESIM_PROVIDER=airalo` is set. The number provider
is always a mock. The current app does not call it.

### appstore-notifications

Receives App Store Server Notifications v2 and writes the subscription
status to `profiles`.

- Since 2026-11-16 every payload is verified before any field is used.
  `verify.ts` checks the ES256 signature and the certificate chain up to a
  pinned Apple Root CA G3, and the function also checks the bundle id. A
  payload that fails gets a 401 and changes nothing. Tests:
  `verify.test.ts`, run by `npm test`.
- It is deployed without Supabase JWT verification, because Apple cannot
  send one. The signature check is the authentication.
- `appstore/IAP.md` says the Server Notification URL in App Store Connect
  points at `https://ringoesim.com/api/appstore-notifications`, which is the
  website, not this function. If that is right, Apple does not call this
  function. Not confirmed here.
- The header comment in `index.ts` mentions `store.hydrate()` reading the
  status at app start. That code no longer exists in the app.

## Functions without source in this folder

`email-code` and `esim-provision` were added on 2026-08-23 and 2026-08-24 and
deployed directly. Their source is not in this repository. If they are still
deployed, the deployed version is the only copy: download it with
`supabase functions download <name>` before editing, so an old local copy is
never pushed over a newer deploy. The notes below are from the time they
were written and have not been checked against deployed code.

### email-code

Sign-in codes sent without Supabase's mailer, whose SMTP credential was
rejected (error 535). It creates a 6-digit code, stores only a SHA-256 digest
in `email_signin_codes`, sends the code through the Resend HTTP API, and on
success returns a one-time `token_hash` that the client exchanges through
`verifyOtp`, so Supabase still issues the session. 10 minute expiry,
5 attempts, 45 second resend cooldown. `verify_jwt: false`.

The current app does not use it. Email codes now come from
`ringoesim.com/api/app-login`.

### esim-provision

eSIM issuance through Telna Connect v2.1, following "MVP API workflow for
eSIM Purchases v1.6". `verify_jwt: true`.

Warnings recorded when it was written:

- The Telna account is a production account with no sandbox (per Telna,
  2026-07-24). Every successful run uses up a real eSIM at $0.90.
- `telna_config.live` gates it and defaults to false.
- `{"dry_run": true}` runs every read and changes nothing. Use this.
- `claim_telna_sim` uses `FOR UPDATE SKIP LOCKED` so two buyers cannot take
  the same ICCID.
- Any failure part way through releases the SIM back to the pool.
- Telna reports SIM status inconsistently: the list endpoint returns
  `"pre-service"` and the single-SIM endpoint returns `"PRE_SERVICE"`.
  Compare through `norm()`, never literally.

The current app does not call it. eSIMs are ordered by the website.
