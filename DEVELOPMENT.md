# Developing Ringo

Real, buildable Vite + React + TypeScript app. Runs fully on a bundled mock
backend with **no setup**; flips to a live backend + real OAuth purely via `.env`.

## Run

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # type-check + production build → dist/
npm run preview      # serve the production build
npm run lint         # ESLint
npm run format       # Prettier
```

## Architecture

```
src/
  main.tsx           entry — calls bootConfig() then renders <Host/>
  config.ts          env-driven wiring (API mode, baseURL, Google, partners)
  Host.tsx           scales the phone, owns theme (persisted)
  App.tsx            stack navigation; onboarding = backend orchestration order
  auth/auth.ts       REAL auth: sessions (persisted+expiry), OTP, OAuth seams
  api/ringoApi.ts    backend seam, layered: auth/identity/numbers/connectivity/
                     communication/billing/catalog — mock today, live via env
  store/store.ts     reactive store: persisted to localStorage, hydrate() in live
  lib/supabase.ts    optional Supabase client (lazy-loaded when configured)
  data/              typed fixtures (countries+MNP, numbers, plans, tiers)
  components/ screens/  UI
supabase/schema.sql  Postgres schema + RLS + sign-up trigger
```

State flow: **UI → store → RingoAPI**. Screens never call `fetch` or fixtures
directly. Mutations update local state optimistically, persist, and call the API.

## Going live (no UI changes)

Everything is behind env vars (see `.env.example`). Set them and rebuild.

| Goal | What to set |
| --- | --- |
| Live orchestration API | `VITE_RINGO_API_MODE=live`, `VITE_RINGO_API_BASE_URL=…` |
| Real Google sign-in | `VITE_GOOGLE_CLIENT_ID=…` (add your origin to Authorized JS origins) |
| Supabase backend | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` → run `supabase/schema.sql` |

The bearer token from the auth session is automatically attached to live API
calls (`config.ts` → `RingoAPI.getToken`).

### Real Apple / Google / SMS
- **Google**: set `VITE_GOOGLE_CLIENT_ID`; `auth.signInWithGoogle()` uses Google
  Identity Services and returns a verified ID token.
- **Apple**: add an Apple Service ID + key, then implement `AppleID.auth.signIn()`
  inside `auth.signInWithApple()` (seam already there).
- **SMS OTP**: delivery currently surfaces the code in-app (no gateway). Point
  `startPhoneVerification` at your SMS provider (e.g. Telnyx) or the backend.

### Supabase wiring (pattern)
```ts
import { getSupabase } from './lib/supabase';
const sb = await getSupabase();           // null unless configured
const { data } = await sb!.from('numbers').select('*');
```
Back each `RingoAPI.*` method with a Supabase query the same way; the UI is
unaffected.

## CI/CD

- **CI** (`.github/workflows/ci.yml`): lint + build on every push/PR.
- **Deploy** (`.github/workflows/deploy.yml`): builds with the Pages base path
  and publishes to GitHub Pages on every push to `main`. (Pages source = GitHub
  Actions.) Push to `main` → live.

## Conventions

- TypeScript strict (looser `noImplicitAny` for inline-style ergonomics).
- Design tokens in `src/theme.ts` (light + dark); never hardcode surface colors.
- Keep screens dumb; put logic in `store`/`auth`/`api`.
