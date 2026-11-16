// supabase/functions/appstore-notifications — App Store Server Notifications v2.
//
// Apple POSTs subscription lifecycle events here (initial buy, renewal, expiry,
// refund, revoke, grace period). This is the SERVER-SIDE source of truth for paid
// access: it updates public.profiles.subscription_status, which store.hydrate()
// reads on app startup so entitlements survive reinstall and follow the user.
//
// Register the deployed URL in App Store Connect → your app → App Information →
// App Store Server Notifications (Production + Sandbox URLs), Version 2.
//
// Deploy: supabase functions deploy appstore-notifications --no-verify-jwt
// (Apple can't send a Supabase JWT; this endpoint authenticates the payload itself.)
//
// Every payload is a JWS signed by Apple. verify.ts checks the signature and the
// certificate chain up to the pinned Apple Root CA G3 before any field is read;
// anything that fails is answered 401 and changes nothing. The service-role
// client below is only reached with a verified payload for this app's bundle id.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { JwsVerifyError, verifyAppleJws } from './verify.ts';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const BUNDLE_ID = Deno.env.get('APPLE_BUNDLE_ID') ?? 'com.ringoesim.app';

// Apple notificationType → our subscription_status.
function statusFor(notificationType: string, subtype?: string): string | null {
  switch (notificationType) {
    case 'SUBSCRIBED':
    case 'DID_RENEW':
    case 'OFFER_REDEEMED':
    case 'DID_CHANGE_RENEWAL_STATUS':
      return 'active';
    case 'DID_FAIL_TO_RENEW':
      return subtype === 'GRACE_PERIOD' ? 'in_grace' : 'expired';
    case 'GRACE_PERIOD_EXPIRED':
    case 'EXPIRED':
      return 'expired';
    case 'REFUND':
    case 'REVOKE':
      return 'revoked';
    default:
      return null; // TEST, RENEWAL_EXTENSION, etc. — no state change
  }
}

interface Payload {
  notificationType: string;
  subtype?: string;
  data?: { signedTransactionInfo?: string; environment?: string; bundleId?: string };
}
interface TxInfo {
  bundleId?: string;
  productId: string;
  originalTransactionId: string;
  expiresDate?: number; // ms since epoch
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  try {
    const { signedPayload } = await req.json();
    if (!signedPayload) return new Response('missing signedPayload', { status: 400 });

    const payload = await verifyAppleJws<Payload>(signedPayload);
    if (payload.data?.bundleId !== BUNDLE_ID) throw new JwsVerifyError('wrong bundle id');

    const status = statusFor(payload.notificationType, payload.subtype);
    const tx = payload.data?.signedTransactionInfo
      ? await verifyAppleJws<TxInfo>(payload.data.signedTransactionInfo)
      : null;
    if (tx && tx.bundleId !== BUNDLE_ID) throw new JwsVerifyError('wrong bundle id');

    // Ack Apple even when there's nothing to persist (e.g. TEST notifications) so
    // it doesn't retry.
    if (!status || !tx?.originalTransactionId) return new Response('ok', { status: 200 });

    await admin
      .from('profiles')
      .update({
        subscription_status: status,
        subscription_product_id: tx.productId,
        subscription_expires_at: tx.expiresDate ? new Date(tx.expiresDate).toISOString() : null,
        subscription_environment: payload.data?.environment ?? null,
        // Reflect the plan the product maps to (keep in sync with iap.ts PLAN_PRODUCT).
        plan_id: tx.productId?.split('.').pop() ?? undefined,
      })
      .eq('subscription_original_transaction_id', tx.originalTransactionId);

    return new Response('ok', { status: 200 });
  } catch (e) {
    if (e instanceof JwsVerifyError) {
      console.warn(e.message);
      return new Response('unauthorized', { status: 401 });
    }
    // 500 makes Apple retry with backoff.
    return new Response('error', { status: 500 });
  }
});
