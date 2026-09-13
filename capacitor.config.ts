import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ringoesim.app',
  appName: 'Ringo',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
  },
  backgroundColor: '#FFF6EF',
  plugins: {
    SplashScreen: {
      // The splash is held until the web layer has actually painted, and JS
      // hides it (Host.tsx). Auto-hiding on a timer instead would uncover a
      // blank webview on a cold start, which is worse than a moment longer on
      // a branded screen. Host also hides it on a hard timeout so a JS failure
      // cannot strand the user here.
      launchAutoHide: false,
      backgroundColor: '#FFF6EF',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false,
    },
  },
};

export default config;
