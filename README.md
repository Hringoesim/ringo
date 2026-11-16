# Ringo app

The Ringo app sells travel data eSIMs. A traveller signs in, picks a
destination and a plan, pays by card, and installs the eSIM on the phone.
The app also shows data usage, top-ups, Ringo Rewards and help.

It is one codebase: React 18, TypeScript and Vite for the web layer, wrapped
with Capacitor 6 for iOS and Android. The iOS app is the product. The web
build is a browser preview of it. See "Platforms" below for what works where.

The app was rewritten around 2026-09-13 (commit `bcae463`). The earlier
product (identity checks, Ringo phone numbers, number porting, a mock/live
`RingoAPI`) is gone from `src/`. `BACKEND_ALIGNMENT.md` and the `supabase/`
folder describe that earlier product and are kept for history.

## Run, test, build

```bash
npm install
npm run dev         # Vite dev server, http://localhost:5173
npm test            # Vitest, runs once
npm run lint        # ESLint
npm run typecheck   # TypeScript only
npm run build       # type-check, then production build into dist/
npm run preview     # serve dist/
```

There is no mock mode and no setup step. The dev server talks to the live
backend at `https://ringoesim.com/api`, so plans and prices are the real ones.
In a desktop browser the app is drawn inside a phone frame (`src/Host.tsx`).
On a phone-sized screen, an installed PWA or the native app it fills the
screen.

## Backend

The only backend the app calls is the Ringo website, `https://ringoesim.com/api`.
Its code is not in this repository.

Calls go through one file, `src/api/light.ts`. The base URL is a constant in
that file. No environment variable changes it. (Three small reporting calls
use `fetch` directly against the same site: see `DEVELOPMENT.md`.) The file's header
lists the endpoints: catalogue (`esim-plans`), sign-in (`app-login`), payment
(`app-pay`, `light-status`), the buyer's eSIM (`esim-subscription`), profile
and rewards (`app-profile`), usage (`app-usage`), push registration
(`app-push-register`) and others.

The site decides prices, takes the payment, orders the eSIM from the supplier
and says who owns what. The app keeps the signed-in account (`user id`, token,
email) in `localStorage` on the phone and sends the id and token with each
account request.

Three other hosts are contacted directly:

- A Supabase project's auth page, only as the Google sign-in proxy
  (`SUPABASE_AUTH_URL` in `src/lib/auth.ts`). No other Supabase feature is
  used. `@supabase/supabase-js` is in `package.json` but nothing in `src/`
  imports it.
- `accounts.google.com` and `oauth2.googleapis.com`, when Google sign-in goes
  straight to Google (`ios/App/App/GoogleSignInPlugin.swift`).
- `itunes.apple.com/lookup`, to see if a newer app version is on the App Store
  (`src/lib/appUpdate.ts`).

## Sign-in

Three ways in, all on `src/components/AuthButtons.tsx`. The first sign-in
creates the account. There are no passwords.

- **Apple** (iOS only): the system sheet returns an identity token.
- **Google** (iOS only, shown when the site's `app_flags` turn it on or a
  client id is set): straight to Google with PKCE when an iOS client id is
  known, otherwise through the Supabase project's Google provider.
- **Email code**: the site emails a six-digit code (`loginStart`), the app
  sends it back (`loginVerify`).

In every case the app sends the token or code to `POST /api/app-login` and
only gets an account back if the site accepts it. The app does not verify
tokens itself. The site's checks are not in this repository.

## Payment

Every plan and top-up is paid by card. `CARD_PAYMENTS` in
`src/lib/cardPay.ts` is a constant set to `true`.

1. The app asks the site for a Stripe payment intent (`POST /api/app-pay`).
   The site sets the amount.
2. The app shows Stripe's native payment sheet
   (`ios/App/App/PaymentSheetPlugin.swift`): card, Link, and Apple Pay.
3. The app polls `GET /api/light-status` until Stripe reports the payment as
   paid. The app never decides on its own that a payment is done.

A signed-in buyer gets the sheet on the plan screen. Without a known email the
Checkout screen asks for one first.

Payment works in the iOS app only. `payByCard` refuses outside a native
shell, and the Android project has no payment plugin.

Older payment code is still in the tree:

- `src/lib/iap.ts`, `src/lib/purchase.ts` and `StoreKitPlugin.swift`: App
  Store in-app purchase, the payment path before 2026-10-24. Still used to
  settle unfinished StoreKit transactions at launch (`src/App.tsx`), for
  "Restore purchases" and for "Manage subscriptions". The buy paths behind
  `!CARD_PAYMENTS` are not reachable.
- `src/lib/inlinePay.ts`: a card field and Apple Pay button drawn on the
  Checkout page. Switched off (`INLINE_PAY = false` in
  `src/screens/CheckoutScreen.tsx`).
- `light.cardCheckout`: Stripe's hosted checkout page. No screen calls it.

## Screen flow

Navigation is a stack plus four tabs, all in `src/App.tsx`. Each screen is
one file in `src/screens/`.

```
no account:  Landing (sign in) -> Login (email and code)
first sign-in: Traveller (pick an avatar, once) -> Notify (notifications, once per phone)
tabs:        eSIMs (Store) | My eSIM | Rewards | Help
buying:      Store -> Destination -> payment sheet -> Checkout (waits for the eSIM) -> My eSIM -> Install
```

| Screen | File | Reached from |
| --- | --- | --- |
| Welcome and sign-in | `LandingScreen.tsx` | launch without an account |
| Email and code | `LoginScreen.tsx` | Landing, and other screens when signed out |
| Pick a traveller | `TravellerScreen.tsx` | first sign-in |
| Notifications step | `NotifyScreen.tsx` | after Traveller, or once at launch |
| Store (tab "eSIMs") | `StoreScreen.tsx` | launch with an account |
| One destination's plans | `DestinationScreen.tsx` | Store, Quiz, My eSIM |
| Checkout | `CheckoutScreen.tsx` | Destination |
| My eSIM (tab) | `EsimScreen.tsx` | tab, after a purchase |
| Install the eSIM | `InstallScreen.tsx` | My eSIM |
| Report a problem | `ReportScreen.tsx` | My eSIM |
| Data quiz | `QuizScreen.tsx` | Store |
| Rewards (tab) and profile | `RewardsScreen.tsx` | tab, My eSIM, Help |
| Help (tab) | `HelpScreen.tsx` | tab |
| Waitlist for the full Ringo service | `WaitlistScreen.tsx` | Help, Rewards |

`WelcomeScreen.tsx` exists but `App.tsx` does not route to it.

## Directory map

```
src/
  main.tsx          entry: loads the language, then renders Host
  Host.tsx          full screen on a device, phone frame in a desktop browser; theme
  App.tsx           navigation stack, tabs, launch tasks
  theme.ts          colours, type sizes, light and dark palettes
  index.css         CSS variables and base styles
  api/light.ts      the one client for ringoesim.com/api
  store/            small stores, each a module with a React hook
    account.ts        signed-in account and purchases in flight (localStorage)
    avatar.ts         profile photo and traveller, kept on the phone
    destinations.ts   destination list from the site
    flags.ts          switches the site sends with the catalogue (app_flags)
    live.ts           "refetch" tick each time the app returns to the foreground
    summary.ts        from-prices for the store cards
  lib/              logic without UI
    auth.ts           Apple and Google sign-in
    cardPay.ts        card payment through the Stripe sheet
    iap.ts, purchase.ts   App Store purchase code (legacy, see Payment)
    inlinePay.ts      on-page card field (switched off)
    esim.ts           LPA string parts and QR code
    push.ts, location.ts  push registration and country for pushes
    i18n.ts           languages; strings are keyed by their English text
    appUpdate.ts, review.ts, abtest.ts, quiz.ts, terms.ts, layout.ts, ...
    *.test.ts         unit tests
  i18n/             13 translation files (ar, de, es, fr, he, it, ja, ko, nl, pt, ru, tr, zh)
  screens/          one file per screen (see the table above)
  components/       shared UI: TabBar, Header, Button, Card, AuthButtons, Globe, ...
  data/             bundled destination list, pictures and credits, cities
  assets/           bundled images and their licence files
public/             icons, web manifest, destination and rewards photos
ios/App/            Xcode project; App/*.swift are the app's own native plugins
android/            Android Studio project (no custom plugins)
appstore/           App Store listing text, screenshots, App Store Connect scripts
scripts/i18n-check.mjs   lists strings a language file is missing
ci_scripts/         Xcode Cloud post-clone script (same file in ios/App/ci_scripts/)
supabase/           schema, migrations and edge functions of the earlier product
.github/workflows/  ci.yml and deploy.yml
```

## Environment variables

None are needed. `.env.example` lists variables from the earlier product
(`VITE_RINGO_API_MODE`, `VITE_DEMO_MODE`, `VITE_SUPABASE_*`, `VITE_PARTNER_*`
and others). Nothing in `src/` reads them. The variables the code does read:

| Variable | Effect |
| --- | --- |
| `VITE_GOOGLE_IOS_CLIENT_ID` | Google iOS client id for a local test build. Normally the site sends it. |
| `VITE_SHOT` | Screenshot builds: open the app on one screen. Never set in a release. |
| `VITE_LANG` | Screenshot builds: force a language. `?lang=` does the same in a browser. |
| `VITE_PROBE_BEACON`, `VITE_BUILD` | Test builds: report the App Store product probe to the site. |
| `VITE_APP_VERSION` | Set by `vite.config.ts` from the Xcode project's version and build number. |
| `GH_PAGES=1` | Build-time only: base path `/ringo/` for GitHub Pages. |

## Tests and CI

`npm test` runs Vitest over `src/**/*.test.ts` and
`supabase/functions/**/*.test.ts` (`vitest.config.ts`). The tests cover
`auth`, `cardPay`, `iap`, `purchase`, `esim` and the Apple signature
verifier.

- `.github/workflows/ci.yml`: on every pull request and every push to `main`,
  runs lint, test and build.
- `.github/workflows/deploy.yml`: on every push to `main`, runs lint, test and
  a build with `GH_PAGES=1`, then publishes `dist/` to GitHub Pages.

## Releases

- **Web**: the Pages workflow above publishes on every push to `main`. A
  `vercel.json` also exists (Vite build, SPA rewrite). Whether a Vercel
  project is connected, and which host is the canonical web address, is not
  confirmed by anything in this repository. See `DEPLOY.md`.
- **iOS**: built from `ios/App/App.xcodeproj`. The version and build number
  live in the Xcode project (1.13, build 102 on this branch). See `NATIVE.md`.
- **Android**: the project builds from `android/`, version 1.0, code 1. It has
  none of the native plugins the iOS app has. Whether it has ever been
  released is not confirmed here.

## Platforms

| | iOS app | Android project | Web build |
| --- | --- | --- | --- |
| Email code sign-in, browsing plans | yes | see note | see note |
| Apple and Google sign-in | yes | no (iOS only in `auth.ts`) | no |
| Pay by card | yes | no (no plugin) | no (`payByCard` refuses) |
| Push notifications | yes | no (iOS only in `push.ts`) | no |

Note: outside the iOS app, every request to `ringoesim.com/api` is a
cross-origin browser request, so it only works from origins the site allows.
That allow-list is in the site's repository, not here. `npm run dev` on
`localhost` works. Whether the GitHub Pages address and the Android app's
origin are allowed is not confirmed in this repository.

## Other documents

- `DEVELOPMENT.md`: working on the code.
- `DEV-GUIDE.md`: short guide for editing a screen without an engineering background.
- `NATIVE.md`, `MOBILE.md`: native builds and running on a phone.
- `DEPLOY.md`: web hosting.
- `AUTH-SETUP.md`, `GOOGLE-SIGNIN-CHECKLIST.md`: sign-in configuration.
- `supabase/functions/README-deployed.md`: the edge functions of the earlier product.
- `BACKEND_ALIGNMENT.md`: history only.
