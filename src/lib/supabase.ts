// supabase.ts — optional Supabase backend (Postgres + Auth + Storage).
//
// Loaded lazily: the @supabase/supabase-js bundle is only fetched when the
// project is actually configured (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY),
// so it costs nothing when running on the mock backend.
//
// Spin up: create a project at supabase.com, run supabase/schema.sql, then set
// the two env vars. See DEVELOPMENT.md for wiring RingoAPI/auth to Supabase.
import type { SupabaseClient } from '@supabase/supabase-js';
import { log } from './log';

let client: SupabaseClient | null | undefined;

export function isSupabaseConfigured(): boolean {
  const hasCreds = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
  // Demo mode: pretend no backend is configured so the whole app (auth + data)
  // runs on the bundled mock layer — every sign-in clicks straight through.
  // Remove VITE_DEMO_MODE (or set it false) to restore real Supabase auth.
  if (import.meta.env.VITE_DEMO_MODE === 'true') {
    // Never fail silently: if real credentials ARE present, make it loud that
    // we're deliberately bypassing real auth/billing — a dangerous prod footgun.
    if (hasCreds) {
      log.error(
        'supabase',
        'VITE_DEMO_MODE=true is OVERRIDING configured Supabase credentials — running on the MOCK backend with no real auth or billing. Unset VITE_DEMO_MODE for production.',
      );
    }
    return false;
  }
  return hasCreds;
}

export async function getSupabase(): Promise<SupabaseClient | null> {
  if (client !== undefined) return client;
  if (!isSupabaseConfigured()) {
    client = null;
    return null;
  }
  const { createClient } = await import('@supabase/supabase-js');
  client = createClient(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    { auth: { persistSession: true, autoRefreshToken: true } },
  );
  return client;
}
