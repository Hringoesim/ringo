# Building Ringo as a native app

The web app (`src/`) is wrapped with [Capacitor](https://capacitorjs.com), so it
ships as a real **iOS** and **Android** app from the same codebase. The native
projects live in `ios/` and `android/` and are committed — clone the repo and
open them directly.

## One-time tooling

| Platform | You need |
| --- | --- |
| iOS | A **Mac** with **Xcode** + CocoaPods (`sudo gem install cocoapods`). For the App Store: an Apple Developer account ($99/yr). |
| Android | **Android Studio** (bundles the SDK). For the Play Store: a Google Play Console account ($25 one-time). |

## Every time you change the web app

Rebuild the web bundle and copy it into the native projects:

```bash
npm install
npm run sync            # = vite build + cap sync (both platforms)
```

## iOS (on a Mac)

```bash
npm run ios:sync        # build + copy web assets + pod install
npm run ios:open        # opens ios/App/App.xcworkspace in Xcode
```

In Xcode: pick a Simulator or your iPhone, set your Team under
*Signing & Capabilities*, then press ▶ Run. Archive (Product → Archive) to
submit to the App Store.

## Android

```bash
npm run android:sync    # build + copy web assets
npm run android:open    # opens android/ in Android Studio
```

In Android Studio: pick an emulator or device and press ▶ Run. Build →
Generate Signed Bundle/APK to produce an `.aab` for the Play Store.

## App identity

Set in `capacitor.config.ts`:

- **appId**: `com.ringoesim.app` (the bundle/package id used by both stores)
- **appName**: `Ringo`

Change these *before* your first store submission — the id can't be changed later.
