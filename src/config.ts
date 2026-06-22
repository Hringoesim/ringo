// config.ts — boot-time wiring driven by environment variables.
// Everything is configured from one place so the app flips from the bundled
// mock backend to a live one (and real OAuth) purely via .env — no code changes.
//
// See .env.example for all variables.
import { RingoAPI } from './api/ringoApi';
import { configureAuth } from './auth/auth';
import { initAuthBridge } from './lib/ringoSupabase';

const SESSION_KEY = 'ringo_session_v1';

function sessionToken(): string | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw).token as string) : null;
  } catch {
    return null;
  }
}

export async function bootConfig(): Promise<void> {
  const env = import.meta.env;

  RingoAPI.configure({
    mode: env.VITE_RINGO_API_MODE === 'live' ? 'live' : 'mock',
    baseUrl: env.VITE_RINGO_API_BASE_URL || '',
    getToken: sessionToken,
    partners: {
      mnp: env.VITE_PARTNER_MNP || '1global',
      rsp: env.VITE_PARTNER_RSP || 'tbd',
      voice: env.VITE_PARTNER_VOICE || 'telnyx',
      identity: env.VITE_PARTNER_IDENTITY || 'onfido',
      billing: 'stripe',
    },
  });

  configureAuth({
    googleClientId: env.VITE_GOOGLE_CLIENT_ID || '',
    backendUrl: env.VITE_AUTH_BACKEND || '',
  });

  // If Supabase is configured, hydrate the session before the app renders.
  await initAuthBridge();
}
