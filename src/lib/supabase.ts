// supabase.ts — optional Supabase backend (Postgres + Auth + Storage).
//
// Loaded lazily: the @supabase/supabase-js bundle is only fetched when the
// project is actually configured (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY),
// so it costs nothing when running on the mock backend.
//
// Spin up: create a project at supabase.com, run supabase/schema.sql, then set
// the two env vars. See DEVELOPMENT.md for wiring RingoAPI/auth to Supabase.
import type { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null | undefined;

export function isSupabaseConfigured(): boolean {
  return !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
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
