# Building Ringo as a native app

The web app in `src/` is wrapped with [Capacitor](https://capacitorjs.com) 6.
The native projects are committed: `ios/` and `android/`. Clone the repo and
open them directly. Do not run `cap add`.

The two platforms are not at the same level:

- **iOS** is the shipped app. It has the app's own Swift plugins for sign-in,
  payment, push and more. Version 1.13, build 102 on this branch.
- **Android** is the plain Capacitor project (`MainActivity.java` only),
  version 1.0, code 1. It has none of those plugins, so Sign in with Apple,
  Google sign-in, card payment and push do not work there. Whether it has
  been released is not recorded in this repository.

## Tooling

| Platform | You need |
| --- | --- |
| iOS | A Mac with Xcode. An Apple Developer account for the App Store. No CocoaPods: dependencies are Swift packages. |
| Android | Android Studio. A Google Play Console account for the Play Store. |

## After every change to the web app

```bash
npm install
npm run sync            # npm run build, then cap sync for both platforms
```

`cap sync` copies `dist/` into the native projects. The copied web bundle
(`ios/App/App/public`) is not committed.

## iOS

```bash
npm run ios:sync        # build, then cap sync ios
npm run ios:open        # opens ios/App/App.xcodeproj in Xcode
```

In Xcode: pick a simulator or your iPhone, set your Team under Signing &
Capabilities, press Run. Product, Archive builds a version for App Store
Connect. `appstore/ExportOptions.plist` holds export settings for an upload
to App Store Connect.

Things specific to this project:

- **Swift packages.** Capacitor's packages are local paths into
  `node_modules/@capacitor/*` (`ios/App/CapApp-SPM/Package.swift`), so
  `npm install` must run before Xcode can resolve them. Stripe comes from
  `stripe-ios-spm`.
- **The app's own plugins** are Swift files in `ios/App/App/`:
  `SignInWithApplePlugin`, `GoogleSignInPlugin`, `PaymentSheetPlugin` (which
  also holds `InlinePayPlugin`), `StoreKitPlugin`, `NotifyPlugin`,
  `LocationPlugin`, `ReviewPlugin`, `BiometricAuthPlugin`. Capacitor 6 does
  not find them by itself: each is registered in
  `ios/App/App/MainViewController.swift`. A new plugin must be added there.
- **Version.** Set `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` in the
  Xcode project. `vite.config.ts` reads them at build time into
  `VITE_APP_VERSION`, which the Help screen, push registration and the update
  check use. Build the web bundle after changing the version.
- **Capabilities** in `ios/App/App/App.entitlements`: push notifications,
  Apple Pay (merchant id), Sign in with Apple.
- **URL schemes** in `Info.plist`: `ringo` (Stripe's return URL) and
  `com.ringoesim.app` (the Google sign-in return through Supabase).
- **Xcode Cloud.** `ci_scripts/ci_post_clone.sh` (same file in
  `ios/App/ci_scripts/`) installs Node, runs `npm ci`, `npm run build` and
  `npx cap sync ios` after the clone. Whether an Xcode Cloud workflow is
  configured is not visible in this repository.
- **App Store material** is in `appstore/`: listing text, screenshots, and
  scripts for App Store Connect. `appstore/IAP.md` and `appstore/LISTING.md`
  were written when plans were sold as App Store in-app purchases and partly
  predate card payment.

## Android

```bash
npm run android:sync    # build, then cap sync android
npm run android:open    # opens android/ in Android Studio
```

In Android Studio: pick an emulator or device and press Run. Build, Generate
Signed Bundle/APK produces an `.aab` for the Play Store.

Read the limits at the top of this file before spending time here. Also,
`android/app/build.gradle` only applies the Google services plugin when a
`google-services.json` file is present, and none is committed.

## App identity

Set in `capacitor.config.ts`:

- **appId**: `com.ringoesim.app`
- **appName**: `Ringo`

Do not change the appId. The iOS app is already on the App Store under it,
and the sign-in and payment setup refer to it.
