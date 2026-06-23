# ✅ Turn on "Continue with Google" — your exact checklist

Everything below is filled in with **your real project**. Just copy the **bold/code**
bits and paste where it says. No decisions to make. ~10 minutes.

Your values (you'll need these twice):

- **Supabase callback URL:**
  `https://swfojlhulsgivzrxqtkv.supabase.co/auth/v1/callback`
- **Your live app:** `https://hringoesim.github.io/ringo/`

---

## Part A — Get a Google sign-in key (in Google Cloud)

1. Go to **https://console.cloud.google.com** and sign in with your Google account.
2. Top-left, click the **project dropdown** → **New Project** → Name it **Ringo** → **Create**.
   Wait a few seconds, then make sure **Ringo** is selected in that dropdown.
3. In the search bar at the top, type **OAuth consent screen** and open it
   (may be labeled **Google Auth Platform → Branding**).
   - Choose **External** → **Create**.
   - App name: **Ringo**
   - User support email: **hippolytebusiness@gmail.com**
   - Developer contact email (bottom): **hippolytebusiness@gmail.com**
   - Click **Save and Continue** through the next screens (you can skip Scopes
     and Test users for now) → **Back to Dashboard**.
4. In the top search bar, type **Credentials** and open it.
   - Click **+ Create Credentials** → **OAuth client ID**.
   - Application type: **Web application**
   - Name: **Ringo Web**
   - Under **Authorized JavaScript origins** → **+ Add URI** → paste:
     `https://hringoesim.github.io`
   - Under **Authorized redirect URIs** → **+ Add URI** → paste:
     `https://swfojlhulsgivzrxqtkv.supabase.co/auth/v1/callback`
   - Click **Create**.
5. A box pops up with **Client ID** and **Client secret**. **Copy both** (keep this
   tab open, or paste them into a note). You'll use them in Part B.

> ⚠️ One gotcha: a new consent screen starts in **"Testing"** mode, which only
> lets emails you've added sign in. So your own login works once you're a test
> user. To do that: search **Audience** (or OAuth consent screen → Test users)
> → **+ Add users** → add **hippolytebusiness@gmail.com**. To open it to
> everyone later, click **Publish app**.

---

## Part B — Switch Google on (in Supabase)

6. Go to **https://supabase.com/dashboard** → open your project.
7. Left sidebar: **Authentication** → **Sign In / Providers** (or **Providers**).
8. Find **Google** in the list and click it. Turn the toggle **ON**.
   - **Client ID (or Client IDs):** paste the Client ID from step 5
   - **Client Secret:** paste the Client secret from step 5
   - Click **Save**.
9. Still in **Authentication**, open **URL Configuration**:
   - **Site URL:** `https://hringoesim.github.io/ringo/`
   - Under **Redirect URLs**, **Add URL:** `https://hringoesim.github.io/ringo/`
   - **Save**.

---

## Part C — Test it

10. Open **https://hringoesim.github.io/ringo/** → **Create account** →
    **Continue with Google**.
11. It should send you to the real Google "choose an account" screen, then bring
    you back into Ringo, signed in for real. 🎉

If anything looks different from these steps or throws an error, **paste me a
screenshot or the error text** and I'll tell you exactly what to fix.
