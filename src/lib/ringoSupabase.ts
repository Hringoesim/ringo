// ringoSupabase.ts — the Supabase-backed implementation of Ringo's auth + data.
//
// Active only when VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set (see
// isSupabaseConfigured). The mock backend is untouched until then. Tables/RLS
// come from supabase/schema.sql.
import { getSupabase, isSupabaseConfigured } from './supabase';
import type { RingoSession } from '../auth/auth';
import type { PhoneNumber } from '../data/types';
import type { PortFormPayload } from '../store/store';

const SESSION_KEY = 'ringo_session_v1';

export { isSupabaseConfigured };

// ── session bridge (Supabase session → our sync RingoSession in localStorage) ──
interface SbSession {
  access_token: string;
  expires_at?: number;
  user?: {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
    app_metadata?: Record<string, unknown>;
  };
}

function writeSession(sb: SbSession | null): RingoSession | null {
  if (!sb?.user) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
  const u = sb.user;
  const meta = u.user_metadata || {};
  const session: RingoSession = {
    userId: u.id,
    email: u.email ?? null,
    name:
      (meta.full_name as string) ||
      (meta.name as string) ||
      (u.email ? u.email.split('@')[0] : 'there'),
    provider: ((u.app_metadata?.provider as RingoSession['provider']) || 'email'),
    token: sb.access_token,
    onboarded: !!meta.onboarded,
    createdAt: Date.now(),
    expiresAt: sb.expires_at ? sb.expires_at * 1000 : Date.now() + 3600_000,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

let bridged = false;
/** Hydrate the local session from Supabase + keep it in sync. Awaited at boot. */
export async function initAuthBridge(onChange?: () => void): Promise<void> {
  if (!isSupabaseConfigured() || bridged) return;
  bridged = true;
  const sb = await getSupabase();
  if (!sb) return;
  const { data } = await sb.auth.getSession();
  writeSession(data.session as SbSession | null);
  sb.auth.onAuthStateChange((_event, session) => {
    writeSession(session as SbSession | null);
    onChange?.();
  });
}

// ── auth ──────────────────────────────────────────────────────────────────────
export const sbAuth = {
  async startEmailOtp(email: string): Promise<void> {
    const sb = await getSupabase();
    if (!sb) throw new Error('Supabase not configured');
    const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (error) throw error;
  },
  async verifyEmailOtp(email: string, token: string): Promise<{ ok: boolean; error?: string; session?: RingoSession | null }> {
    const sb = await getSupabase();
    if (!sb) return { ok: false, error: 'Supabase not configured' };
    const { data, error } = await sb.auth.verifyOtp({ email, token, type: 'email' });
    if (error) return { ok: false, error: error.message };
    return { ok: true, session: writeSession(data.session as SbSession | null) };
  },
  async google(): Promise<void> {
    const sb = await getSupabase();
    if (!sb) return;
    await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } });
  },
  async signOut(): Promise<void> {
    const sb = await getSupabase();
    if (sb) await sb.auth.signOut();
    localStorage.removeItem(SESSION_KEY);
  },
  async completeOnboarding(): Promise<void> {
    const sb = await getSupabase();
    if (!sb) return;
    await sb.auth.updateUser({ data: { onboarded: true } });
  },
};

// ── data (maps to supabase/schema.sql tables) ─────────────────────────────────
function rowToNumber(r: Record<string, unknown>): PhoneNumber {
  return {
    id: String(r.id),
    flag: '📱',
    country: String(r.country ?? ''),
    number: String(r.msisdn ?? ''),
    tag: r.is_main ? 'Primary' : 'Background',
    active: true,
    source: (r.source as PhoneNumber['source']) || 'ringo',
    status: (r.status as PhoneNumber['status']) || 'active',
    porting: r.status === 'porting',
    portEta: (r.port_eta as string) || undefined,
  };
}

export const sbData = {
  async getNumbers(): Promise<PhoneNumber[]> {
    const sb = await getSupabase();
    if (!sb) return [];
    const { data } = await sb.from('numbers').select('*').order('created_at', { ascending: true });
    return (data || []).map(rowToNumber);
  },
  async allocateNumber(countryCode: string, msisdn: string): Promise<void> {
    const sb = await getSupabase();
    if (!sb) return;
    const { data: u } = await sb.auth.getUser();
    if (!u?.user) return;
    await sb.from('numbers').insert({ user_id: u.user.id, msisdn, country: countryCode, source: 'ringo', status: 'active' });
  },
  async portIn(payload: PortFormPayload): Promise<void> {
    const sb = await getSupabase();
    if (!sb) return;
    const { data: u } = await sb.auth.getUser();
    if (!u?.user) return;
    await sb.from('ports').insert({
      user_id: u.user.id, number: payload.number, country: payload.country,
      current_provider: payload.currentProvider, pac: payload.pac ?? null, status: 'processing',
    });
    await sb.from('numbers').insert({
      user_id: u.user.id, msisdn: payload.number, country: payload.country, source: 'ported', status: 'porting',
    });
  },
  async submitKyc(payload: Record<string, unknown>): Promise<void> {
    const sb = await getSupabase();
    if (!sb) return;
    const { data: u } = await sb.auth.getUser();
    if (!u?.user) return;
    await sb.from('kyc_submissions').insert({
      user_id: u.user.id, first_name: payload.firstName, last_name: payload.lastName,
      dob: payload.dob, doc_type: payload.docType, document_ref: payload.documentRef, status: 'in_review',
    });
    await sb.from('profiles').update({ kyc_status: 'in_review' }).eq('id', u.user.id);
  },
  async switchPlan(planId: string): Promise<void> {
    const sb = await getSupabase();
    if (!sb) return;
    const { data: u } = await sb.auth.getUser();
    if (!u?.user) return;
    await sb.from('profiles').update({ plan_id: planId }).eq('id', u.user.id);
  },
  async getProfile(): Promise<Record<string, unknown> | null> {
    const sb = await getSupabase();
    if (!sb) return null;
    const { data: u } = await sb.auth.getUser();
    if (!u?.user) return null;
    const { data } = await sb.from('profiles').select('*').eq('id', u.user.id).single();
    return data;
  },
};
