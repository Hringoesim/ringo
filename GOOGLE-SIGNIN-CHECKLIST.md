# ✅ Turn on "Continue with Google" — your exact checklist

Everything below is filled in with **your real project** and verified against the
current (2026) Google Cloud Console UI. Just copy the **bold/code** bits and
paste where it says. ~5 minutes of clicking, then Claude automates the rest.

Your values (you'll need these below):

- **Supabase callback URL (the only redirect URI Google needs):**
  `https://swfojlhulsgivzrxqtkv.supabase.co/auth/v1/callback`
- **Your live app:** `https://ringo-pi.vercel.app`

---

## Part A — Create a Google sign-in client (only you can do this)

1. Go to **https://console.cloud.google.com** and sign in
   (hippolytebusiness@gmail.com).
2. Top-left **project dropdown** → **New Project** → Name: **Ringo** → **Create**.
   Wait a few seconds, then make sure **Ringo** is selected in that dropdown.
3. In the top search bar type **Google Auth Platform** and open it
   (this replaced the old "OAuth consent screen"). A **Get started** wizard appears:
   - **App name:** `Ringo` · **User support email:** your email → Next
   - **Audience:** **External** → Next
   - **Contact information:** your email → Next → agree → **Create**.
4. Left menu: **Clients** → **+ Create client**:
   - Application type: **Web application** · Name: **Ringo Web**
   - **Authorized redirect URIs** → **+ Add URI** → paste exactly:
     `https://swfojlhulsgivzrxqtkv.supabase.co/auth/v1/callback`
   - Click **Create**.
5. ⚠️ **The Client secret is shown only this once.** Copy **both** the
   **Client ID** (ends in `.apps.googleusercontent.com`) and the
   **Client secret** (starts with `GOCSPX-`) right now.
6. ⚠️ New apps start in **Testing** mode — only listed test users can sign in.
   Left menu: **Audience** → **Test users** → **+ Add users** → add
   **hippolytebusiness@gmail.com** → Save.
   (Later, to open it to everyone: **Audience** → **Publish app**.)

## Part B — Hand off to Claude (automated)

7. Get a Supabase access token (one click):
   **https://supabase.com/dashboard/account/tokens** → **Generate new token** →
   name it `claude` → copy the `sbp_…` value.
8. Paste **three things** into the Claude chat: the **Client ID**, the
   **Client secret**, and the **sbp\_ token**. Claude then automatically:
   - enables the Google provider on Supabase project **APP3** (Management API),
   - sets the Site URL + redirect allow-list (`https://ringo-pi.vercel.app/` and
     `http://localhost:5173/` for local dev),
   - flips the app's `VITE_OAUTH_PROVIDERS=google` flag locally and on Vercel,
   - redeploys and live-tests the button end to end.

<details>
<summary>Prefer to click it yourself instead? (manual Part B)</summary>

- supabase.com/dashboard → project **APP3** → **Authentication** →
  **Sign In / Providers** → **Google** → toggle **ON** → paste Client ID +
  Client Secret → **Save**.
- **Authentication** → **URL Configuration** → Site URL:
  `https://ringo-pi.vercel.app/` · Redirect URLs: add
  `https://ringo-pi.vercel.app/` and `http://localhost:5173/`.
- Then tell Claude "Google is on" so the app flag gets flipped and tested.

</details>

## Part C — Test

Open **https://ringo-pi.vercel.app** → **Create account** → **Continue with
Google** → real Google account chooser → back into Ringo, signed in. 🎉

If anything looks different from these steps, paste a screenshot or the error
text into the chat.
