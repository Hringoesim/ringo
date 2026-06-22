/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google OAuth client ID — enables real Google Identity Services sign-in. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  /** Optional auth backend base URL for live identity. */
  readonly VITE_AUTH_BACKEND?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
