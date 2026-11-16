import { defineConfig } from 'vitest/config';

// Unit tests for the app (src) and for the edge functions' pure modules
// (supabase/functions). Kept apart from vite.config.ts so the app build
// carries nothing of the test runner.
export default defineConfig({
  resolve: {
    alias: {
      // Deno-style specifier used by the edge functions; under Node it is the
      // same package from node_modules.
      'npm:@peculiar/x509@1': '@peculiar/x509',
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'supabase/functions/**/*.test.ts'],
    environment: 'node',
    testTimeout: 15000,
  },
});
