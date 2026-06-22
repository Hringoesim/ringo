/// <reference types="vite/client" />

interface ImportMetaEnv {
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
