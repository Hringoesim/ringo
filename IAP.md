# Apple In-App Purchase (StoreKit 2) — Ringo

Ringo's four plans are **auto-renewable subscriptions** sold through Apple IAP on
iOS. This is required: Apple mandates IAP for digital subscriptions in the app.

The **code is done and compiles** (`xcodebuild … BUILD SUCCEEDED`). What remains
is App Store Connect configuration (agreement + products) and — before public
launch — server-side notification hardening. Steps below.

---

## What's implemented

| Piece | File |
|---|---|
| Native StoreKit 2 plugin (products, purchase, restore, entitlements, `Transaction.updates`) | `ios/App/App/StoreKitPlugin.swift` (registered in `MainViewController.swift`) |
| JS bridge + plan↔product map | `src/lib/iap.ts` |
| Purchase / upgrade / downgrade / restore wiring | `src/store/store.ts` (`checkout`, `changePlan`, `restorePurchases`) |
| Paywall: Apple price, App-Store-only payment, auto-renew disclosure, Restore button | `src/screens/PaywallScreen.tsx` |
| Local test config (works in the simulator, no ASC needed) | `ios/App/App/Ringo.storekit` (wired into the scheme) |
| Subscription persistence (survives reinstall / new device) | `supabase/migrations/20260708_subscription_status.sql`, `schema.sql` |
| Renewal/expiry/refund webhook | `supabase/functions/appstore-notifications/` |

Web / Android keep the existing mock checkout (`isIapAvailable()` gates it).

## Product IDs (must match everywhere)

One subscription group (**"Ringo Plan"**), highest tier = level 1:

| Plan | Product ID | Level | Ref price |
|---|---|---|---|
| Unlimited | `com.ringoesim.app.sub.unlimited` | 1 | $89 |
| Pro | `com.ringoesim.app.sub.pro` | 2 | $59 |
| Plus | `com.ringoesim.app.sub.plus` | 3 | $35 |
| Essentials | `com.ringoesim.app.sub.essentials` | 4 | $19 |

Defined in `src/lib/iap.ts` (`PLAN_PRODUCT`) and `ios/App/App/Ringo.storekit`.

---

## 1. Test locally now (no App Store Connect needed)

1. `npm run build && npx cap sync ios && npx cap open ios`
2. The scheme already points at `Ringo.storekit` (Product ▸ Scheme ▸ Edit Scheme ▸
   Run ▸ Options ▸ StoreKit Configuration = **Ringo.storekit**). Verify it's set.
3. Run in a simulator, go to a plan → Checkout → **Subscribe**. StoreKit's test
   sheet appears; confirm. The paywall shows Apple's price, a Restore button, and
   the auto-renew disclosure. Upgrade/downgrade between tiers to see immediate vs
   deferred behaviour.

## 2. App Store Connect — one-time setup (you must do this)

**a. Paid Apps agreement** (blocks everything else): App Store Connect ▸ Business ▸
sign the *Paid Applications* agreement and add banking + tax. Until this is
"Active", products can't be created or bought.

**b. Create the subscription group + 4 products**: your app ▸ **Subscriptions** ▸
create group **"Ringo Plan"** ▸ add four auto-renewable subscriptions using the
exact Product IDs above. For each: duration **1 month**, set the price per
territory, add a localized display name + description, and one review screenshot.
Set the **subscription levels/ranks** so Unlimited is highest (level 1) down to
Essentials — this is what makes upgrades immediate and downgrades deferred.

**c. Review info**: add the app-level "App Store Server Notifications" URL (step 4),
and a **Terms of Use (EULA)** + **Privacy Policy** URL (the paywall links to
`ringoesim.com/terms` and `/privacy` — make sure those resolve, or update the two
URLs in `PaywallScreen.tsx`).

## 3. Sandbox testing (real StoreKit, pre-release)

Create a Sandbox tester (Users and Access ▸ Sandbox), sign into it on a **real
device** (Settings ▸ App Store ▸ Sandbox Account), then run a TestFlight/dev
build. Purchases are free but exercise the real pipeline (including the webhook).

## 4. Server-side subscription state (before public launch)

1. Apply the DB change: `supabase db push` (or run
   `supabase/migrations/20260708_subscription_status.sql` in the SQL editor).
2. Deploy the webhook:
   `supabase functions deploy appstore-notifications --no-verify-jwt`
3. In App Store Connect ▸ your app ▸ **App Store Server Notifications** (V2), set
   the Production + Sandbox URLs to the function's URL.
4. **Harden it** (see the ⚠️ TODO at the top of the function): it currently decodes
   Apple's JWS but does **not verify the signature chain** yet. Verify the x5c
   cert chain against Apple's root CA (e.g. Apple's `app-store-server-library`)
   before trusting notifications in production.

The client seeds the `originalTransactionId → user` mapping on first purchase
(`recordSubscription`), and `store.hydrate()` reads `subscription_status` on
startup, so paid access is server-authoritative — not client localStorage.

---

## Known follow-ups / caveats

- **Promo/Pioneer % discounts don't apply to IAP charges.** Apple bills its store
  price; only Apple *offer codes* / introductory offers can discount. On native
  the paywall shows Apple's price and still lets a Pioneer code grant *membership*,
  but not a price cut. Decide whether to configure Apple offer codes.
- **App prices vs Apple price points.** The reference prices above are placeholders;
  Apple pricing uses per-territory price points you pick in ASC. The app always
  displays Apple's `displayPrice`, so they stay consistent once set.
- **Number allocation & KYC** remain stubbed pending the wholesale partners — IAP
  covers billing only.
