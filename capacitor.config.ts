import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ringoesim.app',
  appName: 'Ringo',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
  },
  backgroundColor: '#F4EFE9',
};

export default config;
