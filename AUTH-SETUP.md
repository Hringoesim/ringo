# Turning on real "Sign in with Apple / Google"

The app's code is ready. Real social sign-in just needs accounts + keys from
Supabase, Google, and Apple — things only the project owner can create. Follow
these in order. **Google is the quick win (free, ~15 min). Apple needs a paid
Apple Developer account.**

When you're done, the same Apple/Google buttons in the app become real: they
redirect to Apple/Google, the user approves, and they land back in Ringo signed in.

---

## 1. Supabase (the hub — free, ~5 min) — REQUIRED

Supabase is the service that securely talks to Apple and Google for you.

1. Go to https://supabase.com → sign up → **New project**.
2. Once it's created, open **Project Settings → API** and copy:
   - **Project URL**  → this is `VITE_SUPABASE_URL`
   - **anon public key** → this is `VITE_SUPABASE_ANON_KEY`
3. Open **Authentication → URL Configuration → Redirect URLs** and add:
   ```
   https://hringoesim.github.io/ringo/
   ```
   (and `http://localhost:5173/` if you test locally).

Then add the two values to the GitHub repo so the live site picks them up:
**GitHub repo → Settings → Secrets and variables → Actions → Variables tab →
New repository variable**, twice:
- `VITE_SUPABASE_URL` = your Project URL
- `VITE_SUPABASE_ANON_KEY` = your anon public key

(The deploy already reads these — see `.github/workflows/deploy.yml`.)

---

## 2. Google sign-in (free, ~10 min)

1. Go to https://console.cloud.google.com → create a project.
2. **APIs & Services → OAuth consent screen** → set it up (External, add your email).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID →
   Web application**.
4. Under **Authorized redirect URIs**, paste the callback Supabase shows you in
   the next step (looks like `https://<your-project>.supabase.co/auth/v1/callback`).
5. Copy the **Client ID** and **Client secret**.
6. In Supabase: **Authentication → Providers → Google** → toggle on → paste the
   Client ID + secret → Save.

Done — the "Continue with Google" button now really works.

---

## 3. Apple sign-in (needs Apple Developer account — $99/year, ~20 min)

1. Join the Apple Developer Program: https://developer.apple.com/programs/ ($99/yr).
2. In https://developer.apple.com/account → **Certificates, IDs & Profiles**:
   - Create an **App ID** (e.g. `com.ringoesim.app`) with *Sign In with Apple* enabled.
   - Create a **Services ID** (e.g. `com.ringoesim.signin`) — this is your Apple
     "client ID" for the web. Enable *Sign In with Apple* on it and add the
     Supabase callback URL (`https://<your-project>.supabase.co/auth/v1/callback`).
   - Create a **Key** with *Sign In with Apple* enabled and download the `.p8` file.
3. In Supabase: **Authentication → Providers → Apple** → toggle on → fill in the
   Services ID, Team ID, Key ID, and the `.p8` key contents → Save.

Done — the "Sign in with Apple" button now really works.

---

## How to tell it's live

Once `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are set and the site
redeploys, clicking Apple/Google sends you to the real Apple/Google screen
instead of jumping straight to the dashboard. Until then the app falls back to a
local demo login so the flow is still clickable.

**Easiest path:** do Supabase + Google first to prove it works end-to-end, then
add Apple when you're ready to pay for the Apple Developer account.
