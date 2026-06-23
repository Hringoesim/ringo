// supabase/functions/signup — email+password account creation.
//
// Creates a PRE-CONFIRMED user with the service-role key (server-side only) so
// the app can sign the user in immediately with signInWithPassword — no email
// round-trip / OTP / magic link required. Deployed with verify_jwt = false
// because it is a public signup endpoint with its own validation.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let email = '';
  let password = '';
  let name = '';
  try {
    const body = await req.json();
    email = (body.email || '').trim().toLowerCase();
    password = body.password || '';
    name = (body.name || '').trim();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'Enter a valid email address.' }, 400);
  if (typeof password !== 'string' || password.length < 8) {
    return json({ error: 'Password must be at least 8 characters.' }, 400);
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: name ? { full_name: name } : {},
  });

  if (error) {
    const exists = /already|registered|exists/i.test(error.message);
    return json(
      { error: exists ? 'That email already has an account. Try logging in instead.' : error.message },
      exists ? 409 : 400,
    );
  }

  return json({ ok: true });
});
