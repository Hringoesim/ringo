# Ringo — eSIM travel app

> One plan, every country.

An identity-led, iPhone-first eSIM travel app. Built as a real, buildable
**Vite + React + TypeScript** project, ported from the Claude Design HTML/CSS
prototype with the visuals preserved 1:1.

Ringo leads with **identity** (your numbers), not data — the home screen opens
on a membership tier and your numbers, the way Revolut/Cash App lead with the
wallet. Warm light palette, no black/grey, Poppins throughout, and the sunset
gradient (`#F08038 → #F25F77 → #ED4D8E`) used surgically on the hero moments.

## Quick start

```bash
npm install
npm run dev        # start the dev server (Vite)
npm run build      # type-check + production build to dist/
npm run preview    # preview the production build
```

Open the printed local URL. The app renders inside a scaled iPhone frame that
letterboxes to fit any viewport.

## What's in here

- **Lock (Face ID)** → **Splash** → **Sign-up** (Apple / email) → **OTP** →
  **Port-later** → **Soft KYC** → **Onboarding** → **Home** dashboard.
- **Home** — membership tier hero (everyone starts *Orange*), metric strip,
  action rail, wallet-style number card, KYC status and a discovery rail.
- **Browse** — live country search with region grouping.
- **Country detail** — what's included + add a local number.
- **Numbers manager** — *Main* number (calls/SMS/codes) vs *Background* numbers
  (still receive verification codes). Tap any number to promote it.
- **Add number** / **Port your number** (number → carrier → transfer PIN).
- **Plan & billing** — the real Ringo lineup (Essentials $19, Plus $35,
  Pro $59, Unlimited $89) with a selectable picker and fair-use ring.
- **eSIM install** (QR + on-device steps) → **animated activation success**.
- **Membership tiers** ladder.

## Architecture

The UI is fully reactive and backend-ready. Screens never touch `fetch()` or
fixtures directly — they read from a small store and route every mutation
through a single API seam.

```
src/
  main.tsx            app entry
  Host.tsx            scales the iPhone frame to the viewport
  App.tsx             stack-based navigation + tab bar
  theme.ts            warm design tokens (mirrors index.css variables)
  navigation.ts       shared navigation contract
  api/ringoApi.ts     the single backend seam (mock today, live with one call)
  store/store.ts      reactive store + useRingoState() hook (optimistic UI)
  data/               typed fixtures: countries, numbers, plans, tiers
  components/          Device frame, TabBar, Header, Button, Card, shared UI
  screens/            one file per screen
```

### Going live against a real backend

Everything talks only to `RingoAPI`, which ships in **mock mode** (in-memory
fixtures, simulated latency). Flip to a real REST backend with one call at
boot — no screen changes:

```ts
import { RingoAPI } from './api/ringoApi';

RingoAPI.configure({
  mode: 'live',
  baseUrl: 'https://api.ringoesim.com/v1',
  getToken: () => localStorage.getItem('ringo_jwt'),
  onUnauthorized: () => location.assign('/login'),
});
```

Each method documents the HTTP endpoint it maps to; request/response shapes are
identical in mock and live mode.

## Design system

| Token | Value |
| --- | --- |
| Background | `#FEF8F4` |
| Paper | `#FFFDFB` |
| Body text | `#5C2A0E` (warm brown — never black/grey) |
| Emphasis | `#D05000` (deep orange) |
| Gradient | `#F08038 → #F25F77 → #ED4D8E` |
| Typeface | Poppins |
