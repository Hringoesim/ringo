# Developing Ringo

Vite, React 18, TypeScript, Capacitor 6. Read `README.md` first for the
product, the screen flow and the directory map. This file covers day-to-day
work on the code.

## Run

```bash
npm install
npm run dev            # http://localhost:5173
npm test               # Vitest, single run
npm run lint           # ESLint
npm run typecheck      # tsc only
npm run build          # tsc, then vite build into dist/
npm run preview        # serve dist/
npm run format         # Prettier over src/
npm run format:check
```

Native (see `NATIVE.md`):

```bash
npm run sync           # build, then cap sync for both platforms
npm run ios:sync       # build, then cap sync ios
npm run ios:open       # open the Xcode project
npm run android:sync
npm run android:open
```

Translations: `node scripts/i18n-check.mjs` prints the strings each language
file in `src/i18n/` is missing. `--keys` prints the English keys as JSON.

## There is no mock backend

The dev server calls the live site, `https://ringoesim.com/api`. The base URL
is the constant `SITE` in `src/api/light.ts`. There is no mock mode, no demo
mode and no environment variable that points the app at another backend.

What this means in practice:

- Plans and prices in the dev server are the real ones.
- Signing in with an email code in the dev server creates or opens a real
  account.
- Payment cannot be completed in a browser. `payByCard` in
  `src/lib/cardPay.ts` throws unless the app runs in a native shell.
- Apple and Google sign-in buttons only show in the iOS app.

`.env.example` and part of `src/vite-env.d.ts` still describe variables from
the earlier product (`VITE_RINGO_API_MODE`, `VITE_DEMO_MODE`,
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GOOGLE_CLIENT_ID`,
`VITE_AUTH_BACKEND`, `VITE_OAUTH_PROVIDERS`, `VITE_PARTNER_*`). No code reads
them. `deploy.yml` still passes three of them to the build, with no effect.
The variables that do something are listed in `README.md` under "Environment
variables".

## Architecture

```
screen (src/screens)  ->  store hook (src/store)  ->  light.* (src/api/light.ts)  ->  ringoesim.com/api
                      ->  lib function (src/lib)  ->  native plugin (ios/App/App/*.swift)
```

- **One API client.** `src/api/light.ts` exports `light`, an object with one
  method per endpoint, plus the response types. Requests have a 20 second
  timeout, send `cache: 'no-store'`, and throw `ApiError` with a message that
  can be shown to the user. Three fire-and-forget reports call `fetch`
  directly instead of going through `light`: the plan test in
  `src/lib/abtest.ts` (`/api/app-ab`), the quiz answer in `src/lib/quiz.ts`
  (`/api/app-quiz-answer`), and the App Store product probe in `src/App.tsx`
  (`/api/app-probe`, test builds only). All three use the same site.
- **Stores.** Each file in `src/store/` is a small module with its own state,
  a `subscribe` function and a hook built on `useSyncExternalStore`. There is
  no global store and no state library.
  - `account.ts`: the signed-in account (`userId`, token `t`, email,
    `purchaseRef`) in `localStorage` under `ringo_account_v1`, and the context
    of App Store purchases in flight.
  - `live.ts`: a counter that moves each time the app returns to the
    foreground. Stores and screens that read the site refetch when it moves.
  - `destinations.ts`, `summary.ts`: catalogue data, kept in memory only.
  - `flags.ts`: `app_flags` from the catalogue answer (Google sign-in switch).
  - `avatar.ts`: profile photo and traveller choice, kept on the phone.
- **Navigation.** `src/App.tsx` holds a stack of frames and four tabs
  (`store`, `esim`, `rewards`, `help`). Tabs stay mounted once opened. Only
  the Landing and Store screens are in the main bundle. The others are lazy
  chunks, prefetched shortly after launch.
- **Host.** `src/Host.tsx` picks full screen (native app, installed PWA,
  phone-sized browser, or `?shot`) or a phone frame (desktop browser), owns
  the light or dark theme, hides the native splash, and handles the keyboard.
- **Layout.** `src/lib/layout.ts` drives layout from the live width of the
  app root, not from the device type.
- **Native plugins.** The app's own Swift plugins are in `ios/App/App/` and
  are registered by hand in `MainViewController.swift`: Sign in with Apple,
  Google sign-in, Stripe payment sheet and inline pay, StoreKit, push
  (`NotifyPlugin`), location, review prompt, biometrics. JS reaches them with
  `registerPlugin` in the matching `src/lib/` file. Android has none of them.

## Sign-in and payment

See `README.md` for both flows. The files to read:

- Sign-in: `src/components/AuthButtons.tsx`, `src/lib/auth.ts`,
  `src/screens/LoginScreen.tsx`, and `light.loginStart`, `loginVerify`,
  `loginProvider`.
- Payment: `src/lib/cardPay.ts`, `src/screens/DestinationScreen.tsx`
  (`continueTap`), `src/screens/CheckoutScreen.tsx`, and `light.appPay`,
  `cardStatus`.

`src/lib/iap.ts` and `src/lib/purchase.ts` are the earlier App Store payment
path. Their header comments still describe App Store purchase as the way
every plan is sold. That is out of date: `CARD_PAYMENTS` is `true`, and the
StoreKit code now only settles old unfinished transactions, restores
purchases and opens "Manage subscriptions".

## Browser preview switches

Query parameters read by the code:

| Parameter | Effect | Where |
| --- | --- | --- |
| `?w=360`, `?w=744`, `?duo=cover`, `?duo=inner` | width of the phone frame | `Host.tsx` |
| `?shot` | full screen without the frame | `Host.tsx` |
| `?lang=fr` | force a language | `lib/i18n.ts` |
| `?hero=a`, `b`, `c` | welcome screen variants | `LandingScreen.tsx` |
| `?nudge=...` | preview the update or notifications card (dev server only) | `components/AppNudge.tsx` |

## Tests

Vitest, Node environment, configured in `vitest.config.ts`. Test files sit
next to the code: `src/lib/auth.test.ts`, `cardPay.test.ts`, `iap.test.ts`,
`purchase.test.ts`, `esim.test.ts`, and
`supabase/functions/appstore-notifications/verify.test.ts`.

On this branch at the time of writing, two tests in `src/lib/esim.test.ts`
fail: they call `qrDataUri` as a synchronous function, and it now returns a
promise. Until that is fixed, `npm test` exits with an error and both
workflows stop before the build.

## CI and deploy

- `.github/workflows/ci.yml`: pull requests and pushes to `main`. Runs
  `npm ci`, lint, test, build on Node 20.
- `.github/workflows/deploy.yml`: pushes to `main` and manual runs. Runs
  `npm ci`, lint, test, a build with `GH_PAGES=1` (base path `/ringo/`), then
  publishes `dist/` to GitHub Pages.
- `ci_scripts/ci_post_clone.sh` (same file in `ios/App/ci_scripts/`): for
  Xcode Cloud. Installs Node, runs `npm ci`, `npm run build` and
  `npx cap sync ios`. Whether an Xcode Cloud workflow is set up is not
  visible in this repository.

## The supabase/ folder

`supabase/schema.sql`, `supabase/migrations/` and `supabase/functions/`
belong to the earlier product. Nothing in `src/` calls them. The only
Supabase use in the app is the auth URL in `src/lib/auth.ts`, as a Google
sign-in proxy. See `supabase/functions/README-deployed.md`.

## Conventions

- TypeScript `strict`, with `noImplicitAny` off (`tsconfig.app.json`).
- Colours and type sizes come from `src/theme.ts`. Do not hardcode surface
  colours.
- User-facing strings go through `t()` from `src/lib/i18n.ts`, keyed by the
  English text.
- Screens do not call `fetch`. They call `light.*` or a store hook.
- The app never computes a price and never decides a payment is complete. It
  asks the site.
