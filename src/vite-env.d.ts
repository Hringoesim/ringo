/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Screenshot-only: open the app on one screen. Never set in a release build. */
  readonly VITE_SHOT?: string;
  /** test builds only: report the App Store launch probe to ringoesim.com */
  readonly VITE_PROBE_BEACON?: string;
  readonly VITE_BUILD?: string;
  /** Screenshot-only: pin the tax country. Never set in a release build. */
  readonly VITE_SHOT_COUNTRY?: string;
  /** 'mock' (default) | 'live' — selects the RingoAPI backend mode. */
  readonly VITE_RINGO_API_MODE?: 'mock' | 'live';
  /** Base URL of the live orchestration API (when mode = 'live'). */
  readonly VITE_RINGO_API_BASE_URL?: string;
  /** Google OAuth client ID — enables real Google Identity Services sign-in. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  /** Optional auth backend base URL for live identity. */
  readonly VITE_AUTH_BACKEND?: string;
  /** Supabase project URL (optional backend). */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon/public key (safe for the client). */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Wholesale partner identifiers (informational / routing hints). */
  readonly VITE_PARTNER_MNP?: string;
  readonly VITE_PARTNER_RSP?: string;
  readonly VITE_PARTNER_VOICE?: string;
  readonly VITE_PARTNER_IDENTITY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
