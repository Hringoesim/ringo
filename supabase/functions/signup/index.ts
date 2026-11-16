// signup: RETIRED 2026-11-16.
//
// This function created an account for any email address with
// `email_confirm: true`, with no proof that the caller owned the address.
// Sessions from this project are accepted by ringoesim.com's app login, so a
// confirmed account for someone else's address was a way into their account.
// The app has not used password sign-up since the September 2026 rewrite
// (sign-in is Apple, Google, or an emailed code, all verified server-side).
//
// Do not restore the old behaviour. If password sign-up is ever wanted again,
// the address must be proven first (emailed code or link) before the account
// is confirmed.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve((req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  return new Response(
    JSON.stringify({ error: 'Sign-up with a password is no longer available. Continue with Apple, Google or your email.' }),
    { status: 410, headers: { ...cors, 'Content-Type': 'application/json' } },
  );
});
