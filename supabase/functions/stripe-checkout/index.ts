// stripe-checkout — creates a Stripe Checkout Session (subscription) for the
// signed-in user's chosen plan and returns the redirect URL.
//
// WEB path only. On iOS, Apple requires In-App Purchase for digital
// subscriptions — this is for the web app (ringo-pi.vercel.app) and as the
// billing system of record; the iOS app keeps StoreKit/IAP.
//
// Required Supabase secrets: STRIPE_SECRET_KEY, and a price id per plan
// (STRIPE_PRICE_ESSENTIALS / _PLUS / _PRO / _UNLIMITED). SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are injected automatically.
import Stripe from 'npm:stripe@16';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2024-06-20' });
const PRICE: Record<string, string | undefined> = {
  essentials: Deno.env.get('STRIPE_PRICE_ESSENTIALS'),
  plus: Deno.env.get('STRIPE_PRICE_PLUS'),
  pro: Deno.env.get('STRIPE_PRICE_PRO'),
  unlimited: Deno.env.get('STRIPE_PRICE_UNLIMITED'),
};
const SITE = Deno.env.get('SITE_URL') ?? 'https://ringo-pi.vercel.app';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    // Identify the caller from their JWT.
    const asUser = createClient(SUPABASE_URL, SERVICE_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) return json({ error: 'Not signed in' }, 401);

    const { planId } = await req.json().catch(() => ({ planId: '' }));
    const price = PRICE[planId as string];
    if (!price) return json({ error: `Unknown or unconfigured plan: ${planId}` }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: profile } = await admin.from('profiles').select('stripe_customer_id').eq('id', user.id).single();
    let customerId = profile?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email ?? undefined, metadata: { user_id: user.id } });
      customerId = customer.id;
      await admin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      success_url: `${SITE}/?billing=success`,
      cancel_url: `${SITE}/?billing=cancel`,
      allow_promotion_codes: true,
      metadata: { user_id: user.id, plan_id: planId },
      subscription_data: { metadata: { user_id: user.id, plan_id: planId } },
    });
    return json({ url: session.url });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
