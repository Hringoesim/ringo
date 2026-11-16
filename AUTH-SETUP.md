# Sign-in: how it works and what it needs

This file used to be a guide for turning on Supabase Auth (email magic
links, Apple and Google through Supabase, `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` as GitHub variables). The app no longer signs in
that way. Those steps are superseded and have been removed. What follows
describes the code on this branch.

## How sign-in works today

The account belongs to the Ringo website. The app offers three ways in
(`src/components/AuthButtons.tsx`). Each ends with a call to
`POST https://ringoesim.com/api/app-login`, which answers with the account
(`user_id`, token `t`, email) or an error. The app stores that answer in
`localStorage` (`src/store/account.ts`). There are no passwords.

| Way in | Where it shows | What the app sends to `/api/app-login` |
| --- | --- | --- |
| Sign in with Apple | iOS app only | Apple's identity token and a nonce (`provider: 'apple'`) |
| Continue with Google, direct | iOS app, when an iOS client id is known | Google's ID token and a nonce (`provider: 'google'`) |
| Continue with Google, through Supabase | iOS app, when the site's flag is on and no client id is known | the Supabase session token (`provider: 'supabase'`) |
| Continue with email | everywhere | the email, then the six-digit code the site emailed |

The app does not check any token itself. The site does, and its code is in
the site's repository, not here.

## What each way needs

### Email code

Nothing in this repository. The site sends the code and checks it
(`light.loginStart`, `light.loginVerify`, `light.loginCheck` in
`src/api/light.ts`). Supabase's mailer and email templates are not involved.

### Sign in with Apple

- The "Sign In with Apple" capability on the app id `com.ringoesim.app`. The
  entitlement is already in `ios/App/App/App.entitlements`.
- The plugin is `ios/App/App/SignInWithApplePlugin.swift`. No Services ID,
  key file or Supabase provider is used: the native sheet returns the token
  and the app passes it to the site.

### Google, direct route

See `GOOGLE-SIGNIN-CHECKLIST.md`. In short: an iOS-type OAuth client in
Google Cloud for bundle id `com.ringoesim.app`, and its client id given to
the site, which sends it to the app in `app_flags`. For a local test build,
put `VITE_GOOGLE_IOS_CLIENT_ID` in `.env.local`.

### Google, through Supabase

Used only when the Google button is on and the app has no iOS client id
(`signInWithGoogleViaSupabase` in `src/lib/auth.ts`).

- The system sign-in sheet opens the Supabase project's
  `/auth/v1/authorize?provider=google` page. The project URL is the constant
  `SUPABASE_AUTH_URL` in `src/lib/auth.ts`.
- The Supabase project must have the Google provider turned on
  (Authentication, Providers, Google) with a Google Web OAuth client whose
  authorised redirect URI is the project's
  `https://<project>.supabase.co/auth/v1/callback`.
- Supabase must be allowed to redirect to `http://localhost:3000`. While the
  sheet is open the app listens on that port
  (`ios/App/App/GoogleSignInPlugin.swift`, `openAuth`) and hands the session
  back to the app.
- The app uses no Supabase key and no Supabase client library for this.

The current settings of the Supabase project and of the Google Cloud project
cannot be checked from this repository.

## Variables that no longer do anything

`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GOOGLE_CLIENT_ID` and
`VITE_OAUTH_PROVIDERS` are not read by any code in `src/`.
`.github/workflows/deploy.yml` still passes the first three to the build.
That has no effect.

## How to test

- Email code: `npm run dev`, enter an email, type the code. This uses the
  live site and a real account.
- Apple and Google: only in the iOS app, on a device or simulator. See
  `NATIVE.md`.
