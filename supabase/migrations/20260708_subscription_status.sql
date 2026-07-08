-- Ringo — persist subscription state server-side (Apple IAP / StoreKit).
--
-- Before this, `subscribed` lived only in the client's localStorage — spoofable
-- and lost across devices. These columns are the source of truth, written by the
-- App Store Server Notifications v2 webhook (supabase/functions/appstore-notifications)
-- and read on app startup (store.hydrate) so paid access survives reinstall and
-- follows the user across devices.

alter table public.profiles
  add column if not exists subscription_status text not null default 'none',        -- none|active|in_grace|expired|revoked
  add column if not exists subscription_product_id text,                            -- com.ringoesim.app.sub.*
  add column if not exists subscription_expires_at timestamptz,
  add column if not exists subscription_original_transaction_id text,               -- stable per Apple subscription
  add column if not exists subscription_environment text;                           -- Sandbox|Production

-- Look up a profile by the Apple original transaction id when a renewal/refund
-- notification arrives (the webhook doesn't know our user id, only Apple's).
create index if not exists profiles_orig_txn_idx
  on public.profiles (subscription_original_transaction_id);
