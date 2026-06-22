# Running Ringo on your phone

Two ways: an **instant PWA** (no Mac, test today) and a **native iOS app** for
TestFlight / the App Store.

---

## A. Test on your iPhone right now (PWA — no Mac, no account)

1. On your iPhone, open **Safari** and go to the live URL:
   **https://hringoesim.github.io/ringo/**
2. Tap the **Share** icon → **Add to Home Screen** → **Add**.
3. Open **Ringo** from your home screen.

It launches **full-screen** (no browser bars, no mockup frame), with the Ringo
app icon — it behaves like a real app. Updates ship automatically on every push.

> In Safari (before adding to home screen) you'll see the scaled phone *mockup*.
> Add it to the home screen to get the real full-screen app.

---

## B. Native iOS app (TestFlight / App Store)

Requires a **Mac with Xcode** and an **Apple Developer account** ($99/yr).

```bash
cd app
npm install
npm run ios:add        # one-time: creates the native ios/ project
npm run ios:sync       # build web + copy into the iOS app (run after each change)
npm run ios:open       # opens Xcode
```

In Xcode:
1. Select the **App** target → **Signing & Capabilities** → pick your Team
   (bundle id is `com.ringoesim.app`).
2. Plug in your iPhone, select it as the run target, press **▶** to install &
   run on your device.
3. For TestFlight: **Product → Archive** → **Distribute App → App Store Connect**,
   then add testers in App Store Connect.

App identity is set in `capacitor.config.ts` (`appId`, `appName`). App icons live
in `public/icon-*.png` (use them in Xcode's asset catalog, or run an icon
generator like `@capacitor/assets`).

### Notes
- The native build uses base path `/` (default `npm run build`); the GitHub Pages
  build uses `/ringo/` (`GH_PAGES=1`). `ios:sync` already builds with the right base.
- Safe-area insets: the current layout approximates iOS safe areas. After your
  first on-device run we can fine-tune top/bottom insets per device if needed.
- Backend: set `.env` (Supabase / live API) before `ios:sync` so the native app
  points at the right backend.
