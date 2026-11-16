# Running Ringo on your phone

Two ways: the native iOS app, which is the real product, and the web build
added to the home screen, which is a limited preview.

## A. Native iOS app

Needs a Mac with Xcode. For TestFlight and the App Store, an Apple Developer
account.

```bash
npm install
npm run ios:sync       # build the web app and copy it into the iOS project
npm run ios:open       # open Xcode
```

The `ios/` project is already in the repository. There is no one-time
`ios:add` step.

In Xcode:

1. Select the **App** target, then **Signing & Capabilities**, and pick your
   Team. The bundle id is `com.ringoesim.app`.
2. Plug in your iPhone, select it as the run target, press Run.
3. For TestFlight: **Product, Archive**, then **Distribute App, App Store
   Connect**, then add testers in App Store Connect.

Run `npm run ios:sync` again after every change to `src/`.

More detail, including the Swift plugins and how the version number is set:
`NATIVE.md`.

Notes:

- The native build uses base path `/`, which is what `npm run build` and
  `ios:sync` produce. Only the GitHub Pages build uses `/ringo/`
  (`GH_PAGES=1`).
- Safe areas: each screen pads itself with `env(safe-area-inset-*)`
  (`contentInset: 'never'` in `capacitor.config.ts`).
- Backend: there is nothing to configure. The app always talks to
  `https://ringoesim.com/api`.

## B. Web build on the home screen (limited)

The web build has a manifest (`public/manifest.webmanifest`) and the iOS
home-screen meta tags (`index.html`), so Safari can add it to the home
screen: Share, Add to Home Screen. Opened from the home screen it runs full
screen, without the phone frame (`isStandalone` in `src/Host.tsx`). On a
phone-sized screen in a plain browser tab it is also full screen.

What does not work there: Sign in with Apple, Google sign-in, card payment
and push notifications. Those need the native app.

Where to open it: the deploy workflow publishes the web build to GitHub Pages
with base path `/ringo/` on every push to `main`. For the repository
`Hringoesim/ringo` the default Pages address would be
`https://hringoesim.github.io/ringo/`. That the address is live, and that
the site accepts API requests from it, is not confirmed in this repository.
