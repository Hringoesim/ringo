// stripe-webhook — receives Stripe events and flips the user's subscription
// state in `profiles`. This is what makes billing REAL: the account only becomes
// `active` after Stripe confirms payment (no optimistic local flip).
//
// Required Supabase secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.
// Configure the endpoint in the Stripe dashboard →
//   https://<project-ref>.supabase.co/functions/v1/stripe-webhook
// Send: checkout.session.completed, customer.subscription.updated, .deleted.
//
// This function must be deployed with --no-verify-jwt (Stripe signs it itself).
import Stripe from 'npm:stripe@16';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2024-06-20' });
const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

async function setStatus(where: Record<string, string>, patch: Record<string, unknown>) {
  const q = admin.from('profiles').update(patch);
  const key = Object.keys(where)[0];
  await q.eq(key, where[key]);
}

Deno.serve(async (req) => {
  const sig = req.headers.get('stripe-signature');
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig ?? '', WEBHOOK_SECRET);
  } catch (e) {
    return new Response(`Webhook signature verification failed: ${(e as Error)?.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session;
        const userId = s.metadata?.user_id;
        if (userId) {
          await setStatus({ id: userId }, {
            subscription_status: 'active',
            subscription_provider: 'stripe',
            plan_id: s.metadata?.plan_id ?? undefined,
            stripe_customer_id: (s.customer as string) ?? undefined,
            stripe_subscription_id: (s.subscription as string) ?? undefined,
          });
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const deleted = event.type === 'customer.subscription.deleted';
        const active = sub.status === 'active' || sub.status === 'trialing';
        const patch = {
          subscription_status: deleted ? 'canceled' : active ? 'active' : sub.status,
          subscription_provider: 'stripe',
          stripe_subscription_id: sub.id,
          subscription_expires_at: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
        };
        if (sub.metadata?.user_id) await setStatus({ id: sub.metadata.user_id }, patch);
        else await setStatus({ stripe_customer_id: sub.customer as string }, patch);
        break;
      }
      default:
        break;
    }
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(`Handler error: ${(e as Error)?.message}`, { status: 500 });
  }
});
