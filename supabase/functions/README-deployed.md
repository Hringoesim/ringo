# Edge functions

`signup`, `orchestrator`, `appstore-notifications` are the originals.

Two were added 2026-08-23/24 and are deployed live. Their source of truth is
the deployed version in Supabase; fetch with
`supabase functions download <name>` (or the MCP `get_edge_function`) before
editing, so a stale local copy is never pushed over a newer deploy.

## email-code
Sign-in codes that do not use Supabase's mailer, whose SMTP credential is
rejected (535) and which we cannot reach to fix. Mints a 6-digit code, stores
only a SHA-256 digest in `email_signin_codes`, sends it via the Resend HTTP
API, and on success returns a one-time `token_hash` the client swaps through
`verifyOtp` — so Supabase still issues the session.
10-minute expiry, 5 attempts, 45-second resend cooldown. verify_jwt: false.

## esim-provision
Real eSIM issuance through Telna Connect v2.1, per "MVP API workflow for eSIM
Purchases v1.6". verify_jwt: true.

⚠️ The Telna account is PRODUCTION with **no sandbox** (Sheldon Meth,
2026-07-24). Every successful run consumes a real eSIM at **$0.90**. Hence:
- `telna_config.live` gates it and defaults to false
- `{"dry_run": true}` exercises every READ and touches nothing — use this
- `claim_telna_sim` uses FOR UPDATE SKIP LOCKED so two buyers cannot take
  the same ICCID
- any mid-flow failure releases the SIM back to the pool

⚠️ Telna reports SIM status inconsistently: the LIST endpoint returns
`"pre-service"` but the single-SIM endpoint returns `"PRE_SERVICE"`. Compare
through `norm()`, never literally.
