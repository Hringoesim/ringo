import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Base path:
//   - Vercel / domain root  → '/' (default)
//   - GitHub Pages subpath  → '/ringo/' (set GH_PAGES=1 at build time)
const base = process.env.GH_PAGES === '1' ? '/ringo/' : '/';

// The app's version, read from the Xcode project so the Help footer and the
// push registration say the build that is actually installed ("1.02 (75)").
// Nothing set VITE_APP_VERSION before 2026-10-24, so the footer always read 1.0.
function appVersion(): string {
  if (process.env.VITE_APP_VERSION) return process.env.VITE_APP_VERSION;
  try {
    const pbx = readFileSync(new URL('./ios/App/App.xcodeproj/project.pbxproj', import.meta.url), 'utf8');
    const v = /MARKETING_VERSION = ([^;]+);/.exec(pbx)?.[1];
    const b = /CURRENT_PROJECT_VERSION = ([^;]+);/.exec(pbx)?.[1];
    return v ? (b ? `${v} (${b})` : v) : '';
  } catch {
    return '';
  }
}

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
  define: { 'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion()) },
});
