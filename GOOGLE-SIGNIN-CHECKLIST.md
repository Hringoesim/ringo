# Continue with Google in the iOS app: what the owner does, what the code does

The app and ringoesim.com are ready (2026-11-02). Continue with Google is
hidden until Google knows the app, and only the owner can tell Google that.
About five minutes of clicking, no code and no new App Store submission by
anyone but the owner.

## What exists

- App: `src/lib/auth.ts` and `ios/App/App/GoogleSignInPlugin.swift`. The
  button opens Google's own sign-in page in the system sheet
  (ASWebAuthenticationSession), with PKCE, and gets an ID token back. No
  Google SDK, no package, no `GoogleService-Info.plist`. The button and its
  copy ("Continue with Google") are translated in all 13 extra languages.
- Site: `POST /api/app-login { provider: 'google', id_token, nonce }` checks
  the token's signature against Google's published keys, the issuer, the
  audience (our client id), the expiry, the nonce and `email_verified`, and
  opens the account with that email. Same account as the email code and
  Sign in with Apple: one row per address, never a duplicate.
- Switch: the site's catalogue sends `app_flags.google_signin` and
  `app_flags.google_ios_client_id` to the app at launch
  (`src/store/flags.ts`). The app shows the button on iOS when it has a
  client id or when `google_signin` is true (`googleSignInAvailable` in
  `src/lib/auth.ts`). How the site sets the two flags is in the site's
  repository, not this one.
- Second route: when the button is on but the app has no client id,
  `signInWithGoogle` goes through the Supabase project's Google provider
  instead (`signInWithGoogleViaSupabase`), and the site receives the
  Supabase session as `provider: 'supabase'`. The steps below set up the
  direct route.

This file does not record whether the steps below have been done.

## Part A, owner: create the iOS OAuth client (Google Cloud Console)

1. https://console.cloud.google.com, signed in with the Google account that
   owns the Ringo project (the one whose Web client already serves the
   Ringo Supabase project: its id starts with `93624347681-`). Pick that
   project in the top-left dropdown.
2. Search **Google Auth Platform** in the top bar and open it.
3. Left menu **Clients**, then **+ Create client**:
   - Application type: **iOS**
   - Name: **Ringo iOS**
   - Bundle ID: `com.ringoesim.app`
   - App Store ID: `6787133742`
   - Team ID: `R226ARCXF4`
   - **Create**. An iOS client has no secret; nothing to keep private.
4. Copy the **Client ID** (ends in `.apps.googleusercontent.com`). The
   reversed id Google shows (`com.googleusercontent.apps.…`) is derived by
   the app itself; nothing to paste for it.
5. Left menu **Audience**. If the publishing status is **Testing**, press
   **Publish app**: in Testing only listed test users can sign in. The
   scopes used (openid, email, profile) need no verification.

## Part B, one Vercel setting (owner, or paste the id in chat)

```
vercel env add GOOGLE_IOS_CLIENT_ID production
```

Paste the Client ID. The next deploy of the site sends the flag; the app
shows the button the next time it launches and reads the catalogue.
`src/lib/auth.ts` on this branch (app version 1.13) takes the client id from
the flag, so no id needs to be built into the app. Builds 1.07 and 1.08 read
the flag but wanted the id built in.

## Part C, test on a phone

Open the app, Continue with Google, pick an account, land signed in. The
site logs `[app-login] provider token rejected google …` with the reason
when a token is refused (wrong client id is `audience`).

## Local test before the client exists

`VITE_GOOGLE_IOS_CLIENT_ID=<id>` in `.env.local` (not committed) shows the
button in a local build; with a placeholder id Google refuses the sheet,
which is expected.
