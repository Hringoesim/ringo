import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Base path:
//   - Vercel / domain root  → '/' (default)
//   - GitHub Pages subpath  → '/ringo/' (set GH_PAGES=1 at build time)
const base = process.env.GH_PAGES === '1' ? '/ringo/' : '/';

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
});
